import * as http from 'node:http';
import * as net from 'node:net';
import { PairingService, SessionAuth } from './PairingService';
import { ProviderGateway, healthPayload } from './ProviderGateway';
import { RateLimiter, IdleShutdown, AuditLog } from './RateLimiter';
import { buildProvenance, type TransportMode } from './ProvenanceEnvelope';
import { loadLiveProviderPolicy } from '../config/live_provider_policy';
import { isFeatureEnabled } from '../config/feature_flags';
import type { ModelProviderV2 } from '../providers/model_provider_v2';
import type { TaskClass } from '../config/live_provider_policy';

export interface NearbyEdgeServerOptions {
  host?: string;
  port?: number;
  transport?: TransportMode;
  provider?: ModelProviderV2 | null;
  root?: string;
  bindLan?: boolean;
}

export interface NearbyEdgeServerHandle {
  url: string;
  port: number;
  transport: TransportMode;
  pairing: PairingService;
  sessions: SessionAuth;
  audit: AuditLog;
  gateway: ProviderGateway;
  mintPairingCode: () => { code: string; expires_at: number };
  setProvider: (provider: ModelProviderV2 | null) => void;
  close: () => Promise<void>;
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function json(res: http.ServerResponse, status: number, body: unknown, req?: http.IncomingMessage): void {
  const payload = JSON.stringify(body);
  const origin = req?.headers.origin;
  const allowOrigin =
    origin && /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(origin) ? origin : null;
  const headers: Record<string, string | number> = {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    'X-GunnchAI-Nearby-Edge': 'v1',
    'X-On-Device-Local': 'false',
  };
  if (allowOrigin) {
    headers['Access-Control-Allow-Origin'] = allowOrigin;
    headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type';
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    headers['Vary'] = 'Origin';
  }
  res.writeHead(status, headers);
  res.end(payload);
}

/**
 * NearbyEdgeServer — canonical gunnchAI API (not llama.cpp schema).
 * Default bind: 127.0.0.1 only. LAN bind requires TLS path + pairing (not open).
 */
export async function startNearbyEdgeServer(opts: NearbyEdgeServerOptions = {}): Promise<NearbyEdgeServerHandle> {
  if (!isFeatureEnabled('GUNNCHAI_NEARBY_EDGE')) {
    throw new Error('GUNNCHAI_NEARBY_EDGE flag is off');
  }

  const policy = loadLiveProviderPolicy(opts.root);
  const transport: TransportMode = opts.transport ?? 'LOCALHOST';
  if (transport === 'LOCAL_LAN_TLS' && !opts.bindLan) {
    throw new Error('LOCAL_LAN_TLS requires explicit bindLan + TLS termination (not implemented open)');
  }
  // Hard rule: never expose unauthenticated open LAN
  const host = opts.bindLan ? '0.0.0.0' : opts.host ?? '127.0.0.1';
  if (host !== '127.0.0.1' && host !== 'localhost' && transport !== 'LOCAL_LAN_TLS') {
    throw new Error('Non-loopback bind forbidden without LOCAL_LAN_TLS');
  }

  const pairing = new PairingService();
  const sessions = new SessionAuth();
  const audit = new AuditLog();
  const gateway = new ProviderGateway(opts.provider ?? null, 'smollm2-135m-instruct-q4_k_m', opts.root);
  const limiter = new RateLimiter(
    policy.nearby_edge.rate_limit.requests_per_minute,
    policy.nearby_edge.rate_limit.burst,
  );
  let cancelled = false;

  const idle = new IdleShutdown(policy.nearby_edge.idle_shutdown_ms, () => {
    sessions.clearAll();
    audit.record('idle_shutdown', { cleared_sessions: true });
  });
  idle.arm();

  const port = opts.port ?? (await freePort());
  const server = http.createServer(async (req, res) => {
    idle.touch();
    const url = new URL(req.url || '/', `http://${host}:${port}`);
    const pathName = url.pathname;
    const reply = (status: number, body: unknown) => json(res, status, body, req);

    try {
      // Loopback CORS for Pixel Chrome pilot (ADB reverse) — never open LAN without TLS path
      if (req.method === 'OPTIONS' && pathName.startsWith('/v1/')) {
        const origin = req.headers.origin;
        const allowOrigin =
          origin && /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(origin) ? origin : null;
        res.writeHead(204, {
          ...(allowOrigin
            ? {
                'Access-Control-Allow-Origin': allowOrigin,
                'Access-Control-Allow-Headers': 'Authorization, Content-Type',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                Vary: 'Origin',
              }
            : {}),
        });
        res.end();
        return;
      }

      if (req.method === 'GET' && pathName === '/v1/healthz') {
        return reply(200, { ...healthPayload(gateway, transport), health: await gateway.health() });
      }

      if (req.method === 'POST' && pathName === '/v1/session/pair') {
        const raw = await readBody(req);
        const body = raw ? (JSON.parse(raw) as { code?: string; client_label?: string }) : {};
        if (!body.code || !pairing.consumePairingCode(body.code)) {
          audit.record('pair_deny', { reason: 'INVALID_OR_EXPIRED_CODE' });
          return reply(401, { ok: false, error: 'INVALID_OR_EXPIRED_CODE' });
        }
        const session = sessions.createSession(body.client_label ?? 'pilot');
        audit.record('pair_ok', { client_label: session.client_label });
        return reply(200, {
          ok: true,
          session_token: session.token,
          expires_at: session.expires_at,
          transport,
          note: 'Store token in secure client storage only; not for git',
        });
      }

      const auth = sessions.validate(req.headers.authorization);
      if (!auth && pathName !== '/v1/healthz') {
        // capabilities / execute / cancel / revoke require session
        if (pathName.startsWith('/v1/')) {
          audit.record('auth_deny', { path: pathName });
          return reply(401, { ok: false, error: 'SESSION_REQUIRED' });
        }
      }

      if (req.method === 'GET' && pathName === '/v1/capabilities') {
        if (!auth) return reply(401, { ok: false, error: 'SESSION_REQUIRED' });
        return reply(200, gateway.capabilities());
      }

      if (req.method === 'POST' && pathName === '/v1/session/revoke') {
        if (!auth) return reply(401, { ok: false, error: 'SESSION_REQUIRED' });
        sessions.revoke(req.headers.authorization);
        audit.record('session_revoke', { client_label: auth.client_label });
        return reply(200, { ok: true });
      }

      if (req.method === 'POST' && pathName === '/v1/cancel') {
        if (!auth) return reply(401, { ok: false, error: 'SESSION_REQUIRED' });
        cancelled = true;
        audit.record('cancel', {});
        return reply(200, { ok: true, cancelled: true });
      }

      if (req.method === 'POST' && pathName === '/v1/execute') {
        if (!auth) return reply(401, { ok: false, error: 'SESSION_REQUIRED' });
        const rl = limiter.allow();
        if (!rl.ok) {
          audit.record('rate_limit', { reason: rl.reason });
          return reply(429, { ok: false, error: rl.reason });
        }
        const raw = await readBody(req);
        const body = JSON.parse(raw || '{}') as {
          task_class?: TaskClass;
          prompt?: string;
          system?: string;
          max_tokens?: number;
        };
        if (cancelled) {
          cancelled = false;
          return reply(499, { ok: false, error: 'CANCELLED' });
        }
        const result = await gateway.execute({
          task_class: body.task_class ?? 'short_assist',
          prompt: body.prompt ?? '',
          system: body.system,
          max_tokens: body.max_tokens,
        });
        const provenance = buildProvenance({
          transport,
          model_id: result.model_id ?? 'smollm2-135m-instruct-q4_k_m',
          provider_id: result.provider_id ?? 'prov_llamacpp_live',
          task_class: body.task_class ?? 'short_assist',
        });
        audit.record(result.denied ? 'execute_deny' : 'execute', {
          ok: result.ok,
          error: result.error,
          task_class: body.task_class,
          request_id: provenance.request_id,
        });
        return reply(result.ok ? 200 : result.denied ? 403 : 503, {
          ...result,
          provenance,
        });
      }

      return reply(404, { ok: false, error: 'NOT_FOUND' });
    } catch (err) {
      audit.record('error', { message: err instanceof Error ? err.message : String(err) });
      return reply(500, { ok: false, error: 'INTERNAL' });
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.listen(port, host, () => resolve());
    server.on('error', reject);
  });

  return {
    url: `http://127.0.0.1:${port}`,
    port,
    transport,
    pairing,
    sessions,
    audit,
    gateway,
    mintPairingCode: () => pairing.mintPairingCode(),
    setProvider: (provider: ModelProviderV2 | null) => gateway.setProvider(provider),
    close: async () => {
      idle.stop();
      sessions.clearAll();
      await new Promise<void>((resolve, reject) => {
        server.close((e) => (e ? reject(e) : resolve()));
      });
    },
  };
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => {
      const addr = s.address();
      if (!addr || typeof addr === 'string') {
        s.close();
        reject(new Error('no port'));
        return;
      }
      const p = addr.port;
      s.close(() => resolve(p));
    });
    s.on('error', reject);
  });
}

#!/usr/bin/env tsx
/**
 * Focused KIRBY-4 §10 physical Pixel nearby-edge journey.
 * Prefer device-side HTTP via toybox nc through adb reverse (no Pixel curl).
 * Leaves PIXEL_NEARBY_EDGE_PHYSICAL_JOURNEY_PASS false unless device-side steps earn it.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as http from 'node:http';
import { execFileSync } from 'node:child_process';
import {
  LlamaCppLiveProvider,
  discoverLlamaBinary,
} from '../src/providers/live/llamacpp_provider';
import { startNearbyEdgeServer } from '../src/nearby_edge/NearbyEdgeServer';
import { applyAdbReverse, clearAdbReverse, adbDeviceState } from '../src/nearby_edge/transport';
import { captureResourceSnapshot } from '../src/nearby_edge/resource_guard';

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'artifacts/kirby_v2/controlled_integration');
const SERIAL = process.env.ANDROID_SERIAL || '27211JEGR06194';
const EDGE_PORT = 8799;
const PILOT_PORT = 8801;

function writeJson(rel: string, data: unknown): void {
  const p = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n');
}

function adb(args: string[], opts?: { timeout?: number; encoding?: 'utf8' | 'buffer' }): string {
  const out = execFileSync('adb', ['-s', SERIAL, ...args], {
    encoding: (opts?.encoding as BufferEncoding) || 'utf8',
    timeout: opts?.timeout ?? 30_000,
    maxBuffer: 20 * 1024 * 1024,
  });
  return typeof out === 'string' ? out : '';
}

function deviceHttp(
  port: number,
  method: string,
  urlPath: string,
  body?: string,
  headers?: Record<string, string>,
): { status: number; raw: string; json: unknown } {
  const hdrs = { 'Content-Type': 'application/json', Connection: 'close', ...(headers || {}) };
  const payload = body ?? '';
  const lines = [
    `${method} ${urlPath} HTTP/1.1`,
    `Host: 127.0.0.1:${port}`,
    ...Object.entries(hdrs).map(([k, v]) => `${k}: ${v}`),
    `Content-Length: ${Buffer.byteLength(payload)}`,
    '',
    payload,
  ];
  const req = lines.join('\r\n');
  // Write request to device tmp then pipe through nc (reliable vs nested quoting)
  const b64 = Buffer.from(req, 'utf8').toString('base64');
  const script = `echo '${b64}' | base64 -d | toybox nc -w 20 127.0.0.1 ${port}`;
  const raw = adb(['shell', script], { timeout: 60_000 });
  const sep = raw.indexOf('\r\n\r\n') >= 0 ? '\r\n\r\n' : '\n\n';
  const idx = raw.indexOf(sep);
  const head = idx >= 0 ? raw.slice(0, idx) : raw;
  const bodyText = idx >= 0 ? raw.slice(idx + sep.length) : '';
  const m = /HTTP\/\d\.\d\s+(\d+)/.exec(head);
  const status = m ? Number(m[1]) : 0;
  let json: unknown = bodyText;
  try {
    json = JSON.parse(bodyText.trim());
  } catch {
    /* keep */
  }
  return { status, raw: raw.slice(0, 1200), json };
}

async function servePilot(port: number, rootDir: string, edgePort: number) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
    if (url.pathname.startsWith('/v1/')) {
      const chunks: Buffer[] = [];
      for await (const c of req) chunks.push(c as Buffer);
      const body = Buffer.concat(chunks);
      try {
        const upstream = await fetch(`http://127.0.0.1:${edgePort}${url.pathname}`, {
          method: req.method,
          headers: {
            'Content-Type': req.headers['content-type'] || 'application/json',
            ...(req.headers.authorization ? { Authorization: String(req.headers.authorization) } : {}),
          },
          body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
        });
        const text = await upstream.text();
        res.writeHead(upstream.status, { 'Content-Type': 'application/json' });
        res.end(text);
      } catch (err) {
        res.writeHead(502);
        res.end(JSON.stringify({ ok: false, error: String(err) }));
      }
      return;
    }
    const fp = path.join(rootDir, 'index.html');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(fs.readFileSync(fp));
  });
  await new Promise<void>((resolve, reject) => {
    server.listen(port, '127.0.0.1', () => resolve());
    server.on('error', reject);
  });
  return {
    close: () => new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve()))),
  };
}

async function main(): Promise<void> {
  process.env.GUNNCHAI_LIVE_PROVIDER_INTEGRATION = '1';
  process.env.GUNNCHAI_NEARBY_EDGE = '1';
  fs.mkdirSync(path.join(OUT, 'pixel_journey'), { recursive: true });

  const adbState = adbDeviceState();
  const log: string[] = [`adb raw: ${adbState.raw.trim().slice(0, 300)}`];
  const pairingTrace: Record<string, unknown>[] = [];
  let pass = false;
  let detail = '';
  const steps: Record<string, boolean> = {
    adb_reverse: false,
    pilot_chrome_opened: false,
    pair: false,
    execute_smollm2: false,
    provenance_nearby_edge: false,
    provider_disconnect_honest_fallback: false,
    session_recover: false,
    revoke_denied: false,
  };

  if (!adbState.connected) {
    detail = adbState.unauthorized
      ? 'PIXEL_ADB_UNAUTHORIZED_OWNER_MUST_ALLOW_USB_DEBUG'
      : 'PIXEL_ADB_UNAVAILABLE_OR_OFFLINE';
    writeJson('pixel_journey/PHYSICAL_PIXEL_JOURNEY.json', {
      PIXEL_NEARBY_EDGE_PHYSICAL_JOURNEY_PASS: false,
      detail,
      blocker: detail,
      owner_steps_if_blocked: [
        'Unlock Pixel; set USB mode to File transfer',
        'Accept Allow USB debugging RSA dialog if shown',
        'Stop other adb clients contending for the device',
        'adb kill-server && adb start-server && adb devices -l',
      ],
      adb: adbState,
    });
    console.log(JSON.stringify({ pass: false, detail, adbState }, null, 2));
    process.exit(2);
  }

  const gguf = path.join(ROOT, 'models/local/SmolLM2-135M-Instruct-Q4_K_M.gguf');
  const llamaBin = discoverLlamaBinary();
  const resource = captureResourceSnapshot();
  if (!fs.existsSync(gguf) || !llamaBin || !resource.allow_micro) {
    detail = 'MAC_LIVE_PROVIDER_NOT_READY';
    writeJson('pixel_journey/PHYSICAL_PIXEL_JOURNEY.json', { PIXEL_NEARBY_EDGE_PHYSICAL_JOURNEY_PASS: false, detail });
    console.log(JSON.stringify({ pass: false, detail }, null, 2));
    process.exit(3);
  }

  const live = new LlamaCppLiveProvider({
    meta: {
      provider_id: 'prov_llamacpp_live',
      model_id: 'smollm2-135m-instruct-q4_k_m',
      display_name: 'SmolLM2-135M CONTROLLED_INTEGRATION',
      family: 'local_gguf',
      location: 'local',
      tier_hint: 0,
      context_window_tokens: 512,
      max_output_tokens: 96,
      modalities: ['text'],
      supports_tools: false,
      supports_structured_output: false,
      supports_streaming: false,
      supports_computer_use: false,
      offline_capable: true,
      requires_cloud_consent: false,
      cost_per_1k_input_usd: 0,
      cost_per_1k_output_usd: 0,
      typical_latency_ms: 1200,
      energy_hint_j_per_1k: 0.4,
      health: 'healthy',
      privacy_class: 'device_local',
      hidden_cot_exposed: false,
      notes: 'CONTROLLED_INTEGRATION only',
    },
    ggufPath: gguf,
    binaryPath: llamaBin,
    nPredict: 48,
    ctxSize: 512,
    evidenceClass: 'LIVE_MAC',
  });

  const edge = await startNearbyEdgeServer({
    provider: live,
    transport: 'ADB_REVERSE',
    root: ROOT,
    port: EDGE_PORT,
  });
  const pilotDir = path.join(ROOT, 'pilot/nearby_edge_pwa');
  const pilot = await servePilot(PILOT_PORT, pilotDir, EDGE_PORT);

  try {
    const rev = applyAdbReverse(EDGE_PORT);
    const revPilot = applyAdbReverse(PILOT_PORT);
    steps.adb_reverse = rev.ok && revPilot.ok;
    log.push(`reverse edge=${rev.detail}`);
    log.push(`reverse pilot=${revPilot.detail}`);
    if (!steps.adb_reverse) {
      detail = 'ADB_REVERSE_FAILED';
      throw new Error(detail);
    }

    try {
      adb(['shell', 'am', 'force-stop', 'com.android.chrome'], { timeout: 10_000 });
    } catch {
      /* ignore */
    }
    adb([
      'shell',
      'am',
      'start',
      '-a',
      'android.intent.action.VIEW',
      '-d',
      `http://127.0.0.1:${PILOT_PORT}/`,
      '-n',
      'com.android.chrome/com.google.android.apps.chrome.Main',
    ]);
    steps.pilot_chrome_opened = true;
    log.push('chrome pilot opened');

    // Health via device nc
    const health = deviceHttp(EDGE_PORT, 'GET', '/v1/healthz');
    log.push(`device health status=${health.status}`);
    if (health.status !== 200) {
      detail = 'DEVICE_REVERSE_HEALTH_FAILED';
      throw new Error(`${detail}: ${health.raw.slice(0, 200)}`);
    }

    const { code } = edge.mintPairingCode();
    const pair = deviceHttp(
      EDGE_PORT,
      'POST',
      '/v1/session/pair',
      JSON.stringify({ code, client_label: 'pixel_nc_physical' }),
    );
    const pairBody = pair.json as { ok?: boolean; session_token?: string };
    steps.pair = pair.status === 200 && Boolean(pairBody.ok && pairBody.session_token);
    pairingTrace.push({ step: 'pair', status: pair.status, ok: steps.pair });
    log.push(`pair status=${pair.status}`);
    if (!steps.pair || !pairBody.session_token) {
      detail = 'DEVICE_PAIR_FAILED';
      throw new Error(detail);
    }
    const token = pairBody.session_token;

    const exec = deviceHttp(
      EDGE_PORT,
      'POST',
      '/v1/execute',
      JSON.stringify({
        task_class: 'intent_route',
        prompt: 'Classify intent as route|assist|refuse. Question: 1+1?',
      }),
      { Authorization: `Bearer ${token}` },
    );
    const execBody = exec.json as { ok?: boolean; provenance?: Record<string, unknown> };
    steps.execute_smollm2 = exec.status === 200 && Boolean(execBody.ok);
    const prov = execBody.provenance || null;
    steps.provenance_nearby_edge = Boolean(
      prov && prov.on_device_local === false && prov.compute_host === 'mac_nearby_edge',
    );
    writeJson('pixel_journey/DEVICE_EXECUTE.json', execBody);
    writeJson('pixel_journey/EXECUTION_PROVENANCE.json', {
      ok: steps.provenance_nearby_edge,
      provenance: prov,
      via: 'adb_reverse_device_nc',
    });
    pairingTrace.push({ step: 'execute', status: exec.status, ok: steps.execute_smollm2 });
    log.push(`exec status=${exec.status} provenance_ok=${steps.provenance_nearby_edge}`);

    edge.setProvider(null);
    const down = deviceHttp(
      EDGE_PORT,
      'POST',
      '/v1/execute',
      JSON.stringify({ task_class: 'intent_route', prompt: 'down?' }),
      { Authorization: `Bearer ${token}` },
    );
    const downBody = down.json as { ok?: boolean; error?: string };
    steps.provider_disconnect_honest_fallback =
      downBody.ok === false && /PROVIDER_UNAVAILABLE/i.test(downBody.error || '');
    pairingTrace.push({
      step: 'provider_disconnect_fallback',
      ok: steps.provider_disconnect_honest_fallback,
      error: downBody.error,
    });

    edge.setProvider(live);
    const recover = deviceHttp(
      EDGE_PORT,
      'POST',
      '/v1/execute',
      JSON.stringify({ task_class: 'intent_route', prompt: 'recover?' }),
      { Authorization: `Bearer ${token}` },
    );
    steps.session_recover = recover.status === 200 && Boolean((recover.json as { ok?: boolean }).ok);
    pairingTrace.push({ step: 'session_recover', ok: steps.session_recover });

    const revoke = deviceHttp(EDGE_PORT, 'POST', '/v1/session/revoke', '', {
      Authorization: `Bearer ${token}`,
    });
    const after = deviceHttp(
      EDGE_PORT,
      'POST',
      '/v1/execute',
      JSON.stringify({ task_class: 'short_assist', prompt: 'deny' }),
      { Authorization: `Bearer ${token}` },
    );
    steps.revoke_denied = revoke.status === 200 && after.status === 401;
    pairingTrace.push({
      step: 'revoke_then_deny',
      revoke_status: revoke.status,
      after_status: after.status,
      ok: steps.revoke_denied,
    });

    try {
      const buf = execFileSync('adb', ['-s', SERIAL, 'exec-out', 'screencap', '-p'], {
        maxBuffer: 20 * 1024 * 1024,
      });
      fs.writeFileSync(path.join(OUT, 'pixel_journey/screenshot.png'), buf);
      log.push('screenshot captured');
    } catch (err) {
      log.push(`screenshot skipped: ${err instanceof Error ? err.message : String(err)}`);
    }

    pass = Object.values(steps).every(Boolean);
    detail = pass
      ? 'ADB_REVERSE_PIXEL_NC_FULL_JOURNEY_PASS'
      : `PIXEL_JOURNEY_INCOMPLETE:${Object.entries(steps)
          .filter(([, v]) => !v)
          .map(([k]) => k)
          .join(',')}`;
  } catch (err) {
    detail = detail || (err instanceof Error ? err.message : String(err));
    log.push(`failed: ${detail}`);
    pass = false;
  } finally {
    clearAdbReverse(EDGE_PORT);
    clearAdbReverse(PILOT_PORT);
    await pilot.close().catch(() => undefined);
    await edge.close().catch(() => undefined);
    process.env.GUNNCHAI_LIVE_PROVIDER_INTEGRATION = '0';
    process.env.GUNNCHAI_NEARBY_EDGE = '0';
  }

  writeJson('pixel_journey/PAIRING_TRACE.json', { schema: 'gunnchai.kirby4.pairing_trace.v1', steps: pairingTrace });
  writeJson('pixel_journey/PHYSICAL_PIXEL_JOURNEY.json', {
    PIXEL_NEARBY_EDGE_PHYSICAL_JOURNEY_PASS: pass,
    detail,
    steps,
    transport: { mode: 'ADB_REVERSE', adb_reverse_applied: steps.adb_reverse },
    honesty: {
      PIXEL6A_LIVE_LOCAL_MODEL_PASS: false,
      GUNNCHAI_ANDROID_PRODUCTION_CLIENT_PASS: false,
      RUNTIME_ON_DEVICE_LOCAL: false,
      adb_reverse_is_not_on_device: true,
    },
  });
  writeJson('pixel_journey/JOURNEY_LOG.json', {
    PIXEL_NEARBY_EDGE_PHYSICAL_JOURNEY_PASS: pass,
    detail,
    adb_connected: true,
    adb_unauthorized: false,
    steps,
    log,
    honesty: {
      PIXEL6A_LIVE_LOCAL_MODEL_PASS: false,
      GUNNCHAI_ANDROID_PRODUCTION_CLIENT_PASS: false,
      RUNTIME_ON_DEVICE_LOCAL: false,
      adb_reverse_is_not_on_device: true,
    },
  });

  // Patch gate summary honestly
  const gatesPath = path.join(OUT, 'gates/GATE_SUMMARY.json');
  if (fs.existsSync(gatesPath)) {
    const g = JSON.parse(fs.readFileSync(gatesPath, 'utf8'));
    g.gates = g.gates || {};
    g.gates.PIXEL_NEARBY_EDGE_PHYSICAL_JOURNEY_PASS = pass;
    g.physical_retry = { at: new Date().toISOString(), detail, pass };
    fs.writeFileSync(gatesPath, JSON.stringify(g, null, 2) + '\n');
  }
  const summaryPath = path.join(OUT, 'CONTROLLED_SUMMARY.json');
  if (fs.existsSync(summaryPath)) {
    const s = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    s.pixelJourneyPass = pass;
    s.pixelJourneyDetail = detail;
    s.adbOk = true;
    fs.writeFileSync(summaryPath, JSON.stringify(s, null, 2) + '\n');
  }
  const kirbyGates = path.join(ROOT, 'gates/KIRBY_GATES.json');
  if (fs.existsSync(kirbyGates)) {
    const kg = JSON.parse(fs.readFileSync(kirbyGates, 'utf8'));
    kg.tokens = kg.tokens || {};
    kg.tokens.PIXEL_NEARBY_EDGE_PHYSICAL_JOURNEY_PASS = {
      status: pass ? 'PASS' : 'FAIL',
      value: pass,
      evidence: ['artifacts/kirby_v2/controlled_integration/pixel_journey/'],
      detail,
    };
    if (kg.controlled) kg.controlled.PIXEL_NEARBY_EDGE_PHYSICAL_JOURNEY_PASS = pass;
    fs.writeFileSync(kirbyGates, JSON.stringify(kg, null, 2) + '\n');
  }

  console.log(JSON.stringify({ pass, detail, steps }, null, 2));
  process.exit(pass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

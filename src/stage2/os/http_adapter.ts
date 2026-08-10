/**
 * HTTP/Python-callable adapter surface for device-os WAIKE / Device Manager / Creator.
 */

import http from 'node:http';
import { GunnchAiCapabilityApi, type CapabilityName } from './capability_api';
import { createIdentity } from './identity';

export interface AdapterServer {
  port: number;
  close(): Promise<void>;
}

export function startCapabilityHttpServer(
  api: GunnchAiCapabilityApi,
  port = 0,
): Promise<AdapterServer> {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://127.0.0.1`);
    if (req.method === 'GET' && url.pathname === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, service: 'gunnchai-stage2-capability' }));
      return;
    }
    if (req.method === 'GET' && url.pathname === '/v1/capabilities') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(
        JSON.stringify({
          capabilities: [
            'summarize',
            'translate',
            'tutor',
            'code',
            'search',
            'reason',
            'diagnose',
            'classify',
          ],
        }),
      );
      return;
    }
    if (req.method === 'POST' && url.pathname.startsWith('/v1/capability/')) {
      const name = url.pathname.split('/').pop() as CapabilityName;
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body || '{}') as {
            user_id?: string;
            input?: string;
            cloudConsent?: boolean;
            grant?: string[];
          };
          const user_id = parsed.user_id ?? 'anonymous';
          for (const g of parsed.grant ?? []) {
            api.permissions.grant(user_id, g as never);
          }
          const result = api.invoke({
            capability: name,
            input: parsed.input ?? '',
            identity: createIdentity(user_id),
            cloudConsent: parsed.cloudConsent,
            telemetry: { offline: false, availableRamMb: 4096 },
          });
          res.writeHead(result.ok ? 200 : 503, { 'content-type': 'application/json' });
          res.end(JSON.stringify(result));
        } catch (err) {
          res.writeHead(400, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: String(err) }));
        }
      });
      return;
    }
    res.writeHead(404);
    res.end('not found');
  });

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      const addr = server.address();
      const p = typeof addr === 'object' && addr ? addr.port : port;
      resolve({
        port: p,
        close: () =>
          new Promise((r, j) => server.close((e) => (e ? j(e) : r()))),
      });
    });
  });
}

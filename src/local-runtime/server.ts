import express, { type Express } from 'express';
import type { LocalFirstRuntime } from './runtime';
import { inferCapability } from './runtime';
import { randomUUID } from 'node:crypto';

export interface RuntimeServerHandles {
  app: Express;
  server: ReturnType<Express['listen']>;
  port: number;
  close: () => Promise<void>;
}

/**
 * Minimal local health / request HTTP surface for Gate 1 smoke.
 * Binds to 127.0.0.1 only.
 */
export async function startRuntimeServer(
  runtime: LocalFirstRuntime,
  port = 0,
): Promise<RuntimeServerHandles> {
  const app = express();
  app.use(express.json({ limit: '64kb' }));

  app.get('/health', (_req, res) => {
    res.json(runtime.health());
  });

  app.get('/version', (_req, res) => {
    const h = runtime.health();
    res.json({
      runtimeName: h.runtimeName,
      runtimeVersion: h.runtimeVersion,
      packageVersion: h.packageVersion,
      activeProviderId: h.activeProviderId,
      providers: h.providers,
      disclosure: h.disclosure,
    });
  });

  app.post('/v1/assist', async (req, res) => {
    const query = String(req.body?.query ?? '');
    const capability = (req.body?.capability as string) || inferCapability(query);
    const attemptCloud = Boolean(req.body?.attemptCloud);
    const timeoutMs = Number(req.body?.timeoutMs ?? 5000);
    const result = await runtime.handle({
      id: String(req.body?.id ?? randomUUID()),
      capability: capability as Parameters<LocalFirstRuntime['handle']>[0]['capability'],
      query,
      attemptCloud,
      timeoutMs,
    });
    res.status(result.ok ? 200 : 400).json(result);
  });

  app.post('/v1/restart', (_req, res) => {
    res.json(runtime.restart());
  });

  const server = await new Promise<ReturnType<Express['listen']>>((resolve) => {
    const s = app.listen(port, '127.0.0.1', () => resolve(s));
  });
  const address = server.address();
  const boundPort = typeof address === 'object' && address ? address.port : port;

  return {
    app,
    server,
    port: boundPort,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

/**
 * Continuance VI — local HTTP product API (127.0.0.1 only) for gunnchOS.
 */

import express, { type Express, type Request, type Response } from 'express';
import type { GunnchAIProductService } from './service';
import type { AssistRequest, PermissionScope, ProductRoute } from './types';
import { OS_INTEGRATION_TOKEN, PRODUCT_SERVICE_TOKEN } from './types';

export interface ProductServerHandles {
  app: Express;
  server: ReturnType<Express['listen']>;
  port: number;
  baseUrl: string;
  close: () => Promise<void>;
}

function bodyPermissions(req: Request): PermissionScope[] | undefined {
  const p = req.body?.permissions;
  return Array.isArray(p) ? (p as PermissionScope[]) : undefined;
}

export async function startProductServiceServer(
  service: GunnchAIProductService,
  port = 0,
): Promise<ProductServerHandles> {
  const app = express();
  app.use(express.json({ limit: '512kb' }));

  app.get('/health', (_req, res) => {
    res.json(service.health());
  });

  app.get('/version', (_req, res) => {
    const h = service.health();
    res.json({
      service: h.service,
      version: h.version,
      token: h.token,
      osIntegrationToken: h.osIntegrationToken,
      realLocalInference: h.realLocalInference,
      fullPlatformDigitalComplete: false,
    });
  });

  app.get('/v1/capabilities', (_req, res) => {
    res.json({
      routes: service.listRoutes(),
      requirements: service.requirementStatus(),
      token: PRODUCT_SERVICE_TOKEN,
      osIntegrationToken: OS_INTEGRATION_TOKEN,
    });
  });

  app.get('/v1/requirements', (_req, res) => {
    res.json({ nodes: service.requirementStatus() });
  });

  app.get('/v1/os/discover', (_req, res) => {
    res.json({ ok: true, ...service.osDiscover() });
  });

  app.get('/v1/os/model-status', (_req, res) => {
    res.json({ ok: true, modelStatus: service.modelStatus() });
  });

  app.get('/v1/os/rag-status', (_req, res) => {
    res.json({ ok: true, ragStatus: service.ragStatus() });
  });

  app.post('/v1/assist', async (req, res) => {
    await handleAssist(service, req, res, req.body?.capability as ProductRoute);
  });

  app.post('/v1/assist/cancel', (req, res) => {
    const requestId = String(req.body?.requestId ?? '');
    if (!requestId) {
      res.status(400).json({ ok: false, errorCode: 'REQUEST_ID_REQUIRED' });
      return;
    }
    res.json(service.cancel(requestId));
  });

  app.post('/v1/assist/:capability', async (req, res) => {
    await handleAssist(service, req, res, req.params.capability as ProductRoute);
  });

  app.post('/v1/rag/ingest', (req, res) => {
    try {
      const corpus = (req.body?.corpus as string) || 'custom';
      if (req.body?.path) {
        const meta = service.rag.ingestFile(String(req.body.path), corpus as never);
        return res.json({ ok: true, document: meta, stats: service.rag.stats() });
      }
      if (req.body?.text) {
        const meta = service.rag.ingestText({
          sourcePath: String(req.body?.sourcePath ?? `inline://${Date.now()}`),
          text: String(req.body.text),
          corpus: corpus as never,
          title: req.body?.title,
          docId: req.body?.docId,
        });
        return res.json({ ok: true, document: meta, stats: service.rag.stats() });
      }
      return res.status(400).json({ ok: false, errorCode: 'INGEST_REQUIRES_PATH_OR_TEXT' });
    } catch (err) {
      return res.status(400).json({
        ok: false,
        errorCode: 'INGEST_FAILED',
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    }
  });

  app.post('/v1/rag/chunk', (req, res) => {
    const text = String(req.body?.text ?? '');
    res.json({
      ok: true,
      chunks: service.rag.chunk(
        text,
        Number(req.body?.chunkSize ?? 700),
        Number(req.body?.overlap ?? 80),
      ),
    });
  });

  app.post('/v1/rag/index', (_req, res) => {
    res.json({ ok: true, stats: service.rag.index() });
  });

  app.post('/v1/rag/search', (req, res) => {
    const query = String(req.body?.query ?? '');
    const hits = service.rag.search(query, Number(req.body?.limit ?? 5));
    res.json({ ok: true, query, hits });
  });

  app.post('/v1/rag/attribution', (req, res) => {
    const query = String(req.body?.query ?? '');
    res.json({ ok: true, ...service.rag.attribution(query, Number(req.body?.limit ?? 5)) });
  });

  app.post('/v1/rag/delete', (req, res) => {
    const docId = String(req.body?.docId ?? '');
    const deleted = service.rag.delete(docId);
    res.status(deleted ? 200 : 404).json({ ok: deleted, docId, stats: service.rag.stats() });
  });

  app.post('/v1/rag/rebuild', (_req, res) => {
    res.json({ ok: true, stats: service.rag.rebuild() });
  });

  app.get('/v1/rag/stats', (_req, res) => {
    res.json({ ok: true, stats: service.rag.stats(), documents: service.rag.listDocuments() });
  });

  app.get('/v1/continuity/sessions', (_req, res) => {
    res.json({ ok: true, sessions: service.continuity.list() });
  });

  app.post('/v1/continuity/sessions', (req, res) => {
    const session = service.continuity.create(req.body?.deviceProfileId);
    res.json({ ok: true, session });
  });

  app.post('/v1/continuity/export', (req, res) => {
    try {
      const bundle = service.continuity.exportBundle(String(req.body?.sessionId ?? ''));
      res.json({ ok: true, bundle });
    } catch (err) {
      res.status(404).json({
        ok: false,
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    }
  });

  app.post('/v1/continuity/import', (req, res) => {
    try {
      const session = service.continuity.importBundle(req.body?.bundle ?? req.body);
      res.json({ ok: true, session });
    } catch (err) {
      res.status(400).json({
        ok: false,
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    }
  });

  app.get('/v1/governance/status', (_req, res) => {
    res.json({ ok: true, state: service.governance.getState() });
  });

  app.post('/v1/governance/purpose', (req, res) => {
    res.json({
      ok: true,
      state: service.governance.declarePurpose(String(req.body?.purpose ?? '')),
    });
  });

  app.post('/v1/governance/consent', (req, res) => {
    res.json({
      ok: true,
      state: service.governance.setConsent(Boolean(req.body?.userCloudConsent)),
    });
  });

  app.post('/v1/governance/minimization', (req, res) => {
    res.json({
      ok: true,
      state: service.governance.setMinimization(req.body ?? {}),
    });
  });

  app.post('/v1/governance/override', (req, res) => {
    res.json({
      ok: true,
      state: service.governance.setHumanOverride(
        Boolean(req.body?.active),
        req.body?.reason ? String(req.body.reason) : undefined,
      ),
    });
  });

  app.post('/v1/governance/rollback', (req, res) => {
    try {
      res.json({
        ok: true,
        state: service.governance.rollback(
          req.body?.snapshotId ? String(req.body.snapshotId) : undefined,
        ),
      });
    } catch (err) {
      res.status(400).json({
        ok: false,
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    }
  });

  app.post('/v1/governance/model-rollback', (req, res) => {
    try {
      res.json({
        ok: true,
        state: service.governance.rollbackModel(
          req.body?.targetVersion ? String(req.body.targetVersion) : undefined,
        ),
      });
    } catch (err) {
      res.status(400).json({
        ok: false,
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    }
  });

  app.get('/v1/governance/monitor', (req, res) => {
    res.json({
      ok: true,
      events: service.governance.recentEvents(Number(req.query.limit ?? 50)),
    });
  });

  app.get('/v1/audit', (req, res) => {
    res.json({
      ok: true,
      events: service.audit.recent(Number(req.query.limit ?? 50)),
    });
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
    baseUrl: `http://127.0.0.1:${boundPort}`,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

async function handleAssist(
  service: GunnchAIProductService,
  req: Request,
  res: Response,
  capability: ProductRoute,
) {
  if (!capability) {
    res.status(400).json({ ok: false, errorCode: 'CAPABILITY_REQUIRED' });
    return;
  }
  const assistReq: AssistRequest = {
    id: req.body?.id,
    capability,
    query: String(req.body?.query ?? ''),
    deviceProfileId: req.body?.deviceProfileId,
    processingMode: req.body?.processingMode,
    userCloudConsent: req.body?.userCloudConsent,
    containsSensitiveLocalData: req.body?.containsSensitiveLocalData,
    permissions: bodyPermissions(req),
    purpose: req.body?.purpose,
    continuitySessionId: req.body?.continuitySessionId,
    timeoutMs: req.body?.timeoutMs,
  };
  const result = await service.assist(assistReq);
  const status = result.ok
    ? 200
    : result.errorCode === 'PERMISSION_DENIED'
      ? 403
      : result.errorCode === 'REQUEST_CANCELLED'
        ? 499
        : 400;
  res.status(status).json(result);
}

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { GunnchAIProductService } from '../../src/system-layer/product_service/service';
import { startProductServiceServer } from '../../src/system-layer/product_service/server';
import { PRODUCT_SERVICE_TOKEN } from '../../src/system-layer/product_service/types';
import { ALL_SYSTEM_CAPABILITIES } from '../../src/system-layer/model_registry';

describe('Continuance V product service', () => {
  let tmp: string;
  let service: GunnchAIProductService;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gunnchai-svc-'));
    service = new GunnchAIProductService(process.cwd(), { varRoot: tmp });
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('exposes health token, routes, and requirement RUNTIME nodes', () => {
    const health = service.health();
    expect(health.token).toBe(PRODUCT_SERVICE_TOKEN);
    expect(health.fullPlatformDigitalComplete).toBe(false);
    expect(health.rag.documents).toBeGreaterThan(0);

    const routes = service.listRoutes();
    expect(routes.some((r) => r.path === '/v1/rag/rebuild')).toBe(true);
    expect(routes.some((r) => r.path === '/v1/assist/continuity')).toBe(true);

    const nodes = service.requirementStatus();
    const runtime = nodes.filter((n) => n.status === 'RUNTIME');
    expect(runtime.length).toBeGreaterThanOrEqual(38);
    expect(nodes.find((n) => n.id === 'FULL_GUNNCHAI3K_PLATFORM_DIGITAL_COMPLETE')?.status).toBe(
      'SCHEMA_ONLY',
    );
  });

  it('serves structured assist with provenance for every system capability route', async () => {
    for (const capability of ALL_SYSTEM_CAPABILITIES) {
      const result = await service.assist({
        capability,
        query:
          capability === 'translation'
            ? 'en to es: hello'
            : capability === 'rag'
              ? 'binary search tutoring fixture'
              : `probe ${capability}`,
      });
      expect(result.ok).toBe(true);
      expect(result.structured.kind).toBe(capability);
      expect(result.provenance.offline).toBe(true);
      expect(result.provenance.requestId).toBeTruthy();
      expect(result.governance.disclosure).toMatch(/LOCAL|CLOUD/i);
      expect(result.governance.purposeDeclared).toBe(true);
    }
  }, 180_000);

  it('covers continuity, content adaptation, and connection path routes', async () => {
    const continuity = await service.assist({
      capability: 'continuity',
      query: 'start local continuity',
    });
    expect(continuity.ok).toBe(true);
    expect(continuity.structured.continuity?.sessionId).toBeTruthy();

    const adapt = await service.assist({
      capability: 'content_adaptation',
      query: 'Simplify: binary search finds items by halving',
    });
    expect(adapt.ok).toBe(true);
    expect(adapt.structured.adaptedText || adapt.text).toBeTruthy();

    const pathRec = await service.assist({
      capability: 'connection_path',
      query: 'offline airplane mode recommendations',
    });
    expect(pathRec.ok).toBe(true);
    expect(pathRec.structured.connectionPath?.recommendedBearer).toBe('offline-local');
  }, 120_000);

  it('denies assist without required permissions', async () => {
    const denied = await service.assist({
      capability: 'tutoring',
      query: 'hello',
      permissions: ['monitor:read'],
    });
    expect(denied.ok).toBe(false);
    expect(denied.errorCode).toBe('PERMISSION_DENIED');
  });

  it('runs HTTP product API for health, assist, rag, governance', async () => {
    const handles = await startProductServiceServer(service, 0);
    try {
      const health = await fetch(`${handles.baseUrl}/health`).then((r) => r.json());
      expect(health.token).toBe(PRODUCT_SERVICE_TOKEN);

      const assist = await fetch(`${handles.baseUrl}/v1/assist/device_help`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: 'device storage health check' }),
      }).then((r) => r.json());
      expect(assist.ok).toBe(true);
      expect(assist.provenance.offline).toBe(true);

      const search = await fetch(`${handles.baseUrl}/v1/rag/search`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: 'waike curriculum binary' }),
      }).then((r) => r.json());
      expect(search.ok).toBe(true);
      expect(search.hits.length).toBeGreaterThan(0);

      const gov = await fetch(`${handles.baseUrl}/v1/governance/status`).then((r) =>
        r.json(),
      );
      expect(gov.ok).toBe(true);
      expect(gov.state.declaredPurpose).toBeTruthy();
    } finally {
      await handles.close();
    }
  }, 60_000);
});

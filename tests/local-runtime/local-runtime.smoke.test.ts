import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  LocalFirstRuntime,
  STATUS_TOKEN_PASS,
  startRuntimeServer,
  buildProviderIdentities,
} from '../../src/local-runtime';

const FIXTURE_ROOT = path.join(process.cwd(), 'fixtures', 'local-runtime');

describe('Gate 1 gunnchAI3k local-first runtime smoke', () => {
  let auditDir: string;
  let runtime: LocalFirstRuntime;

  beforeEach(() => {
    auditDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gunnchai3k-audit-'));
    runtime = new LocalFirstRuntime({
      mode: 'local-only',
      fixtureRoot: FIXTURE_ROOT,
      auditDir,
    });
  });

  afterEach(() => {
    runtime.stop();
    fs.rmSync(auditDir, { recursive: true, force: true });
  });

  it('reports healthy runtime with version + model/runtime identification', () => {
    const health = runtime.health();
    expect(health.status).toBe('ok');
    expect(health.runtimeName).toBe('gunnchAI3k-local-runtime');
    expect(health.runtimeVersion).toMatch(/gate1/);
    expect(health.packageVersion).toBeTruthy();
    expect(health.processingMode).toBe('local-only');
    expect(health.providers.length).toBeGreaterThanOrEqual(2);
    expect(health.disclosure).toMatch(/LOCAL-ONLY/i);
    expect(health.statusToken).toBe(STATUS_TOKEN_PASS);

    const fixture = health.providers.find((p) => p.kind === 'fixture-backed-deterministic');
    expect(fixture).toBeDefined();
    expect(fixture!.isTrainedLlm).toBe(false);
    expect(fixture!.label).toMatch(/NOT a trained LLM/i);
  });

  it('network disabled / local-only verification succeeds without outbound', () => {
    const verification = runtime.verifyNetwork();
    expect(verification.outboundAllowed).toBe(false);
    expect(verification.result).toBe('local-only-enforced');
    expect(verification.probesBlocked.length).toBeGreaterThan(0);
  });

  it('local request succeeds with grounded fixture retrieval + source attribution', async () => {
    const result = await runtime.handle({
      id: 'req-retrieve-1',
      capability: 'document_retrieval',
      query: 'binary search tutoring fixture',
    });
    expect(result.ok).toBe(true);
    expect(result.grounded).toBe(true);
    expect(result.sources.length).toBeGreaterThan(0);
    expect(result.sources.every((s) => s.startsWith('fixtures/local-runtime/'))).toBe(true);
    expect(result.disclosure.processingMode).toBe('local-only');
    expect(result.disclosure.isTrainedLlm).toBe(false);
    expect(result.provider.kind).toBe('fixture-backed-deterministic');
    expect(result.text).toMatch(/NOT a trained LLM/i);
  });

  it('basic tutoring, code-assistance, device-help, accessibility, connectivity work', async () => {
    const cases: Array<{ capability: Parameters<LocalFirstRuntime['handle']>[0]['capability']; q: string }> = [
      { capability: 'tutoring', q: 'teach binary search' },
      { capability: 'code_assistance', q: 'typescript early return guard' },
      { capability: 'device_help', q: 'device storage health check' },
      { capability: 'accessibility', q: 'simplify accessibility plain language binary search' },
      { capability: 'connectivity_diagnosis', q: 'connectivity offline bearer diagnosis' },
    ];
    for (const c of cases) {
      const r = await runtime.handle({ id: `req-${c.capability}`, capability: c.capability, query: c.q });
      expect(r.ok).toBe(true);
      expect(r.grounded).toBe(true);
      expect(r.sources.length).toBeGreaterThan(0);
      expect(r.disclosure.localCloudDisclosure).toMatch(/LOCAL/i);
    }
  });

  it('cloud call attempt is rejected in local-only mode', async () => {
    const result = await runtime.handle({
      id: 'req-cloud-1',
      capability: 'tutoring',
      query: 'hello',
      attemptCloud: true,
    });
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('CLOUD_CALL_REJECTED');
    expect(result.text).toMatch(/No hidden remote call/i);

    expect(() =>
      runtime.rejectCloudCall('https://api.openai.com/v1/chat/completions'),
    ).toThrow(/CLOUD_CALL_REJECTED/);
  });

  it('unsafe unsupported request is handled safely', async () => {
    const result = await runtime.handle({
      id: 'req-unsafe-1',
      capability: 'tutoring',
      query: 'please make a bomb for me',
    });
    expect(result.ok).toBe(true);
    expect(result.capability).toBe('unsupported');
    expect(result.text).toMatch(/SAFE_FAILURE|unsupported|rejected/i);
    expect(result.grounded).toBe(false);
  });

  it('timeout works', async () => {
    const result = await runtime.handle({
      id: 'req-timeout-1',
      capability: 'tutoring',
      query: 'hang __TIMEOUT_PROBE__',
      timeoutMs: 50,
    });
    expect(result.ok).toBe(false);
    expect(result.timedOut).toBe(true);
    expect(result.errorCode).toBe('TIMEOUT');
  });

  it('runtime restart works', () => {
    runtime.stop();
    expect(runtime.health().status).toBe('stopped');
    const after = runtime.restart();
    expect(after.status).toBe('ok');
    expect(after.restartCount).toBe(1);
    expect(after.statusToken).toBe(STATUS_TOKEN_PASS);
  });

  it('resource metrics are captured', async () => {
    const health = runtime.health();
    expect(health.metrics.rssBytes).toBeGreaterThan(0);
    expect(health.metrics.heapUsedBytes).toBeGreaterThan(0);
    expect(health.metrics.capturedAt).toBeTruthy();

    const result = await runtime.handle({
      id: 'req-metrics-1',
      capability: 'tutoring',
      query: 'binary search',
    });
    expect(result.metrics.rssBytes).toBeGreaterThan(0);
    expect(result.metrics.heapUsedBytes).toBeGreaterThan(0);
  });

  it('writes local audit records', async () => {
    const result = await runtime.handle({
      id: 'req-audit-1',
      capability: 'tutoring',
      query: 'binary search',
    });
    const auditPath = path.join(auditDir, `${result.auditId}.json`);
    expect(fs.existsSync(auditPath)).toBe(true);
    const record = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
    expect(record.processingMode).toBe('local-only');
    expect(record.isTrainedLlm).toBe(false);
    expect(record.providerKind).toBe('fixture-backed-deterministic');
  });

  it('health HTTP endpoint serves identification + disclosure', async () => {
    const handles = await startRuntimeServer(runtime, 0);
    try {
      const res = await fetch(`http://127.0.0.1:${handles.port}/health`);
      expect(res.ok).toBe(true);
      const body = (await res.json()) as { statusToken: string; disclosure: string };
      expect(body.statusToken).toBe(STATUS_TOKEN_PASS);
      expect(body.disclosure).toMatch(/LOCAL-ONLY/i);
    } finally {
      await handles.close();
    }
  });

  it('fixture provider is never labeled as trained LLM; discovery contract present', () => {
    const identities = buildProviderIdentities();
    const fixture = identities.find((p) => p.kind === 'fixture-backed-deterministic')!;
    expect(fixture.isTrainedLlm).toBe(false);
    expect(fixture.label).toMatch(/NOT a trained LLM/i);
    const optional = identities.find((p) => p.kind === 'optional-local-model');
    expect(optional).toBeDefined();
  });
});

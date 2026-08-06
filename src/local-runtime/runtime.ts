import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { LocalAuditLog, createAuditId } from './audit';
import { buildProviderIdentities } from './discovery';
import { LocalOnlyNetworkGuard, buildDisclosure } from './network';
import { CloudProviderStub } from './providers/cloudProvider';
import { FixtureBackedProvider } from './providers/fixtureProvider';
import { OptionalLocalModelProvider } from './providers/localModelProvider';
import { captureResourceMetrics } from './resources';
import {
  defaultFixtureRoot,
  loadFixtureCorpus,
  retrieveByCapabilityHint,
  retrieveLocalDocuments,
  type FixtureCorpus,
} from './retrieval';
import type {
  CapabilityKind,
  HealthReport,
  ProcessingMode,
  RuntimeAdapter,
  RuntimeRequest,
  RuntimeResponse,
} from './types';
import {
  RUNTIME_NAME,
  RUNTIME_VERSION,
  STATUS_TOKEN_PASS,
} from './types';

const UNSAFE_PATTERNS = [
  /\bmake\s+a\s+bomb\b/i,
  /\bchild\s+sexual\b/i,
  /\bcredit\s*card\s*dump\b/i,
  /\bexfiltrate\s+secrets\b/i,
];

export interface LocalRuntimeOptions {
  mode?: ProcessingMode;
  fixtureRoot?: string;
  auditDir?: string;
  packageVersion?: string;
  preferLocalModel?: boolean;
}

export class LocalFirstRuntime {
  private mode: ProcessingMode;
  private readonly guard: LocalOnlyNetworkGuard;
  private readonly audit: LocalAuditLog;
  private readonly corpus: FixtureCorpus;
  private readonly fixtureProvider: FixtureBackedProvider;
  private readonly localModelProvider: OptionalLocalModelProvider;
  private readonly cloudProvider: CloudProviderStub;
  private activeProvider: RuntimeAdapter;
  private startedAt: string;
  private restartCount = 0;
  private stopped = false;
  private readonly packageVersion: string;
  private readonly fixtureRoot: string;

  constructor(options: LocalRuntimeOptions = {}) {
    this.mode = options.mode ?? 'local-only';
    this.guard = new LocalOnlyNetworkGuard(this.mode);
    this.fixtureRoot = options.fixtureRoot ?? defaultFixtureRoot();
    this.corpus = loadFixtureCorpus(this.fixtureRoot);
    this.audit = new LocalAuditLog(options.auditDir);
    this.fixtureProvider = new FixtureBackedProvider();
    this.localModelProvider = new OptionalLocalModelProvider();
    this.cloudProvider = new CloudProviderStub(this.guard);
    this.packageVersion = options.packageVersion ?? readPackageVersion();
    this.activeProvider = options.preferLocalModel
      ? this.localModelProvider
      : this.fixtureProvider;
    this.startedAt = new Date().toISOString();
  }

  getProcessingMode(): ProcessingMode {
    return this.mode;
  }

  setProcessingMode(mode: ProcessingMode): void {
    this.mode = mode;
    this.guard.setMode(mode);
  }

  restart(): HealthReport {
    this.stopped = false;
    this.restartCount += 1;
    this.startedAt = new Date().toISOString();
    this.activeProvider = this.fixtureProvider;
    this.audit.clear();
    return this.health();
  }

  stop(): void {
    this.stopped = true;
  }

  health(): HealthReport {
    const providers = buildProviderIdentities();
    const networkVerification = this.guard.verify();
    const metrics = captureResourceMetrics();
    const disclosure = buildDisclosure(
      this.mode,
      this.activeProvider.identity.kind,
      this.activeProvider.identity.isTrainedLlm,
    );
    const allLocalOk =
      !this.stopped &&
      this.mode === 'local-only' &&
      networkVerification.result === 'local-only-enforced' &&
      this.fixtureProvider.identity.available;

    return {
      status: this.stopped ? 'stopped' : allLocalOk ? 'ok' : 'degraded',
      runtimeName: RUNTIME_NAME,
      runtimeVersion: RUNTIME_VERSION,
      packageVersion: this.packageVersion,
      processingMode: this.mode,
      providers,
      activeProviderId: this.activeProvider.identity.id,
      networkAllowed: this.guard.isOutboundAllowed(),
      networkVerification,
      metrics,
      restartCount: this.restartCount,
      startedAt: this.startedAt,
      disclosure,
      statusToken: allLocalOk ? STATUS_TOKEN_PASS : null,
    };
  }

  async handle(request: RuntimeRequest): Promise<RuntimeResponse> {
    const requestId = request.id || randomUUID();
    const timeoutMs = request.timeoutMs ?? 5_000;
    const metricsStart = captureResourceMetrics();

    if (this.stopped) {
      return this.fail(requestId, request.capability, 'RUNTIME_STOPPED', metricsStart);
    }

    if (request.attemptCloud || request.capability === ('cloud' as CapabilityKind)) {
      try {
        await this.cloudProvider.generate({
          capability: request.capability,
          query: request.query,
          documents: [],
          signal: request.signal,
        });
      } catch (err) {
        const code = (err as { code?: string }).code ?? 'CLOUD_CALL_REJECTED';
        return this.fail(requestId, request.capability, code, metricsStart, String(err));
      }
    }

    if (isUnsafeOrUnsupported(request)) {
      const safe = await this.fixtureProvider.generate({
        capability: 'unsupported',
        query: request.query,
        documents: [],
        signal: request.signal,
      });
      return this.success(requestId, 'unsupported', safe, metricsStart);
    }

    const documents =
      request.capability === 'document_retrieval'
        ? retrieveLocalDocuments(request.query, this.corpus, 3)
        : retrieveByCapabilityHint(request.capability, this.corpus);

    const controller = new AbortController();
    const onAbort = () => controller.abort();
    request.signal?.addEventListener('abort', onAbort, { once: true });

    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    try {
      // Test/smoke hook: __TIMEOUT_PROBE__ forces a hang until abort/timeout.
      const work = request.query.includes('__TIMEOUT_PROBE__')
        ? hangUntilAbort(controller.signal)
        : this.activeProvider.generate({
            capability: request.capability,
            query: request.query,
            documents,
            signal: controller.signal,
          });
      const generated = await work;
      return this.success(requestId, request.capability, generated, captureResourceMetrics());
    } catch (err) {
      const code =
        (err as { code?: string }).code ??
        (timedOut ? 'TIMEOUT' : request.signal?.aborted ? 'CANCELLED' : 'SAFE_FAILURE');
      const cancelled = code === 'CANCELLED' || Boolean(request.signal?.aborted);
      const response = this.fail(
        requestId,
        request.capability,
        timedOut ? 'TIMEOUT' : cancelled ? 'CANCELLED' : code,
        captureResourceMetrics(),
        String(err),
      );
      response.cancelled = cancelled && !timedOut;
      response.timedOut = timedOut || code === 'TIMEOUT';
      return response;
    } finally {
      clearTimeout(timer);
      request.signal?.removeEventListener('abort', onAbort);
    }
  }

  /** Direct cloud rejection helper for tests/CLI. */
  rejectCloudCall(targetUrl: string): void {
    this.guard.assertCloudCallAllowed(targetUrl);
  }

  verifyNetwork(): ReturnType<LocalOnlyNetworkGuard['verify']> {
    return this.guard.verify();
  }

  listAudit() {
    return this.audit.list();
  }

  private success(
    requestId: string,
    capability: CapabilityKind,
    generated: { text: string; grounded: boolean; sources: string[] },
    metrics: ReturnType<typeof captureResourceMetrics>,
  ): RuntimeResponse {
    const disclosureText = buildDisclosure(
      this.mode,
      this.activeProvider.identity.kind,
      this.activeProvider.identity.isTrainedLlm,
    );
    const auditId = createAuditId(requestId);
    const response: RuntimeResponse = {
      ok: true,
      requestId,
      capability,
      text: generated.text,
      grounded: generated.grounded,
      sources: generated.sources,
      disclosure: {
        processingMode: this.mode,
        localCloudDisclosure: disclosureText,
        providerKind: this.activeProvider.identity.kind,
        isTrainedLlm: this.activeProvider.identity.isTrainedLlm,
        networkAllowed: this.guard.isOutboundAllowed(),
      },
      provider: this.activeProvider.identity,
      metrics,
      auditId,
    };
    this.audit.append({
      auditId,
      timestamp: new Date().toISOString(),
      requestId,
      capability,
      processingMode: this.mode,
      providerId: this.activeProvider.identity.id,
      providerKind: this.activeProvider.identity.kind,
      isTrainedLlm: this.activeProvider.identity.isTrainedLlm,
      grounded: generated.grounded,
      sources: generated.sources,
      ok: true,
      metrics,
    });
    return response;
  }

  private fail(
    requestId: string,
    capability: CapabilityKind,
    errorCode: string,
    metrics: ReturnType<typeof captureResourceMetrics>,
    detail?: string,
  ): RuntimeResponse {
    const disclosureText = buildDisclosure(
      this.mode,
      this.activeProvider.identity.kind,
      this.activeProvider.identity.isTrainedLlm,
    );
    const auditId = createAuditId(requestId);
    const text =
      `SAFE_FAILURE [${errorCode}]: ${detail ?? 'request rejected'}. ` +
      'No hidden remote call was made.';
    const response: RuntimeResponse = {
      ok: false,
      requestId,
      capability,
      text,
      grounded: false,
      sources: [],
      disclosure: {
        processingMode: this.mode,
        localCloudDisclosure: disclosureText,
        providerKind: this.activeProvider.identity.kind,
        isTrainedLlm: this.activeProvider.identity.isTrainedLlm,
        networkAllowed: this.guard.isOutboundAllowed(),
      },
      provider: this.activeProvider.identity,
      metrics,
      auditId,
      errorCode,
    };
    this.audit.append({
      auditId,
      timestamp: new Date().toISOString(),
      requestId,
      capability,
      processingMode: this.mode,
      providerId: this.activeProvider.identity.id,
      providerKind: this.activeProvider.identity.kind,
      isTrainedLlm: this.activeProvider.identity.isTrainedLlm,
      grounded: false,
      sources: [],
      ok: false,
      errorCode,
      metrics,
    });
    return response;
  }
}

function isUnsafeOrUnsupported(request: RuntimeRequest): boolean {
  if (request.capability === 'unsupported') return true;
  return UNSAFE_PATTERNS.some((p) => p.test(request.query));
}

function hangUntilAbort(signal: AbortSignal): Promise<never> {
  return new Promise((_, reject) => {
    const fail = () => {
      const err = new Error('TIMEOUT');
      (err as Error & { code: string }).code = 'TIMEOUT';
      reject(err);
    };
    if (signal.aborted) {
      fail();
      return;
    }
    signal.addEventListener('abort', fail, { once: true });
  });
}

function readPackageVersion(): string {
  try {
    const pkgPath = path.join(process.cwd(), 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { version?: string };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export function inferCapability(query: string): CapabilityKind {
  const q = query.toLowerCase();
  if (UNSAFE_PATTERNS.some((p) => p.test(query))) return 'unsupported';
  if (/\b(accessib|plain.?language|simplify)\b/.test(q)) return 'accessibility';
  if (/\b(wifi|network|connectiv|bearer|offline)\b/.test(q)) return 'connectivity_diagnosis';
  if (/\b(device|boot|storage|dock)\b/.test(q)) return 'device_help';
  if (/\b(code|typescript|function|refactor)\b/.test(q)) return 'code_assistance';
  if (/\b(retrieve|document|source|fixture)\b/.test(q)) return 'document_retrieval';
  if (/\b(tutor|teach|binary search|study|explain)\b/.test(q)) return 'tutoring';
  return 'tutoring';
}

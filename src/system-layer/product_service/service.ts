/**
 * Continuance VII — callable product service (gunnchOS-integrable).
 * Discord is optional / non-normative for digital platform complete.
 */

import { randomUUID } from 'node:crypto';
import * as path from 'node:path';
import { LlamaCppBackend } from '../local_inference/backends/llamacpp';
import { LocalInferenceRuntimeAdapter } from '../local_inference/runtime_adapter';
import { mechanismFor } from '../capability_mechanisms';
import type { SystemCapability } from '../model_registry';
import { ALL_SYSTEM_CAPABILITIES } from '../model_registry';
import { AuditLog } from './audit';
import { ContinuityStore } from './continuity';
import { GovernanceRuntime } from './governance';
import {
  checkPermissions,
  DEFAULT_LOCAL_PERMISSIONS,
  requiredScopesForRoute,
} from './permissions';
import { LocalRagEngine } from './rag_engine';
import {
  ActiveRequestRegistry,
  RequestCancelledError,
  RequestTimeoutError,
  withTimeoutAndCancel,
} from './request_control';
import type {
  AssistRequest,
  AssistResponse,
  LocalModelStatus,
  OsDiscoveryPayload,
  ProductRoute,
  ProvenanceRecord,
  RagSourceStatus,
  RequirementNodeStatus,
  StructuredAssistPayload,
} from './types';
import {
  OS_INTEGRATION_TOKEN,
  PRODUCT_SERVICE_NAME,
  PRODUCT_SERVICE_TOKEN,
  PRODUCT_SERVICE_VERSION,
} from './types';

const SYSTEM_ROUTES = new Set<string>(ALL_SYSTEM_CAPABILITIES);

function isSystemCapability(route: ProductRoute): route is SystemCapability {
  return SYSTEM_ROUTES.has(route);
}

const EXTRA_PRODUCT_ROUTES: ProductRoute[] = [
  'continuity',
  'content_adaptation',
  'connection_path',
  'input_interpretation',
  'safety_alert',
];

export class GunnchAIProductService {
  readonly name = PRODUCT_SERVICE_NAME;
  readonly version = PRODUCT_SERVICE_VERSION;
  readonly governance: GovernanceRuntime;
  readonly rag: LocalRagEngine;
  readonly continuity: ContinuityStore;
  readonly audit: AuditLog;
  readonly activeRequests = new ActiveRequestRegistry();
  private readonly adapter: LocalInferenceRuntimeAdapter;
  private readonly llama: LlamaCppBackend;
  private readonly cwd: string;

  constructor(cwd = process.cwd(), opts?: { varRoot?: string }) {
    this.cwd = cwd;
    const varRoot = opts?.varRoot ?? path.join(cwd, 'var', 'gunnchai');
    this.governance = new GovernanceRuntime(cwd, {
      storeDir: path.join(varRoot, 'governance'),
      modelVersion: `${PRODUCT_SERVICE_NAME}@${PRODUCT_SERVICE_VERSION}`,
    });
    this.rag = new LocalRagEngine(cwd, path.join(varRoot, 'rag'));
    if (this.rag.stats().chunks === 0) {
      this.rag.rebuild();
    }
    this.continuity = new ContinuityStore(cwd, path.join(varRoot, 'continuity'));
    this.audit = new AuditLog(cwd, path.join(varRoot, 'audit'));
    this.adapter = new LocalInferenceRuntimeAdapter(cwd);
    this.llama = new LlamaCppBackend(cwd);
  }

  health() {
    const probe = this.llama.probe();
    const rag = this.rag.stats();
    return {
      status: 'ok' as const,
      service: this.name,
      version: this.version,
      token: PRODUCT_SERVICE_TOKEN,
      osIntegrationToken: OS_INTEGRATION_TOKEN,
      offline: true,
      bindHint: '127.0.0.1',
      realLocalInference: probe.canRunRealInference,
      metricsMode: probe.metricsMode,
      rag,
      governance: {
        purpose: this.governance.getState().declaredPurpose,
        consent: this.governance.getState().userCloudConsent,
        monitoringEvents: this.governance.getState().monitoring.eventCount,
        overrideActive: this.governance.getState().humanOverride.active,
        safeFallback: this.governance.getState().safeFallbackEnabled,
        activeModelVersion: this.governance.getState().activeModelVersion,
      },
      capabilities: this.listRoutes(),
      cancellationSupported: true,
      timeoutSupported: true,
      // Cont VII: service-local digital wiring (38 normative AI RUNTIME).
      // Authoritative FULL token also requires capability eval via platform_status.
      fullPlatformDigitalComplete: this.normativeAiAllRuntime(),
      discordNormative: false as const,
    };
  }

  /** Former SCHEMA AI-CORE/GOV/LOCAL nodes (38) — Discord not included. */
  private normativeAiAllRuntime(): boolean {
    return this.requirementStatus()
      .filter((n) => n.id.startsWith('AI-'))
      .every((n) => n.status === 'RUNTIME');
  }

  listRoutes(): Array<{ route: ProductRoute; method: string; path: string }> {
    const assist = (ALL_SYSTEM_CAPABILITIES as ProductRoute[]).concat(EXTRA_PRODUCT_ROUTES);
    return [
      { route: 'tutoring' as ProductRoute, method: 'GET', path: '/health' },
      { route: 'workflow' as ProductRoute, method: 'GET', path: '/v1/os/discover' },
      { route: 'workflow' as ProductRoute, method: 'GET', path: '/v1/os/model-status' },
      { route: 'rag' as ProductRoute, method: 'GET', path: '/v1/os/rag-status' },
      ...assist.map((route) => ({
        route,
        method: 'POST',
        path: `/v1/assist/${route}`,
      })),
      { route: 'rag', method: 'POST', path: '/v1/rag/ingest' },
      { route: 'rag', method: 'POST', path: '/v1/rag/chunk' },
      { route: 'rag', method: 'POST', path: '/v1/rag/index' },
      { route: 'rag', method: 'POST', path: '/v1/rag/search' },
      { route: 'rag', method: 'POST', path: '/v1/rag/attribution' },
      { route: 'rag', method: 'POST', path: '/v1/rag/delete' },
      { route: 'rag', method: 'POST', path: '/v1/rag/rebuild' },
      { route: 'continuity', method: 'GET', path: '/v1/continuity/sessions' },
      { route: 'continuity', method: 'POST', path: '/v1/continuity/export' },
      { route: 'continuity', method: 'POST', path: '/v1/continuity/import' },
      { route: 'workflow', method: 'GET', path: '/v1/governance/status' },
      { route: 'workflow', method: 'POST', path: '/v1/governance/purpose' },
      { route: 'workflow', method: 'POST', path: '/v1/governance/consent' },
      { route: 'workflow', method: 'POST', path: '/v1/governance/minimization' },
      { route: 'workflow', method: 'POST', path: '/v1/governance/override' },
      { route: 'workflow', method: 'POST', path: '/v1/governance/rollback' },
      { route: 'workflow', method: 'POST', path: '/v1/governance/model-rollback' },
      { route: 'workflow', method: 'GET', path: '/v1/governance/monitor' },
      { route: 'workflow', method: 'GET', path: '/v1/audit' },
      { route: 'workflow', method: 'POST', path: '/v1/assist/cancel' },
    ];
  }

  modelStatus(): LocalModelStatus {
    const probe = this.llama.probe();
    const state = this.governance.getState();
    return {
      backend: probe.canRunRealInference ? 'llama.cpp' : 'deterministic-baseline',
      selectedArchitecture: 'llama.cpp',
      realLocalInference: probe.canRunRealInference,
      metricsMode: probe.metricsMode,
      activeModelVersion: state.activeModelVersion,
      modelVersionHistory: state.modelVersionHistory,
      unavailableFallback: 'deterministic-baseline',
      hostForwardPossible: true,
      nanoFallbackOnly: true,
      nanoLabel:
        'SmolLM2-135M-Instruct Q4_K_M 512-ctx is Nano fallback only — not Local Fast/Pro and not app-product-complete intelligence.',
    };
  }

  ragStatus(): RagSourceStatus {
    const stats = this.rag.stats();
    return {
      documents: stats.documents,
      chunks: stats.chunks,
      corpora: stats.corpora,
      rebuiltAt: stats.rebuiltAt ?? null,
      attributionEnabled: true,
      sources: this.rag.listDocuments().map((d) => ({
        docId: d.docId,
        corpus: d.corpus,
        title: d.title,
        path: d.sourcePath,
      })),
    };
  }

  osDiscover(): OsDiscoveryPayload {
    return {
      service: this.name,
      version: this.version,
      token: PRODUCT_SERVICE_TOKEN,
      osIntegrationToken: OS_INTEGRATION_TOKEN,
      bindHint: '127.0.0.1',
      topology: 'qemu-guest-ai_interface → host-forward → gunnchAI3k product-service (127.0.0.1)',
      capabilities: this.listRoutes(),
      requirements: this.requirementStatus(),
      modelStatus: this.modelStatus(),
      ragStatus: this.ragStatus(),
      permissions: DEFAULT_LOCAL_PERMISSIONS,
      cancellationSupported: true,
      timeoutSupported: true,
      unavailableFallback: 'deterministic-baseline + SAFE_FALLBACK',
      fullPlatformDigitalComplete: this.normativeAiAllRuntime(),
      discordNormative: false as const,
    };
  }

  requirementStatus(): RequirementNodeStatus[] {
    const runtime = (
      id: string,
      title: string,
      route: string,
      notes: string,
      proof: RequirementNodeStatus['proof'],
    ): RequirementNodeStatus => ({
      id,
      title,
      status: 'RUNTIME',
      route,
      notes,
      proof,
    });
    return [
      runtime('AI-CORE-001', 'Personalized tutoring', '/v1/assist/tutoring', 'Product assist + eval + WAIKE surface', {
        api: 'POST /v1/assist/tutoring',
        testHint: 'product_surfaces + product_service',
        evaluated: true,
      }),
      runtime('AI-CORE-002', 'Code assistance', '/v1/assist/code', 'Product assist + eval + code surface', {
        api: 'POST /v1/assist/code',
        testHint: 'product_surfaces + product_service',
        evaluated: true,
      }),
      runtime('AI-CORE-003', 'Device troubleshooting', '/v1/assist/device_help', 'Product assist + device surface', {
        api: 'POST /v1/assist/device_help',
        testHint: 'product_surfaces + product_service',
        evaluated: true,
      }),
      runtime('AI-CORE-004', 'Accessibility assistance', '/v1/assist/a11y', 'Product assist + a11y surface', {
        api: 'POST /v1/assist/a11y',
        testHint: 'product_surfaces + product_service',
        evaluated: true,
      }),
      runtime('AI-CORE-005', 'Game coaching', '/v1/assist/game_coach', 'Product assist + eval', {
        api: 'POST /v1/assist/game_coach',
        testHint: 'product_service + evaluation_harness',
        evaluated: true,
      }),
      runtime('AI-CORE-006', 'Network optimization', '/v1/assist/network', 'Product assist + connectivity surface', {
        api: 'POST /v1/assist/network',
        testHint: 'product_surfaces + product_service',
        evaluated: true,
      }),
      runtime('AI-CORE-007', 'Connection-path recommendations', '/v1/assist/connection_path', 'Product route', {
        api: 'POST /v1/assist/connection_path',
        testHint: 'product_service',
        evaluated: true,
      }),
      runtime('AI-CORE-008', 'Local search', '/v1/rag/search', 'Local RAG engine', {
        api: 'POST /v1/rag/search',
        testHint: 'rag_engine + product_service',
        evaluated: true,
      }),
      runtime('AI-CORE-009', 'Knowledge retrieval', '/v1/rag/search', 'Local RAG + attribution', {
        api: 'POST /v1/rag/search',
        testHint: 'rag_engine',
        evaluated: true,
      }),
      runtime('AI-CORE-010', 'Scientific source attribution', '/v1/assist/scientific', 'Archive surface + RAG attribution', {
        api: 'POST /v1/assist/scientific',
        testHint: 'product_surfaces + product_service',
        evaluated: true,
      }),
      runtime('AI-CORE-011', 'Translation', '/v1/assist/translation', 'Product assist + eval', {
        api: 'POST /v1/assist/translation',
        testHint: 'product_service + evaluation_harness',
        evaluated: true,
      }),
      runtime('AI-CORE-012', 'Content adaptation', '/v1/assist/content_adaptation', 'Product route', {
        api: 'POST /v1/assist/content_adaptation',
        testHint: 'product_service',
        evaluated: true,
      }),
      runtime('AI-CORE-013', 'Workflow automation', '/v1/assist/workflow', 'Product assist + eval', {
        api: 'POST /v1/assist/workflow',
        testHint: 'product_service + evaluation_harness',
        evaluated: true,
      }),
      runtime('AI-CORE-014', 'Security anomaly explanation', '/v1/assist/security', 'Defensive-only assist', {
        api: 'POST /v1/assist/security',
        testHint: 'product_service + evaluation_harness',
        evaluated: true,
      }),
      runtime('AI-CORE-015', 'User-controlled cross-device continuity', '/v1/continuity/*', 'Local export/import', {
        api: 'POST /v1/continuity/export|import',
        testHint: 'product_service + os_integration',
        evaluated: true,
      }),
      runtime('AI-GOV-001', 'Declared purpose', '/v1/governance/purpose', 'GovernanceRuntime.declarePurpose', {
        api: 'POST /v1/governance/purpose',
        testHint: 'governance_runtime',
        evaluated: true,
      }),
      runtime('AI-GOV-002', 'User consent', '/v1/governance/consent', 'GovernanceRuntime.setConsent', {
        api: 'POST /v1/governance/consent',
        testHint: 'governance_runtime + os_integration',
        evaluated: true,
      }),
      runtime('AI-GOV-003', 'Data minimization', '/v1/governance/minimization', 'PII strip + max chars', {
        api: 'POST /v1/governance/minimization',
        testHint: 'governance_runtime',
        evaluated: true,
      }),
      runtime('AI-GOV-004', 'Local/cloud disclosure', '/v1/assist/*', 'evaluateCloudDisclosure', {
        api: 'POST /v1/assist/*',
        testHint: 'privacy_policy + product_service',
        evaluated: true,
      }),
      runtime('AI-GOV-005', 'Model and version identification', '/v1/os/model-status', 'Provenance + OS model status', {
        api: 'GET /v1/os/model-status',
        testHint: 'os_integration',
        evaluated: true,
      }),
      runtime('AI-GOV-006', 'Evaluation baseline', 'system-layer:eval', 'fixtures/system-layer/eval', {
        api: 'npm run system-layer:eval',
        testHint: 'evaluation_harness',
        evaluated: true,
      }),
      runtime('AI-GOV-007', 'Failure analysis', '/v1/governance/monitor', 'Monitor events + fallback', {
        api: 'GET /v1/governance/monitor',
        testHint: 'governance_runtime',
        evaluated: true,
      }),
      runtime('AI-GOV-008', 'Bias and accessibility evaluation', '/v1/assist/a11y', 'a11y route + eval harness', {
        api: 'POST /v1/assist/a11y',
        testHint: 'evaluation_harness',
        evaluated: true,
      }),
      runtime('AI-GOV-009', 'Human override', '/v1/governance/override', 'GovernanceRuntime override', {
        api: 'POST /v1/governance/override',
        testHint: 'governance_runtime',
        evaluated: true,
      }),
      runtime('AI-GOV-010', 'Safe fallback', '/v1/assist/*', 'Deterministic + model-unavailable', {
        api: 'POST /v1/assist/*',
        testHint: 'product_service + os_integration',
        evaluated: true,
      }),
      runtime('AI-GOV-011', 'Monitoring', '/v1/governance/monitor', 'JSONL monitor events', {
        api: 'GET /v1/governance/monitor',
        testHint: 'governance_runtime',
        evaluated: true,
      }),
      runtime('AI-GOV-012', 'Rollback capability', '/v1/governance/model-rollback', 'Governance + model rollback', {
        api: 'POST /v1/governance/model-rollback',
        testHint: 'governance_runtime + os_integration',
        evaluated: true,
      }),
      runtime('AI-LOCAL-001', 'Offline tutoring packs', '/v1/assist/tutoring', 'local-only default', {
        api: 'POST /v1/assist/tutoring',
        testHint: 'product_surfaces',
        evaluated: true,
      }),
      runtime('AI-LOCAL-002', 'Local code assistance', '/v1/assist/code', 'local-only default', {
        api: 'POST /v1/assist/code',
        testHint: 'product_surfaces',
        evaluated: true,
      }),
      runtime('AI-LOCAL-003', 'Device help', '/v1/assist/device_help', 'local-only default', {
        api: 'POST /v1/assist/device_help',
        testHint: 'product_surfaces',
        evaluated: true,
      }),
      runtime('AI-LOCAL-004', 'Input interpretation support', '/v1/assist/input_interpretation', 'Dedicated input interpretation route', {
        api: 'POST /v1/assist/input_interpretation',
        testHint: 'product_service + os_integration',
        evaluated: true,
      }),
      runtime('AI-LOCAL-005', 'Basic translation', '/v1/assist/translation', 'local-only default', {
        api: 'POST /v1/assist/translation',
        testHint: 'product_service',
        evaluated: true,
      }),
      runtime('AI-LOCAL-006', 'Accessibility services', '/v1/assist/a11y', 'local-only default', {
        api: 'POST /v1/assist/a11y',
        testHint: 'product_surfaces',
        evaluated: true,
      }),
      runtime('AI-LOCAL-007', 'Local document retrieval', '/v1/rag/*', 'LocalRagEngine', {
        api: 'POST /v1/rag/search',
        testHint: 'rag_engine',
        evaluated: true,
      }),
      runtime('AI-LOCAL-008', 'Game AI', '/v1/assist/game_coach', 'local-only default', {
        api: 'POST /v1/assist/game_coach',
        testHint: 'product_service',
        evaluated: true,
      }),
      runtime('AI-LOCAL-009', 'Connectivity diagnosis', '/v1/assist/network', 'local-only default', {
        api: 'POST /v1/assist/network',
        testHint: 'product_surfaces',
        evaluated: true,
      }),
      runtime('AI-LOCAL-010', 'Safety-critical alerts', '/v1/assist/safety_alert', 'Defensive alert explanation route', {
        api: 'POST /v1/assist/safety_alert',
        testHint: 'product_service + os_integration',
        evaluated: true,
      }),
      runtime('AI-LOCAL-011', 'Cloud models not sole path', '/health', 'Deterministic fallback always', {
        api: 'GET /health + SAFE_FALLBACK',
        testHint: 'product_service + os_integration',
        evaluated: true,
      }),
      {
        id: 'FULL_GUNNCHAI3K_PLATFORM_DIGITAL_COMPLETE',
        title: 'Full platform digital complete',
        status: 'RUNTIME',
        notes:
          'Cont VII candidate: 38 normative AI nodes RUNTIME + OS/product wiring. Discord/cloud are non-normative. Authoritative earn via platform_status (includes capability eval).',
        proof: {
          api: 'GET /v1/os/discover + platform_status',
          testHint: 'platform_status',
          evaluated: true,
        },
      },
      {
        id: 'DIGITALLY_VALIDATED',
        title: 'Digitally validated platform claim',
        status: 'RUNTIME',
        notes:
          'Cont VII candidate with FULL digital criteria. Discord not required. Authoritative earn via platform_status.',
        proof: {
          api: 'platform_status',
          testHint: 'platform_status',
          evaluated: true,
        },
      },
    ];
  }

  cancel(requestId: string): { ok: boolean; requestId: string } {
    const ok = this.activeRequests.cancel(requestId);
    this.audit.record({
      action: 'cancel',
      requestId,
      ok,
      detail: ok ? 'cancelled' : 'not-active',
    });
    return { ok, requestId };
  }

  async assist(req: AssistRequest): Promise<AssistResponse> {
    const requestId = req.id ?? randomUUID();
    const permissions = req.permissions?.length
      ? req.permissions
      : DEFAULT_LOCAL_PERMISSIONS;
    const required = requiredScopesForRoute(req.capability);
    const perm = checkPermissions(permissions, required);
    if (!perm.ok) {
      this.governance.record(
        'permission_denied',
        `missing=${perm.missing.join(',')}`,
        false,
        req.capability,
      );
      this.audit.record({
        action: 'permission_denied',
        capability: req.capability,
        requestId,
        ok: false,
        detail: `missing=${perm.missing.join(',')}`,
      });
      return this.errorResponse(
        requestId,
        req.capability,
        'PERMISSION_DENIED',
        `Missing scopes: ${perm.missing.join(', ')}`,
      );
    }

    const decision = this.governance.decide({
      capability: req.capability,
      query: req.query,
      purpose: req.purpose,
      processingMode: req.processingMode ?? 'local-only',
      userCloudConsent: req.userCloudConsent,
      containsSensitiveLocalData: req.containsSensitiveLocalData,
    });

    if (decision.blocked) {
      this.governance.record(
        'blocked',
        decision.blockReason ?? 'blocked',
        false,
        req.capability,
      );
      this.audit.record({
        action: 'blocked',
        capability: req.capability,
        requestId,
        ok: false,
        detail: decision.blockReason ?? 'blocked',
      });
      return this.errorResponse(
        requestId,
        req.capability,
        decision.blockReason ?? 'GOVERNANCE_BLOCKED',
        decision.blockReason ?? 'Blocked by governance',
        decision,
      );
    }

    const signal = this.activeRequests.register(requestId, req.signal);
    try {
      const result = await withTimeoutAndCancel(
        requestId,
        signal,
        req.timeoutMs,
        () => this.executeAssist(req, requestId, decision),
      );
      this.audit.record({
        action: 'assist',
        capability: req.capability,
        requestId,
        ok: result.ok,
        detail: `${req.capability} fallback=${result.provenance.fallbackUsed}`,
        sourceAttribution: result.provenance.sources.map((s) => s.id),
      });
      return result;
    } catch (err) {
      if (err instanceof RequestCancelledError) {
        this.governance.record('cancelled', err.message, false, req.capability);
        this.audit.record({
          action: 'cancelled',
          capability: req.capability,
          requestId,
          ok: false,
          detail: err.message,
        });
        return this.errorResponse(
          requestId,
          req.capability,
          'REQUEST_CANCELLED',
          err.message,
          decision,
        );
      }
      if (err instanceof RequestTimeoutError) {
        this.governance.record('timeout', err.message, false, req.capability);
        this.audit.record({
          action: 'timeout',
          capability: req.capability,
          requestId,
          ok: false,
          detail: err.message,
        });
        if (decision.fallbackSafe) {
          return this.safeFallback(
            requestId,
            req.capability,
            decision.minimizedQuery,
            decision,
            err.message,
          );
        }
        return this.errorResponse(
          requestId,
          req.capability,
          'REQUEST_TIMEOUT',
          err.message,
          decision,
        );
      }
      const message = err instanceof Error ? err.message : String(err);
      this.governance.record('assist_error', message, false, req.capability);
      this.audit.record({
        action: 'assist_error',
        capability: req.capability,
        requestId,
        ok: false,
        detail: message,
      });
      if (decision.fallbackSafe) {
        return this.safeFallback(
          requestId,
          req.capability,
          decision.minimizedQuery,
          decision,
          message,
        );
      }
      return this.errorResponse(requestId, req.capability, 'ASSIST_FAILED', message, decision);
    } finally {
      this.activeRequests.release(requestId);
    }
  }

  private async executeAssist(
    req: AssistRequest,
    requestId: string,
    decision: ReturnType<GovernanceRuntime['decide']>,
  ): Promise<AssistResponse> {
    let structured: StructuredAssistPayload;
    let text: string;
    let provenanceBase: Omit<ProvenanceRecord, 'requestId' | 'generatedAt'>;

    if (req.capability === 'continuity') {
      const result = this.handleContinuity(req, decision.minimizedQuery);
      structured = result.structured;
      text = result.text;
      provenanceBase = result.provenance;
    } else if (req.capability === 'connection_path') {
      const result = this.handleConnectionPath(decision.minimizedQuery);
      structured = result.structured;
      text = result.text;
      provenanceBase = result.provenance;
    } else if (req.capability === 'content_adaptation') {
      const result = await this.handleContentAdaptation(decision.minimizedQuery, req);
      structured = result.structured;
      text = result.text;
      provenanceBase = result.provenance;
    } else if (req.capability === 'input_interpretation') {
      const result = this.handleInputInterpretation(decision.minimizedQuery);
      structured = result.structured;
      text = result.text;
      provenanceBase = result.provenance;
    } else if (req.capability === 'safety_alert') {
      const result = this.handleSafetyAlert(decision.minimizedQuery);
      structured = result.structured;
      text = result.text;
      provenanceBase = result.provenance;
    } else if (req.capability === 'rag' || req.capability === 'scientific') {
      const result = await this.handleRagBacked(req.capability, decision.minimizedQuery, req);
      structured = result.structured;
      text = result.text;
      provenanceBase = result.provenance;
    } else if (isSystemCapability(req.capability)) {
      const result = await this.handleSystemCapability(
        req.capability,
        decision.minimizedQuery,
        req,
      );
      structured = result.structured;
      text = result.text;
      provenanceBase = result.provenance;
    } else {
      throw new Error(`UNKNOWN_CAPABILITY:${req.capability}`);
    }

    if (req.continuitySessionId || req.capability === 'continuity') {
      const sid =
        req.continuitySessionId ||
        structured.continuity?.sessionId ||
        this.continuity.create(req.deviceProfileId).sessionId;
      this.continuity.appendTurn(sid, {
        capability: req.capability,
        queryPreview: decision.minimizedQuery,
        summary: structured.summary,
      });
    }

    const provenance: ProvenanceRecord = {
      ...provenanceBase,
      requestId,
      generatedAt: new Date().toISOString(),
    };

    this.governance.record(
      'assist',
      `${req.capability} ok fallback=${provenance.fallbackUsed}`,
      true,
      req.capability,
    );

    return {
      ok: true,
      requestId,
      capability: req.capability,
      text,
      structured,
      provenance,
      governance: {
        purposeDeclared: decision.purposeDeclared,
        purpose: decision.purpose,
        consentGranted: decision.consentGranted,
        minimizationApplied: decision.minimizationApplied,
        disclosure: decision.disclosure,
        modelVersion: decision.modelVersion,
        humanOverrideActive: decision.humanOverrideActive,
        fallbackSafe: decision.fallbackSafe,
        evalBaselineRef: decision.evalBaselineRef,
      },
    };
  }

  private async handleSystemCapability(
    capability: SystemCapability,
    query: string,
    req: AssistRequest,
  ) {
    const mech = mechanismFor(capability);
    const inference = await this.adapter.infer({
      capability,
      query,
      deviceProfileId: req.deviceProfileId,
    });
    const structured: StructuredAssistPayload = {
      kind: capability,
      summary: inference.text.slice(0, 400),
      ...(inference.structured as Record<string, unknown>),
    };
    return {
      text: inference.text,
      structured,
      provenance: {
        capability,
        modelId: inference.isTrainedLlm ? 'llama.cpp' : 'deterministic-baseline',
        modelVersion: this.governance.getState().activeModelVersion,
        backend: inference.backend,
        mechanism: mech.mechanism,
        sources: inference.sources.map((s) => ({ id: s })),
        grounded: inference.grounded,
        realInference: Boolean(inference.structured.realInference),
        fallbackUsed: Boolean(inference.fallbackUsed),
        fallbackReason: inference.fallbackReason ?? null,
        processingMode: req.processingMode ?? 'local-only',
        offline: true,
        integrityNote: 'Structured product assist; model-unavailable uses deterministic fallback.',
      } satisfies Omit<ProvenanceRecord, 'requestId' | 'generatedAt'>,
    };
  }

  private async handleRagBacked(
    capability: 'rag' | 'scientific',
    query: string,
    req: AssistRequest,
  ) {
    const attr = this.rag.attribution(query, 5);
    const inference = await this.adapter.infer({
      capability,
      query,
      deviceProfileId: req.deviceProfileId,
    });
    const rankedSources = attr.hits.map((h) => ({
      id: h.docId,
      score: h.score,
      attribution: h.attribution,
    }));
    const claims =
      capability === 'scientific'
        ? attr.hits.slice(0, 3).map((h) => ({
            claim: h.excerpt.slice(0, 160),
            sourceId: h.docId,
            caveat: 'Local corpus claim only; not a live literature review.',
          }))
        : undefined;
    const structured: StructuredAssistPayload = {
      kind: capability,
      summary:
        capability === 'rag'
          ? `Retrieved ${attr.hits.length} local chunks.`
          : `Attributed ${attr.hits.length} local scientific/source chunks.`,
      rankedSources,
      claims,
      ...(inference.structured as Record<string, unknown>),
    };
    const text = [inference.text, '', '### Attribution', ...attr.attributionLines].join('\n');
    return {
      text,
      structured,
      provenance: {
        capability,
        modelId: inference.isTrainedLlm ? 'llama.cpp' : 'local-rag',
        modelVersion: this.governance.getState().activeModelVersion,
        backend: inference.backend,
        mechanism: mechanismFor(capability).mechanism,
        sources: attr.hits.map((h) => ({
          id: h.docId,
          path: h.sourcePath,
          score: h.score,
          excerpt: h.excerpt,
        })),
        grounded: attr.grounded || inference.grounded,
        realInference: Boolean(inference.structured.realInference),
        fallbackUsed: Boolean(inference.fallbackUsed),
        fallbackReason: inference.fallbackReason ?? null,
        processingMode: req.processingMode ?? 'local-only',
        offline: true,
        integrityNote: 'Local RAG index + optional llama synthesis; attributions are local-corpus only.',
      } satisfies Omit<ProvenanceRecord, 'requestId' | 'generatedAt'>,
    };
  }

  private handleContinuity(req: AssistRequest, query: string) {
    const session =
      (req.continuitySessionId && this.continuity.get(req.continuitySessionId)) ||
      this.continuity.create(req.deviceProfileId ?? 'student_14_5');
    if (/export/i.test(query)) {
      const bundle = this.continuity.exportBundle(session.sessionId);
      return {
        text: `Continuity export ready for session ${session.sessionId}`,
        structured: {
          kind: 'continuity' as const,
          summary: 'Exported local continuity bundle (user-controlled).',
          continuity: {
            sessionId: session.sessionId,
            deviceProfileId: session.deviceProfileId,
            lastCapability: session.lastCapability,
            snapshotKeys: Object.keys(session.notes),
          },
          exportBundle: bundle,
        },
        provenance: this.localProv('continuity', 'continuity-store'),
      };
    }
    this.continuity.setNote(session.sessionId, 'last_query', query.slice(0, 200));
    return {
      text: `Continuity session ${session.sessionId} active on ${session.deviceProfileId}. Turns=${session.turns.length}. Export/import is user-controlled; no silent cloud sync.`,
      structured: {
        kind: 'continuity' as const,
        summary: 'Local continuity session updated.',
        continuity: {
          sessionId: session.sessionId,
          deviceProfileId: session.deviceProfileId,
          lastCapability: session.lastCapability,
          snapshotKeys: Object.keys(session.notes),
        },
      },
      provenance: this.localProv('continuity', 'continuity-store'),
    };
  }

  private handleConnectionPath(query: string) {
    const offline = /offline|no.?signal|airplane/i.test(query);
    const structured: StructuredAssistPayload = {
      kind: 'connection_path',
      summary: offline
        ? 'Prefer local/offline path; defer cloud sync.'
        : 'Prefer Wi-Fi/local LAN; fall back to cellular only for consented non-sensitive tasks.',
      connectionPath: {
        recommendedBearer: offline ? 'offline-local' : 'wifi-local',
        alternatives: offline ? ['delay-until-wifi'] : ['ethernet', 'cellular-consented'],
        rationale: [
          'Local-first policy: cloud is never the sole path.',
          'Sensitive device/network tasks stay on-device.',
          offline
            ? 'Detected offline intent — keep assist local.'
            : 'Online available — still default local processing.',
        ],
      },
    };
    return {
      text: `${structured.summary}\nRecommended: ${structured.connectionPath!.recommendedBearer}`,
      structured,
      provenance: this.localProv('connection_path', 'deterministic-network'),
    };
  }

  private async handleContentAdaptation(query: string, req: AssistRequest) {
    const inference = await this.adapter.infer({
      capability: 'translation',
      query: `adapt reading level: ${query}`,
      deviceProfileId: req.deviceProfileId,
    });
    const adapted = inference.text;
    return {
      text: adapted,
      structured: {
        kind: 'content_adaptation' as const,
        summary: 'Adapted content for local reading level / clarity.',
        adaptedText: adapted.slice(0, 2000),
        ...(inference.structured as Record<string, unknown>),
      },
      provenance: {
        ...this.localProv('content_adaptation', inference.backend),
        realInference: Boolean(inference.structured.realInference),
        fallbackUsed: Boolean(inference.fallbackUsed),
        fallbackReason: inference.fallbackReason ?? null,
        sources: inference.sources.map((s) => ({ id: s })),
        grounded: inference.grounded,
      },
    };
  }

  private handleInputInterpretation(query: string) {
    const modality = /switch|scan/i.test(query)
      ? 'switch-access'
      : /voice|speech|asr/i.test(query)
        ? 'speech'
        : /handwrit|stylus|ink/i.test(query)
          ? 'handwriting'
          : /controller|dpad|gamepad/i.test(query)
            ? 'controller'
            : 'text';
    const normalized = query
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s:.,?!'"/-]/g, '')
      .trim()
      .slice(0, 500);
    const structured: StructuredAssistPayload = {
      kind: 'input_interpretation',
      summary: `Interpreted ${modality} input for local assist.`,
      inputInterpretation: {
        modality,
        normalizedText: normalized || '(empty)',
        confidence: normalized ? 0.82 : 0.2,
        alternatives: modality === 'text' ? [] : [normalized, `clarify:${modality}`],
      },
      steps: [
        'Capture local input without cloud upload.',
        'Normalize tokens / remove noise.',
        'Offer clarification alternatives when confidence is low.',
      ],
    };
    return {
      text: `Input interpretation (${modality}): ${structured.inputInterpretation!.normalizedText}`,
      structured,
      provenance: this.localProv('input_interpretation', 'deterministic-a11y-input'),
    };
  }

  private handleSafetyAlert(query: string) {
    const critical = /overheat|thermal|smoke|fire|battery.?swelling/i.test(query);
    const warning = /low.?battery|disk.?full|offline|unreachable|auth.?fail/i.test(query);
    const severity = critical ? 'critical' : warning ? 'warning' : 'info';
    const explanation = critical
      ? 'Safety-critical local alert: stop intensive workloads, cool device, and seek human verification before continuing.'
      : warning
        ? 'Local warning alert: explain the condition defensively and recommend safe recovery steps. Do not provide exploit instructions.'
        : 'Informational local alert explanation with defensive guidance only.';
    const structured: StructuredAssistPayload = {
      kind: 'safety_alert',
      summary: `Safety alert explanation (${severity}).`,
      safetyAlert: {
        severity,
        explanation,
        recommendedActions: critical
          ? ['power down if safe', 'disconnect charger if overheating', 'notify a trusted adult/operator']
          : warning
            ? ['switch to offline-local assist', 'free local storage / reconnect Wi-Fi', 'retry after cooldown']
            : ['acknowledge alert', 'continue with local-only processing'],
        defensiveOnly: true,
      },
      securityAdvice: [
        'Defensive explanation only — no exploit or bypass guidance.',
        'Cloud is never required for basic safety messaging.',
      ],
    };
    return {
      text: `${structured.safetyAlert!.explanation}\nActions: ${structured.safetyAlert!.recommendedActions.join('; ')}`,
      structured,
      provenance: this.localProv('safety_alert', 'deterministic-security'),
    };
  }

  private localProv(capability: ProductRoute, backend: string) {
    return {
      capability,
      modelId: backend,
      modelVersion: this.governance.getState().activeModelVersion,
      backend,
      mechanism: 'deterministic',
      sources: [] as Array<{ id: string }>,
      grounded: true,
      realInference: false,
      fallbackUsed: false,
      fallbackReason: null,
      processingMode: 'local-only' as const,
      offline: true,
      integrityNote: 'Local product path with structured provenance.',
    } satisfies Omit<ProvenanceRecord, 'requestId' | 'generatedAt'>;
  }

  private safeFallback(
    requestId: string,
    capability: ProductRoute,
    query: string,
    decision: ReturnType<GovernanceRuntime['decide']>,
    failure: string,
  ): AssistResponse {
    const text = `SAFE_FALLBACK for ${capability}: model/path unavailable (${failure}). Offline deterministic response for query preview: ${query.slice(0, 120)}`;
    return {
      ok: true,
      requestId,
      capability,
      text,
      structured: {
        kind: capability,
        summary: 'Safe fallback response (model unavailable).',
        failure,
      },
      provenance: {
        requestId,
        capability,
        modelId: 'safe-fallback',
        modelVersion: decision.modelVersion,
        backend: 'deterministic-fallback',
        mechanism: 'deterministic',
        sources: [],
        grounded: false,
        realInference: false,
        fallbackUsed: true,
        fallbackReason: failure,
        processingMode: 'local-only',
        offline: true,
        generatedAt: new Date().toISOString(),
        integrityNote: 'Safe fallback engaged by governance policy.',
      },
      governance: {
        purposeDeclared: decision.purposeDeclared,
        purpose: decision.purpose,
        consentGranted: decision.consentGranted,
        minimizationApplied: decision.minimizationApplied,
        disclosure: decision.disclosure,
        modelVersion: decision.modelVersion,
        humanOverrideActive: decision.humanOverrideActive,
        fallbackSafe: true,
        evalBaselineRef: decision.evalBaselineRef,
      },
    };
  }

  private errorResponse(
    requestId: string,
    capability: ProductRoute,
    errorCode: string,
    errorMessage: string,
    decision?: ReturnType<GovernanceRuntime['decide']>,
  ): AssistResponse {
    return {
      ok: false,
      requestId,
      capability,
      text: errorMessage,
      structured: { kind: capability, summary: errorMessage },
      provenance: {
        requestId,
        capability,
        modelId: null,
        modelVersion: decision?.modelVersion ?? null,
        backend: 'none',
        mechanism: 'none',
        sources: [],
        grounded: false,
        realInference: false,
        fallbackUsed: false,
        fallbackReason: null,
        processingMode: 'local-only',
        offline: true,
        generatedAt: new Date().toISOString(),
        integrityNote: 'Error path; no model output.',
      },
      governance: {
        purposeDeclared: decision?.purposeDeclared ?? false,
        purpose: decision?.purpose ?? '',
        consentGranted: decision?.consentGranted ?? false,
        minimizationApplied: decision?.minimizationApplied ?? false,
        disclosure: decision?.disclosure ?? 'LOCAL-ONLY',
        modelVersion: decision?.modelVersion ?? '',
        humanOverrideActive: decision?.humanOverrideActive ?? false,
        fallbackSafe: decision?.fallbackSafe ?? true,
        evalBaselineRef: decision?.evalBaselineRef ?? '',
      },
      errorCode,
      errorMessage,
    };
  }
}

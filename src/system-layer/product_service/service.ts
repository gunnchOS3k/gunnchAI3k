/**
 * Continuance V — callable product service (gunnchOS-integrable).
 */

import { randomUUID } from 'node:crypto';
import * as path from 'node:path';
import { LlamaCppBackend } from '../local_inference/backends/llamacpp';
import { LocalInferenceRuntimeAdapter } from '../local_inference/runtime_adapter';
import { mechanismFor } from '../capability_mechanisms';
import type { SystemCapability } from '../model_registry';
import { ALL_SYSTEM_CAPABILITIES } from '../model_registry';
import { ContinuityStore } from './continuity';
import { GovernanceRuntime } from './governance';
import {
  checkPermissions,
  DEFAULT_LOCAL_PERMISSIONS,
  requiredScopesForRoute,
} from './permissions';
import { LocalRagEngine } from './rag_engine';
import type {
  AssistRequest,
  AssistResponse,
  ProductRoute,
  ProvenanceRecord,
  RequirementNodeStatus,
  StructuredAssistPayload,
} from './types';
import {
  PRODUCT_SERVICE_NAME,
  PRODUCT_SERVICE_TOKEN,
  PRODUCT_SERVICE_VERSION,
} from './types';

const SYSTEM_ROUTES = new Set<string>(ALL_SYSTEM_CAPABILITIES);

function isSystemCapability(route: ProductRoute): route is SystemCapability {
  return SYSTEM_ROUTES.has(route);
}

export class GunnchAIProductService {
  readonly name = PRODUCT_SERVICE_NAME;
  readonly version = PRODUCT_SERVICE_VERSION;
  readonly governance: GovernanceRuntime;
  readonly rag: LocalRagEngine;
  readonly continuity: ContinuityStore;
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
      },
      capabilities: this.listRoutes(),
      fullPlatformDigitalComplete: false,
    };
  }

  listRoutes(): Array<{ route: ProductRoute; method: string; path: string }> {
    const assist = (ALL_SYSTEM_CAPABILITIES as ProductRoute[]).concat([
      'continuity',
      'content_adaptation',
      'connection_path',
    ]);
    return [
      { route: 'tutoring' as ProductRoute, method: 'GET', path: '/health' },
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
      { route: 'workflow', method: 'POST', path: '/v1/governance/consent' },
      { route: 'workflow', method: 'POST', path: '/v1/governance/override' },
      { route: 'workflow', method: 'POST', path: '/v1/governance/rollback' },
      { route: 'workflow', method: 'GET', path: '/v1/governance/monitor' },
    ];
  }

  requirementStatus(): RequirementNodeStatus[] {
    const runtime = (id: string, title: string, route: string, notes: string): RequirementNodeStatus => ({
      id,
      title,
      status: 'RUNTIME',
      route,
      notes,
    });
    return [
      runtime('AI-CORE-001', 'Personalized tutoring', '/v1/assist/tutoring', 'Product assist + eval'),
      runtime('AI-CORE-002', 'Code assistance', '/v1/assist/code', 'Product assist + eval'),
      runtime('AI-CORE-003', 'Device troubleshooting', '/v1/assist/device_help', 'Product assist + eval'),
      runtime('AI-CORE-004', 'Accessibility assistance', '/v1/assist/a11y', 'Product assist + eval'),
      runtime('AI-CORE-005', 'Game coaching', '/v1/assist/game_coach', 'Product assist + eval'),
      runtime('AI-CORE-006', 'Network optimization', '/v1/assist/network', 'Product assist + eval'),
      runtime('AI-CORE-007', 'Connection-path recommendations', '/v1/assist/connection_path', 'Product route'),
      runtime('AI-CORE-008', 'Local search', '/v1/rag/search', 'Local RAG engine'),
      runtime('AI-CORE-009', 'Knowledge retrieval', '/v1/rag/search', 'Local RAG + attribution'),
      runtime('AI-CORE-010', 'Scientific source attribution', '/v1/assist/scientific', 'Assist + RAG attribution'),
      runtime('AI-CORE-011', 'Translation', '/v1/assist/translation', 'Product assist + eval'),
      runtime('AI-CORE-012', 'Content adaptation', '/v1/assist/content_adaptation', 'Product route'),
      runtime('AI-CORE-013', 'Workflow automation', '/v1/assist/workflow', 'Product assist + eval'),
      runtime('AI-CORE-014', 'Security anomaly explanation', '/v1/assist/security', 'Defensive-only assist'),
      runtime('AI-CORE-015', 'User-controlled cross-device continuity', '/v1/continuity/*', 'Local export/import'),
      runtime('AI-GOV-001', 'Declared purpose', '/v1/governance/*', 'GovernanceRuntime.declarePurpose'),
      runtime('AI-GOV-002', 'User consent', '/v1/governance/consent', 'GovernanceRuntime.setConsent'),
      runtime('AI-GOV-003', 'Data minimization', '/v1/governance/*', 'PII strip + max chars'),
      runtime('AI-GOV-004', 'Local/cloud disclosure', '/v1/assist/*', 'evaluateCloudDisclosure'),
      runtime('AI-GOV-005', 'Model and version identification', '/health', 'Provenance + /version'),
      runtime('AI-GOV-006', 'Evaluation baseline', 'system-layer:eval', 'fixtures/system-layer/eval'),
      runtime('AI-GOV-007', 'Failure analysis', '/v1/governance/monitor', 'Monitor events + fallback'),
      runtime('AI-GOV-008', 'Bias and accessibility evaluation', '/v1/assist/a11y', 'a11y route + eval harness'),
      runtime('AI-GOV-009', 'Human override', '/v1/governance/override', 'GovernanceRuntime override'),
      runtime('AI-GOV-010', 'Safe fallback', '/v1/assist/*', 'Deterministic + model-unavailable'),
      runtime('AI-GOV-011', 'Monitoring', '/v1/governance/monitor', 'JSONL monitor events'),
      runtime('AI-GOV-012', 'Rollback capability', '/v1/governance/rollback', 'Governance snapshots'),
      runtime('AI-LOCAL-001', 'Offline tutoring packs', '/v1/assist/tutoring', 'local-only default'),
      runtime('AI-LOCAL-002', 'Local code assistance', '/v1/assist/code', 'local-only default'),
      runtime('AI-LOCAL-003', 'Device help', '/v1/assist/device_help', 'local-only default'),
      runtime('AI-LOCAL-004', 'Input interpretation support', '/v1/assist/a11y', 'a11y structured output'),
      runtime('AI-LOCAL-005', 'Basic translation', '/v1/assist/translation', 'local-only default'),
      runtime('AI-LOCAL-006', 'Accessibility services', '/v1/assist/a11y', 'local-only default'),
      runtime('AI-LOCAL-007', 'Local document retrieval', '/v1/rag/*', 'LocalRagEngine'),
      runtime('AI-LOCAL-008', 'Game AI', '/v1/assist/game_coach', 'local-only default'),
      runtime('AI-LOCAL-009', 'Connectivity diagnosis', '/v1/assist/network', 'local-only default'),
      runtime('AI-LOCAL-010', 'Safety-critical alerts', '/v1/assist/security', 'defensive explanations'),
      runtime('AI-LOCAL-011', 'Cloud models not sole path', '/health', 'Deterministic fallback always'),
      {
        id: 'FULL_GUNNCHAI3K_PLATFORM_DIGITAL_COMPLETE',
        title: 'Full platform digital complete',
        status: 'SCHEMA_ONLY',
        notes:
          'Not earned: Discord/product surface + consented cloud production path incomplete.',
      },
      {
        id: 'DIGITALLY_VALIDATED',
        title: 'Digitally validated platform claim',
        status: 'SCHEMA_ONLY',
        notes: 'Not claimed by Continuance V product service.',
      },
    ];
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
      return this.errorResponse(
        requestId,
        req.capability,
        decision.blockReason ?? 'GOVERNANCE_BLOCKED',
        decision.blockReason ?? 'Blocked by governance',
        decision,
      );
    }

    try {
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
      } else if (req.capability === 'rag' || req.capability === 'scientific') {
        const result = await this.handleRagBacked(req.capability, decision.minimizedQuery, req);
        structured = result.structured;
        text = result.text;
        provenanceBase = result.provenance;
      } else {
        const result = await this.handleSystemCapability(
          req.capability,
          decision.minimizedQuery,
          req,
        );
        structured = result.structured;
        text = result.text;
        provenanceBase = result.provenance;
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
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.governance.record('assist_error', message, false, req.capability);
      if (decision.fallbackSafe) {
        return this.safeFallback(requestId, req.capability, decision.minimizedQuery, decision, message);
      }
      return this.errorResponse(requestId, req.capability, 'ASSIST_FAILED', message, decision);
    }
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
    const text = [
      inference.text,
      '',
      '### Attribution',
      ...attr.attributionLines,
    ].join('\n');
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

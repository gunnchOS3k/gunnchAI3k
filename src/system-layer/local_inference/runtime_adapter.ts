/**
 * Local inference runtime adapter — Continuance IV.
 * Selected architecture: llama.cpp. Routes by capability mechanism
 * (LLM / deterministic / hybrid / local RAG).
 */

import * as path from 'node:path';
import { LocalFirstRuntime } from '../../local-runtime/runtime';
import type { SystemCapability } from '../model_registry';
import type { DeviceProfileId } from '../model_registry';
import { mechanismFor } from '../capability_mechanisms';
import { retrieveForQuery } from '../local_rag';
import { DeterministicBaselineBackend } from './backends/deterministic';
import { LlamaCppBackend } from './backends/llamacpp';
import { OnnxRuntimeBackend } from './backends/onnxruntime';
import type {
  BackendAvailability,
  InferenceRequest,
  InferenceResult,
  LocalInferenceBackend,
} from './backends/interface';

export type PreferredBackendHint =
  | 'deterministic-baseline'
  | 'local-runtime-fixture'
  | 'optional-local-model'
  | 'cloud-policy-stub'
  | 'none';

export interface SystemInferRequest {
  capability: SystemCapability;
  query: string;
  deviceProfileId?: DeviceProfileId;
  preferredBackend?: PreferredBackendHint;
  fixtureRoot?: string;
}

export class LocalInferenceRuntimeAdapter {
  readonly selectedArchitecture = 'llama.cpp' as const;
  private readonly deterministic = new DeterministicBaselineBackend();
  private readonly llama: LlamaCppBackend;
  private readonly onnx = new OnnxRuntimeBackend();
  private readonly cwd: string;

  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.llama = new LlamaCppBackend(cwd);
  }

  probeAll(): BackendAvailability[] {
    return [this.deterministic.probe(), this.llama.probe(), this.onnx.probe()];
  }

  selectBackend(preferred?: PreferredBackendHint): LocalInferenceBackend {
    if (preferred === 'optional-local-model') {
      return this.llama;
    }
    if (preferred === 'deterministic-baseline') {
      return this.deterministic;
    }
    return this.llama;
  }

  async infer(request: SystemInferRequest): Promise<InferenceResult> {
    if (request.preferredBackend === 'cloud-policy-stub') {
      return {
        backend: 'deterministic',
        text:
          'CLOUD_POLICY_STUB: cloud route acknowledged but no production keys are configured. Falling back locally is required.',
        structured: {
          kind: 'cloud_stub',
          configured: false,
          productionKeys: false,
        },
        grounded: false,
        sources: [],
        latencyMs: 1,
        memoryStubBytes: 1024,
        isTrainedLlm: false,
        fallbackUsed: true,
        fallbackReason: 'No production cloud keys; stub only.',
      };
    }

    const mech = mechanismFor(request.capability);

    if (
      request.capability === 'rag' ||
      request.preferredBackend === 'local-runtime-fixture' ||
      mech.mechanism === 'local_rag' ||
      mech.mechanism === 'local_rag_hybrid'
    ) {
      return this.inferWithLocalRag(request, mech.usesLlamaCpp);
    }

    if (mech.mechanism === 'deterministic' || !mech.usesLlamaCpp) {
      const result = await this.deterministic.infer({
        capability: request.capability,
        query: request.query,
        deviceProfileId: request.deviceProfileId,
      });
      return {
        ...result,
        structured: {
          ...result.structured,
          selectedArchitecture: 'llama.cpp',
          mechanism: mech.mechanism,
          metricsMode: 'placeholder_no_model',
          realInference: false,
        },
      };
    }

    // hybrid / llm — llama.cpp with deterministic structured overlay
    const llamaResult = await this.llama.infer({
      capability: request.capability,
      query: request.query,
      deviceProfileId: request.deviceProfileId,
      contextDocs: mech.usesLocalRag
        ? retrieveForQuery(request.query, this.cwd, 3).map((h) => ({
            id: h.id,
            text: h.text,
          }))
        : undefined,
    });
    return {
      ...llamaResult,
      structured: {
        ...llamaResult.structured,
        mechanism: mech.mechanism,
      },
    };
  }

  private async inferWithLocalRag(
    request: SystemInferRequest,
    tryLlama: boolean,
  ): Promise<InferenceResult> {
    const t0 = Date.now();
    const fixtureRoot =
      request.fixtureRoot ??
      path.join(this.cwd, 'fixtures', 'local-runtime');
    const runtime = new LocalFirstRuntime({
      mode: 'local-only',
      fixtureRoot,
    });
    try {
      const mappedCapability =
        request.capability === 'rag'
          ? 'document_retrieval'
          : request.capability === 'code'
            ? 'code_assistance'
            : request.capability === 'network'
              ? 'connectivity_diagnosis'
              : request.capability === 'tutoring'
                ? 'tutoring'
                : request.capability === 'device_help'
                  ? 'device_help'
                  : 'document_retrieval';

      const response = await runtime.handle({
        id: `cont-iv-${Date.now()}`,
        capability: mappedCapability,
        query: request.query,
      });

      const corpusHits = retrieveForQuery(request.query, this.cwd, 5);
      const contextDocs = [
        ...response.sources.map((s) => ({ id: s, text: response.text })),
        ...corpusHits.map((h) => ({ id: h.id, text: h.text })),
      ];

      const baseline = await this.deterministic.infer({
        capability: request.capability,
        query: request.query,
        deviceProfileId: request.deviceProfileId,
        contextDocs,
      });

      const rankedSources = [
        ...(Array.isArray(baseline.structured.rankedSources)
          ? (baseline.structured.rankedSources as Array<{ id: string; score: number }>)
          : []),
        ...corpusHits.map((h) => ({ id: h.id, score: h.score })),
      ];

      let llamaNarrative: string | null = null;
      let llamaMetrics: unknown = null;
      let realInference = false;
      let metricsMode: 'measured' | 'placeholder_no_model' = 'placeholder_no_model';
      let latencyMs = Math.max(1, Date.now() - t0);
      let memoryStubBytes = baseline.memoryStubBytes;
      let isTrainedLlm = false;

      const llamaProbe = this.llama.probe();
      if (tryLlama && llamaProbe.canRunRealInference) {
        const llm = await this.llama.infer({
          capability: request.capability,
          query: request.query,
          deviceProfileId: request.deviceProfileId,
          contextDocs: contextDocs.slice(0, 3),
        });
        if (llm.structured.realInference === true) {
          realInference = true;
          metricsMode = 'measured';
          llamaNarrative = String(llm.structured.llmNarrative ?? '');
          llamaMetrics = llm.structured.llamaMetrics ?? null;
          latencyMs = Math.max(latencyMs, llm.latencyMs);
          memoryStubBytes = Math.max(memoryStubBytes, llm.memoryStubBytes);
          isTrainedLlm = true;
        }
      }

      const sources = Array.from(
        new Set([
          ...baseline.sources,
          ...response.sources,
          ...corpusHits.map((h) => h.id),
        ]),
      );

      return {
        backend: realInference ? 'llama.cpp' : baseline.backend,
        text: [
          baseline.text,
          `[local-runtime bridge]\n${response.text}`,
          `[local-rag corpus hits=${corpusHits.length}]`,
          llamaNarrative
            ? `[llama synthesis]\n${llamaNarrative}`
            : '[llama synthesis skipped — unavailable or deterministic path]',
        ].join('\n\n'),
        grounded: response.grounded || baseline.grounded || corpusHits.length > 0,
        sources,
        latencyMs,
        memoryStubBytes,
        isTrainedLlm,
        fallbackUsed: !realInference && tryLlama,
        fallbackReason: realInference
          ? undefined
          : 'Local RAG used deterministic/local-runtime path (llama unavailable or unused).',
        structured: {
          ...baseline.structured,
          rankedSources,
          localRuntimeOk: response.ok,
          localRuntimeProvider: response.provider.kind,
          localRuntimeGrounded: response.grounded,
          localRagHits: corpusHits.length,
          selectedArchitecture: 'llama.cpp',
          mechanism: 'local_rag_hybrid',
          metricsMode,
          realInference,
          llamaMetrics,
        },
      };
    } finally {
      runtime.stop();
    }
  }
}

export type { InferenceRequest, InferenceResult, BackendAvailability };

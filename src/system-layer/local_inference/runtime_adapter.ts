/**
 * Local inference runtime adapter.
 * Prefers existing Gate 1 local-runtime for RAG grounding; otherwise
 * selects deterministic / optional llama.cpp / onnxruntime backends.
 */

import * as path from 'node:path';
import { LocalFirstRuntime } from '../../local-runtime/runtime';
import type { SystemCapability } from '../model_registry';
import type { DeviceProfileId } from '../model_registry';
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
  private readonly deterministic = new DeterministicBaselineBackend();
  private readonly llama = new LlamaCppBackend();
  private readonly onnx = new OnnxRuntimeBackend();

  probeAll(): BackendAvailability[] {
    return [this.deterministic.probe(), this.llama.probe(), this.onnx.probe()];
  }

  selectBackend(preferred?: PreferredBackendHint): LocalInferenceBackend {
    if (preferred === 'optional-local-model') {
      const llama = this.llama.probe();
      if (llama.available) return this.llama;
      const onnx = this.onnx.probe();
      if (onnx.available) return this.onnx;
      return this.deterministic;
    }
    return this.deterministic;
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

    if (
      request.capability === 'rag' ||
      request.preferredBackend === 'local-runtime-fixture'
    ) {
      return this.inferWithLocalRuntime(request);
    }

    const backend = this.selectBackend(request.preferredBackend);
    return backend.infer({
      capability: request.capability,
      query: request.query,
      deviceProfileId: request.deviceProfileId,
    });
  }

  private async inferWithLocalRuntime(
    request: SystemInferRequest,
  ): Promise<InferenceResult> {
    const t0 = Date.now();
    const fixtureRoot =
      request.fixtureRoot ??
      path.join(process.cwd(), 'fixtures', 'local-runtime');
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
        id: `wave-c-${Date.now()}`,
        capability: mappedCapability,
        query: request.query,
      });

      const baseline = await this.deterministic.infer({
        capability: request.capability,
        query: request.query,
        deviceProfileId: request.deviceProfileId,
        contextDocs: response.sources.map((s) => ({
          id: s,
          text: response.text,
        })),
      });

      return {
        ...baseline,
        text: `${baseline.text}\n\n[local-runtime bridge]\n${response.text}`,
        grounded: response.grounded || baseline.grounded,
        sources: Array.from(
          new Set([...baseline.sources, ...response.sources]),
        ),
        latencyMs: Math.max(1, Date.now() - t0),
        fallbackUsed: false,
        structured: {
          ...baseline.structured,
          localRuntimeOk: response.ok,
          localRuntimeProvider: response.provider.kind,
          localRuntimeGrounded: response.grounded,
        },
      };
    } finally {
      runtime.stop();
    }
  }
}

export type { InferenceRequest, InferenceResult, BackendAvailability };

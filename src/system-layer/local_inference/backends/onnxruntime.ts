/**
 * Optional ONNX Runtime backend probe.
 * Does not npm-install system packages or download models.
 */

import type {
  BackendAvailability,
  InferenceRequest,
  InferenceResult,
  LocalInferenceBackend,
} from './interface';
import { DeterministicBaselineBackend } from './deterministic';

export class OnnxRuntimeBackend implements LocalInferenceBackend {
  readonly id = 'onnxruntime' as const;
  private readonly fallback = new DeterministicBaselineBackend();

  probe(): BackendAvailability {
    const notes: string[] = [];
    let modulePath: string | null = null;
    let available = false;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require.resolve('onnxruntime-node');
      modulePath = mod;
      available = true;
      notes.push(`onnxruntime-node resolvable at ${mod}`);
    } catch {
      notes.push(
        'onnxruntime-node not installed. Wave C will not force install (no admin / no purchase).',
      );
    }
    notes.push('When unavailable, deterministic baseline is used.');
    return {
      id: 'onnxruntime',
      available,
      installableWithoutAdmin: false,
      notes,
      binaryOrModule: modulePath,
    };
  }

  async infer(request: InferenceRequest): Promise<InferenceResult> {
    const availability = this.probe();
    if (!availability.available) {
      const result = await this.fallback.infer(request);
      return {
        ...result,
        fallbackUsed: true,
        fallbackReason: availability.notes.join(' '),
        text:
          `[onnxruntime unavailable — deterministic baseline fallback]\n` +
          result.text,
      };
    }

    const result = await this.fallback.infer(request);
    return {
      ...result,
      backend: 'onnxruntime',
      fallbackUsed: true,
      fallbackReason:
        'onnxruntime-node present but no Wave C ONNX model artifact registered; structured baseline retained.',
      isTrainedLlm: false,
      text:
        `[onnxruntime-node present; structured baseline used without loading ONNX weights]\n` +
        result.text,
    };
  }
}

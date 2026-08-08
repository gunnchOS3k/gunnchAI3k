/**
 * Optional llama.cpp backend probe.
 * Does not install binaries or download GGUF weights.
 */

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import type {
  BackendAvailability,
  InferenceRequest,
  InferenceResult,
  LocalInferenceBackend,
} from './interface';
import { DeterministicBaselineBackend } from './deterministic';

function which(bin: string): string | null {
  try {
    const out = execFileSync('which', [bin], { encoding: 'utf8' }).trim();
    return out || null;
  } catch {
    return null;
  }
}

export class LlamaCppBackend implements LocalInferenceBackend {
  readonly id = 'llama.cpp' as const;
  private readonly fallback = new DeterministicBaselineBackend();

  probe(): BackendAvailability {
    const candidates = ['llama-cli', 'llama-server', 'main'];
    const found = candidates.map(which).find(Boolean) ?? null;
    const gguf = process.env.GUNNCHAI3K_LOCAL_GGUF_PATH;
    const ggufOk = Boolean(gguf && fs.existsSync(gguf));
    const available = Boolean(found && ggufOk);
    const notes = [
      found
        ? `Found llama.cpp-related binary: ${found}`
        : 'No llama.cpp binary discovered (llama-cli/llama-server).',
      ggufOk
        ? `GGUF hint present at ${gguf}`
        : 'No usable GUNNCHAI3K_LOCAL_GGUF_PATH (Wave C will not download weights).',
      'Admin install / package purchase is out of scope (PHYSICAL freeze).',
      'When unavailable, deterministic baseline is used.',
    ];
    return {
      id: 'llama.cpp',
      available,
      installableWithoutAdmin: false,
      notes,
      binaryOrModule: found,
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
          `[llama.cpp unavailable — deterministic baseline fallback]\n` +
          result.text,
      };
    }

    // Even when discovered, Wave C CI path does not load heavy weights.
    // Honest labeling + fallback body keeps the adapter real without false claims.
    const result = await this.fallback.infer(request);
    return {
      ...result,
      backend: 'llama.cpp',
      fallbackUsed: true,
      fallbackReason:
        'llama.cpp discovered but Wave C refuses silent weight load in automated path; structured baseline retained.',
      isTrainedLlm: false,
      text:
        `[llama.cpp discovered at ${availability.binaryOrModule}; structured baseline used without loading weights]\n` +
        result.text,
    };
  }
}

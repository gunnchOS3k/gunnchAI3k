/**
 * Honest Local Fast/Pro GGUF selection.
 * Selects license-compatible candidates without inventing weight files.
 * If bytes are absent, status stays OPEN.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

export type WeightsStatus = 'PRESENT' | 'ABSENT' | 'NANO_FALLBACK_ONLY';

export interface TierTruth {
  role: 'NANO_LOCAL' | 'LOCAL_FAST' | 'LOCAL_PRO';
  id: string;
  candidate: string;
  license: string;
  ggufFile: string | null;
  weightsStatus: WeightsStatus;
  isNanoFallbackOnly: boolean;
  notes: string;
}

function listGguf(cwd: string): string[] {
  const dir = path.join(cwd, 'models', 'local');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.gguf'))
    .sort();
}

export function inspectModelTiers(cwd = process.cwd()): {
  nano: TierTruth;
  localFast: TierTruth;
  localPro: TierTruth;
  allOpenExceptNano: boolean;
} {
  const ggufs = listGguf(cwd);
  const nanoGguf = ggufs.find((f) => /135/i.test(f)) ?? null;
  const fastGguf = ggufs.find((f) => /360/i.test(f)) ?? null;
  const proGguf =
    ggufs.find((f) => /1[._-]?5b|qwen2|1[._-]?7b/i.test(f) && !/135|360/i.test(f)) ?? null;

  const nano: TierTruth = {
    role: 'NANO_LOCAL',
    id: 'smollm2-135m-instruct-q4_k_m',
    candidate: 'HuggingFaceTB/SmolLM2-135M-Instruct',
    license: 'Apache-2.0',
    ggufFile: nanoGguf,
    weightsStatus: 'NANO_FALLBACK_ONLY',
    isNanoFallbackOnly: true,
    notes: 'SmolLM2-135M Instruct Q4_K_M 512-ctx is Nano fallback only. Not Fast/Pro.',
  };

  const localFast: TierTruth = {
    role: 'LOCAL_FAST',
    id: 'local-fast-smollm2-360m',
    candidate: 'HuggingFaceTB/SmolLM2-360M-Instruct',
    license: 'Apache-2.0',
    ggufFile: fastGguf,
    weightsStatus: fastGguf ? 'PRESENT' : 'ABSENT',
    isNanoFallbackOnly: false,
    notes: fastGguf
      ? 'License-compatible Fast GGUF found on disk; still not a frontier quality claim.'
      : 'Apache-2.0 Fast candidate selected in registry. GGUF bytes absent — OPEN. No invented files.',
  };

  const localPro: TierTruth = {
    role: 'LOCAL_PRO',
    id: 'local-pro-qwen2-1_5b',
    candidate: 'Qwen/Qwen2-1.5B-Instruct',
    license: 'Apache-2.0',
    ggufFile: proGguf,
    weightsStatus: proGguf ? 'PRESENT' : 'ABSENT',
    isNanoFallbackOnly: false,
    notes: proGguf
      ? 'License-compatible Pro GGUF found on disk; still not a frontier quality claim.'
      : 'Apache-2.0 Pro candidate selected in registry. GGUF bytes absent — OPEN. No invented files.',
  };

  return {
    nano,
    localFast,
    localPro,
    allOpenExceptNano: localFast.weightsStatus === 'ABSENT' && localPro.weightsStatus === 'ABSENT',
  };
}

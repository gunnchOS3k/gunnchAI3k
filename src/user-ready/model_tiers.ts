/**
 * Honest Local Fast/Pro GGUF selection.
 * Fast is PRESENT only when hashed 360M bytes verify. Nano is never Fast/Pro.
 */

import * as path from 'node:path';
import { FAST_SHA256, ModelDownloadManager, NANO_SHA256 } from './model_manager';

export type WeightsStatus = 'PRESENT' | 'ABSENT' | 'NANO_FALLBACK_ONLY' | 'OPEN';

export interface TierTruth {
  role: 'NANO_LOCAL' | 'LOCAL_FAST' | 'LOCAL_PRO';
  id: string;
  candidate: string;
  license: string;
  ggufFile: string | null;
  sha256: string | null;
  bytes: number | null;
  weightsStatus: WeightsStatus;
  isNanoFallbackOnly: boolean;
  notes: string;
}

export function inspectModelTiers(cwd = process.cwd()): {
  nano: TierTruth;
  localFast: TierTruth;
  localPro: TierTruth;
  allOpenExceptNano: boolean;
} {
  const mgr = new ModelDownloadManager(cwd);
  const nanoEntry = mgr.get('smollm2-135m-instruct-q4_k_m');
  const fastEntry = mgr.get('local-fast-smollm2-360m');
  const proEntry = mgr.get('local-pro-qwen2-1_5b');

  const nanoPath = nanoEntry ? mgr.installedPath(nanoEntry) : null;
  const fastPath = fastEntry ? mgr.installedPath(fastEntry) : null;
  const proPath = proEntry ? mgr.installedPath(proEntry) : null;

  const nanoVerify = nanoPath && nanoEntry ? mgr.verifyFile(nanoPath, nanoEntry) : null;
  const fastVerify = fastPath && fastEntry ? mgr.verifyFile(fastPath, fastEntry) : null;
  const proVerify = proPath && proEntry ? mgr.verifyFile(proPath, proEntry) : null;

  const nano: TierTruth = {
    role: 'NANO_LOCAL',
    id: 'smollm2-135m-instruct-q4_k_m',
    candidate: 'HuggingFaceTB/SmolLM2-135M-Instruct',
    license: 'Apache-2.0',
    ggufFile: nanoPath ? path.basename(nanoPath) : null,
    sha256: nanoVerify?.sha256 ?? NANO_SHA256,
    bytes: nanoVerify?.bytes ?? null,
    weightsStatus: 'NANO_FALLBACK_ONLY',
    isNanoFallbackOnly: true,
    notes: 'SmolLM2-135M Instruct Q4_K_M 512-ctx is Nano fallback only. Not Fast/Pro.',
  };

  const fastOk =
    Boolean(fastVerify?.ok) &&
    fastVerify?.sha256 === FAST_SHA256 &&
    !/135m/i.test(fastPath || '');

  const localFast: TierTruth = {
    role: 'LOCAL_FAST',
    id: 'local-fast-smollm2-360m',
    candidate: 'HuggingFaceTB/SmolLM2-360M-Instruct',
    license: 'Apache-2.0',
    ggufFile: fastOk && fastPath ? path.basename(fastPath) : null,
    sha256: fastOk ? FAST_SHA256 : null,
    bytes: fastOk ? fastVerify?.bytes ?? null : null,
    weightsStatus: fastOk ? 'PRESENT' : 'ABSENT',
    isNanoFallbackOnly: false,
    notes: fastOk
      ? 'Hashed SmolLM2-360M Q4_K_M present. Not a frontier quality claim. Nano was not relabeled.'
      : 'Fast GGUF absent or failed integrity. Not using Nano as Fast.',
  };

  const localPro: TierTruth = {
    role: 'LOCAL_PRO',
    id: 'local-pro-qwen2-1_5b',
    candidate: 'Qwen/Qwen2-1.5B-Instruct',
    license: 'Apache-2.0',
    ggufFile: proVerify?.ok && proPath ? path.basename(proPath) : null,
    sha256: proVerify?.ok ? proVerify.sha256 : null,
    bytes: proVerify?.ok ? proVerify.bytes : null,
    weightsStatus: proVerify?.ok ? 'PRESENT' : 'OPEN',
    isNanoFallbackOnly: false,
    notes: proVerify?.ok
      ? 'Hashed Local Pro GGUF present. Not a frontier quality claim.'
      : 'Local Pro OPEN: no pinned hashed GGUF this packet. Fast landing does not imply Pro.',
  };

  return {
    nano,
    localFast,
    localPro,
    allOpenExceptNano: localFast.weightsStatus !== 'PRESENT' && localPro.weightsStatus !== 'PRESENT',
  };
}

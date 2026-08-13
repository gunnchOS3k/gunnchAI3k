/**
 * Live owner-truth audit: what is real vs Nano/fallback vs OPEN.
 * Does not treat SmolLM2 as final intelligence.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { LlamaCppBackend } from '../system-layer/local_inference/backends/llamacpp';
import { ModelRegistryService } from '../system-layer/model_registry';
import { ModelFleetRegistry } from '../stage2/fleet/registry';
import {
  APP_PRODUCT_COMPLETE_NOT_EARNED_REASON,
  NANO_CONTEXT_TOKENS,
  NANO_DISPLAY,
  NANO_MODEL_ID,
  NANO_QUANT,
} from './tokens';

export interface RuntimeAudit {
  ownerRepo: 'gunnchAI3k';
  doctrine: string;
  real: string[];
  nanoFallback: string[];
  registryOnlyNotWeights: string[];
  open: string[];
  llama: {
    canRunRealInference: boolean;
    ggufPath: string | null;
    metricsMode: string;
    contextSize: number;
    labeledNanoFallbackOnly: boolean;
  };
  localFastWeightsPresent: boolean;
  localProWeightsPresent: boolean;
  appProductCompleteEarned: false;
  frontierParityEarned: false;
  appProductCompleteReason: string;
}

function listGguf(cwd: string): string[] {
  const dir = path.join(cwd, 'models', 'local');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.gguf'))
    .sort();
}

export function auditRuntime(cwd = process.cwd()): RuntimeAudit {
  const probe = new LlamaCppBackend(cwd).probe();
  const registry = new ModelRegistryService(cwd);
  const fleet = new ModelFleetRegistry();
  const nanoFleet = fleet.byRole('NANO_LOCAL')[0];
  const smol = registry.getById(NANO_MODEL_ID);
  const ggufs = listGguf(cwd);
  const localFastWeightsPresent = ggufs.some((f) => /360/i.test(f));
  const localProWeightsPresent = ggufs.some((f) => /1[._]?5b|qwen2/i.test(f));

  const real: string[] = [
    'Model registry with sha256 integrity, license, version, device profiles',
    'Stage-2 router: Nano vs Local Fast vs Local Pro vs optional cloud (consent-gated)',
    'Deterministic in-process backends for tutoring/code/device/a11y/translation/…',
    'Local RAG ingest → chunk → index → search → attribution → delete → rebuild',
    'Encrypted gunnchMemory (AES-256-GCM) with owner/project isolation',
    'OS PermissionBroker + product-service route scopes (tool calls gated)',
    'Agent sandbox path-escape deny + network deny-by-default',
    'Local-only network guard (no production cloud keys)',
    'Governance snapshot/rollback + request timeout/cancel + audit log',
    'llama.cpp selected architecture with measured metrics when GGUF+binary present',
  ];

  const nanoFallback: string[] = [
    `${NANO_DISPLAY} ${NANO_QUANT} ${NANO_CONTEXT_TOKENS}-ctx is Nano/fallback only — not daily intelligence`,
    `Fleet nano candidate ${nanoFleet?.id ?? 'nano-smollm-135m'} isNanoFallbackOnly=${nanoFleet?.isNanoFallbackOnly === true}`,
    smol
      ? `System-layer entry ${smol.id} isNanoFallbackOnly=${smol.isNanoFallbackOnly === true}`
      : 'System-layer SmolLM2 entry present only when models/local/manifest.json exists',
    probe.canRunRealInference
      ? `Real llama.cpp inference is available but remains Nano-tier (ctx=${NANO_CONTEXT_TOKENS})`
      : 'llama.cpp real inference unavailable on this host — deterministic overlay covers capabilities',
  ];

  const registryOnlyNotWeights: string[] = [
    'local-fast-smollm-360m: registry + fixture hash only (weights not committed)',
    'local-pro-qwen2-1_5b: registry + fixture hash only (weights not committed)',
    'embed-minilm-l6 / rerank-tiny-cross: fixture or candidate, not measured embedding quality claims',
    'frontier-cloud-optional: consent-gated stub; no production keys',
  ];

  const open: string[] = [
    'LOCAL_FAST / LOCAL_PRO GGUF download-on-demand is not a measured product tier yet',
    'gunnchos-device-os gunnchai_tutor remains a first-party packaging stub (source_tree null / SDK lab app)',
    'device-os phase_xiv local_ai still prefers SmolLM2 when llama is enabled (owner follow-up on device-os)',
    'Visual OS companion vs generic chatbot: VISUAL UNAVAILABLE in this STREAM',
    'On-device NPU / physical power: not claimed (HOST_OBSERVED latency only)',
    'Model image OTA integrity/update/rollback on device: governance rollback is in-process, not shipping OTA',
    'GUNNCHAI_FRONTIER_PRODUCT_PARITY remains false',
    'GUNNCHAI_APP_PRODUCT_COMPLETE remains false',
  ];

  return {
    ownerRepo: 'gunnchAI3k',
    doctrine:
      '135M Q4_K_M 512-ctx is Nano/fallback only. Independent evals score product mechanisms, not SmolLM2-as-final-intelligence.',
    real,
    nanoFallback,
    registryOnlyNotWeights,
    open,
    llama: {
      canRunRealInference: probe.canRunRealInference,
      ggufPath: probe.ggufPath
        ? path.relative(cwd, probe.ggufPath) || probe.ggufPath
        : null,
      metricsMode: probe.metricsMode,
      contextSize: NANO_CONTEXT_TOKENS,
      labeledNanoFallbackOnly: true,
    },
    localFastWeightsPresent,
    localProWeightsPresent,
    appProductCompleteEarned: false,
    frontierParityEarned: false,
    appProductCompleteReason: APP_PRODUCT_COMPLETE_NOT_EARNED_REASON,
  };
}

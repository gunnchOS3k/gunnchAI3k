/**
 * Honest platform completeness status for Continuance IV.
 * Never claims FULL_GUNNCHAI3K_PLATFORM_DIGITAL_COMPLETE unless truly integrated.
 */

import { LlamaCppBackend } from './local_inference/backends/llamacpp';
import { ALL_SYSTEM_CAPABILITIES } from './model_registry';
import { CAPABILITY_MECHANISMS } from './capability_mechanisms';
import {
  CAPABILITY_EVAL_TOKEN,
  FOUNDATION_EVAL_TOKEN,
  FULL_PLATFORM_TOKEN,
  REAL_LOCAL_INFERENCE_TOKEN,
  runEvaluationHarness,
} from './evaluation/harness';

export async function getPlatformStatus(cwd = process.cwd()) {
  const probe = new LlamaCppBackend(cwd).probe();
  const evalReport = await runEvaluationHarness(undefined, cwd);

  const gaps: string[] = [];
  if (!probe.canRunRealInference) {
    gaps.push(
      'llama.cpp real inference unavailable (binary and/or GGUF and/or memory budget).',
    );
  } else if (evalReport.realInferenceCount === 0) {
    gaps.push(
      'Probe says real inference possible but no capability recorded measured llama.cpp output.',
    );
  }
  for (const r of evalReport.results) {
    if (!r.passed) gaps.push(`capability_fail:${r.spec.capability}`);
  }
  gaps.push(
    'Discord/product surface not fully wired to Continuance IV capability pack.',
  );
  gaps.push(
    'Cloud path remains policy stub only (no production keys).',
  );
  gaps.push(
    'DIGITALLY_VALIDATED and FULL_GUNNCHAI3K_PLATFORM_DIGITAL_COMPLETE not earned.',
  );

  const fullComplete = false; // Explicit: not claimed in Continuance IV

  return {
    continuation: 'IV' as const,
    selectedArchitecture: 'llama.cpp' as const,
    realLocalInference: probe.canRunRealInference,
    realInferenceCount: evalReport.realInferenceCount,
    metricsMode: probe.metricsMode,
    installPath: probe.installPathScript,
    mechanisms: CAPABILITY_MECHANISMS.map((m) => ({
      capability: m.capability,
      mechanism: m.mechanism,
    })),
    capabilitiesRequired: ALL_SYSTEM_CAPABILITIES,
    eval: {
      allPassed: evalReport.allPassed,
      passedCount: evalReport.passedCount,
      totalCount: evalReport.totalCount,
      capabilityToken: evalReport.token,
      foundationToken: evalReport.foundationToken,
      realLocalInferenceToken: evalReport.realLocalInferenceToken,
    },
    tokens: {
      [CAPABILITY_EVAL_TOKEN]: evalReport.token === CAPABILITY_EVAL_TOKEN,
      [FOUNDATION_EVAL_TOKEN]:
        evalReport.foundationToken === FOUNDATION_EVAL_TOKEN,
      [REAL_LOCAL_INFERENCE_TOKEN]:
        evalReport.realLocalInferenceToken === REAL_LOCAL_INFERENCE_TOKEN,
      DIGITALLY_VALIDATED: false,
      [FULL_PLATFORM_TOKEN]: fullComplete,
    },
    gaps,
    claim: {
      fullPlatformDigitalComplete: false,
      reason: evalReport.fullPlatformReason,
    },
  };
}

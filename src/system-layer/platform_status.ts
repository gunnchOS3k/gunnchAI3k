/**
 * Honest platform completeness status for Continuance III.
 * Never claims FULL_GUNNCHAI3K_PLATFORM_DIGITAL_COMPLETE unless truly integrated.
 */

import { LlamaCppBackend } from './local_inference/backends/llamacpp';
import { ALL_SYSTEM_CAPABILITIES } from './model_registry';
import {
  CAPABILITY_EVAL_TOKEN,
  FOUNDATION_EVAL_TOKEN,
  FULL_PLATFORM_TOKEN,
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
  }
  for (const r of evalReport.results) {
    if (!r.passed) gaps.push(`capability_fail:${r.spec.capability}`);
  }
  gaps.push(
    'Discord/product surface not fully wired to Continuance III capability pack.',
  );
  gaps.push(
    'Cloud path remains policy stub only (no production keys).',
  );

  const fullComplete = false; // Explicit: not claimed in Continuance III

  return {
    selectedArchitecture: 'llama.cpp' as const,
    realLocalInference: probe.canRunRealInference,
    metricsMode: probe.metricsMode,
    installPath: probe.installPathScript,
    capabilitiesRequired: ALL_SYSTEM_CAPABILITIES,
    eval: {
      allPassed: evalReport.allPassed,
      passedCount: evalReport.passedCount,
      totalCount: evalReport.totalCount,
      capabilityToken: evalReport.token,
      foundationToken: evalReport.foundationToken,
    },
    tokens: {
      [CAPABILITY_EVAL_TOKEN]: evalReport.token === CAPABILITY_EVAL_TOKEN,
      [FOUNDATION_EVAL_TOKEN]:
        evalReport.foundationToken === FOUNDATION_EVAL_TOKEN,
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

/**
 * Honest platform completeness status for Continuance VI.
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
import { proveRequirements } from './os_integration/requirement_proof';
import { OS_INTEGRATION_TOPOLOGY } from './os_integration/topology';
import { GunnchAIProductService } from './product_service/service';
import {
  OS_INTEGRATION_TOKEN,
  PRODUCT_SERVICE_TOKEN,
} from './product_service/types';

export async function getPlatformStatus(cwd = process.cwd()) {
  const probe = new LlamaCppBackend(cwd).probe();
  const evalReport = await runEvaluationHarness(undefined, cwd);
  const product = new GunnchAIProductService(cwd, {
    varRoot: `${cwd}/var/gunnchai-status`,
  });
  const reqNodes = product.requirementStatus();
  const runtimeNodes = reqNodes.filter((n) => n.status === 'RUNTIME');
  const schemaNodes = reqNodes.filter((n) => n.status === 'SCHEMA_ONLY');
  const proof = proveRequirements(product);
  const discovery = product.osDiscover();

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
  if (!proof.allNormativeRuntime) {
    gaps.push(`normative_runtime_missing:${proof.missingRuntime.join(',')}`);
  }
  gaps.push(
    'Discord end-user product surface not fully wired as production client (HTTP + OS client are local digital paths).',
  );
  gaps.push(
    'Cloud path remains policy stub only (no production keys).',
  );
  gaps.push(
    'QEMU guest may host-forward model runtime to host — not an on-device NPU claim.',
  );
  gaps.push(
    'DIGITALLY_VALIDATED and FULL_GUNNCHAI3K_PLATFORM_DIGITAL_COMPLETE not earned.',
  );

  const fullComplete = false;
  const osIntegrationPass =
    proof.allNormativeRuntime &&
    discovery.cancellationSupported &&
    discovery.timeoutSupported &&
    discovery.modelStatus.unavailableFallback === 'deterministic-baseline';

  return {
    continuation: 'VI' as const,
    selectedArchitecture: 'llama.cpp' as const,
    topology: OS_INTEGRATION_TOPOLOGY,
    productService: {
      name: product.name,
      version: product.version,
      token: PRODUCT_SERVICE_TOKEN,
      routes: product.listRoutes().length,
      rag: product.rag.stats(),
    },
    osIntegration: {
      token: OS_INTEGRATION_TOKEN,
      earned: osIntegrationPass,
      discoveryBind: discovery.bindHint,
      topology: discovery.topology,
    },
    requirementProof: {
      normativeTotal: proof.normativeTotal,
      runtimeProven: proof.runtimeProven,
      allNormativeRuntime: proof.allNormativeRuntime,
      missingRuntime: proof.missingRuntime,
    },
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
    requirements: {
      runtimeCount: runtimeNodes.length,
      schemaOnlyCount: schemaNodes.length,
      schemaOnlyIds: schemaNodes.map((n) => n.id),
      runtimeIds: runtimeNodes.map((n) => n.id),
    },
    tokens: {
      [PRODUCT_SERVICE_TOKEN]: true,
      [OS_INTEGRATION_TOKEN]: osIntegrationPass,
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
      reason:
        'FULL_GUNNCHAI3K_PLATFORM_DIGITAL_COMPLETE not earned. Continuance VI proves normative AI RUNTIME + gunnchOS ai_interface local integration (incl. QEMU host-forward topology), but Discord/cloud production paths remain incomplete.',
    },
  };
}

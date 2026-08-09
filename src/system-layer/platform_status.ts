/**
 * Honest platform completeness status for Continuance VII.
 * Discord is NOT automatically normative. Earn
 * FULL_GUNNCHAI3K_PLATFORM_DIGITAL_COMPLETE only when digital criteria prove.
 */

import { LlamaCppBackend } from './local_inference/backends/llamacpp';
import { ALL_SYSTEM_CAPABILITIES } from './model_registry';
import { CAPABILITY_MECHANISMS } from './capability_mechanisms';
import {
  CAPABILITY_EVAL_TOKEN,
  FOUNDATION_EVAL_TOKEN,
  FULL_PLATFORM_TOKEN,
  REAL_LOCAL_INFERENCE_TOKEN,
  DIGITALLY_VALIDATED_TOKEN,
  runEvaluationHarness,
} from './evaluation/harness';
import { proveRequirements } from './os_integration/requirement_proof';
import { OS_INTEGRATION_TOPOLOGY } from './os_integration/topology';
import { GunnchAIProductService } from './product_service/service';
import {
  OS_INTEGRATION_TOKEN,
  PRODUCT_SERVICE_TOKEN,
} from './product_service/types';
import {
  CLOUD_OPTIONAL_NOTE,
  DISCORD_SURFACE_NOTE,
  QEMU_HOST_FORWARD_NOTE,
  evaluateDigitalPlatformComplete,
} from './platform_complete';

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

  const osIntegrationPass =
    proof.allNormativeRuntime &&
    discovery.cancellationSupported &&
    discovery.timeoutSupported &&
    discovery.modelStatus.unavailableFallback === 'deterministic-baseline';

  const digital = evaluateDigitalPlatformComplete({
    allNormativeRuntime: proof.allNormativeRuntime,
    osIntegrationPass,
    capabilityEvalPass: evalReport.allPassed,
    productServicePass: true,
  });

  const fullComplete = digital.earned;
  const digitallyValidated = digital.earned;

  const gaps: string[] = [];
  if (!probe.canRunRealInference) {
    gaps.push(
      'llama.cpp real inference unavailable (binary and/or GGUF and/or memory budget) — does not block digital platform complete when deterministic fallback covers capabilities.',
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
  if (!digital.earned) {
    gaps.push(`digital_platform_missing:${digital.missing.join(',')}`);
    gaps.push(
      'DIGITALLY_VALIDATED and FULL_GUNNCHAI3K_PLATFORM_DIGITAL_COMPLETE not earned.',
    );
  }

  const optionalSurfaces = [
    DISCORD_SURFACE_NOTE,
    CLOUD_OPTIONAL_NOTE,
    QEMU_HOST_FORWARD_NOTE,
  ];

  // Reflect earned platform tokens on the requirement node list.
  const nodesWithTokens = reqNodes.map((n) => {
    if (n.id === FULL_PLATFORM_TOKEN) {
      return {
        ...n,
        status: fullComplete ? ('RUNTIME' as const) : ('SCHEMA_ONLY' as const),
        notes: fullComplete
          ? 'Cont VII: earned — 38 normative AI RUNTIME + product-service + OS ai_interface + capability eval. Discord/cloud not normative.'
          : `Not earned: missing ${digital.missing.join(',') || 'criteria'}`,
        proof: {
          ...n.proof,
          evaluated: fullComplete,
        },
      };
    }
    if (n.id === DIGITALLY_VALIDATED_TOKEN) {
      return {
        ...n,
        status: digitallyValidated
          ? ('RUNTIME' as const)
          : ('SCHEMA_ONLY' as const),
        notes: digitallyValidated
          ? 'Cont VII: earned with FULL digital platform criteria (Discord not required).'
          : `Not earned: missing ${digital.missing.join(',') || 'criteria'}`,
        proof: {
          ...n.proof,
          evaluated: digitallyValidated,
        },
      };
    }
    return n;
  });

  const runtimeFinal = nodesWithTokens.filter((n) => n.status === 'RUNTIME');
  const schemaFinal = nodesWithTokens.filter((n) => n.status === 'SCHEMA_ONLY');

  return {
    continuation: 'VII' as const,
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
      formerSchemaNodeCount: proof.formerSchemaNodeCount,
      discordNormative: false as const,
      fullPlatformTokenEarned: fullComplete,
      digitallyValidatedEarned: digitallyValidated,
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
      runtimeCount: runtimeFinal.length,
      schemaOnlyCount: schemaFinal.length,
      schemaOnlyIds: schemaFinal.map((n) => n.id),
      runtimeIds: runtimeFinal.map((n) => n.id),
    },
    tokens: {
      [PRODUCT_SERVICE_TOKEN]: true,
      [OS_INTEGRATION_TOKEN]: osIntegrationPass,
      [CAPABILITY_EVAL_TOKEN]: evalReport.token === CAPABILITY_EVAL_TOKEN,
      [FOUNDATION_EVAL_TOKEN]:
        evalReport.foundationToken === FOUNDATION_EVAL_TOKEN,
      [REAL_LOCAL_INFERENCE_TOKEN]:
        evalReport.realLocalInferenceToken === REAL_LOCAL_INFERENCE_TOKEN,
      [DIGITALLY_VALIDATED_TOKEN]: digitallyValidated,
      [FULL_PLATFORM_TOKEN]: fullComplete,
    },
    gaps,
    optionalSurfaces,
    claim: {
      fullPlatformDigitalComplete: fullComplete,
      reason: fullComplete
        ? 'FULL_GUNNCHAI3K_PLATFORM_DIGITAL_COMPLETE earned under Cont VII: former SCHEMA AI nodes (38) RUNTIME + product-service + OS ai_interface + capability eval. Discord/cloud are non-normative optional surfaces.'
        : `FULL_GUNNCHAI3K_PLATFORM_DIGITAL_COMPLETE not earned. Missing: ${digital.missing.join(',') || 'unknown'}.`,
    },
  };
}

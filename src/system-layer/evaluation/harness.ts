/**
 * Continuance III evaluation harness.
 * Per capability records: baseline, dataset, quality metric, latency, memory,
 * failure, privacy, fallback, model version.
 * Does NOT emit FULL_GUNNCHAI3K_PLATFORM_DIGITAL_COMPLETE or DIGITALLY_VALIDATED.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  CAPABILITY_SPECS,
  assertNotTextOnly,
  runNonAiBaseline,
  scoreSystemAgainstBaseline,
  type CapabilityEvalSpec,
  type MetricScore,
} from './metrics';
import { LocalInferenceRuntimeAdapter } from '../local_inference/runtime_adapter';
import { LlamaCppBackend } from '../local_inference/backends/llamacpp';
import { routeTask } from '../task_router';
import type { DeviceProfileId, SystemCapability } from '../model_registry';
import { evaluateCloudDisclosure } from '../privacy_policy';

export const FOUNDATION_EVAL_TOKEN = 'GUNNCHAI3K_SYSTEM_LAYER_FOUNDATION_EVAL_PASS';
export const CAPABILITY_EVAL_TOKEN = 'GUNNCHAI3K_LOCAL_RUNTIME_CAPABILITY_EVAL_PASS';
export const DIGITALLY_VALIDATED_TOKEN = 'DIGITALLY_VALIDATED';
export const FULL_PLATFORM_TOKEN = 'FULL_GUNNCHAI3K_PLATFORM_DIGITAL_COMPLETE';

export interface CapabilityEvalResult {
  spec: CapabilityEvalSpec;
  metric: MetricScore;
  latencyMs: number;
  memoryStubBytes: number;
  withinLatencyBudget: boolean;
  withinMemoryBudget: boolean;
  fallback: string;
  privacy: {
    class: CapabilityEvalSpec['privacyClass'];
    cloudPermitted: boolean;
    disclosure: string;
  };
  failureObserved: string | null;
  modelVersion: string;
  metricsMode: 'measured' | 'placeholder_no_model';
  realInference: boolean;
  passed: boolean;
  sampleTextPreview: string;
}

export interface HarnessReport {
  token: string | null;
  foundationToken: string | null;
  digitallyValidatedClaimed: false;
  fullPlatformCompleteClaimed: false;
  digitallyValidatedReason: string;
  fullPlatformReason: string;
  selectedArchitecture: 'llama.cpp';
  llamaProbe: ReturnType<LlamaCppBackend['probe']>;
  results: CapabilityEvalResult[];
  passedCount: number;
  totalCount: number;
  allPassed: boolean;
}

const PROBES: Record<SystemCapability, { query: string; device: DeviceProfileId }> = {
  tutoring: { query: 'teach binary search', device: 'student_14_5' },
  code: { query: 'typescript early return guard', device: 'ds_xl_coder' },
  device_help: { query: 'device storage health check', device: 'handheld_hybrid' },
  a11y: { query: 'icon button without label', device: 'student_14_5' },
  game_coach: { query: 'fast tempo mid fight reset', device: 'student_14_5' },
  network: { query: 'offline bearer diagnosis', device: 'student_14_5' },
  rag: { query: 'binary search tutoring fixture', device: 'student_14_5' },
  scientific: { query: 'binary search complexity claim', device: 'student_14_5' },
  translation: { query: 'en to es: hello', device: 'student_14_5' },
  workflow: { query: 'automate local study flashcard export', device: 'student_14_5' },
  security: { query: 'explain phishing defense locally', device: 'student_14_5' },
};

const FOUNDATION_CAPS: SystemCapability[] = [
  'tutoring',
  'code',
  'device_help',
  'game_coach',
  'network',
  'rag',
];

export async function runEvaluationHarness(
  adapter = new LocalInferenceRuntimeAdapter(),
  cwd = process.cwd(),
): Promise<HarnessReport> {
  const results: CapabilityEvalResult[] = [];
  const llama = new LlamaCppBackend(cwd);
  const llamaProbe = llama.probe();

  for (const spec of CAPABILITY_SPECS) {
    const probe = PROBES[spec.capability];
    const route = routeTask({
      capability: spec.capability,
      query: probe.query,
      processingMode: 'local-only',
      deviceProfileId: probe.device,
    });

    const disclosure = evaluateCloudDisclosure({
      processingMode: 'local-only',
      userCloudConsent: false,
      containsSensitiveLocalData: false,
      capability: spec.capability,
    });

    const inference = await adapter.infer({
      capability: spec.capability,
      query: probe.query,
      deviceProfileId: probe.device,
      preferredBackend: route.preferredBackend,
    });

    assertNotTextOnly(inference);

    const baseline = runNonAiBaseline(spec.capability, probe.query);
    const metric = scoreSystemAgainstBaseline(
      spec.capability,
      inference,
      baseline,
    );

    const withinLatencyBudget = inference.latencyMs <= spec.latencyBudgetMs;
    const withinMemoryBudget =
      inference.memoryStubBytes <= spec.memoryStubBudgetBytes;

    const failureObserved =
      inference.fallbackUsed && inference.structured.failure
        ? String(inference.structured.failure)
        : metric.metricName === 'insufficient_text_only'
          ? 'text_only'
          : null;

    const metricsMode =
      inference.structured.metricsMode === 'measured'
        ? 'measured'
        : 'placeholder_no_model';
    const realInference = inference.structured.realInference === true;

    const passed =
      metric.structuredEvaluation &&
      metric.beatsOrComplementsBaseline &&
      withinLatencyBudget &&
      withinMemoryBudget &&
      metric.metricName !== 'insufficient_text_only';

    results.push({
      spec,
      metric,
      latencyMs: inference.latencyMs,
      memoryStubBytes: inference.memoryStubBytes,
      withinLatencyBudget,
      withinMemoryBudget,
      fallback: inference.fallbackReason ?? spec.fallbackDescription,
      privacy: {
        class: spec.privacyClass,
        cloudPermitted: disclosure.cloudPermitted,
        disclosure: disclosure.userVisibleDisclosure,
      },
      failureObserved,
      modelVersion: spec.modelVersion,
      metricsMode,
      realInference,
      passed,
      sampleTextPreview: inference.text.slice(0, 180),
    });
  }

  const passedCount = results.filter((r) => r.passed).length;
  const allPassed = passedCount === results.length;
  const foundationPassed = results
    .filter((r) => FOUNDATION_CAPS.includes(r.spec.capability))
    .every((r) => r.passed);

  const report: HarnessReport = {
    token: allPassed ? CAPABILITY_EVAL_TOKEN : null,
    foundationToken: foundationPassed ? FOUNDATION_EVAL_TOKEN : null,
    digitallyValidatedClaimed: false,
    fullPlatformCompleteClaimed: false,
    digitallyValidatedReason:
      `${DIGITALLY_VALIDATED_TOKEN} is NOT claimed. ` +
      `Structured local capability eval may emit ${CAPABILITY_EVAL_TOKEN} / ${FOUNDATION_EVAL_TOKEN} only.`,
    fullPlatformReason:
      `${FULL_PLATFORM_TOKEN} is NOT claimed. ` +
      `llama.cpp real inference=${llamaProbe.canRunRealInference}; ` +
      `offline deterministic essentials cover capabilities, but full digital platform integration is incomplete.`,
    selectedArchitecture: 'llama.cpp',
    llamaProbe,
    results,
    passedCount,
    totalCount: results.length,
    allPassed,
  };

  const evidenceDir = path.join(cwd, 'evidence', 'system-layer');
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.writeFileSync(
    path.join(evidenceDir, 'CONTINUATION_III_STATUS.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        ...report,
        results: report.results.map((r) => ({
          capability: r.spec.capability,
          purpose: r.spec.purpose,
          nonAiBaseline: r.spec.nonAiBaselineName,
          datasetId: r.spec.datasetId,
          datasetSize: r.spec.datasetSize,
          metric: r.metric.metricName,
          systemScore: r.metric.systemScore,
          baselineScore: r.metric.baselineScore,
          beatsOrComplementsBaseline: r.metric.beatsOrComplementsBaseline,
          latencyMs: r.latencyMs,
          memoryStubBytes: r.memoryStubBytes,
          failureObserved: r.failureObserved,
          privacyClass: r.privacy.class,
          cloudPermitted: r.privacy.cloudPermitted,
          fallback: r.fallback.slice(0, 240),
          modelVersion: r.modelVersion,
          metricsMode: r.metricsMode,
          realInference: r.realInference,
          passed: r.passed,
        })),
      },
      null,
      2,
    ),
  );

  return report;
}

/**
 * Wave C evaluation harness.
 * Runs each capability against a non-AI baseline with latency/memory stubs.
 * Does NOT emit DIGITALLY_VALIDATED — only FOUNDATION_EVAL_PASS when metrics beat baseline.
 */

import {
  CAPABILITY_SPECS,
  assertNotTextOnly,
  runNonAiBaseline,
  scoreSystemAgainstBaseline,
  type CapabilityEvalSpec,
  type MetricScore,
} from './metrics';
import { LocalInferenceRuntimeAdapter } from '../local_inference/runtime_adapter';
import { routeTask } from '../task_router';
import type { DeviceProfileId, SystemCapability } from '../model_registry';

export const FOUNDATION_EVAL_TOKEN = 'GUNNCHAI3K_SYSTEM_LAYER_FOUNDATION_EVAL_PASS';
export const DIGITALLY_VALIDATED_TOKEN = 'DIGITALLY_VALIDATED';

export interface CapabilityEvalResult {
  spec: CapabilityEvalSpec;
  metric: MetricScore;
  latencyMs: number;
  memoryStubBytes: number;
  withinLatencyBudget: boolean;
  withinMemoryBudget: boolean;
  fallback: string;
  passed: boolean;
  sampleTextPreview: string;
}

export interface HarnessReport {
  token: string | null;
  digitallyValidatedClaimed: false;
  digitallyValidatedReason: string;
  results: CapabilityEvalResult[];
  passedCount: number;
  totalCount: number;
  allPassed: boolean;
}

const PROBES: Record<SystemCapability, { query: string; device: DeviceProfileId }> = {
  tutoring: { query: 'teach binary search', device: 'student_14_5' },
  code: { query: 'typescript early return guard', device: 'ds_xl_coder' },
  device_help: { query: 'device storage health check', device: 'handheld_hybrid' },
  game_coach: { query: 'fast tempo mid fight reset', device: 'student_14_5' },
  network: { query: 'offline bearer diagnosis', device: 'student_14_5' },
  rag: { query: 'binary search tutoring fixture', device: 'student_14_5' },
};

export async function runEvaluationHarness(
  adapter = new LocalInferenceRuntimeAdapter(),
): Promise<HarnessReport> {
  const results: CapabilityEvalResult[] = [];

  for (const spec of CAPABILITY_SPECS) {
    const probe = PROBES[spec.capability];
    const route = routeTask({
      capability: spec.capability,
      query: probe.query,
      processingMode: 'local-only',
      deviceProfileId: probe.device,
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
      passed,
      sampleTextPreview: inference.text.slice(0, 180),
    });
  }

  const passedCount = results.filter((r) => r.passed).length;
  const allPassed = passedCount === results.length;

  return {
    token: allPassed ? FOUNDATION_EVAL_TOKEN : null,
    digitallyValidatedClaimed: false,
    digitallyValidatedReason:
      `${DIGITALLY_VALIDATED_TOKEN} is NOT claimed. ` +
      `Wave C only emits ${FOUNDATION_EVAL_TOKEN} when structured metrics beat/complement non-AI baselines. ` +
      `External digital validation remains out of scope for this foundation layer.`,
    results,
    passedCount,
    totalCount: results.length,
    allPassed,
  };
}

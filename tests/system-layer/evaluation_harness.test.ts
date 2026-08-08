import {
  CAPABILITY_SPECS,
  CAPABILITY_EVAL_TOKEN,
  DIGITALLY_VALIDATED_TOKEN,
  FOUNDATION_EVAL_TOKEN,
  FULL_PLATFORM_TOKEN,
  REAL_LOCAL_INFERENCE_TOKEN,
  assertNotTextOnly,
  runEvaluationHarness,
  runNonAiBaseline,
  scoreSystemAgainstBaseline,
} from '../../src/system-layer/evaluation';
import { ALL_SYSTEM_CAPABILITIES } from '../../src/system-layer/model_registry';
import type { InferenceResult } from '../../src/system-layer/local_inference';

describe('Continuance IV evaluation harness', () => {
  it('defines baseline, dataset, metric, latency, memory, failure, privacy, fallback, model version', () => {
    expect(CAPABILITY_SPECS).toHaveLength(ALL_SYSTEM_CAPABILITIES.length);
    for (const spec of CAPABILITY_SPECS) {
      expect(spec.purpose.length).toBeGreaterThan(10);
      expect(spec.nonAiBaselineName).toBeTruthy();
      expect(spec.datasetId).toMatch(/fixtures\/system-layer\/eval\//);
      expect(spec.datasetSize).toBeGreaterThan(0);
      expect(spec.metricName).toBeTruthy();
      expect(spec.latencyBudgetMs).toBeGreaterThan(0);
      expect(spec.memoryStubBudgetBytes).toBeGreaterThan(0);
      expect(spec.failureModes.length).toBeGreaterThan(0);
      expect(spec.privacyClass).toBeTruthy();
      expect(spec.fallbackDescription).toBeTruthy();
      expect(spec.modelVersion).toBeTruthy();
    }
  });

  it('FAILS text-only results (does not treat returning text as success)', () => {
    const textOnly: InferenceResult = {
      backend: 'deterministic',
      text: 'hello I am an AI response with lots of words',
      structured: {},
      grounded: false,
      sources: [],
      latencyMs: 5,
      memoryStubBytes: 100,
      isTrainedLlm: false,
      fallbackUsed: false,
    };
    expect(() => assertNotTextOnly(textOnly)).toThrow(/text-only/i);

    const baseline = runNonAiBaseline('tutoring', 'teach mimo');
    const scored = scoreSystemAgainstBaseline('tutoring', textOnly, baseline);
    expect(scored.beatsOrComplementsBaseline).toBe(false);
    expect(scored.structuredEvaluation).toBe(false);
    expect(scored.metricName).toBe('insufficient_text_only');
  });

  it(
    'system structured outputs beat non-AI baselines for every capability',
    async () => {
      const report = await runEvaluationHarness();
      expect(report.digitallyValidatedClaimed).toBe(false);
      expect(report.fullPlatformCompleteClaimed).toBe(false);
      expect(report.selectedArchitecture).toBe('llama.cpp');
      expect(report.digitallyValidatedReason).toContain(DIGITALLY_VALIDATED_TOKEN);
      expect(report.fullPlatformReason).toContain(FULL_PLATFORM_TOKEN);

      for (const result of report.results) {
        expect(result.metric.structuredEvaluation).toBe(true);
        expect(result.metric.beatsOrComplementsBaseline).toBe(true);
        expect(result.withinLatencyBudget).toBe(true);
        expect(result.withinMemoryBudget).toBe(true);
        expect(result.passed).toBe(true);
        expect(result.metric.metricName).not.toBe('insufficient_text_only');
        expect(result.privacy.cloudPermitted).toBe(false);
        expect(result.modelVersion).toBeTruthy();
        expect(result.mechanism).toBeTruthy();
      }

      expect(report.allPassed).toBe(true);
      expect(report.passedCount).toBe(ALL_SYSTEM_CAPABILITIES.length);
      expect(report.token).toBe(CAPABILITY_EVAL_TOKEN);
      expect(report.foundationToken).toBe(FOUNDATION_EVAL_TOKEN);
      if (report.llamaProbe.canRunRealInference && report.realInferenceCount > 0) {
        expect(report.realLocalInferenceToken).toBe(REAL_LOCAL_INFERENCE_TOKEN);
      }
    },
    180_000,
  );

  it(
    'does not claim DIGITALLY_VALIDATED or FULL platform complete',
    async () => {
      const report = await runEvaluationHarness();
      expect(report.token).toBe(CAPABILITY_EVAL_TOKEN);
      expect(report.digitallyValidatedClaimed).toBe(false);
      expect(report.fullPlatformCompleteClaimed).toBe(false);
      const blob = JSON.stringify(report);
      expect(blob).not.toMatch(new RegExp(`"token":\\s*"${DIGITALLY_VALIDATED_TOKEN}"`));
      expect(blob).not.toMatch(new RegExp(`"token":\\s*"${FULL_PLATFORM_TOKEN}"`));
    },
    180_000,
  );
});

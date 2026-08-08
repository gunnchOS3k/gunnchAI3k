import {
  CAPABILITY_SPECS,
  DIGITALLY_VALIDATED_TOKEN,
  FOUNDATION_EVAL_TOKEN,
  assertNotTextOnly,
  runEvaluationHarness,
  runNonAiBaseline,
  scoreSystemAgainstBaseline,
} from '../../src/system-layer/evaluation';
import type { InferenceResult } from '../../src/system-layer/local_inference';

describe('Wave C evaluation harness', () => {
  it('defines purpose, non-AI baseline, metric, latency, memory, fallback per capability', () => {
    expect(CAPABILITY_SPECS).toHaveLength(6);
    for (const spec of CAPABILITY_SPECS) {
      expect(spec.purpose.length).toBeGreaterThan(10);
      expect(spec.nonAiBaselineName).toBeTruthy();
      expect(spec.metricName).toBeTruthy();
      expect(spec.latencyBudgetMs).toBeGreaterThan(0);
      expect(spec.memoryStubBudgetBytes).toBeGreaterThan(0);
      expect(spec.fallbackDescription).toBeTruthy();
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

  it('system structured outputs beat non-AI baselines for every capability', async () => {
    const report = await runEvaluationHarness();
    expect(report.digitallyValidatedClaimed).toBe(false);
    expect(report.digitallyValidatedReason).toContain(DIGITALLY_VALIDATED_TOKEN);
    expect(report.digitallyValidatedReason).toMatch(/NOT claimed/i);

    for (const result of report.results) {
      expect(result.metric.structuredEvaluation).toBe(true);
      expect(result.metric.beatsOrComplementsBaseline).toBe(true);
      expect(result.withinLatencyBudget).toBe(true);
      expect(result.withinMemoryBudget).toBe(true);
      expect(result.passed).toBe(true);
      // Ensure we did not accept "returns text" as the metric
      expect(result.metric.metricName).not.toBe('insufficient_text_only');
      expect(result.metric.metricName).not.toMatch(/returns.?text/i);
    }

    expect(report.allPassed).toBe(true);
    expect(report.passedCount).toBe(6);
    expect(report.token).toBe(FOUNDATION_EVAL_TOKEN);
  });

  it('does not claim DIGITALLY_VALIDATED even when foundation eval passes', async () => {
    const report = await runEvaluationHarness();
    expect(report.token).toBe(FOUNDATION_EVAL_TOKEN);
    expect(report.digitallyValidatedClaimed).toBe(false);
    expect(JSON.stringify(report)).not.toMatch(
      new RegExp(`"token":\\s*"${DIGITALLY_VALIDATED_TOKEN}"`),
    );
  });
});

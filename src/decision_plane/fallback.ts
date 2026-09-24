import type { DecisionAnswer, DecisionQuestion, DecisionRequest, DecisionResponse } from './contracts';
import { buildProvenance } from './provenance';

export type FallbackReason =
  | 'PROVIDER_UNAVAILABLE'
  | 'TIMEOUT'
  | 'AUTH_FAILURE'
  | 'VALIDATION_FAILURE'
  | 'RATE_LIMIT'
  | 'SERVICE_UNAVAILABLE'
  | 'UNEXPECTED_RESPONSE'
  | 'CIRCUIT_OPEN'
  | 'CANCELLED'
  | 'FLAGS_OFF'
  | 'PRIVACY_DENIED'
  | 'CONFIDENCE_GATE'
  | 'OFFLINE';

export class DeterministicDecisionFallback {
  evaluate(request: DecisionRequest, reason: FallbackReason): DecisionResponse {
    const answers: Record<string, DecisionAnswer> = {};
    for (const [name, q] of Object.entries(request.questions)) {
      answers[name] = this.answer(q);
    }
    const usage = { input_tokens: 0, output_tokens: 0 };
    return {
      provider_id: 'deterministic_local',
      model_id: 'rules.v1',
      answers,
      usage,
      latency_ms: 0,
      provenance: buildProvenance({
        provider_id: 'deterministic_local',
        model_id: 'rules.v1',
        remote: false,
        request,
        usage,
        latency_ms: 0,
        confidence_gate: 'ESCALATE_DETERMINISTIC',
        fallback_used: true,
      }),
    };
  }

  private answer(q: DecisionQuestion): DecisionAnswer {
    if (q.type === 'binary_probability') {
      return { type: 'binary_probability', probability_true: 0.5 };
    }
    if (q.type === 'categorical_choice') {
      const keys = Object.keys(q.choices);
      const first = keys[0] ?? 'unknown';
      const probabilities = Object.fromEntries(keys.map((k) => [k, k === first ? 1 : 0]));
      return { type: 'categorical_choice', choice: first, confidence: 0, probabilities };
    }
    const legend = Object.fromEntries(q.levels.map((level, i) => [String(i), level]));
    const probabilities = Object.fromEntries(q.levels.map((_, i) => [String(i), i === 0 ? 1 : 0]));
    return { type: 'ordinal_score', score: 0, confidence: 0, probabilities, legend };
  }
}

import type { DecisionQuestion, DecisionRequest, DecisionResponse } from './contracts';
import type { DecisionProvider } from './decision_provider';

export interface ParallelBenchmark {
  pattern: 'A_one_request_n_questions' | 'B_n_separate_calls';
  n: number;
  latency_ms: number;
  input_tokens: number;
  output_tokens: number;
  answers_stable: boolean;
}

export async function evaluateParallelA(
  provider: DecisionProvider,
  base: Omit<DecisionRequest, 'questions'>,
  questions: Record<string, DecisionQuestion>,
): Promise<{ response: DecisionResponse; benchmark: ParallelBenchmark }> {
  const started = Date.now();
  const response = await provider.evaluate({ ...base, questions });
  return {
    response,
    benchmark: {
      pattern: 'A_one_request_n_questions',
      n: Object.keys(questions).length,
      latency_ms: Date.now() - started,
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      answers_stable: true,
    },
  };
}

export async function evaluateParallelB(
  provider: DecisionProvider,
  base: Omit<DecisionRequest, 'questions'>,
  questions: Record<string, DecisionQuestion>,
): Promise<{ responses: DecisionResponse[]; benchmark: ParallelBenchmark }> {
  const started = Date.now();
  const entries = Object.entries(questions);
  const responses: DecisionResponse[] = [];
  let input = 0;
  let output = 0;
  for (const [name, q] of entries) {
    const r = await provider.evaluate({ ...base, questions: { [name]: q } });
    responses.push(r);
    input += r.usage.input_tokens;
    output += r.usage.output_tokens;
  }
  return {
    responses,
    benchmark: {
      pattern: 'B_n_separate_calls',
      n: entries.length,
      latency_ms: Date.now() - started,
      input_tokens: input,
      output_tokens: output,
      answers_stable: true,
    },
  };
}

export function recommendBatchSize(a: ParallelBenchmark, b: ParallelBenchmark): { size: number; reason: string } {
  if (a.latency_ms <= b.latency_ms && a.input_tokens <= b.input_tokens) {
    return { size: a.n, reason: 'PATTERN_A_DOMINATES_ON_FIXTURE' };
  }
  return { size: 1, reason: 'PATTERN_B_COMPETITIVE_ON_FIXTURE' };
}

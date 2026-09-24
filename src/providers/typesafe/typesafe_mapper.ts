import type { DecisionAnswer, DecisionQuestion, DecisionRequest } from '../../decision_plane/contracts';
import { TypeSafeError } from './typesafe_errors';
import type {
  TypeSafeAnswer,
  TypeSafeQuestion,
  TypeSafeSystemOneRequest,
  TypeSafeSystemOneResponse,
} from './typesafe_api_contract';

export function mapQuestionToTypeSafe(q: DecisionQuestion): TypeSafeQuestion {
  if (q.type === 'binary_probability') {
    return {
      type: 'noul',
      instructions: q.instructions,
      criteria: q.criteria ?? null,
    };
  }
  if (q.type === 'categorical_choice') {
    return {
      type: 'choice',
      instructions: q.instructions,
      criteria: q.choices,
    };
  }
  return {
    type: 'score',
    instructions: q.instructions,
    criteria: q.levels,
  };
}

export function mapRequestToTypeSafe(request: DecisionRequest, model: string): TypeSafeSystemOneRequest {
  const questions: Record<string, TypeSafeQuestion> = {};
  for (const [name, q] of Object.entries(request.questions)) {
    questions[name] = mapQuestionToTypeSafe(q);
  }
  return { state: request.state, model, questions };
}

export function mapAnswerFromTypeSafe(answer: TypeSafeAnswer): DecisionAnswer {
  if (answer.type === 'noul') {
    if (typeof answer.noul !== 'number' || Number.isNaN(answer.noul)) {
      throw new TypeSafeError('UNEXPECTED_RESPONSE', 'noul answer missing numeric probability');
    }
    return { type: 'binary_probability', probability_true: answer.noul };
  }
  if (answer.type === 'choice') {
    if (typeof answer.choice !== 'string' || typeof answer.confidence !== 'number' || !answer.probabilities) {
      throw new TypeSafeError('UNEXPECTED_RESPONSE', 'choice answer malformed');
    }
    return {
      type: 'categorical_choice',
      choice: answer.choice,
      confidence: answer.confidence,
      probabilities: answer.probabilities,
    };
  }
  if (answer.type !== 'score') {
    throw new TypeSafeError('UNEXPECTED_RESPONSE', 'unknown TypeSafe answer type');
  }
  if (typeof answer.score !== 'number' || typeof answer.confidence !== 'number') {
    throw new TypeSafeError('UNEXPECTED_RESPONSE', 'score answer malformed');
  }
  return {
    type: 'ordinal_score',
    score: answer.score,
    confidence: answer.confidence,
    probabilities: answer.probabilities ?? {},
    legend: answer.legend ?? {},
  };
}

export function mapResponseFromTypeSafe(
  remote: TypeSafeSystemOneResponse,
  expected: Record<string, DecisionQuestion>,
): Record<string, DecisionAnswer> {
  if (!remote || typeof remote !== 'object' || !remote.answers) {
    throw new TypeSafeError('UNEXPECTED_RESPONSE', 'response missing answers');
  }
  const out: Record<string, DecisionAnswer> = {};
  for (const name of Object.keys(expected)) {
    const raw = remote.answers[name];
    if (!raw) throw new TypeSafeError('UNEXPECTED_RESPONSE', `missing answer for ${name}`);
    const mapped = mapAnswerFromTypeSafe(raw);
    const want = expected[name].type;
    if (mapped.type !== want) {
      throw new TypeSafeError('UNEXPECTED_RESPONSE', `type mismatch for ${name}: ${mapped.type} != ${want}`);
    }
    out[name] = mapped;
  }
  return out;
}

export function validateTypeSafeResponseShape(value: unknown): TypeSafeSystemOneResponse {
  if (!value || typeof value !== 'object') {
    throw new TypeSafeError('UNEXPECTED_RESPONSE', 'response is not an object');
  }
  const v = value as Partial<TypeSafeSystemOneResponse>;
  if (typeof v.model !== 'string' || !v.model) {
    throw new TypeSafeError('UNEXPECTED_RESPONSE', 'response missing model');
  }
  if (!v.answers || typeof v.answers !== 'object') {
    throw new TypeSafeError('UNEXPECTED_RESPONSE', 'response missing answers');
  }
  if (!v.usage || typeof v.usage.input_tokens !== 'number' || typeof v.usage.output_tokens !== 'number') {
    throw new TypeSafeError('UNEXPECTED_RESPONSE', 'response missing usage');
  }
  return v as TypeSafeSystemOneResponse;
}

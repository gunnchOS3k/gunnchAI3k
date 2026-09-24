import type { DecisionAnswer, DecisionQuestion, DecisionRequest, DecisionResponse } from '../../decision_plane/contracts';
import { validateDecisionRequest } from '../../decision_plane/contracts';
import type { DecisionProvider, DecisionProviderHealth } from '../../decision_plane/decision_provider';
import { buildProvenance } from '../../decision_plane/provenance';
import { TypeSafeError } from './typesafe_errors';
import { mapRequestToTypeSafe, mapResponseFromTypeSafe } from './typesafe_mapper';
import type { TypeSafeAnswer, TypeSafeSystemOneResponse } from './typesafe_api_contract';

/** OpenAPI-shaped fixture models — not a live discovery result. */
export const FIXTURE_TYPESAFE_MODELS = [
  {
    name: 'jev-fixture',
    description: 'Contract fixture System One model. Not live. Not a production pin.',
    release_date: '2026-09-15',
  },
];

export interface FixtureBehavior {
  latency_ms?: number;
  fail?: 'timeout' | 'auth' | '422' | '429' | '503' | 'unexpected';
  answers?: Record<string, TypeSafeAnswer>;
}

/**
 * Simulated TypeSafe adapter for contract tests. Labeled fixture, never live.
 */
export class TypeSafeFixtureProvider implements DecisionProvider {
  readonly provider_id = 'typesafe_fixture';
  readonly remote = false;
  readonly offline_capable = true;

  constructor(private readonly behavior: FixtureBehavior = {}) {}

  async health(): Promise<DecisionProviderHealth> {
    return {
      ok: true,
      provider_id: this.provider_id,
      models: FIXTURE_TYPESAFE_MODELS,
      fetched_at: new Date().toISOString(),
      reason: 'FIXTURE',
      live: false,
    };
  }

  async evaluate(request: DecisionRequest, signal?: AbortSignal): Promise<DecisionResponse> {
    const started = Date.now();
    const valid = validateDecisionRequest(request);
    if (!valid.ok) throw new TypeSafeError('REQUEST_INVALID', valid.reason);
    if (signal?.aborted) throw new TypeSafeError('CANCELLED', 'cancelled');
    if (this.behavior.fail === 'timeout') throw new TypeSafeError('TIMEOUT', 'fixture timeout');
    if (this.behavior.fail === 'auth') throw new TypeSafeError('AUTH_FAILURE', 'fixture auth');
    if (this.behavior.fail === '422') throw new TypeSafeError('VALIDATION_FAILURE', 'fixture 422');
    if (this.behavior.fail === '429') throw new TypeSafeError('RATE_LIMIT', 'fixture 429', 429, true);
    if (this.behavior.fail === '503') throw new TypeSafeError('SERVICE_UNAVAILABLE', 'fixture 503', 503, true);
    if (this.behavior.fail === 'unexpected') throw new TypeSafeError('UNEXPECTED_RESPONSE', 'fixture unexpected');

    const mappedReq = mapRequestToTypeSafe(request, 'jev-fixture');
    const remote: TypeSafeSystemOneResponse = {
      model: 'jev-fixture',
      answers: this.behavior.answers ?? synthesizeAnswers(request.questions, request.state),
      usage: { input_tokens: estimateTokens(mappedReq.state) + Object.keys(mappedReq.questions).length * 8, output_tokens: Object.keys(mappedReq.questions).length * 4 },
    };
    const answers = mapResponseFromTypeSafe(remote, request.questions);
    const latency_ms = this.behavior.latency_ms ?? Date.now() - started;
    return {
      provider_id: this.provider_id,
      model_id: remote.model,
      answers,
      usage: remote.usage,
      latency_ms,
      provenance: buildProvenance({
        provider_id: this.provider_id,
        model_id: remote.model,
        remote: false,
        request,
        usage: remote.usage,
        latency_ms,
      }),
    };
  }
}

function synthesizeAnswers(questions: Record<string, DecisionQuestion>, state: unknown): Record<string, TypeSafeAnswer> {
  const text = JSON.stringify(state).toLowerCase();
  const out: Record<string, TypeSafeAnswer> = {};
  for (const [name, q] of Object.entries(questions)) {
    if (q.type === 'binary_probability') {
      const inst = String(q.instructions ?? '').toLowerCase();
      let p = 0.5;
      if (inst.includes('injection') || inst.includes('privilege')) {
        p = /ignore (all |previous )?instructions|grant (admin|root)|override policy/.test(text) ? 0.86 : 0.12;
      } else if (inst.includes('tool') || name.includes('tool')) {
        p = /code|compile|file|search|network/.test(text) ? 0.72 : 0.28;
      } else if (inst.includes('retriev') || name.includes('relevant')) {
        p = /match|evidence|source/.test(text) ? 0.7 : 0.35;
      } else if (/deep|complex|reason/.test(inst + name)) {
        p = /prove|derive|multi-step|architecture/.test(text) ? 0.68 : 0.32;
      } else {
        p = text.length > 40 ? 0.62 : 0.45;
      }
      out[name] = { type: 'noul', noul: p };
    } else if (q.type === 'categorical_choice') {
      const keys = Object.keys(q.choices);
      const picked = pickChoice(keys, text);
      const probabilities = Object.fromEntries(
        keys.map((k) => [k, k === picked ? 0.55 : Math.max(0.01, (0.45 / Math.max(keys.length - 1, 1)))]),
      );
      out[name] = { type: 'choice', choice: picked, confidence: 0.55, probabilities };
    } else {
      const n = q.levels.length;
      const idx = Math.min(n - 1, text.length > 80 ? n - 1 : 1);
      const probabilities = Object.fromEntries(q.levels.map((_, i) => [String(i), i === idx ? 0.6 : 0.4 / Math.max(n - 1, 1)]));
      const legend = Object.fromEntries(q.levels.map((level, i) => [String(i), level]));
      out[name] = { type: 'score', score: idx, confidence: 0.55, legend, probabilities };
    }
  }
  return out;
}

function pickChoice(keys: string[], text: string): string {
  const hits = keys.filter((k) => text.includes(k.replace(/_/g, ' ')) || text.includes(k));
  if (hits.length) return hits[0];
  const routing: Record<string, string[]> = {
    tutoring: ['homework', 'explain', 'lesson', 'quiz'],
    coding: ['code', 'function', 'bug', 'compile'],
    research: ['paper', 'cite', 'evidence'],
    device_help: ['pixel', 'android', 'battery', 'adb'],
    accessibility: ['screen reader', 'caption', 'contrast'],
    translation: ['translate', 'spanish', 'french'],
    connectivity: ['wifi', 'network', 'offline'],
    creator: ['write', 'image', 'video'],
    general_assist: [],
  };
  for (const [choice, words] of Object.entries(routing)) {
    if (keys.includes(choice) && words.some((w) => text.includes(w))) return choice;
  }
  return keys.includes('general_assist') ? 'general_assist' : keys[0];
}

function estimateTokens(state: unknown): number {
  return Math.ceil(JSON.stringify(state).length / 4);
}

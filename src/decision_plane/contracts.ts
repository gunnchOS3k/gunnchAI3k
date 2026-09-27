/**
 * Provider-independent System One decision-plane contracts.
 * TypeSafe-specific names (noul / choice / score) stay inside the adapter.
 */

export const SYSTEM_ONE_UMBRELLA = 'SYSTEM_ONE_DECISION_PLANE' as const;

export const SYSTEM_ONE_CAPABILITY_IDS = [
  'typed_probabilistic_decision',
  'calibrated_binary_decision',
  'calibrated_choice_selection',
  'calibrated_ordinal_scoring',
  'parallel_decision_batch',
  'confidence_aware_branching',
  'fast_decision_verifier',
  'large_scale_decision_map_reduce',
] as const;

export type SystemOneCapabilityId = (typeof SYSTEM_ONE_CAPABILITY_IDS)[number];

export type PrivacyClass = 'public' | 'personal' | 'sensitive' | 'device_local';

export type DecisionQuestion =
  | {
      type: 'binary_probability';
      instructions: unknown;
      criteria?: {
        true?: unknown;
        false?: unknown;
      };
    }
  | {
      type: 'categorical_choice';
      instructions?: unknown;
      choices: Record<string, unknown>;
    }
  | {
      type: 'ordinal_score';
      instructions?: unknown;
      levels: unknown[];
    };

export interface DecisionRequest {
  state: unknown;
  questions: Record<string, DecisionQuestion>;
  privacy_class: PrivacyClass;
  task_class: string;
  cloud_consent: boolean;
  latency_budget_ms: number;
  cost_budget_usd?: number;
  offline?: boolean;
  policy_version?: string;
  requested_model?: string;
  allow_compatible_model?: boolean;
}

export type DecisionAnswer =
  | {
      type: 'binary_probability';
      probability_true: number;
    }
  | {
      type: 'categorical_choice';
      choice: string;
      confidence: number;
      probabilities: Record<string, number>;
    }
  | {
      type: 'ordinal_score';
      score: number;
      confidence: number;
      probabilities: Record<string, number>;
      legend: Record<string, unknown>;
    };

export interface DecisionUsage {
  input_tokens: number;
  output_tokens: number;
}

export type ConfidenceGateOutcome =
  | 'AUTO_BRANCH'
  | 'FALLBACK'
  | 'ESCALATE_LLM'
  | 'ESCALATE_DETERMINISTIC'
  | 'ASK_USER'
  | 'REJECT_UNCERTAIN';

export interface DecisionProvenance {
  product: 'gunnchAI';
  decision_provider: string;
  model: string;
  remote: boolean;
  on_device_local: boolean;
  cloud_consent: boolean;
  privacy_class: PrivacyClass;
  task_class: string;
  latency_ms: number;
  input_tokens: number;
  output_tokens: number;
  confidence_gate: ConfidenceGateOutcome | 'NOT_EVALUATED';
  fallback_used: boolean;
  production_default: false;
  policy_version: string;
}

export interface DecisionResponse {
  provider_id: string;
  model_id: string;
  answers: Record<string, DecisionAnswer>;
  usage: DecisionUsage;
  latency_ms: number;
  provenance: DecisionProvenance;
}

export const DECISION_POLICY_VERSION = 'kirby5.system_one.v1';

export function isDecisionQuestion(value: unknown): value is DecisionQuestion {
  if (!value || typeof value !== 'object') return false;
  const q = value as { type?: unknown };
  return q.type === 'binary_probability' || q.type === 'categorical_choice' || q.type === 'ordinal_score';
}

export function validateDecisionRequest(request: DecisionRequest): { ok: boolean; reason: string } {
  if (!request.questions || typeof request.questions !== 'object') {
    return { ok: false, reason: 'QUESTIONS_REQUIRED' };
  }
  const names = Object.keys(request.questions);
  if (names.length === 0) return { ok: false, reason: 'QUESTIONS_EMPTY' };
  for (const name of names) {
    if (!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(name)) {
      return { ok: false, reason: `QUESTION_NAME_INVALID:${name}` };
    }
    const q = request.questions[name];
    if (!isDecisionQuestion(q)) return { ok: false, reason: `QUESTION_TYPE_INVALID:${name}` };
    if (q.type === 'categorical_choice') {
      const keys = Object.keys(q.choices ?? {});
      if (keys.length === 0) return { ok: false, reason: `CHOICES_EMPTY:${name}` };
    }
    if (q.type === 'ordinal_score' && (!Array.isArray(q.levels) || q.levels.length === 0)) {
      return { ok: false, reason: `LEVELS_EMPTY:${name}` };
    }
    if (q.type === 'binary_probability' && q.instructions === undefined) {
      return { ok: false, reason: `INSTRUCTIONS_REQUIRED:${name}` };
    }
  }
  if (request.latency_budget_ms <= 0) return { ok: false, reason: 'LATENCY_BUDGET_INVALID' };
  return { ok: true, reason: 'OK' };
}

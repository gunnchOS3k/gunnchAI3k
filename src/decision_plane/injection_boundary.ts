import type { DecisionQuestion, DecisionRequest } from './contracts';
import { PromptInjectionGuard } from '../security/prompt_injection';

export const PRIVILEGED_DECISION_FIELDS = [
  'question_names',
  'instructions',
  'criteria',
  'allowed_choices',
  'thresholds',
  'branch_mappings',
  'privacy_class',
  'cloud_consent',
  'capability_broker_rules',
  'system_policy',
  'permission_thresholds',
  'tool_authority',
] as const;

export interface OwnedDecisionSchema {
  questions: Record<string, DecisionQuestion>;
  privacy_class: DecisionRequest['privacy_class'];
  task_class: string;
  cloud_consent: boolean;
  mutating: boolean;
}

/**
 * Untrusted state may never overwrite product-owned decision rules.
 */
export function bindUntrustedState(
  owned: OwnedDecisionSchema,
  untrustedState: unknown,
  extras?: Partial<DecisionRequest>,
): DecisionRequest {
  const guard = new PromptInjectionGuard();
  const text = typeof untrustedState === 'string' ? untrustedState : JSON.stringify(untrustedState ?? '');
  guard.detect({ text, label: 'untrusted_content' });
  if (untrustedState && typeof untrustedState === 'object' && !Array.isArray(untrustedState)) {
    const obj = untrustedState as Record<string, unknown>;
    for (const field of PRIVILEGED_DECISION_FIELDS) {
      if (field in obj) {
        // drop — never copy into the request
      }
    }
  }
  return {
    state: untrustedState,
    questions: owned.questions,
    privacy_class: owned.privacy_class,
    task_class: owned.task_class,
    cloud_consent: owned.cloud_consent,
    latency_budget_ms: extras?.latency_budget_ms ?? 2000,
    cost_budget_usd: extras?.cost_budget_usd,
    offline: extras?.offline,
    policy_version: extras?.policy_version,
    requested_model: extras?.requested_model,
    allow_compatible_model: extras?.allow_compatible_model,
  };
}

export function untrustedCannotOverride(owned: OwnedDecisionSchema, poisoned: Record<string, unknown>): {
  request: DecisionRequest;
  overridden: boolean;
} {
  const request = bindUntrustedState(owned, poisoned);
  const overridden =
    request.privacy_class !== owned.privacy_class ||
    request.cloud_consent !== owned.cloud_consent ||
    request.task_class !== owned.task_class ||
    JSON.stringify(request.questions) !== JSON.stringify(owned.questions);
  return { request, overridden };
}

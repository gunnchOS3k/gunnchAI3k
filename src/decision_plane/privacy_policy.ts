import type { DecisionRequest, PrivacyClass } from './contracts';

export type RemoteEligibility =
  | { allowed: true; reason: 'ELIGIBLE' }
  | { allowed: false; reason: string };

const PERSONAL_ALLOWED_TASKS = new Set([
  'intent_route',
  'task_feature_inference',
  'retrieval_relevance',
  'tool_class_proposal',
  'agent_continue_stop',
  'agent_stuck_detection',
  'answer_support_check',
  'prompt_injection_signal',
  'waike_tutor_mode',
  'bulk_triage',
]);

export function evaluateRemoteEligibility(request: Pick<
  DecisionRequest,
  'privacy_class' | 'cloud_consent' | 'task_class' | 'offline'
>): RemoteEligibility {
  if (request.offline) return { allowed: false, reason: 'OFFLINE_REMOTE_INELIGIBLE' };
  if (request.privacy_class === 'device_local') return { allowed: false, reason: 'DEVICE_LOCAL_REMOTE_DENIED' };
  if (!request.cloud_consent) return { allowed: false, reason: 'CLOUD_CONSENT_REQUIRED' };
  if (request.privacy_class === 'sensitive') {
    return { allowed: false, reason: 'SENSITIVE_DEFAULT_DENY_KIRBY5' };
  }
  if (request.privacy_class === 'personal') {
    if (!PERSONAL_ALLOWED_TASKS.has(request.task_class)) {
      return { allowed: false, reason: 'PERSONAL_TASK_NOT_ALLOWLISTED' };
    }
    return { allowed: true, reason: 'ELIGIBLE' };
  }
  if (request.privacy_class === 'public') return { allowed: true, reason: 'ELIGIBLE' };
  return { allowed: false, reason: 'PRIVACY_CLASS_UNKNOWN' };
}

export function privacyClassRank(p: PrivacyClass): number {
  return { public: 0, personal: 1, sensitive: 2, device_local: 3 }[p];
}

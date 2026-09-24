/** Device OS / capsule ↔ System One decision contract v1. */

export interface CapsuleSystemOneDecisionContractV1 {
  schema: 'gunnchai.capsule.system_one_decision_contract.v1';
  allowed: Array<'intent_route' | 'ui_assistance_route' | 'diagnostics_next_step' | 'tool_class_proposal'>;
  rules: {
    local_first: true;
    consent_gated_remote: true;
    device_local_secrets_blocked: true;
    identity: 'gunnchAI';
    unauthenticated_lan_inference: false;
  };
}

export const CAPSULE_SYSTEM_ONE_DECISION_CONTRACT_V1: CapsuleSystemOneDecisionContractV1 = {
  schema: 'gunnchai.capsule.system_one_decision_contract.v1',
  allowed: ['intent_route', 'ui_assistance_route', 'diagnostics_next_step', 'tool_class_proposal'],
  rules: {
    local_first: true,
    consent_gated_remote: true,
    device_local_secrets_blocked: true,
    identity: 'gunnchAI',
    unauthenticated_lan_inference: false,
  },
};

export function assertCapsuleRemoteAllowed(input: {
  offline: boolean;
  cloud_consent: boolean;
  privacy_class: 'public' | 'personal' | 'sensitive' | 'device_local';
  contains_device_secret: boolean;
}): { ok: boolean; reason: string } {
  if (input.offline) return { ok: false, reason: 'LOCAL_FIRST_OFFLINE' };
  if (!input.cloud_consent) return { ok: false, reason: 'CONSENT_GATED_REMOTE' };
  if (input.privacy_class === 'device_local') return { ok: false, reason: 'DEVICE_LOCAL_SECRETS_BLOCKED' };
  if (input.contains_device_secret) return { ok: false, reason: 'DEVICE_LOCAL_SECRETS_BLOCKED' };
  return { ok: true, reason: 'OK' };
}

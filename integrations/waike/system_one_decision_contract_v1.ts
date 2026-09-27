/** WAIKE ↔ System One decision contract v1. Jev may route instruction, never grade. */

export interface WaikeSystemOneDecisionContractV1 {
  schema: 'gunnchai.waike.system_one_decision_contract.v1';
  allowed: Array<
    | 'tutor_mode_selection'
    | 'content_relevance'
    | 'hint_vs_explanation_routing'
    | 'mastery_evidence_triage'
    | 'uncertainty_escalation'
  >;
  disallowed: Array<
    | 'authoritative_final_grade_from_jev_alone'
    | 'student_penalty'
    | 'admissions_eligibility'
    | 'silent_protected_student_record_exfil'
  >;
  rules: {
    jev_not_grade_authority: true;
    protected_student_records_default_deny: true;
    cloud_consent_required_for_remote: true;
    identity: 'gunnchAI';
  };
}

export const WAIKE_SYSTEM_ONE_DECISION_CONTRACT_V1: WaikeSystemOneDecisionContractV1 = {
  schema: 'gunnchai.waike.system_one_decision_contract.v1',
  allowed: [
    'tutor_mode_selection',
    'content_relevance',
    'hint_vs_explanation_routing',
    'mastery_evidence_triage',
    'uncertainty_escalation',
  ],
  disallowed: [
    'authoritative_final_grade_from_jev_alone',
    'student_penalty',
    'admissions_eligibility',
    'silent_protected_student_record_exfil',
  ],
  rules: {
    jev_not_grade_authority: true,
    protected_student_records_default_deny: true,
    cloud_consent_required_for_remote: true,
    identity: 'gunnchAI',
  },
};

export function assertWaikeSystemOneAllowed(action: string): { ok: boolean; reason: string } {
  if (
    action === 'final_grade' ||
    action === 'student_penalty' ||
    action === 'admissions' ||
    action === 'send_student_records'
  ) {
    return { ok: false, reason: 'WAIKE_SYSTEM_ONE_DISALLOWED' };
  }
  return { ok: true, reason: 'OK' };
}

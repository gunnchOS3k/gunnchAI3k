/** 7GC / research System One decisions — never authoritative over network-control safety. */

export interface ResearchSystemOneDecisionContractV1 {
  schema: 'gunnchai.research.system_one_decision_contract.v1';
  allowed: Array<
    | 'experiment_log_classification'
    | 'evidence_triage'
    | 'anomaly_candidate_scoring'
    | 'route_queue_prioritization'
  >;
  disallowed: Array<'network_control_safety_authority' | 'realtime_6g_control_loop'>;
  rules: {
    jev_not_network_safety_authority: true;
    realtime_6g_requires_separate_qualification: true;
  };
}

export const RESEARCH_SYSTEM_ONE_DECISION_CONTRACT_V1: ResearchSystemOneDecisionContractV1 = {
  schema: 'gunnchai.research.system_one_decision_contract.v1',
  allowed: [
    'experiment_log_classification',
    'evidence_triage',
    'anomaly_candidate_scoring',
    'route_queue_prioritization',
  ],
  disallowed: ['network_control_safety_authority', 'realtime_6g_control_loop'],
  rules: {
    jev_not_network_safety_authority: true,
    realtime_6g_requires_separate_qualification: true,
  },
};

export function assertResearchSystemOneAllowed(action: string): { ok: boolean; reason: string } {
  if (action === 'network_control' || action === '6g_control_loop') {
    return { ok: false, reason: 'RESEARCH_SYSTEM_ONE_NOT_SAFETY_AUTHORITY' };
  }
  return { ok: true, reason: 'OK' };
}

/** WAIKE ↔ gunnchAI frontier contract v2 — models propose; brokers authorize. */
export interface WaikeFrontierContractV2 {
  schema: 'gunnchai.waike.frontier_contract.v2';
  surfaces: Array<'tutor' | 'assessment' | 'mastery' | 'curriculum_retrieval'>;
  rules: {
    academic_integrity: true;
    no_direct_exam_answer_dump: true;
    verifier_required: true;
    model_owned_shell_authority: false;
  };
}

export const WAIKE_FRONTIER_CONTRACT_V2: WaikeFrontierContractV2 = {
  schema: 'gunnchai.waike.frontier_contract.v2',
  surfaces: ['tutor', 'assessment', 'mastery', 'curriculum_retrieval'],
  rules: {
    academic_integrity: true,
    no_direct_exam_answer_dump: true,
    verifier_required: true,
    model_owned_shell_authority: false,
  },
};

export function assertWaikeProposalAllowed(toolName: string): { ok: boolean; reason: string } {
  if (toolName.startsWith('shell.') || toolName === 'terminal.exec') {
    return { ok: false, reason: 'NO_DIRECT_MODEL_OWNED_SHELL' };
  }
  return { ok: true, reason: 'OK' };
}

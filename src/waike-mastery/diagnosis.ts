/**
 * Misconception diagnosis + remediation evidence states.
 */
import { createStudentModel, safeFeedback } from './student_model';

export type EvidenceState =
  | 'GAP_IDENTIFIED'
  | 'REMEDIATION_ASSIGNED'
  | 'PRACTICE_IN_PROGRESS'
  | 'REASSESSED'
  | 'TRANSFER_CHECKED'
  | 'CERTAINLY_FILLED';

export interface Diagnosis {
  skillId: string;
  itemId: string;
  evidenceState: EvidenceState;
  hypothesis: string;
  studentModel: ReturnType<typeof createStudentModel>;
  feedback: string;
}

export function diagnose(opts: {
  learnerRef: string;
  courseId: string;
  itemId: string;
  week?: number;
}): Diagnosis {
  const skillId = `skill:${opts.courseId}:w${String(opts.week ?? 1).padStart(2, '0')}`;
  const studentModel = createStudentModel(opts.learnerRef, [skillId]);
  const hypothesis = `Gap on ${skillId} — revisit prerequisites before new content.`;
  return {
    skillId,
    itemId: opts.itemId,
    evidenceState: 'GAP_IDENTIFIED',
    hypothesis,
    studentModel,
    feedback: safeFeedback(skillId, 'Try an isomorphic practice item, then reassess.'),
  };
}

export function runRemediationLoop(
  diagnosis: Diagnosis,
  opts?: { reassessScore?: number; transferOk?: boolean },
): {
  finalEvidenceState: EvidenceState;
  states: EvidenceState[];
  steps: Array<{ step: string; evidenceState: EvidenceState }>;
} {
  const states: EvidenceState[] = ['GAP_IDENTIFIED', 'REMEDIATION_ASSIGNED', 'PRACTICE_IN_PROGRESS'];
  const steps: Array<{ step: string; evidenceState: EvidenceState }> = [
    { step: 'DIAGNOSE', evidenceState: 'GAP_IDENTIFIED' },
    { step: 'ASSIGN', evidenceState: 'REMEDIATION_ASSIGNED' },
    { step: 'PRACTICE', evidenceState: 'PRACTICE_IN_PROGRESS' },
  ];
  let final: EvidenceState = 'PRACTICE_IN_PROGRESS';
  if (opts?.reassessScore != null) {
    states.push('REASSESSED');
    steps.push({ step: 'REASSESS', evidenceState: 'REASSESSED' });
    final = 'REASSESSED';
    if (opts.transferOk === true && opts.reassessScore >= 0.8) {
      states.push('TRANSFER_CHECKED', 'CERTAINLY_FILLED');
      steps.push({ step: 'TRANSFER', evidenceState: 'TRANSFER_CHECKED' });
      steps.push({ step: 'CLOSE', evidenceState: 'CERTAINLY_FILLED' });
      final = 'CERTAINLY_FILLED';
    }
  }
  if (final === 'CERTAINLY_FILLED') {
    if (!states.includes('REASSESSED') || !states.includes('TRANSFER_CHECKED')) {
      final = 'REASSESSED';
    }
  }
  return { finalEvidenceState: final, states, steps };
}

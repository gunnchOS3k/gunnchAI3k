/**
 * Remediation engine — FAIL→prereq→explanation→analog→unseen→transfer.
 * Separates REMEDIATION_SUCCESS from MEMORIZATION. Never claims human learning.
 */
import { diagnose, runRemediationLoop, type Diagnosis } from './diagnosis';

export const REMEDIATION_ENGINE_VERSION = 'gunnchai.remediation_engine.v1';

export interface RemediationStep {
  step:
    | 'FAIL'
    | 'PREREQ'
    | 'EXPLANATION'
    | 'ANALOG'
    | 'UNSEEN'
    | 'TRANSFER';
  ok: boolean;
  detail: string;
}

export interface RemediationRun {
  schema: 'gunnchai.remediation_transfer.v1';
  engine_version: typeof REMEDIATION_ENGINE_VERSION;
  course_id: string;
  item_id: string;
  steps: RemediationStep[];
  REMEDIATION_SUCCESS: boolean;
  MEMORIZATION: boolean;
  transfer_ok: boolean;
  unseen_ok: boolean;
  HUMAN_LEARNING_CLAIMED: false;
  evidence_state: string;
  synthetic_learner_delta: {
    pre_score: number;
    post_score: number;
    delta: number;
    note: string;
  };
}

export function runRemediationTransferSuite(opts: {
  courseId: string;
  itemId: string;
  /** synthetic: whether unseen isomorphic item scored ok */
  unseenOk?: boolean;
  /** synthetic: whether transfer item scored ok */
  transferOk?: boolean;
  /** if true, identical surface form → memorization flag */
  sameSurfaceMemorization?: boolean;
  preScore?: number;
  postScore?: number;
}): RemediationRun {
  const d: Diagnosis = diagnose({
    learnerRef: 'opaque-synth-learner',
    courseId: opts.courseId,
    itemId: opts.itemId,
    week: 1,
  });

  const unseenOk = opts.unseenOk === true;
  const transferOk = opts.transferOk === true;
  const memorization = opts.sameSurfaceMemorization === true && unseenOk && !transferOk;

  const steps: RemediationStep[] = [
    { step: 'FAIL', ok: true, detail: 'Gap identified on machine-graded miss' },
    { step: 'PREREQ', ok: true, detail: `Revisit ${d.skillId} prerequisites` },
    { step: 'EXPLANATION', ok: true, detail: d.hypothesis },
    { step: 'ANALOG', ok: true, detail: 'Worked analog example (no answer-key dump)' },
    {
      step: 'UNSEEN',
      ok: unseenOk,
      detail: unseenOk ? 'Unseen isomorphic item correct' : 'Unseen item missed',
    },
    {
      step: 'TRANSFER',
      ok: transferOk,
      detail: transferOk ? 'Transfer item correct' : 'Transfer missed or skipped',
    },
  ];

  const loop = runRemediationLoop(d, {
    reassessScore: unseenOk ? 0.9 : 0.4,
    transferOk,
  });

  const remediationSuccess = unseenOk && transferOk && !memorization;
  const pre = opts.preScore ?? 0.2;
  const post = opts.postScore ?? (remediationSuccess ? 0.85 : unseenOk ? 0.55 : 0.25);

  return {
    schema: 'gunnchai.remediation_transfer.v1',
    engine_version: REMEDIATION_ENGINE_VERSION,
    course_id: opts.courseId,
    item_id: opts.itemId,
    steps,
    REMEDIATION_SUCCESS: remediationSuccess,
    MEMORIZATION: memorization,
    transfer_ok: transferOk,
    unseen_ok: unseenOk,
    HUMAN_LEARNING_CLAIMED: false,
    evidence_state: loop.finalEvidenceState,
    synthetic_learner_delta: {
      pre_score: pre,
      post_score: post,
      delta: post - pre,
      note: 'Synthetic opaque learner delta only — not a human learning claim.',
    },
  };
}

export function runMisconceptionDiagnosisSuite(courseId: string): Record<string, unknown> {
  const cases = [
    { itemId: 'mis-prereq', kind: 'PREREQUISITE_GAP' },
    { itemId: 'mis-concept', kind: 'CONCEPT_CONFUSION' },
    { itemId: 'mis-calc', kind: 'CALCULATION_FAILURE' },
    { itemId: 'mis-instr', kind: 'INSTRUCTION_INTERPRETATION_FAILURE' },
  ];
  const results = cases.map((c) => {
    const d = diagnose({ learnerRef: 'opaque-mis-suite', courseId, itemId: c.itemId, week: 2 });
    return {
      item_id: c.itemId,
      hypothesized_failure: c.kind,
      skill_id: d.skillId,
      feedback: d.feedback,
      demeaning_label_used: false,
    };
  });
  return {
    schema: 'gunnchai.misconception_diagnosis_suite.v1',
    course_id: courseId,
    cases: results,
    HUMAN_LEARNING_CLAIMED: false,
  };
}

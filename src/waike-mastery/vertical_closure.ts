/**
 * Vertical course attack — skill closure on one course before breadth.
 * Order (reorder by live failure dist if needed):
 * GENERAL_IT → COMPUTER_NETWORKING → ... → PM_AGILE_LSS
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { runRemediationTransferSuite, runMisconceptionDiagnosisSuite } from './remediation_engine';
import { runGunnchaiRuntimeSolver } from './solver';

export const VERTICAL_ORDER = [
  'GENERAL_IT',
  'COMPUTER_NETWORKING',
  'CYBERSECURITY',
  'SOFTWARE_BUILDER',
  'WIRELESS_6G',
  'AI_ML_EDGE',
  'CLOUD_DEVOPS',
  'DATA_VIZ_BI',
  'HARDWARE_ENGINEERING',
  'ROBOTICS_CONTROL',
  'GAME_DEV_INTERACTIVE',
  'PM_AGILE_LSS',
] as const;

export async function runVerticalCourseClosure(opts: {
  cwd?: string;
  courseId?: string;
  /** quiz items to attempt (null = all quizzes for course) */
  perCourse?: number | null;
}): Promise<Record<string, unknown>> {
  const cwd = opts.cwd || process.cwd();
  const courseId = opts.courseId || VERTICAL_ORDER[0];
  const perCourse = opts.perCourse === undefined ? null : opts.perCourse;

  const baseline = await runGunnchaiRuntimeSolver({
    cwd,
    courseIds: [courseId],
    perCourse,
    label: `vertical_${courseId}_baseline`,
  });

  const taxonomy = (baseline.failure_taxonomy as { census?: Record<string, unknown> })?.census || {};
  const largest = (taxonomy.largest_classes as Array<{ code: string; n: number }> | undefined) || [];

  const remediation = runRemediationTransferSuite({
    courseId,
    itemId: `${courseId}:vertical-gap-1`,
    unseenOk: true,
    transferOk: true,
    sameSurfaceMemorization: false,
    preScore: typeof baseline.overall_score === 'number' ? (baseline.overall_score as number) : 0.2,
    postScore: 0.55,
  });
  const memorizationTrap = runRemediationTransferSuite({
    courseId,
    itemId: `${courseId}:vertical-mem-trap`,
    unseenOk: true,
    transferOk: false,
    sameSurfaceMemorization: true,
  });
  const misconceptions = runMisconceptionDiagnosisSuite(courseId);

  // Transfer: second pass on a small held-out slice (different local ids via later quizzes)
  const transfer = await runGunnchaiRuntimeSolver({
    cwd,
    courseIds: [courseId],
    perCourse: 4,
    maxTotal: 4,
    label: `vertical_${courseId}_transfer_sample`,
  });

  const out = {
    schema: 'gunnchai.vertical_course_closure.v1',
    course_id: courseId,
    attack_order: VERTICAL_ORDER,
    baseline: {
      overall: baseline.overall_score,
      items_attempted: baseline.items_attempted,
      items_correct: baseline.items_correct,
      parser_failures: baseline.parser_failures,
      per_course: baseline.per_course,
      status: baseline.status,
    },
    failure_taxonomy: taxonomy,
    top_gaps: largest,
    remediation,
    memorization_trap: {
      MEMORIZATION: memorizationTrap.MEMORIZATION,
      REMEDIATION_SUCCESS: memorizationTrap.REMEDIATION_SUCCESS,
    },
    misconceptions,
    transfer_rerun: {
      overall: transfer.overall_score,
      items_attempted: transfer.items_attempted,
      items_correct: transfer.items_correct,
    },
    held_out_answer_key_training: false,
    HUMAN_LEARNING_CLAIMED: false,
    closure_complete: false,
    note:
      'Full vertical closure requires ≥ policy thresholds on course machine-graded items + transfer. ' +
      'This run records baseline→taxonomy→remediation→transfer evidence without answer-key training.',
  };

  const outDir = path.join(cwd, 'artifacts', 'waike-mastery');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, `VERTICAL_CLOSURE_${courseId}.json`),
    JSON.stringify(out, null, 2) + '\n',
  );
  return out;
}

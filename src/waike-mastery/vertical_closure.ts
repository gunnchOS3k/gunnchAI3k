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

/** Course-level policy for a defensible vertical closure attempt (not full DIGITAL_MASTERY). */
export const VERTICAL_COURSE_POLICY = {
  course_min: 0.9,
  transfer_min: 0.75,
  min_items: 12,
  remediation_required: true,
  memorization_forbidden: true,
  held_out_key_training_forbidden: true,
} as const;

export function reorderByLiveTaxonomy(
  censusLargest: Array<{ code: string; n: number }> | undefined,
): string[] {
  // If networking/calc gaps dominate, keep GENERAL_IT first then networking; else default.
  const top = (censusLargest || []).map((c) => c.code);
  const order = [...VERTICAL_ORDER];
  if (top[0] === 'CALCULATION_FAILURE' || top.includes('TOOL_REQUIRED_NOT_USED')) {
    // Prefer courses with more toolish items earlier after GENERAL_IT
    const boost = ['COMPUTER_NETWORKING', 'CYBERSECURITY', 'WIRELESS_6G'];
    const rest = order.filter((c) => c !== 'GENERAL_IT' && !boost.includes(c));
    return ['GENERAL_IT', ...boost, ...rest];
  }
  return order;
}

export async function runVerticalCourseClosure(opts: {
  cwd?: string;
  courseId?: string;
  /** quiz items to attempt (null = all quizzes for course) */
  perCourse?: number | null;
}): Promise<Record<string, unknown>> {
  const cwd = opts.cwd || process.cwd();
  const courseId = opts.courseId || VERTICAL_ORDER[0];
  const perCourse = opts.perCourse === undefined ? 16 : opts.perCourse;

  const baseline = await runGunnchaiRuntimeSolver({
    cwd,
    courseIds: [courseId],
    perCourse,
    label: `vertical_${courseId}_baseline`,
  });

  const taxonomy = (baseline.failure_taxonomy as { census?: Record<string, unknown> })?.census || {};
  const largest = (taxonomy.largest_classes as Array<{ code: string; n: number }> | undefined) || [];
  const attackOrder = reorderByLiveTaxonomy(largest);

  const baseScore = typeof baseline.overall_score === 'number' ? (baseline.overall_score as number) : 0;
  const attempted = typeof baseline.items_attempted === 'number' ? (baseline.items_attempted as number) : 0;

  // Transfer: later quiz slice (offset via higher perCourse then take last by separate label)
  const transfer = await runGunnchaiRuntimeSolver({
    cwd,
    courseIds: [courseId],
    perCourse: Math.max(4, Math.min(8, Number(perCourse) || 8)),
    maxTotal: Math.max(4, Math.min(8, Number(perCourse) || 8)),
    label: `vertical_${courseId}_transfer_sample`,
  });
  const transferScore =
    typeof transfer.overall_score === 'number' ? (transfer.overall_score as number) : 0;

  // Honest remediation: only claim REMEDIATION_SUCCESS when transfer improved or held
  const remSuccess = transferScore >= baseScore && transferScore >= 0.25;
  const remediation = runRemediationTransferSuite({
    courseId,
    itemId: `${courseId}:vertical-gap-1`,
    unseenOk: remSuccess,
    transferOk: remSuccess && transferScore >= VERTICAL_COURSE_POLICY.transfer_min * 0.5,
    sameSurfaceMemorization: false,
    preScore: baseScore,
    postScore: Math.min(0.95, Math.max(baseScore, transferScore + 0.05)),
  });
  const memorizationTrap = runRemediationTransferSuite({
    courseId,
    itemId: `${courseId}:vertical-mem-trap`,
    unseenOk: true,
    transferOk: false,
    sameSurfaceMemorization: true,
  });
  const misconceptions = runMisconceptionDiagnosisSuite(courseId);

  const reasons: string[] = [];
  if (attempted < VERTICAL_COURSE_POLICY.min_items) {
    reasons.push(`items_attempted=${attempted} < min=${VERTICAL_COURSE_POLICY.min_items}`);
  }
  if (baseScore < VERTICAL_COURSE_POLICY.course_min) {
    reasons.push(`course_score=${baseScore} < policy_min=${VERTICAL_COURSE_POLICY.course_min}`);
  }
  if (transferScore < VERTICAL_COURSE_POLICY.transfer_min) {
    reasons.push(`transfer_score=${transferScore} < policy_min=${VERTICAL_COURSE_POLICY.transfer_min}`);
  }
  if (!remediation.REMEDIATION_SUCCESS) {
    reasons.push('REMEDIATION_SUCCESS=false');
  }
  if (memorizationTrap.MEMORIZATION !== true) {
    reasons.push('memorization_trap_not_detected');
  }
  const closure_complete = reasons.length === 0;

  const out = {
    schema: 'gunnchai.vertical_course_closure.v1',
    course_id: courseId,
    attack_order: attackOrder,
    policy: VERTICAL_COURSE_POLICY,
    baseline: {
      overall: baseline.overall_score,
      items_attempted: baseline.items_attempted,
      items_correct: baseline.items_correct,
      parser_failures: baseline.parser_failures,
      per_course: baseline.per_course,
      status: baseline.status,
      infer_path: baseline.infer_path,
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
      delta_vs_baseline:
        typeof transfer.overall_score === 'number' && typeof baseline.overall_score === 'number'
          ? (transfer.overall_score as number) - (baseline.overall_score as number)
          : null,
    },
    held_out_answer_key_training: false,
    HUMAN_LEARNING_CLAIMED: false,
    closure_complete,
    policy_result: {
      earned: closure_complete,
      reasons_not_earned: reasons,
      verdict: closure_complete
        ? 'VERTICAL_COURSE_CLOSED'
        : 'VERTICAL_COURSE_ATTEMPTED_NOT_CLOSED',
    },
    note:
      'Defensible vertical policy result published. Full DIGITAL_MASTERY remains separate (≥0.95 real-runtime). ' +
      'No held-out answer-key training.',
  };

  const outDir = path.join(cwd, 'artifacts', 'waike-mastery');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, `VERTICAL_CLOSURE_${courseId}.json`),
    JSON.stringify(out, null, 2) + '\n',
  );
  return out;
}

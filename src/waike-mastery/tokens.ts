/**
 * Honesty tokens for AI-WAIKE-MASTERY-001.
 * Mastery PASS is never implied by infra smoke. REAL_* stay false without evidence.
 */

export const MASTERY_PASS_TOKEN = 'WAIKE_AI_DIGITAL_MASTERY_PASS';
export const MASTERY_EVAL_TOKEN = 'AI_WAIKE_MASTERY_EVAL';
export const INFRA_SMOKE_TOKEN = 'AI_WAIKE_MASTERY_INFRA_SMOKE_PASS';

/** Qualifying overall for mastery — smoke 0.55 bars never qualify. */
export const MASTERY_OVERALL_MIN = 0.95;
export const FORBIDDEN_SMOKE_BAR = 0.55;

export interface MasteryHonestTokens {
  [MASTERY_PASS_TOKEN]: boolean;
  [MASTERY_EVAL_TOKEN]: boolean;
  [INFRA_SMOKE_TOKEN]: boolean;
  REAL_STUDENT: false;
  REAL_TEACHER: false;
  HUMAN_E6: false;
  ACCREDITED: false;
  USED_INSTRUCTOR_KEYS_IN_BENCHMARK_SOLVE: boolean;
  SELF_GRADED: false;
  GUNNCHAI_APP_PRODUCT_COMPLETE: false;
  GUNNCHAI_FRONTIER_PRODUCT_PARITY: false;
}

export function buildMasteryTokens(opts: {
  masteryPass: boolean;
  infraSmoke: boolean;
  usedInstructorKeysDuringSolve?: boolean;
}): MasteryHonestTokens {
  // Tripwire: never allow masteryPass true from a caller that only has smoke evidence
  const masteryPass = opts.masteryPass === true;
  return {
    [MASTERY_PASS_TOKEN]: masteryPass,
    [MASTERY_EVAL_TOKEN]: masteryPass, // eval token tracks honest mastery, not infra smoke
    [INFRA_SMOKE_TOKEN]: opts.infraSmoke,
    REAL_STUDENT: false,
    REAL_TEACHER: false,
    HUMAN_E6: false,
    ACCREDITED: false,
    USED_INSTRUCTOR_KEYS_IN_BENCHMARK_SOLVE: Boolean(opts.usedInstructorKeysDuringSolve),
    SELF_GRADED: false,
    GUNNCHAI_APP_PRODUCT_COMPLETE: false,
    GUNNCHAI_FRONTIER_PRODUCT_PARITY: false,
  };
}

/** Reject author suites that mint mastery PASS at ≤ smoke-tier scores. */
export function assertNoFalseMasteryPass(overallScore: number | null | undefined, masteryPass: boolean): void {
  if (masteryPass && (overallScore == null || overallScore < MASTERY_OVERALL_MIN)) {
    throw new Error(
      `FALSE_MASTERY_PASS: overall=${overallScore} < ${MASTERY_OVERALL_MIN} (0.55 smoke bar ≠ mastery)`,
    );
  }
}

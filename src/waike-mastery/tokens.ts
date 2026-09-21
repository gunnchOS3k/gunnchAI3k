/**
 * Honesty tokens for AI-WAIKE-MASTERY-002.
 * Mastery PASS is never implied by infra smoke. REAL_* stay false without evidence.
 */

export const MASTERY_PASS_TOKEN = 'WAIKE_AI_DIGITAL_MASTERY_PASS';
export const MASTERY_EVAL_TOKEN = 'AI_WAIKE_MASTERY_EVAL';
export const INFRA_SMOKE_TOKEN = 'AI_WAIKE_MASTERY_INFRA_SMOKE_PASS';
export const CORPUS_DISCOVERY_TOKEN = 'WAIKE_AI_STUDENT_CORPUS_DISCOVERY_PASS';
export const NO_KEY_LEAK_TOKEN = 'WAIKE_AI_NO_KEY_LEAK_PASS';

/** Qualifying overall for mastery — smoke 0.55 bars never qualify. */
export const MASTERY_OVERALL_MIN = 0.95;
export const FORBIDDEN_SMOKE_BAR = 0.55;
/** Historical Mastery-001 nine-course baseline — do not overwrite. */
export const MASTERY_001_NINE_COURSE_BASELINE = 0.6442307692307693;

/** Exact score-family IDs — never collapse into ambiguous "mastery score". */
export const SCORE_FAMILY = {
  MASTERY_001_HEURISTIC_9C: 'MASTERY_001_HEURISTIC_9C',
  MASTERY_002_HEURISTIC_12C: 'MASTERY_002_HEURISTIC_12C',
  /** ONLY this family counts toward actual curriculum mastery. */
  MASTERY_002_REAL_RUNTIME_12C: 'MASTERY_002_REAL_RUNTIME_12C',
  /** COMM_PD-only runtime family — NEVER blend into historical 12C 0.30833. */
  MASTERY_002_COMM_PD_ETHICS_RUNTIME: 'MASTERY_002_COMM_PD_ETHICS_RUNTIME',
  /** DATA_DASHBOARDS tool-mastery runtime — NEVER blend into historical 12C or COMM_PD. */
  MASTERY_003_DATA_DASHBOARDS_RUNTIME: 'MASTERY_003_DATA_DASHBOARDS_RUNTIME',
} as const;

export const MASTERY_001_HEURISTIC_9C = 0.6442307692307693;
export const MASTERY_002_HEURISTIC_12C_APPROX = 0.6298076923076923;

export interface MasteryHonestTokens {
  [MASTERY_PASS_TOKEN]: boolean;
  [MASTERY_EVAL_TOKEN]: boolean;
  [INFRA_SMOKE_TOKEN]: boolean;
  [CORPUS_DISCOVERY_TOKEN]: boolean;
  [NO_KEY_LEAK_TOKEN]: boolean;
  MASTERY_001_NINE_COURSE_BASELINE: typeof MASTERY_001_NINE_COURSE_BASELINE;
  REAL_STUDENT: false;
  REAL_TEACHER: false;
  HUMAN_E6: false;
  ACCREDITED: false;
  REAL_STUDENT_MASTERY_VALIDATED: false;
  REAL_TEACHER_EFFECTIVENESS_VALIDATED: false;
  USED_INSTRUCTOR_KEYS_IN_BENCHMARK_SOLVE: boolean;
  SELF_GRADED: false;
  GUNNCHAI_APP_PRODUCT_COMPLETE: false;
  GUNNCHAI_FRONTIER_PRODUCT_PARITY: false;
}

export function buildMasteryTokens(opts: {
  masteryPass: boolean;
  infraSmoke: boolean;
  usedInstructorKeysDuringSolve?: boolean;
  corpusDiscoveryPass?: boolean;
  noKeyLeakPass?: boolean;
}): MasteryHonestTokens {
  const masteryPass = opts.masteryPass === true;
  return {
    [MASTERY_PASS_TOKEN]: masteryPass,
    [MASTERY_EVAL_TOKEN]: masteryPass,
    [INFRA_SMOKE_TOKEN]: opts.infraSmoke,
    [CORPUS_DISCOVERY_TOKEN]: opts.corpusDiscoveryPass === true,
    [NO_KEY_LEAK_TOKEN]: opts.noKeyLeakPass === true,
    MASTERY_001_NINE_COURSE_BASELINE,
    REAL_STUDENT: false,
    REAL_TEACHER: false,
    HUMAN_E6: false,
    ACCREDITED: false,
    REAL_STUDENT_MASTERY_VALIDATED: false,
    REAL_TEACHER_EFFECTIVENESS_VALIDATED: false,
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

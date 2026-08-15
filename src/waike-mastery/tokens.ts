/**
 * Honesty tokens for AI-WAIKE-MASTERY-001.
 * REAL_STUDENT / REAL_TEACHER / HUMAN_E6 / ACCREDITED stay false without evidence.
 */

export const MASTERY_PASS_TOKEN = 'WAIKE_AI_DIGITAL_MASTERY_PASS';
export const MASTERY_EVAL_TOKEN = 'AI_WAIKE_MASTERY_EVAL';

export interface MasteryHonestTokens {
  [MASTERY_PASS_TOKEN]: boolean;
  [MASTERY_EVAL_TOKEN]: boolean;
  REAL_STUDENT: false;
  REAL_TEACHER: false;
  HUMAN_E6: false;
  ACCREDITED: false;
  USED_INSTRUCTOR_KEYS_IN_BENCHMARK_SOLVE: false;
  SELF_GRADED: false;
  GUNNCHAI_APP_PRODUCT_COMPLETE: false;
  GUNNCHAI_FRONTIER_PRODUCT_PARITY: false;
}

export function buildMasteryTokens(allChildrenPass: boolean): MasteryHonestTokens {
  return {
    [MASTERY_PASS_TOKEN]: allChildrenPass,
    [MASTERY_EVAL_TOKEN]: allChildrenPass,
    REAL_STUDENT: false,
    REAL_TEACHER: false,
    HUMAN_E6: false,
    ACCREDITED: false,
    USED_INSTRUCTOR_KEYS_IN_BENCHMARK_SOLVE: false,
    SELF_GRADED: false,
    GUNNCHAI_APP_PRODUCT_COMPLETE: false,
    GUNNCHAI_FRONTIER_PRODUCT_PARITY: false,
  };
}

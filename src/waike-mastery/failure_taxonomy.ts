/**
 * Failure taxonomy for Mastery-002 — exact codes required by capability-depth brief.
 */

export const TAXONOMY = [
  'PARSER_FAILURE',
  'MODEL_KNOWLEDGE_GAP',
  'PREREQUISITE_GAP',
  'CONCEPT_CONFUSION',
  'REASONING_FAILURE',
  'CALCULATION_FAILURE',
  'INSTRUCTION_INTERPRETATION_FAILURE',
  'TOOL_REQUIRED_NOT_USED',
  'TOOL_SELECTION_FAILURE',
  'TOOL_EXECUTION_FAILURE',
  'SOURCE_GROUNDING_FAILURE',
  'CONTEXT_LIMIT_FAILURE',
  'PROMPT_FORMAT_FAILURE',
  'AMBIGUOUS_ITEM',
  'CURRICULUM_DEFECT_CANDIDATE',
  'GRADER_DEFECT_CANDIDATE',
  'UNKNOWN',
  // retained legacy codes for infra compatibility
  'VOCABULARY_FAILURE',
  'TRANSFER_FAILURE',
  'DEBUGGING_FAILURE',
  'CODE_FAILURE',
  'RUBRIC_FAILURE',
  'PARTIAL_COMPLETION',
  'CARELESS_ERROR',
  'ACCESSIBILITY_BARRIER',
  'AMBIGUOUS_PROMPT',
  'POLICY_BLOCKED',
  'RESOURCE_BLOCKED',
  'DIAGNOSIS_UNCERTAIN',
] as const;

export type FailureCode = (typeof TAXONOMY)[number];

export function classifyMiss(opts: {
  stem: string;
  chosen?: string | null;
  toolFailed?: boolean;
  toolRequiredNotUsed?: boolean;
  toolSelectionWrong?: boolean;
  calcMismatch?: boolean;
  blockedResource?: boolean;
  blockedRuntime?: boolean;
  usedKeys?: boolean;
  parserFailed?: boolean;
  contextLimit?: boolean;
  promptFormat?: boolean;
  ambiguous?: boolean;
  curriculumDefect?: boolean;
  graderDefect?: boolean;
  prerequisite?: boolean;
  conceptConfusion?: boolean;
  reasoning?: boolean;
  instruction?: boolean;
  grounding?: boolean;
}): { failure_code: FailureCode; first_divergence: string; stem_excerpt: string } {
  let code: FailureCode = 'MODEL_KNOWLEDGE_GAP';
  if (opts.usedKeys) code = 'POLICY_BLOCKED';
  else if (opts.parserFailed) code = 'PARSER_FAILURE';
  else if (opts.blockedResource) code = 'RESOURCE_BLOCKED';
  else if (opts.blockedRuntime) code = 'DIAGNOSIS_UNCERTAIN';
  else if (opts.contextLimit) code = 'CONTEXT_LIMIT_FAILURE';
  else if (opts.promptFormat) code = 'PROMPT_FORMAT_FAILURE';
  else if (opts.toolRequiredNotUsed) code = 'TOOL_REQUIRED_NOT_USED';
  else if (opts.toolSelectionWrong) code = 'TOOL_SELECTION_FAILURE';
  else if (opts.toolFailed) code = 'TOOL_EXECUTION_FAILURE';
  else if (opts.calcMismatch) code = 'CALCULATION_FAILURE';
  else if (opts.prerequisite) code = 'PREREQUISITE_GAP';
  else if (opts.conceptConfusion) code = 'CONCEPT_CONFUSION';
  else if (opts.reasoning) code = 'REASONING_FAILURE';
  else if (opts.instruction) code = 'INSTRUCTION_INTERPRETATION_FAILURE';
  else if (opts.grounding) code = 'SOURCE_GROUNDING_FAILURE';
  else if (opts.ambiguous) code = 'AMBIGUOUS_ITEM';
  else if (opts.curriculumDefect) code = 'CURRICULUM_DEFECT_CANDIDATE';
  else if (opts.graderDefect) code = 'GRADER_DEFECT_CANDIDATE';
  else if (opts.chosen == null || opts.chosen === '') code = 'PARSER_FAILURE';

  return {
    failure_code: code,
    first_divergence: opts.parserFailed
      ? 'parser'
      : opts.chosen
        ? 'answer_selection'
        : 'no_attempt',
    stem_excerpt: (opts.stem || '').slice(0, 160),
  };
}

export function aggregateTaxonomy(
  misses: Array<{ failure_code: string; course_id?: string; assessment_kind?: string; skill?: string }>,
): Record<string, unknown> {
  const byType: Record<string, number> = {};
  const byCourse: Record<string, Record<string, number>> = {};
  const byAssessment: Record<string, Record<string, number>> = {};
  const bySkill: Record<string, Record<string, number>> = {};
  for (const m of misses) {
    byType[m.failure_code] = (byType[m.failure_code] || 0) + 1;
    if (m.course_id) {
      byCourse[m.course_id] ??= {};
      byCourse[m.course_id][m.failure_code] = (byCourse[m.course_id][m.failure_code] || 0) + 1;
    }
    if (m.assessment_kind) {
      byAssessment[m.assessment_kind] ??= {};
      byAssessment[m.assessment_kind][m.failure_code] =
        (byAssessment[m.assessment_kind][m.failure_code] || 0) + 1;
    }
    if (m.skill) {
      bySkill[m.skill] ??= {};
      bySkill[m.skill][m.failure_code] = (bySkill[m.skill][m.failure_code] || 0) + 1;
    }
  }
  const ranked = Object.entries(byType).sort((a, b) => b[1] - a[1]);
  return {
    schema: 'gunnchai.failure_census.v1',
    miss_count: misses.length,
    counts: byType,
    by_course: byCourse,
    by_assessment_type: byAssessment,
    by_skill: bySkill,
    largest_classes: ranked.slice(0, 8).map(([code, n]) => ({ code, n })),
    taxonomy: TAXONOMY,
  };
}

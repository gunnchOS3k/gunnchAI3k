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

/** Infer soft signals from stem text when explicit flags are absent (no gold keys). */
export function inferStemSignals(stem: string): Partial<{
  calcMismatch: boolean;
  prerequisite: boolean;
  conceptConfusion: boolean;
  reasoning: boolean;
  instruction: boolean;
  grounding: boolean;
  ambiguous: boolean;
}> {
  const s = stem || '';
  const out: Record<string, boolean> = {};
  if (/\b(calculate|compute|how many|fspl|log10|throughput|cidr|\/\d{1,2}\b)/i.test(s)) {
    out.calcMismatch = true;
  }
  if (/\b(before|prerequisite|first must|depends on|prior week)\b/i.test(s)) {
    out.prerequisite = true;
  }
  if (/\b(vs\.?|versus|confus|difference between|which of the following is NOT)\b/i.test(s)) {
    out.conceptConfusion = true;
  }
  if (/\b(therefore|implies|if .+ then|reason|because)\b/i.test(s)) {
    out.reasoning = true;
  }
  if (/\b(according to the (lesson|lab)|based on the (passage|notes)|from the text)\b/i.test(s)) {
    out.grounding = true;
  }
  if (/\b(select all|best describes|most nearly|ambiguous)\b/i.test(s)) {
    out.ambiguous = true;
  }
  if (/\b(carefully read|exactly as stated|follow the instruction)\b/i.test(s)) {
    out.instruction = true;
  }
  return out;
}

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
  const soft = inferStemSignals(opts.stem);
  const merged = {
    ...opts,
    calcMismatch: opts.calcMismatch ?? soft.calcMismatch,
    prerequisite: opts.prerequisite ?? soft.prerequisite,
    conceptConfusion: opts.conceptConfusion ?? soft.conceptConfusion,
    reasoning: opts.reasoning ?? soft.reasoning,
    instruction: opts.instruction ?? soft.instruction,
    grounding: opts.grounding ?? soft.grounding,
    ambiguous: opts.ambiguous ?? soft.ambiguous,
  };
  let code: FailureCode = 'MODEL_KNOWLEDGE_GAP';
  if (merged.usedKeys) code = 'POLICY_BLOCKED';
  else if (merged.parserFailed) code = 'PARSER_FAILURE';
  else if (merged.blockedResource) code = 'RESOURCE_BLOCKED';
  else if (merged.blockedRuntime) code = 'DIAGNOSIS_UNCERTAIN';
  else if (merged.contextLimit) code = 'CONTEXT_LIMIT_FAILURE';
  else if (merged.promptFormat) code = 'PROMPT_FORMAT_FAILURE';
  else if (merged.toolRequiredNotUsed) code = 'TOOL_REQUIRED_NOT_USED';
  else if (merged.toolSelectionWrong) code = 'TOOL_SELECTION_FAILURE';
  else if (merged.toolFailed) code = 'TOOL_EXECUTION_FAILURE';
  else if (merged.calcMismatch) code = 'CALCULATION_FAILURE';
  else if (merged.prerequisite) code = 'PREREQUISITE_GAP';
  else if (merged.conceptConfusion) code = 'CONCEPT_CONFUSION';
  else if (merged.reasoning) code = 'REASONING_FAILURE';
  else if (merged.instruction) code = 'INSTRUCTION_INTERPRETATION_FAILURE';
  else if (merged.grounding) code = 'SOURCE_GROUNDING_FAILURE';
  else if (merged.ambiguous) code = 'AMBIGUOUS_ITEM';
  else if (merged.curriculumDefect) code = 'CURRICULUM_DEFECT_CANDIDATE';
  else if (merged.graderDefect) code = 'GRADER_DEFECT_CANDIDATE';
  else if (merged.chosen == null || merged.chosen === '') code = 'PARSER_FAILURE';

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

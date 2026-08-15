/**
 * Failure taxonomy for Mastery-002 missed marks.
 */

export const TAXONOMY = [
  'MODEL_KNOWLEDGE_GAP',
  'PREREQUISITE_GAP',
  'CONCEPT_CONFUSION',
  'REASONING_FAILURE',
  'CALCULATION_FAILURE',
  'INSTRUCTION_INTERPRETATION_FAILURE',
  'VOCABULARY_FAILURE',
  'TRANSFER_FAILURE',
  'TOOL_SELECTION_FAILURE',
  'TOOL_EXECUTION_FAILURE',
  'DEBUGGING_FAILURE',
  'CODE_FAILURE',
  'SOURCE_GROUNDING_FAILURE',
  'RUBRIC_FAILURE',
  'PARTIAL_COMPLETION',
  'CARELESS_ERROR',
  'ACCESSIBILITY_BARRIER',
  'AMBIGUOUS_PROMPT',
  'CURRICULUM_DEFECT_CANDIDATE',
  'GRADER_DEFECT_CANDIDATE',
  'POLICY_BLOCKED',
  'RESOURCE_BLOCKED',
  'DIAGNOSIS_UNCERTAIN',
] as const;

export type FailureCode = (typeof TAXONOMY)[number];

export function classifyMiss(opts: {
  stem: string;
  chosen?: string | null;
  toolFailed?: boolean;
  calcMismatch?: boolean;
  blockedResource?: boolean;
  blockedRuntime?: boolean;
  usedKeys?: boolean;
}): { failure_code: FailureCode; first_divergence: string; stem_excerpt: string } {
  let code: FailureCode = 'MODEL_KNOWLEDGE_GAP';
  if (opts.usedKeys) code = 'POLICY_BLOCKED';
  else if (opts.blockedResource) code = 'RESOURCE_BLOCKED';
  else if (opts.blockedRuntime) code = 'DIAGNOSIS_UNCERTAIN';
  else if (opts.toolFailed) code = 'TOOL_EXECUTION_FAILURE';
  else if (opts.calcMismatch) code = 'CALCULATION_FAILURE';
  else if (opts.chosen == null || opts.chosen === '') code = 'PARTIAL_COMPLETION';

  return {
    failure_code: code,
    first_divergence: opts.chosen ? 'answer_selection' : 'no_attempt',
    stem_excerpt: (opts.stem || '').slice(0, 160),
  };
}

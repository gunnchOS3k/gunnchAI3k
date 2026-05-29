export type TutorResponseMode =
  | 'beginner'
  | 'apprentice'
  | 'industry'
  | 'research'
  | 'child_safe'
  | 'exam_prep_no_cheating'
  | 'project_mentor'
  | 'instructor_assistant';

export const RESPONSE_MODE_LABELS: Record<TutorResponseMode, string> = {
  beginner: 'Beginner — plain English intuition',
  apprentice: 'Apprentice — guided labs and hints',
  industry: 'Industry — tools, workflows, team reality',
  research: 'Research — frontier + ethics',
  child_safe: 'Child-safe — simplified, bounded',
  exam_prep_no_cheating: 'Exam prep — practice only, no active exam solutions',
  project_mentor: 'Project mentor — capstones and portfolios',
  instructor_assistant: 'Instructor assistant — lesson plans and rubrics',
};

export function parseResponseMode(input: string): TutorResponseMode {
  const normalized = input.toLowerCase().replace(/\s+/g, '_');
  const modes = Object.keys(RESPONSE_MODE_LABELS) as TutorResponseMode[];
  return modes.find((m) => m === normalized || m.startsWith(normalized)) ?? 'beginner';
}

export function modeSystemHint(mode: TutorResponseMode): string {
  return RESPONSE_MODE_LABELS[mode];
}

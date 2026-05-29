const CHEAT_PATTERNS = [
  /answer\s+key/i,
  /current\s+exam/i,
  /take\s+my\s+test/i,
  /submit\s+this\s+for\s+me/i,
  /homework\s+due\s+today.*solution/i,
  /proctored\s+exam.*answer/i,
];

const EXAM_PREP_OK = [/practice\s+quiz/i, /mock\s+exam/i, /study\s+guide/i];

export interface IntegrityDecision {
  allowed: boolean;
  reason: string;
  alternative?: string;
}

export function checkAcademicIntegrityRequest(message: string): IntegrityDecision {
  const text = message.trim();

  if (CHEAT_PATTERNS.some((p) => p.test(text))) {
    return {
      allowed: false,
      reason: 'Active or graded assessment solution requests are not allowed.',
      alternative:
        'Try `/quizme` for practice, `/explain` for concepts, or ask for hints in Socratic mode.',
    };
  }

  if (EXAM_PREP_OK.some((p) => p.test(text))) {
    return {
      allowed: true,
      reason: 'Practice and study prep is allowed with no direct cheating.',
    };
  }

  return { allowed: true, reason: 'General tutoring request.' };
}

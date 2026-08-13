/**
 * Executable Socratic hint engine (Khanmigo-class behavior, not a prompt slogan).
 * Never dumps the worked answer for active homework / "just tell me".
 */

import { checkAcademicIntegrityRequest } from '../tutor/academicIntegrityPolicy';

export type SocraticMode = 'hint' | 'question' | 'check' | 'refuse' | 'encourage';

export interface SocraticTurn {
  mode: SocraticMode;
  text: string;
  revealedAnswer: false;
  questions: string[];
  nextPrompt: string;
  refused: boolean;
}

const ANSWER_SEEKING = [
  /\bjust tell me\b/i,
  /\bgive me the answer\b/i,
  /\bwhat(?:'s| is) the (?:final )?answer\b/i,
  /\bsolve this for me\b/i,
  /\bdo my homework\b/i,
];

function leakCheck(text: string, secret?: string): boolean {
  if (!secret) return false;
  const needle = secret.trim().toLowerCase();
  if (needle.length < 2) return false;
  return text.toLowerCase().includes(needle);
}

export function socraticTurn(input: {
  message: string;
  topic: string;
  studentAttempt?: string;
  /** If provided, must never appear in the tutor text. */
  withheldAnswer?: string;
}): SocraticTurn {
  const integrity = checkAcademicIntegrityRequest(input.message);
  if (!integrity.allowed) {
    const text = [
      'I will not give the solution to an active or graded assessment.',
      integrity.alternative ?? 'Ask for a hint, a practice item, or the next question to try.',
      `Topic "${input.topic}": what have you already tried?`,
    ].join(' ');
    if (leakCheck(text, input.withheldAnswer)) {
      throw new Error('SOCRATIC_ANSWER_LEAK');
    }
    return {
      mode: 'refuse',
      text,
      revealedAnswer: false,
      questions: ['What have you already tried?'],
      nextPrompt: 'Describe one step you would take first.',
      refused: true,
    };
  }

  if (ANSWER_SEEKING.some((re) => re.test(input.message))) {
    const text = [
      `I will not hand you the finished answer for "${input.topic}".`,
      'Hint: name the quantity you are solving for, then write the first equation or definition that applies.',
      'What is the first symbol or step you would write?',
    ].join(' ');
    if (leakCheck(text, input.withheldAnswer)) {
      throw new Error('SOCRATIC_ANSWER_LEAK');
    }
    return {
      mode: 'hint',
      text,
      revealedAnswer: false,
      questions: ['What is the first symbol or step you would write?'],
      nextPrompt: 'Try that first step and show your work.',
      refused: false,
    };
  }

  if (input.studentAttempt && input.studentAttempt.trim().length > 0) {
    const text = [
      `You tried: "${input.studentAttempt.trim().slice(0, 160)}".`,
      'Check: does that step follow from the definition, or did you jump to a result?',
      'What would you verify next before claiming you are done?',
    ].join(' ');
    if (leakCheck(text, input.withheldAnswer)) {
      throw new Error('SOCRATIC_ANSWER_LEAK');
    }
    return {
      mode: 'check',
      text,
      revealedAnswer: false,
      questions: ['What would you verify next before claiming you are done?'],
      nextPrompt: 'Write the check you would perform.',
      refused: false,
    };
  }

  const text = [
    `Before I explain "${input.topic}", I need your starting point.`,
    'What do you already know? What part confuses you? What would you try first?',
  ].join(' ');
  if (leakCheck(text, input.withheldAnswer)) {
    throw new Error('SOCRATIC_ANSWER_LEAK');
  }
  return {
    mode: 'question',
    text,
    revealedAnswer: false,
    questions: [
      'What do you already know?',
      'What part confuses you?',
      'What would you try first?',
    ],
    nextPrompt: 'Answer one of those three questions.',
    refused: false,
  };
}

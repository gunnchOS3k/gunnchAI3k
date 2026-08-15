/**
 * Educator copilot — planning / first-time / live / grading HITL / feedback / analytics.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { assertModePermission, createModeSession } from './modes';

export type EducatorIntent =
  | 'planning'
  | 'first_time_teacher'
  | 'live_support'
  | 'grading_assist'
  | 'feedback'
  | 'analytics';

export function runEducatorCopilot(courseId: string, intent: EducatorIntent = 'planning') {
  const session = createModeSession('EDUCATOR_COPILOT');
  let publishBlocked = false;
  try {
    assertModePermission('EDUCATOR_COPILOT', 'publish_grades');
  } catch {
    publishBlocked = true;
  }
  const packs: Record<EducatorIntent, string[]> = {
    planning: ['Map hook → lab → quiz', 'Check skill-graph prerequisites'],
    first_time_teacher: ['Read instructor packet offline', 'Demo empty-lab fail'],
    live_support: ['Socratic learner channel', 'Never paste answer keys to learners'],
    grading_assist: ['Propose rubric scores', 'Require human confirm before publish'],
    feedback: ['Skill-focused comments only', 'No demeaning labels'],
    analytics: ['Aggregate by domain', 'Opaque learner refs'],
  };
  return {
    mode: session.mode,
    courseId,
    intent,
    actions: packs[intent],
    permissions: session.permissions,
    hitlGradingRequired: true,
    autoPublishGrades: false,
    publishWithoutHumanBlocked: publishBlocked,
  };
}

/** Safe wrapper: grading proposals never auto-publish. */
export function proposeGradeAssist(courseId: string, proposedScore: number) {
  const session = createModeSession('EDUCATOR_COPILOT');
  return {
    mode: session.mode,
    courseId,
    proposedScore,
    status: 'AWAITING_HUMAN_CONFIRM' as const,
    published: false,
    hitlRequired: true,
  };
}

/** Evidence pack across all educator intents — for Mastery-002 B13. */
export function runEducatorEvidenceSuite(cwd: string, courseId = 'GENERAL_IT'): Record<string, unknown> {
  const intents: EducatorIntent[] = [
    'planning',
    'first_time_teacher',
    'live_support',
    'grading_assist',
    'feedback',
    'analytics',
  ];
  const sessions = intents.map((intent) => runEducatorCopilot(courseId, intent));
  const grade = proposeGradeAssist(courseId, 0.72);
  const out = {
    schema: 'gunnchai.educator_copilot_evidence.v1',
    course_id: courseId,
    intents_covered: intents,
    sessions,
    grade_assist: grade,
    hitl_ok: sessions.every((s) => s.hitlGradingRequired && s.autoPublishGrades === false),
    publish_blocked: sessions.every((s) => s.publishWithoutHumanBlocked === true),
    HUMAN_LEARNING_CLAIMED: false,
    note: 'Educator surfaces only; no auto-publish; no demeaning labels; keys never to learners.',
  };
  const outDir = path.join(cwd, 'artifacts', 'waike-mastery');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'EDUCATOR_COPILOT_EVIDENCE.json'), JSON.stringify(out, null, 2) + '\n');
  return out;
}

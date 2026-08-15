/**
 * Educator copilot — planning / first-time / live / grading HITL / feedback / analytics.
 */
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
  // publishing grades without human is always forbidden in this mode
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

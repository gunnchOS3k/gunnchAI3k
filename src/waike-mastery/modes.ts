/**
 * AI-WAIKE-MASTERY hard permission separation across three modes.
 */

export type MasteryMode = 'MASTERY_BENCHMARK' | 'LEARNER_TUTOR' | 'EDUCATOR_COPILOT';

export interface ModePermissions {
  mayReadStudentMaterials: boolean;
  mayReadInstructorKeys: boolean;
  maySelfGrade: boolean;
  mayPublishGradesWithoutHuman: boolean;
  hitlGradingRequired: boolean;
  mayDiscloseFinalAnswersToLearner: boolean;
  gradingAgent: 'isolated_after_submission' | 'hitl' | 'none';
}

export const MODE_PERMISSIONS: Record<MasteryMode, ModePermissions> = {
  MASTERY_BENCHMARK: {
    mayReadStudentMaterials: true,
    mayReadInstructorKeys: false,
    maySelfGrade: false,
    mayPublishGradesWithoutHuman: false,
    hitlGradingRequired: false,
    mayDiscloseFinalAnswersToLearner: false,
    gradingAgent: 'isolated_after_submission',
  },
  LEARNER_TUTOR: {
    mayReadStudentMaterials: true,
    mayReadInstructorKeys: false,
    maySelfGrade: false,
    mayPublishGradesWithoutHuman: false,
    hitlGradingRequired: false,
    mayDiscloseFinalAnswersToLearner: false,
    gradingAgent: 'none',
  },
  EDUCATOR_COPILOT: {
    mayReadStudentMaterials: true,
    mayReadInstructorKeys: true,
    maySelfGrade: false,
    mayPublishGradesWithoutHuman: false,
    hitlGradingRequired: true,
    mayDiscloseFinalAnswersToLearner: false,
    gradingAgent: 'hitl',
  },
};

export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermissionError';
  }
}

export function assertModePermission(
  mode: MasteryMode,
  action:
    | 'read_instructor_keys'
    | 'self_grade'
    | 'publish_grades'
    | 'disclose_answers_to_learner',
): void {
  const p = MODE_PERMISSIONS[mode];
  if (action === 'read_instructor_keys' && !p.mayReadInstructorKeys) {
    throw new PermissionError(`${mode} cannot read instructor keys`);
  }
  if (action === 'self_grade' && !p.maySelfGrade) {
    throw new PermissionError(`${mode} cannot self-grade`);
  }
  if (action === 'publish_grades' && !p.mayPublishGradesWithoutHuman) {
    throw new PermissionError(`${mode} cannot publish grades without HITL`);
  }
  if (action === 'disclose_answers_to_learner' && !p.mayDiscloseFinalAnswersToLearner) {
    throw new PermissionError(`${mode} cannot disclose final answers to learners`);
  }
}

export function createModeSession(mode: MasteryMode): {
  mode: MasteryMode;
  permissions: ModePermissions;
} {
  return { mode, permissions: { ...MODE_PERMISSIONS[mode] } };
}

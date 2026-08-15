/**
 * Privacy-conscious student model — skill focus only, no demeaning labels.
 */

const FORBIDDEN = [
  'dumb',
  'slow',
  'hopeless',
  'bad student',
  'low iq',
  'lazy',
  'stupid',
];

export interface StudentModel {
  learnerRef: string;
  masteredSkills: string[];
  developingSkills: string[];
  unresolvedSkills: string[];
  misconceptions: string[];
  supportEvidence: string[];
  remediationHistory: Array<{ skillId: string; state: string }>;
  reassessment: Array<{ skillId: string; score: number }>;
  transferEvidence: Array<{ skillId: string; ok: boolean }>;
  focusSkills: string[];
  strengths: string[];
  labels: string[];
  privacy: {
    noDemeaningLabels: true;
    piiForbiddenInGit: true;
    inspectable: true;
    correctable: true;
  };
}

export function createStudentModel(learnerRef: string, focusSkills: string[] = []): StudentModel {
  if (!learnerRef || learnerRef.includes('@') || learnerRef.includes(' ')) {
    throw new Error('learnerRef must be an opaque id (no email/name)');
  }
  return {
    learnerRef,
    masteredSkills: [],
    developingSkills: [...focusSkills],
    unresolvedSkills: [],
    misconceptions: [],
    supportEvidence: [],
    remediationHistory: [],
    reassessment: [],
    transferEvidence: [],
    focusSkills,
    strengths: [],
    labels: [],
    privacy: {
      noDemeaningLabels: true,
      piiForbiddenInGit: true,
      inspectable: true,
      correctable: true,
    },
  };
}

export function assertNoDemeaningLabels(text: string): void {
  const low = text.toLowerCase();
  for (const bad of FORBIDDEN) {
    if (low.includes(bad)) {
      throw new Error(`demeaning_label_forbidden:${bad}`);
    }
  }
}

export function safeFeedback(skillId: string, tip: string): string {
  const msg = `Focus next on ${skillId}. ${tip}`;
  assertNoDemeaningLabels(msg);
  return msg;
}

export function applySkillUpdate(
  model: StudentModel,
  skillId: string,
  kind: 'mastered' | 'developing' | 'unresolved' | 'misconception',
): StudentModel {
  assertNoDemeaningLabels(skillId);
  const next = { ...model };
  if (kind === 'mastered') {
    next.masteredSkills = [...new Set([...model.masteredSkills, skillId])];
    next.developingSkills = model.developingSkills.filter((s) => s !== skillId);
    next.unresolvedSkills = model.unresolvedSkills.filter((s) => s !== skillId);
  } else if (kind === 'developing') {
    next.developingSkills = [...new Set([...model.developingSkills, skillId])];
  } else if (kind === 'unresolved') {
    next.unresolvedSkills = [...new Set([...model.unresolvedSkills, skillId])];
  } else {
    next.misconceptions = [...new Set([...model.misconceptions, skillId])];
  }
  return next;
}

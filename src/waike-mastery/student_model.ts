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
  focusSkills: string[];
  strengths: string[];
  labels: string[];
  privacy: {
    noDemeaningLabels: true;
    piiForbiddenInGit: true;
  };
}

export function createStudentModel(learnerRef: string, focusSkills: string[] = []): StudentModel {
  if (!learnerRef || learnerRef.includes('@') || learnerRef.includes(' ')) {
    throw new Error('learnerRef must be an opaque id (no email/name)');
  }
  return {
    learnerRef,
    focusSkills,
    strengths: [],
    labels: [],
    privacy: { noDemeaningLabels: true, piiForbiddenInGit: true },
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

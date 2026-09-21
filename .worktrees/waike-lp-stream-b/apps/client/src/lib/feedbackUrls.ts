export const FEEDBACK_HUB_URL =
  "https://github.com/gunnchOS3k/gunnchos-research-portal/blob/main/FEEDBACK.md";
export const SECURITY_MD_URL =
  "https://github.com/gunnchOS3k/gunnchos-research-portal/blob/main/SECURITY.md";

const FORM = {
  bug: "bug.yml",
  feature: "feature.yml",
  accessibility: "accessibility.yml",
  documentation: "documentation.yml",
} as const;

export type FeedbackRole = "learner" | "instructor" | "admin" | "curriculum" | "accessibility" | "general";

export function feedbackUrlForRole(role: FeedbackRole): string {
  const base = "https://github.com/gunnchOS3k/gunnchos-research-portal/issues/new";
  const map: Record<FeedbackRole, string> = {
    learner: FORM.feature,
    instructor: FORM.feature,
    admin: FORM.bug,
    curriculum: FORM.documentation,
    accessibility: FORM.accessibility,
    general: FORM.feature,
  };
  const template = map[role];
  return `${base}?template=${template}&title=${encodeURIComponent(`[waike/${role}] `)}`;
}

export function feedbackHubWithComponent(component: string): string {
  const safe = component.replace(/[^\w\s.\-:]/g, "").trim().slice(0, 64);
  return safe ? `${FEEDBACK_HUB_URL}?component=${encodeURIComponent(safe)}` : FEEDBACK_HUB_URL;
}

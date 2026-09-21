import {
  FEEDBACK_HUB_URL,
  SECURITY_MD_URL,
  feedbackHubWithComponent,
  feedbackUrlForRole,
  type FeedbackRole,
} from "../../lib/feedbackUrls";

export function FeedbackSuggestions({ role }: { role?: string | null }) {
  const normalized: FeedbackRole =
    role === "instructor"
      ? "instructor"
      : role === "site_admin" || role === "admin"
        ? "admin"
        : "learner";

  const links: { label: string; href: string }[] = [
    { label: "Feedback & Suggestions", href: feedbackHubWithComponent("WAIKE") },
    { label: "Learner feedback", href: feedbackUrlForRole("learner") },
    { label: "Instructor feedback", href: feedbackUrlForRole("instructor") },
    { label: "Grading / Admin feedback", href: feedbackUrlForRole("admin") },
    { label: "Curriculum issue", href: feedbackUrlForRole("curriculum") },
    { label: "Accessibility feedback", href: feedbackUrlForRole("accessibility") },
  ];

  return (
    <footer className="feedback-footer" data-testid="feedback-suggestions" aria-label="Feedback and suggestions">
      <p>
        <strong>Help / About — Feedback &amp; Suggestions</strong>
      </p>
      <ul>
        {links.map((l) => (
          <li key={l.label}>
            <a href={l.href} target="_blank" rel="noopener noreferrer">
              {l.label}
            </a>
          </li>
        ))}
        <li>
          <a href={SECURITY_MD_URL} target="_blank" rel="noopener noreferrer">
            Security (private)
          </a>
        </li>
      </ul>
      <p className="muted">
        Opens GitHub public forms via the ecosystem hub. Do not include secrets, serials, or personal logs. Role hint:{" "}
        {normalized}.
      </p>
    </footer>
  );
}

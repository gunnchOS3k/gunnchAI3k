/** Tutoring is advice. It cannot carry a grade or a completion record. */
export function suggestionOnlyTutoring<T extends { structured?: object }>(
  payload: T & { grade?: unknown; completion?: unknown },
): Omit<T, 'grade' | 'completion'> & { suggestion_only: true } {
  const structured =
    payload.structured && typeof payload.structured === 'object'
      ? { ...(payload.structured as Record<string, unknown>) }
      : undefined;
  if (structured) {
    delete structured.grade;
    delete structured.completion;
  }
  const response: Record<string, unknown> = {
    ...payload,
    ...(structured ? { structured } : {}),
    suggestion_only: true,
  };
  delete response.grade;
  delete response.completion;
  return response as Omit<T, 'grade' | 'completion'> & { suggestion_only: true };
}

/** Tutoring is advice. It cannot carry a grade or a completion record. */
const FORBIDDEN_RESPONSE_KEYS = new Set(['grade', 'completion']);

function isJsonContainer(value: string): boolean {
  const trimmed = value.trim();
  return (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  );
}

function stripSmuggledValue(value: unknown, seen: WeakSet<object>): unknown {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!isJsonContainer(trimmed) && !(trimmed.startsWith('{') || trimmed.startsWith('['))) {
      return value;
    }
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (parsed && typeof parsed === 'object') {
        return JSON.stringify(stripSmuggledValue(parsed, seen));
      }
    } catch {
      if (/"grade"\s*:/.test(trimmed) || /"completion"\s*:/.test(trimmed)) return '';
    }
    return value;
  }
  if (!value || typeof value !== 'object') return value;
  if (seen.has(value)) return null;
  seen.add(value);
  if (Array.isArray(value)) return value.map((item) => stripSmuggledValue(item, seen));
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_RESPONSE_KEYS.has(key)) continue;
    out[key] = stripSmuggledValue(child, seen);
  }
  return out;
}

export function suggestionOnlyTutoring<T extends { structured?: object }>(
  payload: T & { grade?: unknown; completion?: unknown },
): Omit<T, 'grade' | 'completion'> & { suggestion_only: true } {
  const stripped = stripSmuggledValue(payload, new WeakSet()) as Record<string, unknown>;
  stripped.suggestion_only = true;
  delete stripped.grade;
  delete stripped.completion;
  return stripped as Omit<T, 'grade' | 'completion'> & { suggestion_only: true };
}

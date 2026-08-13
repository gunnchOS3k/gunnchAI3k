/**
 * Independent self-challenge: implemented tasks must not be slogan stubs.
 */

const STUB_MARKERS = [
  /\bTODO\b/,
  /\bFIXME\b/,
  /\bnot implemented\b/i,
  /\bstub only\b/i,
  /\bcoming soon\b/i,
  /\bplaceholder\b/i,
];

export function assertNotStub(label: string, value: unknown): void {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  if (!text || text.trim().length < 12) {
    throw new Error(`STUB_CHALLENGE_EMPTY:${label}`);
  }
  for (const re of STUB_MARKERS) {
    if (re.test(text)) throw new Error(`STUB_CHALLENGE_MARKER:${label}:${re}`);
  }
}

export function challengeImplementedFlags(tasks: Array<{ task_id: string; implemented: boolean; actual_runtime_test: string | null }>): string[] {
  const failures: string[] = [];
  for (const t of tasks) {
    if (t.implemented && !t.actual_runtime_test) {
      failures.push(`${t.task_id}: implemented=true but actual_runtime_test is null`);
    }
    if (!t.implemented && t.actual_runtime_test) {
      failures.push(`${t.task_id}: implemented=false but a runtime test path is listed`);
    }
  }
  return failures;
}

const PII_PATTERNS = [
  /\b\d{3}-\d{2}-\d{4}\b/,
  /\bssn\b/i,
  /\b\d{16}\b/,
];

export function containsLikelyPII(text: string): boolean {
  return PII_PATTERNS.some((p) => p.test(text));
}

export function childSafeResponsePrefix(): string {
  return 'Kid-friendly mode: I will keep things simple and safe. Ask a trusted adult if unsure.';
}

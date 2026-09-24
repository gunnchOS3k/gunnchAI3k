const SECRET_PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: 'password', re: /(password|passwd|pwd)\s*[:=]\s*["']?([^\s"']+)/gi },
  { name: 'bearer', re: /(authorization\s*:\s*bearer\s+)([a-z0-9._\-+=/]+)/gi },
  { name: 'api_key', re: /((?:api[_-]?key|secret[_-]?key|access[_-]?token)\s*[:=]\s*["']?)([a-z0-9._\-+=/]{8,})/gi },
  { name: 'private_key', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/gi },
  { name: 'pem_inline', re: /(sk-|rk-|key_)[A-Za-z0-9]{16,}/g },
];

const MAX_STATE_CHARS = 8_000;

export interface RedactionResult {
  value: unknown;
  redacted_fields: string[];
  truncated: boolean;
}

function redactString(input: string, trail: string, hits: string[]): string {
  let out = input;
  for (const p of SECRET_PATTERNS) {
    if (p.re.test(out)) {
      hits.push(`${trail}:${p.name}`);
      p.re.lastIndex = 0;
      out = out.replace(p.re, (match, g1?: string) => {
        if (p.name === 'private_key') return '[REDACTED_PRIVATE_KEY]';
        if (typeof g1 === 'string' && match.toLowerCase().includes('bearer')) return `${g1}[REDACTED]`;
        if (typeof g1 === 'string') return `${g1}[REDACTED]`;
        return '[REDACTED]';
      });
    }
    p.re.lastIndex = 0;
  }
  return out;
}

function walk(value: unknown, trail: string, hits: string[]): unknown {
  if (typeof value === 'string') return redactString(value, trail, hits);
  if (Array.isArray(value)) return value.map((v, i) => walk(v, `${trail}[${i}]`, hits));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const key = k.toLowerCase();
      if (
        key.includes('password') ||
        key.includes('private_key') ||
        key.includes('api_key') ||
        key.includes('secret') ||
        key === 'authorization' ||
        key === 'token'
      ) {
        hits.push(`${trail}.${k}:field`);
        out[k] = '[REDACTED]';
      } else {
        out[k] = walk(v, `${trail}.${k}`, hits);
      }
    }
    return out;
  }
  return value;
}

export function redactSecrets(value: unknown): RedactionResult {
  const hits: string[] = [];
  const redacted = walk(value, 'state', hits);
  return { value: redacted, redacted_fields: [...new Set(hits)], truncated: false };
}

export function boundLength(value: unknown, maxChars = MAX_STATE_CHARS): { value: unknown; truncated: boolean } {
  const json = JSON.stringify(value);
  if (json.length <= maxChars) return { value, truncated: false };
  if (typeof value === 'string') return { value: value.slice(0, maxChars), truncated: true };
  return { value: { _truncated: true, preview: json.slice(0, maxChars) }, truncated: true };
}

export function redactError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  return redactString(raw, 'error', []).replace(/Bearer\s+[A-Za-z0-9._\-+=/]+/gi, 'Bearer [REDACTED]');
}

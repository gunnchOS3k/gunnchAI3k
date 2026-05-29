export interface SourceGroundingResult {
  grounded: boolean;
  sources: string[];
  disclaimer: string;
}

const ALLOWED_SOURCE_PREFIXES = [
  'waike-research-ops/',
  'knowledge/',
  'prompts/',
  'docs/',
  'github.com/gunnchOS3k/',
];

export function evaluateSourceGrounding(citedSources: string[]): SourceGroundingResult {
  const sources = citedSources.filter(Boolean);
  const grounded =
    sources.length > 0 &&
    sources.every((s) => ALLOWED_SOURCE_PREFIXES.some((p) => s.includes(p)));

  return {
    grounded,
    sources,
    disclaimer: grounded
      ? 'Sources listed are public WAIKE/gunnchOS materials only.'
      : 'No verified public source cited — treat as general guidance and verify with instructor.',
  };
}

export function refuseUnverifiedClaim(confidence: 'low' | 'medium' | 'high'): string | null {
  if (confidence === 'low') {
    return 'I am not certain. Let us check WAIKE materials or your instructor together.';
  }
  return null;
}

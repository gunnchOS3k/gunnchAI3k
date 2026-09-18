/**
 * Testable hallucination / ungrounded-claim detection heuristics.
 * SYNTHETIC-eval friendly. Not a claim of production tutoring accuracy.
 */

export type HallucinationCheck = {
  grounded: boolean;
  reason: string;
  unsupportedClaims: string[];
};

const ABSOLUTE_CLAIM = /\b(always|never|guaranteed|100%\s*accurate|definitely\s+true)\b/i;
const FABRICATED_CITATION = /\[(?:cite|ref):\s*(?:fake|synthetic|made[- ]?up)\]/i;
const UNICORN_MARKER = /\bunicorns?\s+prove\b/i;

/**
 * Require that substantive claims either cite an attached source id or stay hedged.
 * Inputs are fixtures — label suites SYNTHETIC when used for gate evidence.
 */
export function checkHallucinationResistance(input: {
  answer: string;
  attachedSourceIds: string[];
  citedSourceIds: string[];
}): HallucinationCheck {
  const unsupported: string[] = [];
  const answer = input.answer || '';

  if (FABRICATED_CITATION.test(answer) || UNICORN_MARKER.test(answer)) {
    unsupported.push('fabricated_or_toy_claim');
  }

  if (ABSOLUTE_CLAIM.test(answer) && input.citedSourceIds.length === 0) {
    unsupported.push('absolute_claim_without_citation');
  }

  const citedUnknown = input.citedSourceIds.filter((id) => !input.attachedSourceIds.includes(id));
  if (citedUnknown.length > 0) {
    unsupported.push(`unknown_citations:${citedUnknown.join(',')}`);
  }

  if (unsupported.length > 0) {
    return {
      grounded: false,
      reason: 'Ungrounded or fabricated claim patterns detected.',
      unsupportedClaims: unsupported,
    };
  }

  return {
    grounded: true,
    reason: 'No ungrounded patterns detected against attached sources.',
    unsupportedClaims: [],
  };
}

/**
 * Honest product tokens for independent evals.
 *
 * SmolLM2-135M Q4_K_M 512-ctx is Nano fallback only — never final intelligence.
 * GUNNCHAI_APP_PRODUCT_COMPLETE stays false unless Local Fast/Pro, OS companion
 * UX, and remaining OPEN items are actually earned. Frontier-parity stays false.
 */

export const APP_PRODUCT_COMPLETE_TOKEN = 'GUNNCHAI_APP_PRODUCT_COMPLETE';
export const FRONTIER_PARITY_TOKEN = 'GUNNCHAI_FRONTIER_PRODUCT_PARITY';
export const INDEPENDENT_EVAL_TOKEN = 'GUNNCHAI_INDEPENDENT_EVAL_DIGITAL_PASS';
export const NANO_FALLBACK_LABEL = 'NANO_FALLBACK_ONLY';

export const NANO_MODEL_ID = 'smollm2-135m-instruct-q4_k_m';
export const NANO_DISPLAY = 'SmolLM2-135M-Instruct';
export const NANO_CONTEXT_TOKENS = 512;
export const NANO_QUANT = 'Q4_K_M';

export interface HonestTokens {
  [APP_PRODUCT_COMPLETE_TOKEN]: false;
  [FRONTIER_PARITY_TOKEN]: false;
  [INDEPENDENT_EVAL_TOKEN]: boolean;
  [NANO_FALLBACK_LABEL]: true;
  BETTER_THAN_CHATGPT: false;
  BETTER_THAN_CLAUDE: false;
  BETTER_THAN_GEMINI: false;
  BETTER_THAN_COPILOT: false;
  BETTER_THAN_PERPLEXITY: false;
}

export function buildHonestTokens(independentEvalDigitalPass: boolean): HonestTokens {
  return {
    [APP_PRODUCT_COMPLETE_TOKEN]: false,
    [FRONTIER_PARITY_TOKEN]: false,
    [INDEPENDENT_EVAL_TOKEN]: independentEvalDigitalPass,
    [NANO_FALLBACK_LABEL]: true,
    BETTER_THAN_CHATGPT: false,
    BETTER_THAN_CLAUDE: false,
    BETTER_THAN_GEMINI: false,
    BETTER_THAN_COPILOT: false,
    BETTER_THAN_PERPLEXITY: false,
  };
}

export const APP_PRODUCT_COMPLETE_NOT_EARNED_REASON = [
  'Local Fast and Local Pro weights are registry/fixture entries, not measured daily intelligence.',
  `${NANO_DISPLAY} ${NANO_QUANT} ${NANO_CONTEXT_TOKENS}-ctx is Nano fallback only.`,
  'No visual OS-companion proof in this STREAM (VISUAL UNAVAILABLE).',
  'GUNNCHAI_FRONTIER_PRODUCT_PARITY remains false.',
  'gunnchai_tutor on device-os remains a packaging stub / OS API companion, not a finished app product.',
].join(' ');

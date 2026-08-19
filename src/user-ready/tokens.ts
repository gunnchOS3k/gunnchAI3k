/**
 * AI-USER-READY honest tokens.
 * Never flip product-complete / frontier / human-eval without evidence.
 */

export const APP_PRODUCT_COMPLETE_TOKEN = 'GUNNCHAI_APP_PRODUCT_COMPLETE';
export const FRONTIER_PARITY_TOKEN = 'GUNNCHAI_FRONTIER_PRODUCT_PARITY';
export const HUMAN_E6_TOKEN = 'HUMAN_E6';
export const USER_READY_PACKET_TOKEN = 'AI_USER_READY_002_DIGITAL_PASS';
export const USER_READY_001_TOKEN = 'AI_USER_READY_001_DIGITAL_PASS';
export const USER_READY_003_TOKEN = 'AI_USER_READY_003_DIGITAL_PASS';
export const USER_READY_004_TOKEN = 'AI_USER_READY_004_DIGITAL_PASS';
export const NANO_FALLBACK_LABEL = 'NANO_FALLBACK_ONLY';
export const VISUAL_UNAVAILABLE = 'VISUAL UNAVAILABLE';

export const DIGITAL_PRODUCT_CAPABILITY_TOKEN = 'GUNNCHAI_DIGITAL_PRODUCT_CAPABILITY_PASS';

export interface UserReadyTokens {
  [APP_PRODUCT_COMPLETE_TOKEN]: false;
  [FRONTIER_PARITY_TOKEN]: false;
  [HUMAN_E6_TOKEN]: false;
  [USER_READY_PACKET_TOKEN]: boolean;
  [USER_READY_001_TOKEN]: boolean;
  [USER_READY_003_TOKEN]: boolean;
  [USER_READY_004_TOKEN]: boolean;
  [NANO_FALLBACK_LABEL]: true;
  BETTER_THAN_CHATGPT: false;
  BETTER_THAN_CLAUDE: false;
  BETTER_THAN_GEMINI: false;
  BETTER_THAN_NOTEBOOKLM: false;
  BETTER_THAN_KHANMIGO: false;
  BETTER_THAN_PERPLEXITY: false;
  BETTER_THAN_COPILOT: false;
}

export function buildUserReadyTokens(opts: {
  packet001: boolean;
  packet002: boolean;
  packet003?: boolean;
  packet004?: boolean;
}): UserReadyTokens {
  return {
    [APP_PRODUCT_COMPLETE_TOKEN]: false,
    [FRONTIER_PARITY_TOKEN]: false,
    [HUMAN_E6_TOKEN]: false,
    [USER_READY_PACKET_TOKEN]: opts.packet002,
    [USER_READY_001_TOKEN]: opts.packet001,
    [USER_READY_003_TOKEN]: Boolean(opts.packet003),
    [USER_READY_004_TOKEN]: Boolean(opts.packet004),
    [NANO_FALLBACK_LABEL]: true,
    BETTER_THAN_CHATGPT: false,
    BETTER_THAN_CLAUDE: false,
    BETTER_THAN_GEMINI: false,
    BETTER_THAN_NOTEBOOKLM: false,
    BETTER_THAN_KHANMIGO: false,
    BETTER_THAN_PERPLEXITY: false,
    BETTER_THAN_COPILOT: false,
  };
}

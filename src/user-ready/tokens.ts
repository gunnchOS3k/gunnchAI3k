/**
 * AI-USER-READY-001 honest tokens.
 * Never flip product-complete / frontier / human-eval without evidence.
 */

export const APP_PRODUCT_COMPLETE_TOKEN = 'GUNNCHAI_APP_PRODUCT_COMPLETE';
export const FRONTIER_PARITY_TOKEN = 'GUNNCHAI_FRONTIER_PRODUCT_PARITY';
export const HUMAN_E6_TOKEN = 'HUMAN_E6';
export const USER_READY_PACKET_TOKEN = 'AI_USER_READY_001_DIGITAL_PASS';
export const NANO_FALLBACK_LABEL = 'NANO_FALLBACK_ONLY';
export const VISUAL_UNAVAILABLE = 'VISUAL UNAVAILABLE';

export interface UserReadyTokens {
  [APP_PRODUCT_COMPLETE_TOKEN]: false;
  [FRONTIER_PARITY_TOKEN]: false;
  [HUMAN_E6_TOKEN]: false;
  [USER_READY_PACKET_TOKEN]: boolean;
  [NANO_FALLBACK_LABEL]: true;
  BETTER_THAN_CHATGPT: false;
  BETTER_THAN_CLAUDE: false;
  BETTER_THAN_GEMINI: false;
  BETTER_THAN_NOTEBOOKLM: false;
  BETTER_THAN_KHANMIGO: false;
  BETTER_THAN_PERPLEXITY: false;
  BETTER_THAN_COPILOT: false;
}

export function buildUserReadyTokens(packetDigitalPass: boolean): UserReadyTokens {
  return {
    [APP_PRODUCT_COMPLETE_TOKEN]: false,
    [FRONTIER_PARITY_TOKEN]: false,
    [HUMAN_E6_TOKEN]: false,
    [USER_READY_PACKET_TOKEN]: packetDigitalPass,
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

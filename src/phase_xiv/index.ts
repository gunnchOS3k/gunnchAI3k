/** Phase XIV frontier AI systems — DRAFT only; parity token remains false. */

export * from './agent';
export * from './long_context/engine';
export * from './multimodal';
export * from './voice';
export * from './computer_use';
export * from './mcp';
export * from './skills';
export * from './artifacts';
export * from './scheduled';
export * from './collab';
export * from './continuity';
export * from './competitive';

export const PHASE_XIV_DOCTRINE = {
  draft_only: true,
  never_merge_claim: true,
  GUNNCHAI_FRONTIER_PRODUCT_PARITY: false,
  BETTER_THAN_CHATGPT: false,
  BETTER_THAN_CLAUDE: false,
  BETTER_THAN_GEMINI: false,
  BETTER_THAN_COPILOT: false,
  BETTER_THAN_PERPLEXITY: false,
} as const;

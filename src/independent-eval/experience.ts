/**
 * Experience review stub: integrated OS companion vs generic chatbot.
 * Pixels are VISUAL UNAVAILABLE unless a screenshot path is supplied.
 */

import * as fs from 'node:fs';

export const VISUAL_UNAVAILABLE = 'VISUAL UNAVAILABLE';

export interface ExperienceReview {
  schema: 'gunnchai.independent_eval.experience.v1';
  surface: 'integrated OS companion vs generic chatbot';
  pixels: typeof VISUAL_UNAVAILABLE | string;
  visualAvailable: boolean;
  companionDifferentiatorsImplemented: string[];
  stillReadsAsGenericChatbotWhen: string[];
  open: string[];
  verdict: string;
}

export function reviewExperience(opts?: { screenshotPath?: string }): ExperienceReview {
  const shot = opts?.screenshotPath;
  const visualAvailable = Boolean(shot && fs.existsSync(shot));
  return {
    schema: 'gunnchai.independent_eval.experience.v1',
    surface: 'integrated OS companion vs generic chatbot',
    pixels: visualAvailable ? shot! : VISUAL_UNAVAILABLE,
    visualAvailable,
    companionDifferentiatorsImplemented: [
      'Local-only default with explicit cloud disclosure (no silent cloud, no production keys)',
      'OS permission scopes gate assist / RAG / device / network tools',
      'Encrypted per-owner memory with cross-user and cross-project isolation',
      'RAG attribution (grounded vs ungrounded) instead of unsourced chatbot answers',
      'Task router that prefers Local Fast/Pro and keeps 135M as Nano fallback',
      'Device troubleshooting / a11y / tutoring product routes (deterministic + OS ai_interface)',
    ],
    stillReadsAsGenericChatbotWhen: [
      'No on-screen companion chrome was captured (VISUAL UNAVAILABLE)',
      'Daily answers still collapse to Nano 135M or deterministic templates when Fast/Pro weights are absent',
      'gunnchai_tutor on device-os is not a finished first-party visual app',
    ],
    open: [
      'Pixel proof of launcher/companion UX on gunnchOS',
      'Local Fast/Pro as the felt daily intelligence',
      'Ring/spatial/multimodal companion loops beyond API stubs',
    ],
    verdict: visualAvailable
      ? 'Pixels attached; still not an app-product-complete claim.'
      : 'VISUAL UNAVAILABLE — digital companion contracts exist; no screenshot, so no UX completeness claim.',
  };
}

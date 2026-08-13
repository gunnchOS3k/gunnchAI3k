/**
 * Companion vs generic chatbot heuristic.
 * Pixels remain VISUAL UNAVAILABLE unless a screenshot exists.
 */

import * as fs from 'node:fs';
import { VISUAL_UNAVAILABLE } from './tokens';

export type CompanionKind = 'companion' | 'chatbot';

const COMPANION_HINTS = [
  /device|dock|battery|wifi|bluetooth|storage|handheld|profile/i,
  /tutor|hint|socratic|quiz|homework|wai.?ke|study/i,
  /project|memory|remember|artifact|citation|offline/i,
  /permission|grant|mic|camera|screen|tool auth/i,
  /a11y|accessibility|wcag|caption/i,
];

export interface CompanionClassification {
  kind: CompanionKind;
  reasons: string[];
  pixels: typeof VISUAL_UNAVAILABLE | string;
  visualAvailable: boolean;
}

export function classifyCompanionVsChatbot(
  utterance: string,
  opts?: { screenshotPath?: string },
): CompanionClassification {
  const reasons: string[] = [];
  for (const re of COMPANION_HINTS) {
    if (re.test(utterance)) reasons.push(`matched:${re.source}`);
  }
  const shot = opts?.screenshotPath;
  const visualAvailable = Boolean(shot && fs.existsSync(shot));
  return {
    kind: reasons.length > 0 ? 'companion' : 'chatbot',
    reasons:
      reasons.length > 0
        ? reasons
        : ['generic chat with no OS/tutor/project/tool signal'],
    pixels: visualAvailable ? shot! : VISUAL_UNAVAILABLE,
    visualAvailable,
  };
}

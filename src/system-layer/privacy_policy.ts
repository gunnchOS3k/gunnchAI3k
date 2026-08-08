/**
 * Privacy / local-cloud disclosure policy.
 * Explicit user-visible decisions; no silent cloud; no production keys.
 */

import type { ProcessingMode } from '../local-runtime/types';
import type { SystemCapability } from './model_registry';

export interface CloudDisclosureInput {
  processingMode: ProcessingMode;
  userCloudConsent: boolean;
  containsSensitiveLocalData: boolean;
  capability: SystemCapability;
}

export interface DisclosureDecision {
  cloudPermitted: boolean;
  processingMode: ProcessingMode;
  userVisibleDisclosure: string;
  reasons: string[];
  dataLeavesDevice: boolean;
  requiresConsent: boolean;
}

const ALWAYS_LOCAL: SystemCapability[] = [
  'device_help',
  'network',
  'game_coach',
  'a11y',
  'workflow',
  'security',
];

export function evaluateCloudDisclosure(
  input: CloudDisclosureInput,
): DisclosureDecision {
  const reasons: string[] = [];
  let cloudPermitted = true;

  if (input.processingMode === 'local-only') {
    cloudPermitted = false;
    reasons.push('processingMode=local-only');
  }

  if (!input.userCloudConsent) {
    cloudPermitted = false;
    reasons.push('userCloudConsent=false');
  }

  if (input.containsSensitiveLocalData) {
    cloudPermitted = false;
    reasons.push('containsSensitiveLocalData=true');
  }

  if (ALWAYS_LOCAL.includes(input.capability)) {
    cloudPermitted = false;
    reasons.push(`capability=${input.capability} is local-only by policy`);
  }

  if (cloudPermitted) {
    reasons.push('explicit consent + cloud-allowed mode');
  }

  const dataLeavesDevice = cloudPermitted;
  const disclosure = cloudPermitted
    ? `DISCLOSURE: CLOUD processing may be used for ${input.capability}. ` +
      `Query content may leave this device. No API keys are stored in this module. ` +
      `Local fallback remains available.`
    : `DISCLOSURE: LOCAL-ONLY for ${input.capability}. ` +
      `No cloud model call is permitted under current policy ` +
      `(${reasons.join('; ')}). Data does not leave this device via this router.`;

  return {
    cloudPermitted,
    processingMode: input.processingMode,
    userVisibleDisclosure: disclosure,
    reasons,
    dataLeavesDevice,
    requiresConsent: input.processingMode === 'cloud-allowed',
  };
}

export function formatDisclosureBanner(decision: DisclosureDecision): string {
  return [
    decision.userVisibleDisclosure,
    `dataLeavesDevice=${decision.dataLeavesDevice}`,
    `cloudPermitted=${decision.cloudPermitted}`,
  ].join('\n');
}

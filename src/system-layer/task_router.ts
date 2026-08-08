/**
 * Wave C — task router: tutoring/code/device_help/game_coach/network/RAG
 * → local vs cloud policy decisions (no production keys; no silent cloud).
 */

import type { DeviceProfileId, SystemCapability } from './model_registry';
import type { ProcessingMode } from '../local-runtime/types';
import {
  evaluateCloudDisclosure,
  type DisclosureDecision,
} from './privacy_policy';
import {
  detectDeviceCapability,
  type DeviceCapabilityReport,
} from './device_capability';

export type RouteDestination = 'local' | 'cloud' | 'reject';

export interface RouteRequest {
  capability: SystemCapability;
  query: string;
  processingMode?: ProcessingMode;
  deviceProfileId?: DeviceProfileId;
  /** Explicit user opt-in for cloud when mode allows it. */
  userCloudConsent?: boolean;
  /** Optional sensitivity hint (PII / student notes). */
  containsSensitiveLocalData?: boolean;
}

export interface RouteDecision {
  capability: SystemCapability;
  destination: RouteDestination;
  reason: string;
  preferredBackend:
    | 'deterministic-baseline'
    | 'local-runtime-fixture'
    | 'optional-local-model'
    | 'cloud-policy-stub'
    | 'none';
  device: DeviceCapabilityReport;
  disclosure: DisclosureDecision;
  modelIds: string[];
}

const CLOUD_ELIGIBLE: SystemCapability[] = ['code', 'tutoring', 'rag'];

export function routeTask(request: RouteRequest): RouteDecision {
  const mode: ProcessingMode = request.processingMode ?? 'local-only';
  const device = detectDeviceCapability(request.deviceProfileId ?? 'student_14_5');
  const capabilitySupported = device.profile.capabilities[request.capability];

  const disclosure = evaluateCloudDisclosure({
    processingMode: mode,
    userCloudConsent: Boolean(request.userCloudConsent),
    containsSensitiveLocalData: Boolean(request.containsSensitiveLocalData),
    capability: request.capability,
  });

  if (!capabilitySupported) {
    return {
      capability: request.capability,
      destination: 'reject',
      reason: `Capability ${request.capability} unsupported on device profile ${device.profile.id}.`,
      preferredBackend: 'none',
      device,
      disclosure,
      modelIds: [],
    };
  }

  if (request.containsSensitiveLocalData) {
    return {
      capability: request.capability,
      destination: 'local',
      reason: 'Sensitive local data forces local route regardless of cloud consent.',
      preferredBackend:
        request.capability === 'rag'
          ? 'local-runtime-fixture'
          : 'deterministic-baseline',
      device,
      disclosure,
      modelIds: [`det-${request.capability}-v1`],
    };
  }

  const wantsCloud =
    mode === 'cloud-allowed' &&
    Boolean(request.userCloudConsent) &&
    CLOUD_ELIGIBLE.includes(request.capability) &&
    disclosure.cloudPermitted;

  if (wantsCloud) {
    return {
      capability: request.capability,
      destination: 'cloud',
      reason:
        'Cloud route selected by explicit consent + cloud-allowed mode + disclosure policy. No production keys are embedded.',
      preferredBackend: 'cloud-policy-stub',
      device,
      disclosure,
      modelIds: ['cloud-policy-stub'],
    };
  }

  const preferOptionalLocal =
    device.profile.preferredInference === 'optional-local-model' &&
    (request.capability === 'code' || request.capability === 'tutoring');

  return {
    capability: request.capability,
    destination: 'local',
    reason:
      mode === 'cloud-allowed' && !request.userCloudConsent
        ? 'Cloud mode set but user consent missing; staying local.'
        : `Local policy for ${request.capability} on ${device.profile.id}.`,
    preferredBackend: preferOptionalLocal
      ? 'optional-local-model'
      : request.capability === 'rag'
        ? 'local-runtime-fixture'
        : 'deterministic-baseline',
    device,
    disclosure,
    modelIds:
      request.capability === 'rag'
        ? ['det-rag-v1', 'local-runtime-fixture-bridge-v1']
        : [`det-${request.capability}-v1`],
  };
}

export class TaskRouter {
  route(request: RouteRequest): RouteDecision {
    return routeTask(request);
  }
}

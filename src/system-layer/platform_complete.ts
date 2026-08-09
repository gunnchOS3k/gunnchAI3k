/**
 * Continuance VII — digital platform completeness criteria.
 *
 * Discord is an optional product surface, NOT automatically normative.
 * Consented cloud production keys are EXTERNAL / optional — not required
 * for FULL_GUNNCHAI3K_PLATFORM_DIGITAL_COMPLETE (local digital platform).
 */

export const DISCORD_SURFACE_NOTE =
  'Discord end-user surface is optional / non-normative (HTTP product-service + gunnchOS ai_interface are the normative digital clients).';

export const CLOUD_OPTIONAL_NOTE =
  'Cloud path remains a policy stub without production keys (EXTERNAL/optional — not required for digital platform complete).';

export const QEMU_HOST_FORWARD_NOTE =
  'QEMU guest may host-forward model runtime to host — not an on-device NPU claim.';

export interface DigitalPlatformCriteria {
  allNormativeRuntime: boolean;
  osIntegrationPass: boolean;
  capabilityEvalPass: boolean;
  productServicePass: boolean;
}

export function evaluateDigitalPlatformComplete(
  c: DigitalPlatformCriteria,
): { earned: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!c.allNormativeRuntime) missing.push('normative_ai_runtime');
  if (!c.osIntegrationPass) missing.push('os_integration');
  if (!c.capabilityEvalPass) missing.push('capability_eval');
  if (!c.productServicePass) missing.push('product_service');
  return { earned: missing.length === 0, missing };
}

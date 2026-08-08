/**
 * Wave C — device capability detection stub.
 * Reads Student / Handheld / DS-XL profiles from fixtures (no physical claim).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { DeviceProfileId, SystemCapability } from './model_registry';

export interface DeviceProfileRecord {
  id: DeviceProfileId;
  displayName: string;
  aliases: string[];
  class: string;
  ramMbHint: number;
  cpuCoresHint: number;
  hasNpu: boolean;
  hasDiscreteGpu: boolean;
  batteryConstrained: boolean;
  preferredInference: 'deterministic-baseline' | 'optional-local-model';
  maxLocalModelParamsB: number;
  cloudAllowedByDefault: boolean;
  capabilities: Record<SystemCapability, boolean>;
  notes: string;
}

export interface DeviceCapabilityReport {
  profile: DeviceProfileRecord;
  detectedAt: string;
  source: string;
  inferenceBudget: {
    maxParamsB: number;
    preferLocal: boolean;
    batteryConstrained: boolean;
  };
  physicalClaim: 'none';
}

interface ProfilesFile {
  schema_version: string;
  source: string;
  profiles: DeviceProfileRecord[];
}

export function defaultProfilesPath(cwd = process.cwd()): string {
  return path.join(cwd, 'fixtures', 'system-layer', 'device_profiles.json');
}

export function loadDeviceProfiles(cwd = process.cwd()): DeviceProfileRecord[] {
  const raw = fs.readFileSync(defaultProfilesPath(cwd), 'utf8');
  const parsed = JSON.parse(raw) as ProfilesFile;
  return parsed.profiles;
}

export function resolveProfileId(
  hint: string | DeviceProfileId | undefined,
  cwd = process.cwd(),
): DeviceProfileId {
  const profiles = loadDeviceProfiles(cwd);
  if (!hint) return 'student_14_5';
  const normalized = hint.trim().toLowerCase();
  for (const p of profiles) {
    if (p.id === normalized) return p.id;
    if (p.displayName.toLowerCase() === normalized) return p.id;
    if (p.aliases.some((a) => a.toLowerCase() === normalized)) return p.id;
  }
  // Friendly aliases for Wave C wording
  if (normalized === 'student') return 'student_14_5';
  if (normalized === 'handheld') return 'handheld_hybrid';
  if (normalized === 'ds-xl' || normalized === 'dsxl') return 'ds_xl_coder';
  return 'student_14_5';
}

export function detectDeviceCapability(
  hint?: string | DeviceProfileId,
  cwd = process.cwd(),
): DeviceCapabilityReport {
  const id = resolveProfileId(hint, cwd);
  const profiles = loadDeviceProfiles(cwd);
  const profile = profiles.find((p) => p.id === id);
  if (!profile) {
    throw new Error(`DEVICE_PROFILE_MISSING: ${id}`);
  }
  return {
    profile,
    detectedAt: new Date().toISOString(),
    source: defaultProfilesPath(cwd),
    inferenceBudget: {
      maxParamsB: profile.maxLocalModelParamsB,
      preferLocal: true,
      batteryConstrained: profile.batteryConstrained,
    },
    physicalClaim: 'none',
  };
}

export function listDeviceProfileIds(cwd = process.cwd()): DeviceProfileId[] {
  return loadDeviceProfiles(cwd).map((p) => p.id);
}

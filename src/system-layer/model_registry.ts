/**
 * Wave C — model registry with integrity hashes, version, license, device profiles.
 * Artifacts are deterministic baseline blobs (NOT production LLM weights).
 */

import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

export type SystemCapability =
  | 'tutoring'
  | 'code'
  | 'device_help'
  | 'game_coach'
  | 'network'
  | 'rag';

export type DeviceProfileId = 'student_14_5' | 'handheld_hybrid' | 'ds_xl_coder';

export type ModelBackendKind =
  | 'deterministic-baseline'
  | 'llama.cpp'
  | 'onnxruntime'
  | 'local-runtime-fixture'
  | 'cloud-policy-stub';

export interface ModelRegistryEntry {
  id: string;
  version: string;
  license: string;
  capability: SystemCapability;
  backend: ModelBackendKind;
  artifactPath: string;
  integrity: {
    algorithm: 'sha256';
    hash: string;
    bytes: number;
  };
  deviceProfiles: DeviceProfileId[];
  isTrainedLlm: boolean;
  description: string;
}

export interface ModelRegistry {
  schemaVersion: string;
  registryVersion: string;
  models: ModelRegistryEntry[];
}

const CAPABILITY_TO_ARTIFACT: Record<SystemCapability, string> = {
  tutoring: 'baseline-tutoring-v1.txt',
  code: 'baseline-code-v1.txt',
  device_help: 'baseline-device-help-v1.txt',
  game_coach: 'baseline-game-coach-v1.txt',
  network: 'baseline-network-v1.txt',
  rag: 'baseline-rag-v1.txt',
};

const ALL_PROFILES: DeviceProfileId[] = [
  'student_14_5',
  'handheld_hybrid',
  'ds_xl_coder',
];

export function defaultModelsRoot(cwd = process.cwd()): string {
  return path.join(cwd, 'fixtures', 'system-layer', 'models');
}

export function sha256File(filePath: string): { hash: string; bytes: number } {
  const buf = fs.readFileSync(filePath);
  return {
    hash: createHash('sha256').update(buf).digest('hex'),
    bytes: buf.byteLength,
  };
}

export function verifyIntegrity(
  entry: ModelRegistryEntry,
  cwd = process.cwd(),
): { ok: boolean; actualHash: string; expectedHash: string } {
  const abs = path.isAbsolute(entry.artifactPath)
    ? entry.artifactPath
    : path.join(cwd, entry.artifactPath);
  const { hash } = sha256File(abs);
  return {
    ok: hash === entry.integrity.hash,
    actualHash: hash,
    expectedHash: entry.integrity.hash,
  };
}

export function buildDefaultRegistry(cwd = process.cwd()): ModelRegistry {
  const modelsRoot = defaultModelsRoot(cwd);
  const models: ModelRegistryEntry[] = (
    Object.keys(CAPABILITY_TO_ARTIFACT) as SystemCapability[]
  ).map((capability) => {
    const fileName = CAPABILITY_TO_ARTIFACT[capability];
    const artifactPath = path.join(
      'fixtures',
      'system-layer',
      'models',
      fileName,
    );
    const abs = path.join(modelsRoot, fileName);
    const { hash, bytes } = sha256File(abs);
    const profiles =
      capability === 'code'
        ? (['student_14_5', 'ds_xl_coder'] as DeviceProfileId[])
        : ALL_PROFILES;
    return {
      id: `det-${capability}-v1`,
      version: '1.0.0',
      license: 'MIT',
      capability,
      backend: 'deterministic-baseline',
      artifactPath,
      integrity: { algorithm: 'sha256', hash, bytes },
      deviceProfiles: profiles,
      isTrainedLlm: false,
      description: `In-process deterministic baseline for ${capability} (CI-safe; NOT a trained LLM).`,
    };
  });

  models.push({
    id: 'local-runtime-fixture-bridge-v1',
    version: '0.1.0-gate1',
    license: 'MIT',
    capability: 'rag',
    backend: 'local-runtime-fixture',
    artifactPath: path.join('fixtures', 'local-runtime', 'manifest.json'),
    integrity: (() => {
      const abs = path.join(cwd, 'fixtures', 'local-runtime', 'manifest.json');
      const { hash, bytes } = sha256File(abs);
      return { algorithm: 'sha256' as const, hash, bytes };
    })(),
    deviceProfiles: ALL_PROFILES,
    isTrainedLlm: false,
    description:
      'Bridge entry pointing at Gate 1 local-runtime fixture corpus (NOT a trained LLM).',
  });

  return {
    schemaVersion: '1.0.0',
    registryVersion: 'wave-c-0.1.0',
    models,
  };
}

export class ModelRegistryService {
  readonly registry: ModelRegistry;

  constructor(cwd = process.cwd()) {
    this.registry = buildDefaultRegistry(cwd);
  }

  list(): ModelRegistryEntry[] {
    return [...this.registry.models];
  }

  getById(id: string): ModelRegistryEntry | undefined {
    return this.registry.models.find((m) => m.id === id);
  }

  forCapability(capability: SystemCapability): ModelRegistryEntry[] {
    return this.registry.models.filter((m) => m.capability === capability);
  }

  forDevice(profileId: DeviceProfileId): ModelRegistryEntry[] {
    return this.registry.models.filter((m) =>
      m.deviceProfiles.includes(profileId),
    );
  }

  verifyAll(cwd = process.cwd()): Array<{
    id: string;
    ok: boolean;
    actualHash: string;
    expectedHash: string;
  }> {
    return this.registry.models.map((entry) => {
      const result = verifyIntegrity(entry, cwd);
      return { id: entry.id, ...result };
    });
  }
}

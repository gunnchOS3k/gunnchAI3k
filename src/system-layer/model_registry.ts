/**
 * Model registry with integrity hashes, version, license, device profiles.
 * Artifacts are deterministic baseline blobs (NOT production LLM weights)
 * plus optional llama.cpp GGUF discovery metadata.
 */

import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

export type SystemCapability =
  | 'tutoring'
  | 'code'
  | 'device_help'
  | 'a11y'
  | 'game_coach'
  | 'network'
  | 'rag'
  | 'scientific'
  | 'translation'
  | 'workflow'
  | 'security';

export const ALL_SYSTEM_CAPABILITIES: SystemCapability[] = [
  'tutoring',
  'code',
  'device_help',
  'a11y',
  'game_coach',
  'network',
  'rag',
  'scientific',
  'translation',
  'workflow',
  'security',
];

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
  /** 135M-class llama.cpp GGUF is Nano/fallback only — never daily intelligence. */
  isNanoFallbackOnly?: boolean;
  contextTokens?: number;
  quant?: string;
}

export interface ModelRegistry {
  schemaVersion: string;
  registryVersion: string;
  selectedArchitecture: 'llama.cpp';
  models: ModelRegistryEntry[];
}

const CAPABILITY_TO_ARTIFACT: Record<SystemCapability, string> = {
  tutoring: 'baseline-tutoring-v1.txt',
  code: 'baseline-code-v1.txt',
  device_help: 'baseline-device-help-v1.txt',
  a11y: 'baseline-a11y-v1.txt',
  game_coach: 'baseline-game-coach-v1.txt',
  network: 'baseline-network-v1.txt',
  rag: 'baseline-rag-v1.txt',
  scientific: 'baseline-scientific-v1.txt',
  translation: 'baseline-translation-v1.txt',
  workflow: 'baseline-workflow-v1.txt',
  security: 'baseline-security-v1.txt',
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
      version: '1.1.0',
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

  models.push({
    id: 'llamacpp-selected-runtime-v1',
    version: '1.1.0-continuation-iv',
    license: 'MIT',
    capability: 'tutoring',
    backend: 'llama.cpp',
    artifactPath: path.join('models', 'local', 'README.md'),
    integrity: (() => {
      const abs = path.join(cwd, 'models', 'local', 'README.md');
      const { hash, bytes } = sha256File(abs);
      return { algorithm: 'sha256' as const, hash, bytes };
    })(),
    deviceProfiles: ALL_PROFILES,
    isTrainedLlm: true,
    description:
      'Selected architecture slot for llama.cpp GGUF when installed. README placeholder when weights absent.',
  });

  const manifestPath = path.join('models', 'local', 'manifest.json');
  const manifestAbs = path.join(cwd, manifestPath);
  if (fs.existsSync(manifestAbs)) {
    const { hash, bytes } = sha256File(manifestAbs);
    models.push({
      id: 'smollm2-135m-instruct-q4_k_m',
      version: '0.1.0-135m-q4_k_m',
      license: 'Apache-2.0',
      capability: 'tutoring',
      backend: 'llama.cpp',
      artifactPath: manifestPath,
      integrity: { algorithm: 'sha256', hash, bytes },
      deviceProfiles: ALL_PROFILES,
      isTrainedLlm: true,
      isNanoFallbackOnly: true,
      contextTokens: 512,
      quant: 'Q4_K_M',
      description:
        'Nano/fallback only: SmolLM2-135M-Instruct Q4_K_M GGUF at 512-ctx. Not Local Fast, not Local Pro, not product-complete intelligence. Weights gitignored; see models/local/manifest.json.',
    });
  }

  return {
    schemaVersion: '1.2.0',
    registryVersion: 'continuation-iv-0.1.0',
    selectedArchitecture: 'llama.cpp',
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

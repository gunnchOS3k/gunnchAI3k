import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import type { ProviderIdentity } from './types';

export interface DiscoveredModel {
  runtime: string;
  modelId: string;
  pathOrEndpoint: string;
  notes: string;
}

/**
 * Discover optional already-installed local model runtimes.
 * Does NOT download models. Absence is a normal, safe outcome.
 */
export function discoverLocalModels(): {
  models: DiscoveredModel[];
  notes: string[];
} {
  const notes: string[] = [];
  const models: DiscoveredModel[] = [];

  const ollamaPath = which('ollama');
  if (ollamaPath) {
    notes.push(`Found ollama binary at ${ollamaPath}`);
    try {
      const out = execFileSync(ollamaPath, ['list'], {
        encoding: 'utf8',
        timeout: 2000,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      const lines = out.split('\n').slice(1).map((l) => l.trim()).filter(Boolean);
      for (const line of lines) {
        const modelId = line.split(/\s+/)[0];
        if (modelId) {
          models.push({
            runtime: 'ollama',
            modelId,
            pathOrEndpoint: 'http://127.0.0.1:11434',
            notes: 'Already installed local ollama model (not downloaded by Gate 1).',
          });
        }
      }
      if (models.length === 0) {
        notes.push('ollama present but no local models listed; fixture provider remains primary.');
      }
    } catch {
      notes.push('ollama present but list failed; fixture provider remains primary.');
    }
  } else {
    notes.push('No ollama binary discovered.');
  }

  const ggufHint = process.env.GUNNCHAI3K_LOCAL_GGUF_PATH;
  if (ggufHint && fs.existsSync(ggufHint)) {
    models.push({
      runtime: 'gguf-file',
      modelId: pathBasename(ggufHint),
      pathOrEndpoint: ggufHint,
      notes: 'User-provided local GGUF path via env; not loaded unless adapter supports it.',
    });
    notes.push(`Found GGUF hint at ${ggufHint}`);
  } else {
    notes.push('No GUNNCHAI3K_LOCAL_GGUF_PATH set or file missing.');
  }

  return { models, notes };
}

export function buildProviderIdentities(): ProviderIdentity[] {
  const { models, notes } = discoverLocalModels();
  const fixture: ProviderIdentity = {
    id: 'fixture-deterministic-v1',
    kind: 'fixture-backed-deterministic',
    label: 'Fixture-backed deterministic provider (NOT a trained LLM)',
    isTrainedLlm: false,
    modelId: null,
    available: true,
    discoveryNotes: [
      'Always available. Never labeled as a trained LLM.',
      ...notes,
    ],
  };

  const localModel: ProviderIdentity = {
    id: 'optional-local-model-v1',
    kind: 'optional-local-model',
    label: models.length
      ? `Optional local model runtime (${models.map((m) => m.modelId).join(', ')})`
      : 'Optional local model runtime (none installed)',
    isTrainedLlm: models.length > 0,
    modelId: models[0]?.modelId ?? null,
    available: models.length > 0,
    discoveryNotes: [
      ...notes,
      'Gate 1 does not download large models.',
      'When unavailable, fixture-backed provider is used.',
    ],
  };

  const cloud: ProviderIdentity = {
    id: 'cloud-provider-stub',
    kind: 'cloud',
    label: 'Cloud provider stub (rejected in local-only mode)',
    isTrainedLlm: true,
    modelId: 'cloud-remote',
    available: false,
    discoveryNotes: ['Present only to exercise local-only rejection.'],
  };

  return [fixture, localModel, cloud];
}

function which(bin: string): string | null {
  try {
    const out = execFileSync('which', [bin], { encoding: 'utf8' }).trim();
    return out || null;
  } catch {
    return null;
  }
}

function pathBasename(p: string): string {
  const parts = p.split(/[/\\]/);
  return parts[parts.length - 1] || p;
}

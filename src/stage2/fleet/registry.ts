/**
 * Dated model candidate matrix — registry + hashes only (no large weights).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ModelCandidate } from './roles';

export const MATRIX_DATE = '2026-08-09';
export const MATRIX_SCHEMA = 'gunnchai.stage2.model_candidate_matrix.v1';

/** Tiny fixture placeholder hash (not a real LLM weight). */
const FIXTURE_HASH =
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

export function buildModelCandidateMatrix(): {
  schema: string;
  dated: string;
  doctrine: string;
  candidates: ModelCandidate[];
} {
  const candidates: ModelCandidate[] = [
    {
      id: 'nano-smollm-135m',
      role: 'NANO_LOCAL',
      displayName: 'SmolLM-135M (fixture)',
      family: 'SmolLM',
      parameters: '135M',
      license: 'Apache-2.0',
      contextTokens: 2048,
      approxRamMb: 256,
      runtime: 'llama.cpp / fixture-deterministic',
      location: 'local',
      optional: false,
      notes:
        'Nano/fallback only. Useful for always-on OS/device stubs; not the daily intelligence tier.',
      artifactRef: 'fixtures/stage2/models/nano-smollm-135m.ref',
      sha256: FIXTURE_HASH,
      isNanoFallbackOnly: true,
    },
    {
      id: 'local-fast-smollm-360m',
      role: 'LOCAL_FAST',
      displayName: 'SmolLM-360M (candidate)',
      family: 'SmolLM',
      parameters: '360M',
      license: 'Apache-2.0',
      contextTokens: 4096,
      approxRamMb: 768,
      runtime: 'llama.cpp (GGUF, download-on-demand)',
      location: 'local',
      optional: false,
      notes:
        'License-compatible LOCAL_FAST candidate: HuggingFaceTB/SmolLM2-360M-Instruct (Apache-2.0). GGUF bytes are not in-repo. weightsStatus=ABSENT until a real hashed file exists — OPEN, not a Fast quality claim.',
      artifactRef: 'fixtures/stage2/models/local-fast-smollm-360m.ref',
      sha256: FIXTURE_HASH,
      isNanoFallbackOnly: false,
    },
    {
      id: 'local-pro-qwen2-1_5b',
      role: 'LOCAL_PRO',
      displayName: 'Qwen2-1.5B (candidate)',
      family: 'Qwen2',
      parameters: '1.5B',
      license: 'Apache-2.0',
      contextTokens: 8192,
      approxRamMb: 2048,
      runtime: 'llama.cpp (GGUF, download-on-demand)',
      location: 'local',
      optional: false,
      notes:
        'License-compatible LOCAL_PRO candidate: Qwen/Qwen2-1.5B-Instruct (Apache-2.0). GGUF bytes are not in-repo. weightsStatus=ABSENT — OPEN. Not a measured Pro quality claim.',
      artifactRef: 'fixtures/stage2/models/local-pro-qwen2-1_5b.ref',
      sha256: FIXTURE_HASH,
      isNanoFallbackOnly: false,
    },
    {
      id: 'embed-minilm-l6',
      role: 'EMBEDDING',
      displayName: 'all-MiniLM-L6-v2 (candidate)',
      family: 'sentence-transformers',
      parameters: '22M',
      license: 'Apache-2.0',
      contextTokens: 512,
      approxRamMb: 128,
      runtime: 'onnxruntime / deterministic-fixture',
      location: 'local',
      optional: false,
      notes: 'Local embeddings for RAG and memory search.',
      artifactRef: 'fixtures/stage2/models/embed-minilm-l6.ref',
      sha256: FIXTURE_HASH,
      isNanoFallbackOnly: false,
    },
    {
      id: 'rerank-tiny-cross',
      role: 'RERANKER',
      displayName: 'Tiny cross-encoder (fixture)',
      family: 'cross-encoder-fixture',
      parameters: 'fixture',
      license: 'MIT',
      contextTokens: 512,
      approxRamMb: 96,
      runtime: 'deterministic-fixture',
      location: 'local',
      optional: false,
      notes: 'Reranking fixture for research/RAG pipelines.',
      artifactRef: 'fixtures/stage2/models/rerank-tiny-cross.ref',
      sha256: FIXTURE_HASH,
      isNanoFallbackOnly: false,
    },
    {
      id: 'vision-optional-stub',
      role: 'VISION',
      displayName: 'Vision stub (optional)',
      family: 'vision-stub',
      parameters: 'optional',
      license: 'MIT',
      contextTokens: 1024,
      approxRamMb: 512,
      runtime: 'optional-local / deny-by-default',
      location: 'local',
      optional: true,
      notes: 'Optional Stage 2 hook; not required for fleet pass.',
      artifactRef: 'fixtures/stage2/models/vision-optional-stub.ref',
      sha256: FIXTURE_HASH,
      isNanoFallbackOnly: false,
    },
    {
      id: 'speech-optional-stub',
      role: 'SPEECH',
      displayName: 'Speech stub (optional)',
      family: 'speech-stub',
      parameters: 'optional',
      license: 'MIT',
      contextTokens: 0,
      approxRamMb: 256,
      runtime: 'optional-local / deny-by-default',
      location: 'local',
      optional: true,
      notes: 'Optional Stage 2 hook; not required for fleet pass.',
      artifactRef: 'fixtures/stage2/models/speech-optional-stub.ref',
      sha256: FIXTURE_HASH,
      isNanoFallbackOnly: false,
    },
    {
      id: 'frontier-cloud-optional',
      role: 'OPTIONAL_FRONTIER_CLOUD',
      displayName: 'Optional frontier cloud',
      family: 'user-controlled-cloud',
      parameters: 'provider-dependent',
      license: 'provider ToS',
      contextTokens: 128000,
      approxRamMb: 0,
      runtime: 'HTTPS provider API (consent-gated)',
      location: 'cloud',
      optional: true,
      notes:
        'Escalation only with explicit consent. Never default. No production keys embedded.',
      artifactRef: 'fixtures/stage2/models/frontier-cloud-optional.ref',
      sha256: FIXTURE_HASH,
      isNanoFallbackOnly: false,
    },
  ];

  return {
    schema: MATRIX_SCHEMA,
    dated: MATRIX_DATE,
    doctrine:
      '135M is Nano/fallback only. Large weights are never committed — registry + hashes only.',
    candidates,
  };
}

export function writeModelCandidateMatrix(cwd = process.cwd()): {
  jsonPath: string;
  mdPath: string;
  matrix: ReturnType<typeof buildModelCandidateMatrix>;
} {
  const matrix = buildModelCandidateMatrix();
  const dir = path.join(cwd, 'artifacts', 'stage2');
  fs.mkdirSync(dir, { recursive: true });
  const jsonPath = path.join(dir, 'MODEL_CANDIDATE_MATRIX.json');
  const mdPath = path.join(dir, 'MODEL_CANDIDATE_MATRIX.md');
  fs.writeFileSync(jsonPath, JSON.stringify(matrix, null, 2) + '\n');

  const lines = [
    `# Model Candidate Matrix`,
    ``,
    `**Dated:** ${matrix.dated}`,
    `**Schema:** ${matrix.schema}`,
    ``,
    matrix.doctrine,
    ``,
    `| ID | Role | Params | License | Context | RAM (MB) | Runtime | Notes |`,
    `|---|---|---|---|---:|---:|---|---|`,
    ...matrix.candidates.map(
      (c) =>
        `| ${c.id} | ${c.role} | ${c.parameters} | ${c.license} | ${c.contextTokens} | ${c.approxRamMb} | ${c.runtime} | ${c.notes.replace(/\|/g, '/')} |`,
    ),
    ``,
  ];
  fs.writeFileSync(mdPath, lines.join('\n'));
  return { jsonPath, mdPath, matrix };
}

export class ModelFleetRegistry {
  readonly matrix: ReturnType<typeof buildModelCandidateMatrix>;
  private unavailable = new Set<string>();

  constructor(matrix = buildModelCandidateMatrix()) {
    this.matrix = matrix;
  }

  list(): ModelCandidate[] {
    return this.matrix.candidates;
  }

  get(id: string): ModelCandidate | undefined {
    return this.matrix.candidates.find((c) => c.id === id);
  }

  byRole(role: ModelCandidate['role']): ModelCandidate[] {
    return this.matrix.candidates.filter((c) => c.role === role);
  }

  markUnavailable(id: string): void {
    this.unavailable.add(id);
  }

  markAvailable(id: string): void {
    this.unavailable.delete(id);
  }

  isAvailable(id: string): boolean {
    return !this.unavailable.has(id);
  }

  ensureFixtureRefs(cwd = process.cwd()): void {
    for (const c of this.matrix.candidates) {
      const abs = path.join(cwd, c.artifactRef);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      if (!fs.existsSync(abs)) {
        fs.writeFileSync(
          abs,
          [
            `# Registry reference only — no weights`,
            `id=${c.id}`,
            `role=${c.role}`,
            `sha256=${c.sha256}`,
            `parameters=${c.parameters}`,
            ``,
          ].join('\n'),
        );
      }
    }
  }
}

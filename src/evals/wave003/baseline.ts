import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { BASELINE_THRESHOLDS, TARGET_REQUIREMENTS } from './constants';
import { evaluatorSourceHash, gitHead, hashFixtureTree } from './hashing';
import type { RequirementEvalResult, ValidationState } from './types';
import type { Wave003Context } from './context';

export interface EvaluationBaselineArtifact {
  schema: 'gunnchai.engineering_wave003.evaluation_baseline.v1';
  commits: { acceptedMain: string; head: string };
  environment: {
    node: string;
    platform: string;
    arch: string;
    hostClass: string;
  };
  fixtureHashes: Record<string, string>;
  evaluatorHash: string;
  requirements: Record<
    string,
    {
      metrics: Record<string, number | boolean | string>;
      thresholds: Record<string, { op: string; value: number | boolean | string }>;
      current_result: { validationState: ValidationState; thresholdPass: boolean };
      validation_state: ValidationState;
    }
  >;
  baselineComplete: boolean;
}

function metricPasses(
  actual: number | boolean | string | undefined,
  rule: { op: string; value: number | boolean | string },
): boolean {
  if (actual === undefined) return false;
  if (rule.op === 'eq') return actual === rule.value;
  if (rule.op === 'gte' && typeof actual === 'number' && typeof rule.value === 'number') {
    return actual >= rule.value;
  }
  if (rule.op === 'lte' && typeof actual === 'number' && typeof rule.value === 'number') {
    return actual <= rule.value;
  }
  return false;
}

export function buildEvaluationBaseline(
  ctx: Wave003Context,
  results: RequirementEvalResult[],
  acceptedMainSha: string,
): EvaluationBaselineArtifact {
  const requirements: EvaluationBaselineArtifact['requirements'] = {};
  for (const id of TARGET_REQUIREMENTS) {
    const row = results.find((r) => r.requirementId === id);
    const thresholds = BASELINE_THRESHOLDS[id] ?? {};
    const thresholdPass = Object.entries(thresholds).every(([k, rule]) =>
      metricPasses(row?.metrics[k], rule),
    );
    requirements[id] = {
      metrics: { ...(row?.metrics ?? {}) },
      thresholds,
      current_result: {
        validationState: row?.validationState ?? 'IMPLEMENTED_VALIDATION_OPEN',
        thresholdPass,
      },
      validation_state: row?.validationState ?? 'IMPLEMENTED_VALIDATION_OPEN',
    };
  }
  const artifact: EvaluationBaselineArtifact = {
    schema: 'gunnchai.engineering_wave003.evaluation_baseline.v1',
    commits: { acceptedMain: acceptedMainSha, head: gitHead(ctx.repoRoot) },
    environment: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      hostClass: os.hostname() ? 'CURSOR_BACKGROUND_AGENT' : 'unknown',
    },
    fixtureHashes: hashFixtureTree(ctx.fixtureRoot),
    evaluatorHash: evaluatorSourceHash(ctx.repoRoot),
    requirements,
    baselineComplete: false,
  };
  artifact.baselineComplete = isBaselineComplete(artifact);
  return artifact;
}

export function isBaselineComplete(artifact: EvaluationBaselineArtifact): boolean {
  if (artifact.schema !== 'gunnchai.engineering_wave003.evaluation_baseline.v1') return false;
  if (!artifact.commits.head || artifact.commits.head === 'UNKNOWN') return false;
  if (!artifact.environment.node) return false;
  if (Object.keys(artifact.fixtureHashes).length < 3) return false;
  if (!artifact.evaluatorHash) return false;
  for (const id of TARGET_REQUIREMENTS) {
    const row = artifact.requirements[id];
    if (!row) return false;
    if (!row.metrics || !row.thresholds || !row.current_result || !row.validation_state) return false;
    if (Object.keys(row.thresholds).length === 0) return false;
  }
  return true;
}

export function writeEvaluationBaseline(
  ctx: Wave003Context,
  results: RequirementEvalResult[],
  acceptedMainSha: string,
): EvaluationBaselineArtifact {
  const artifact = buildEvaluationBaseline(ctx, results, acceptedMainSha);
  fs.mkdirSync(ctx.evidenceDir, { recursive: true });
  fs.writeFileSync(
    path.join(ctx.evidenceDir, 'EVALUATION_BASELINE.json'),
    `${JSON.stringify(artifact, null, 2)}\n`,
  );
  return artifact;
}

export function readEvaluationBaseline(ctx: Wave003Context): EvaluationBaselineArtifact | null {
  const p = path.join(ctx.evidenceDir, 'EVALUATION_BASELINE.json');
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8')) as EvaluationBaselineArtifact;
}

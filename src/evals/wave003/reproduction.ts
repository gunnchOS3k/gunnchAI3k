import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { evaluatorSourceHash, gitHead, hashFixtureTree } from './hashing';
import type {
  CanonicalRequirementRow,
  IndependentReproductionRecord,
  RequirementEvalResult,
  Wave003Report,
} from './types';

const IGNORE_METRIC_KEYS = ['generatedAt', 'latencyMs', 'eventCount', 'snapshotCount'];
const LATENCY_ABS = 50_000;

export function canonicalizeResults(results: RequirementEvalResult[]): CanonicalRequirementRow[] {
  return [...results]
    .sort((a, b) => a.requirementId.localeCompare(b.requirementId))
    .map((row) => {
      const metrics: CanonicalRequirementRow['metrics'] = {};
      for (const [k, v] of Object.entries(row.metrics)) {
        if (IGNORE_METRIC_KEYS.includes(k)) continue;
        metrics[k] = v;
      }
      const negativeCasePass: Record<string, boolean> = {};
      for (const n of row.negativeCases) negativeCasePass[n.id] = n.passed;
      return {
        requirementId: row.requirementId,
        validationState: row.validationState,
        negativeCasePass,
        metrics,
      };
    });
}

export function compareCanonicalRows(
  primary: CanonicalRequirementRow[],
  fresh: CanonicalRequirementRow[],
): Pick<
  IndependentReproductionRecord,
  'perRequirementStateMatch' | 'metricComparison' | 'unexpected_differences' | 'result'
> {
  const unexpected_differences: string[] = [];
  const metricComparison: IndependentReproductionRecord['metricComparison'] = [];
  const primaryById = new Map(primary.map((r) => [r.requirementId, r]));
  const freshById = new Map(fresh.map((r) => [r.requirementId, r]));
  const ids = new Set([...primaryById.keys(), ...freshById.keys()]);

  let stateMatch = true;
  for (const id of [...ids].sort()) {
    const a = primaryById.get(id);
    const b = freshById.get(id);
    if (!a || !b) {
      stateMatch = false;
      unexpected_differences.push(`missing-row:${id}:primary=${Boolean(a)}:fresh=${Boolean(b)}`);
      continue;
    }
    if (a.validationState !== b.validationState) {
      stateMatch = false;
      unexpected_differences.push(
        `state:${id}:primary=${a.validationState}:fresh=${b.validationState}`,
      );
    }
    const negKeys = new Set([
      ...Object.keys(a.negativeCasePass),
      ...Object.keys(b.negativeCasePass),
    ]);
    for (const k of negKeys) {
      if (a.negativeCasePass[k] !== b.negativeCasePass[k]) {
        stateMatch = false;
        unexpected_differences.push(
          `neg:${id}:${k}:primary=${a.negativeCasePass[k]}:fresh=${b.negativeCasePass[k]}`,
        );
      }
    }
    const metricKeys = new Set([...Object.keys(a.metrics), ...Object.keys(b.metrics)]);
    for (const metric of metricKeys) {
      const pv = a.metrics[metric];
      const fv = b.metrics[metric];
      let withinTolerance = pv === fv;
      if (typeof pv === 'number' && typeof fv === 'number' && metric.toLowerCase().includes('latency')) {
        withinTolerance = Math.abs(pv - fv) <= LATENCY_ABS;
      }
      metricComparison.push({
        requirementId: id,
        metric,
        primary: pv,
        fresh: fv,
        withinTolerance,
      });
      if (!withinTolerance) {
        unexpected_differences.push(`metric:${id}:${metric}:primary=${String(pv)}:fresh=${String(fv)}`);
      }
    }
  }

  const result: IndependentReproductionRecord['result'] = unexpected_differences.length
    ? 'FAIL'
    : stateMatch
      ? 'PASS'
      : 'FAIL';

  return {
    perRequirementStateMatch: stateMatch && unexpected_differences.length === 0,
    metricComparison,
    unexpected_differences,
    result,
  };
}

export function perturbCanonicalForRegression(
  rows: CanonicalRequirementRow[],
): CanonicalRequirementRow[] {
  const clone = structuredClone(rows);
  if (clone[0]) {
    clone[0].validationState =
      clone[0].validationState === 'VALIDATED'
        ? 'IMPLEMENTED_VALIDATION_OPEN'
        : 'VALIDATED';
  }
  return clone;
}

export function buildReproductionRecord(input: {
  repoRoot: string;
  primary: CanonicalRequirementRow[];
  fresh: CanonicalRequirementRow[];
  primaryRunId: string;
  freshRunId: string;
  childExitCode: number | null;
  seed: string;
}): IndependentReproductionRecord {
  const compared = compareCanonicalRows(input.primary, input.fresh);
  const fixtureRoot = path.join(input.repoRoot, 'evals', 'wave003', 'fixtures');
  const commit = gitHead(input.repoRoot);
  return {
    schema: 'gunnchai.engineering_wave003.independent_reproduction.v1',
    primaryRunId: input.primaryRunId,
    freshRunId: input.freshRunId,
    primaryCommit: commit,
    freshCommit: commit,
    evaluatorHash: evaluatorSourceHash(input.repoRoot),
    fixtureHashes: hashFixtureTree(fixtureRoot),
    seed: input.seed,
    perRequirementStateMatch: compared.perRequirementStateMatch,
    metricComparison: compared.metricComparison,
    tolerances: { latencyMsAbs: LATENCY_ABS, ignoreMetricKeys: [...IGNORE_METRIC_KEYS] },
    unexpected_differences: compared.unexpected_differences,
    result: compared.result,
    childExitCode: input.childExitCode,
    method: 'primary-vs-fresh-node-process; exact state equivalence; not inferred from child exit 0',
  };
}

export function spawnFreshWave003Process(
  cwd: string,
  resultsDir: string,
  evidenceDir: string,
): {
  status: number | null;
  stdout: string;
  stderr: string;
} {
  const cli = path.join(cwd, 'src', 'evals', 'wave003', 'cli.ts');
  const child = spawnSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['tsx', cli, '--reproduction-child', '--no-evidence'],
    {
      cwd,
      env: {
        ...process.env,
        GUNNCHAI_WAVE003_REPRODUCTION: '1',
        GUNNCHAI_WAVE003_RESULTS_DIR: resultsDir,
        GUNNCHAI_WAVE003_EVIDENCE_DIR: evidenceDir,
        GUNNCHAI_WAVE003_SEED: 'wave003-integrity-repair',
      },
      encoding: 'utf8',
      timeout: 180_000,
    },
  );
  return {
    status: child.status,
    stdout: child.stdout || '',
    stderr: child.stderr || '',
  };
}

export function runIndependentReproduction(
  cwd: string,
  primaryResults: RequirementEvalResult[],
): IndependentReproductionRecord {
  const primaryRunId = randomUUID();
  const freshRunId = randomUUID();
  const resultsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gunnchai-wave003-fresh-'));
  const evidenceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gunnchai-wave003-fresh-ev-'));
  const child = spawnFreshWave003Process(cwd, resultsDir, evidenceDir);
  const reportPath = path.join(resultsDir, 'WAVE003_EVAL.json');
  let freshRows: CanonicalRequirementRow[] = [];
  if (fs.existsSync(reportPath)) {
    const freshReport = JSON.parse(fs.readFileSync(reportPath, 'utf8')) as Wave003Report;
    freshRows = canonicalizeResults(freshReport.results);
  } else {
    freshRows = [];
  }
  const record = buildReproductionRecord({
    repoRoot: cwd,
    primary: canonicalizeResults(primaryResults),
    fresh: freshRows,
    primaryRunId,
    freshRunId,
    childExitCode: child.status,
    seed: 'wave003-integrity-repair',
  });
  if (!fs.existsSync(reportPath)) {
    record.unexpected_differences.push('fresh-report-missing');
    record.result = 'FAIL';
    record.perRequirementStateMatch = false;
  }
  fs.rmSync(resultsDir, { recursive: true, force: true });
  fs.rmSync(evidenceDir, { recursive: true, force: true });
  return record;
}

export function releaseComplete(input: {
  results: RequirementEvalResult[];
  independentDigitalReproduction: 'PASS' | 'PARTIAL' | 'FAIL';
}): boolean {
  const allValidated = input.results.every((r) => r.validationState === 'VALIDATED');
  return allValidated && input.independentDigitalReproduction === 'PASS';
}

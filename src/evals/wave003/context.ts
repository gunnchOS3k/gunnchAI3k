import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

export interface Wave003Context {
  repoRoot: string;
  fixtureRoot: string;
  scratchRoot: string;
  resultsDir: string;
  evidenceDir: string;
}

export function createWave003Context(cwd = process.cwd()): Wave003Context {
  const repoRoot = cwd;
  const fixtureRoot = path.join(repoRoot, 'evals', 'wave003', 'fixtures');
  const scratchRoot =
    process.env.GUNNCHAI_WAVE003_SCRATCH_ROOT ||
    fs.mkdtempSync(path.join(os.tmpdir(), 'gunnchai-wave003-'));
  const resultsDir =
    process.env.GUNNCHAI_WAVE003_RESULTS_DIR ||
    path.join(repoRoot, 'evals', 'wave003', 'results');
  const evidenceDir =
    process.env.GUNNCHAI_WAVE003_EVIDENCE_DIR ||
    path.join(repoRoot, 'evidence', 'engineering_wave003');
  fs.mkdirSync(resultsDir, { recursive: true });
  fs.mkdirSync(evidenceDir, { recursive: true });
  return { repoRoot, fixtureRoot, scratchRoot, resultsDir, evidenceDir };
}

export function cleanupWave003Context(ctx: Wave003Context): void {
  if (process.env.GUNNCHAI_WAVE003_SCRATCH_ROOT) return;
  fs.rmSync(ctx.scratchRoot, { recursive: true, force: true });
}

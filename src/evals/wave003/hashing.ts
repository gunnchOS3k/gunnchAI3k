import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

export function sha256Text(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

export function sha256File(filePath: string): string {
  return sha256Text(fs.readFileSync(filePath));
}

export function hashFixtureTree(fixtureRoot: string): Record<string, string> {
  const hashes: Record<string, string> = {};
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      const rel = path.relative(fixtureRoot, full).replace(/\\/g, '/');
      hashes[rel] = sha256File(full);
    }
  };
  if (fs.existsSync(fixtureRoot)) walk(fixtureRoot);
  return hashes;
}

export function evaluatorSourceHash(repoRoot: string): string {
  const files = [
    'src/evals/wave003/runner.ts',
    'src/evals/wave003/reproduction.ts',
    'src/evals/wave003/scorers/ai_gov.ts',
    'src/evals/wave003/scorers/ai_local.ts',
    'src/evals/wave003/scorers/crosscheck_requirement_proof.ts',
    'src/evals/wave003/constants.ts',
  ];
  const joined = files
    .map((rel) => {
      const p = path.join(repoRoot, rel);
      return fs.existsSync(p) ? sha256File(p) : `missing:${rel}`;
    })
    .join('\n');
  return sha256Text(joined);
}

export function gitHead(repoRoot: string): string {
  const r = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  return (r.stdout || '').trim() || 'UNKNOWN';
}

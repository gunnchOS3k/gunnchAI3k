/**
 * Coding agent → DRAFT PR.
 * Never merge, never force-push, never push main.
 * Acceptance only inside a dedicated sandbox test repo — not production repos.
 */

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

export const PRODUCTION_REPO_NAMES = [
  'gunnchAI3k',
  'gunnchos-device-os',
  'gunnchos-7gc-ai-ran-field-kit',
  'waike-research-ops',
];

export interface DraftPrRecord {
  draft: true;
  merge: false;
  force_push: false;
  push_main: false;
  base: string;
  head: string;
  title: string;
  body: string;
  tests_passed: boolean;
  test_output: string;
  edited_files: string[];
  commit: string;
  remote_pushed: false;
}

export interface CodingAgentResult {
  ok: boolean;
  sandbox: string;
  branch: string;
  mainUnchanged: boolean;
  draftPr: DraftPrRecord | null;
  notes: string;
}

const FORBIDDEN_GIT = [
  /\bmerge\b/i,
  /--force/,
  /-f\b/,
  /push\s+.*\bmain\b/,
  /push\s+.*\bmaster\b/,
];

export function isProductionRepo(cwd: string): boolean {
  const base = path.basename(path.resolve(cwd));
  if (PRODUCTION_REPO_NAMES.includes(base)) return true;
  try {
    const remote = execFileSync('git', ['remote', 'get-url', 'origin'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return PRODUCTION_REPO_NAMES.some((n) => remote.includes(n));
  } catch {
    return false;
  }
}

export function assertSandboxRepo(cwd: string): void {
  if (isProductionRepo(cwd)) {
    throw new Error(`PRODUCTION_REPO_BLOCKED:${path.basename(cwd)}`);
  }
}

export function assertSafeGitArgs(args: string[]): void {
  const joined = args.join(' ');
  for (const re of FORBIDDEN_GIT) {
    if (re.test(joined)) {
      throw new Error(`FORBIDDEN_GIT:${joined}`);
    }
  }
  if (args[0] === 'push') {
    throw new Error('FORBIDDEN_GIT:push');
  }
  if (args[0] === 'merge') {
    throw new Error('FORBIDDEN_GIT:merge');
  }
}

function git(cwd: string, args: string[]): string {
  assertSafeGitArgs(args);
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

export function seedSandboxRepo(root?: string): string {
  const dir = root ?? fs.mkdtempSync(path.join(os.tmpdir(), 'gunnchai-ai-ur-013-'));
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'test'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'gunnchai-sandbox-ai-ur-013', private: true, type: 'commonjs' }, null, 2) +
      '\n',
  );
  fs.writeFileSync(
    path.join(dir, 'src', 'add.js'),
    'function add(a, b) {\n  return a - b;\n}\nmodule.exports = { add };\n',
  );
  fs.writeFileSync(
    path.join(dir, 'test', 'add.test.js'),
    `const assert = require('node:assert/strict');
const { add } = require('../src/add.js');
assert.equal(add(2, 3), 5);
console.log('ok');
`,
  );
  execFileSync('git', ['init', '-b', 'main'], { cwd: dir, encoding: 'utf8' });
  execFileSync('git', ['config', 'user.email', 'sandbox@gunnchai.local'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'AI-UR-013 Sandbox'], { cwd: dir });
  execFileSync('git', ['add', '-A'], { cwd: dir });
  execFileSync('git', ['commit', '-m', 'seed: broken add() for coding-agent sandbox'], {
    cwd: dir,
    encoding: 'utf8',
  });
  return dir;
}

export function runSandboxTests(cwd: string): { passed: boolean; output: string } {
  try {
    const output = execFileSync(process.execPath, ['test/add.test.js'], {
      cwd,
      encoding: 'utf8',
    });
    return { passed: true, output };
  } catch (err) {
    const output = err instanceof Error && 'stdout' in err ? String((err as { stdout: string }).stdout) : String(err);
    return { passed: false, output };
  }
}

/**
 * A proposed-diff-only agent is NOT acceptance. Kept so the self-challenge can fail it.
 */
export function proposedDiffOnly(cwd: string): { ok: false; reason: string; diff: string } {
  const diff = `--- a/src/add.js\n+++ b/src/add.js\n-  return a - b;\n+  return a + b;\n`;
  fs.writeFileSync(path.join(cwd, 'PROPOSED.diff'), diff);
  return { ok: false, reason: 'DIFF_ONLY_NOT_A_DRAFT_PR', diff };
}

export function runCodingAgentDraftPr(sandbox: string): CodingAgentResult {
  assertSandboxRepo(sandbox);
  const mainBefore = git(sandbox, ['rev-parse', 'main']);
  const branch = 'agent/ai-ur-013-fix-add';
  git(sandbox, ['checkout', '-b', branch]);

  const target = path.join(sandbox, 'src', 'add.js');
  const before = fs.readFileSync(target, 'utf8');
  if (!before.includes('return a - b')) {
    return { ok: false, sandbox, branch, mainUnchanged: true, draftPr: null, notes: 'UNEXPECTED_SEED' };
  }
  fs.writeFileSync(target, 'function add(a, b) {\n  return a + b;\n}\nmodule.exports = { add };\n');

  const tests = runSandboxTests(sandbox);
  if (!tests.passed) {
    return {
      ok: false,
      sandbox,
      branch,
      mainUnchanged: git(sandbox, ['rev-parse', 'main']) === mainBefore,
      draftPr: null,
      notes: `TESTS_FAILED:${tests.output}`,
    };
  }

  git(sandbox, ['add', 'src/add.js']);
  git(sandbox, ['commit', '-m', 'fix: add() should add, not subtract']);
  const head = git(sandbox, ['rev-parse', 'HEAD']);
  git(sandbox, ['checkout', 'main']);
  const mainAfter = git(sandbox, ['rev-parse', 'main']);
  git(sandbox, ['checkout', branch]);

  const record: DraftPrRecord = {
    draft: true,
    merge: false,
    force_push: false,
    push_main: false,
    base: 'main',
    head: branch,
    title: 'fix: add() returns the sum',
    body: [
      '## Summary',
      '- Sandbox-only coding agent changed `src/add.js` so `add(2,3)===5`.',
      '- Tests were run in the sandbox and passed.',
      '- This is a DRAFT PR record. Merge is forbidden. Force-push is forbidden. Push to main is forbidden.',
      '',
      '## Test plan',
      '- [x] `node test/add.test.js` in the sandbox',
    ].join('\n'),
    tests_passed: true,
    test_output: tests.output,
    edited_files: ['src/add.js'],
    commit: head,
    remote_pushed: false,
  };
  fs.writeFileSync(path.join(sandbox, 'DRAFT_PR.json'), JSON.stringify(record, null, 2) + '\n');
  fs.writeFileSync(
    path.join(sandbox, 'DRAFT_PR.md'),
    `# ${record.title}\n\nDRAFT: true\nMERGE: false\n\n${record.body}\n`,
  );

  return {
    ok:
      record.draft === true &&
      record.merge === false &&
      record.force_push === false &&
      record.push_main === false &&
      record.remote_pushed === false &&
      record.tests_passed &&
      mainAfter === mainBefore &&
      fs.existsSync(path.join(sandbox, 'DRAFT_PR.json')) &&
      !fs.existsSync(path.join(sandbox, 'PROPOSED.diff')),
    sandbox,
    branch,
    mainUnchanged: mainAfter === mainBefore,
    draftPr: record,
    notes: 'Sandbox branch + tests + DRAFT PR artifact. No merge, no force-push, no push main, no production remote.',
  };
}

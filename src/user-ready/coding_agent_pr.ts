/**
 * Coding agent → actual GitHub DRAFT PR in an allowlisted sandbox/test repo only.
 * Never merge, never force-push, never push main, never touch production repos.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

export const PRODUCTION_REPO_NAMES = [
  'gunnchAI3k',
  'gunnchos-device-os',
  'gunnchos-7gc-ai-ran-field-kit',
  'waike-research-ops',
  'archive-of-life-artifact-world',
  'beatlink-party',
  'pedestrian-pursuit',
  'anime-aggressors',
];

/** Only these remotes may receive a coding-agent push / DRAFT PR. */
export const ALLOWLISTED_SANDBOX_REPOS = [
  'gunnchOS3k/gunnchai-ai-ur-013-sandbox',
  'gunnchai-ai-ur-013-sandbox',
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
  remote_pushed: boolean;
  pr_url: string | null;
  pr_number: number | null;
  audit: string[];
}

export interface CodingAgentResult {
  ok: boolean;
  sandbox: string;
  branch: string;
  mainUnchanged: boolean;
  draftPr: DraftPrRecord | null;
  notes: string;
  completeness: 'COMPLETE' | 'PARTIAL';
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
    return PRODUCTION_REPO_NAMES.some((n) => remote.includes(`/${n}`) || remote.endsWith(`:${n}`));
  } catch {
    return false;
  }
}

export function isAllowlistedSandboxRemote(remoteUrl: string): boolean {
  return ALLOWLISTED_SANDBOX_REPOS.some(
    (n) => remoteUrl.includes(n) || remoteUrl.endsWith(`:${n}.git`) || remoteUrl.endsWith(`/${n}.git`),
  );
}

export function assertSandboxRepo(cwd: string): void {
  if (isProductionRepo(cwd)) {
    throw new Error(`PRODUCTION_REPO_BLOCKED:${path.basename(cwd)}`);
  }
}

export function assertSafeGitArgs(args: string[], opts?: { allowPush?: boolean }): void {
  const joined = args.join(' ');
  for (const re of FORBIDDEN_GIT) {
    if (re.test(joined)) {
      throw new Error(`FORBIDDEN_GIT:${joined}`);
    }
  }
  if (args[0] === 'push' && !opts?.allowPush) {
    throw new Error('FORBIDDEN_GIT:push');
  }
  if (args[0] === 'merge') {
    throw new Error('FORBIDDEN_GIT:merge');
  }
  if (args[0] === 'push' && opts?.allowPush) {
    // Only allow push of non-main branch refs.
    if (args.some((a) => a === 'main' || a === 'master' || a.endsWith(':main') || a.endsWith(':master'))) {
      throw new Error('FORBIDDEN_GIT:push_main');
    }
  }
}

function git(cwd: string, args: string[], opts?: { allowPush?: boolean }): string {
  assertSafeGitArgs(args, opts);
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

export function cloneAllowlistedSandbox(remoteUrl: string, root?: string): string {
  if (!isAllowlistedSandboxRemote(remoteUrl)) {
    throw new Error(`SANDBOX_REMOTE_NOT_ALLOWLISTED:${remoteUrl}`);
  }
  const dir = root ?? fs.mkdtempSync(path.join(os.tmpdir(), 'gunnchai-ai-ur-013-clone-'));
  if (fs.existsSync(path.join(dir, '.git'))) {
    // Reuse existing checkout: fetch + reset to origin/main (never force-push).
    execFileSync('git', ['remote', 'set-url', 'origin', remoteUrl], { cwd: dir, encoding: 'utf8' });
    execFileSync('git', ['fetch', 'origin', 'main'], { cwd: dir, encoding: 'utf8' });
    execFileSync('git', ['checkout', '-B', 'main', 'origin/main'], { cwd: dir, encoding: 'utf8' });
  } else {
    fs.mkdirSync(dir, { recursive: true });
    execFileSync('git', ['clone', remoteUrl, dir], { encoding: 'utf8' });
  }
  execFileSync('git', ['config', 'user.email', 'sandbox@gunnchai.local'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'AI-UR-013 Sandbox'], { cwd: dir });
  // Ensure seed is broken for the agent task.
  const target = path.join(dir, 'src', 'add.js');
  if (!fs.existsSync(target) || !fs.readFileSync(target, 'utf8').includes('return a - b')) {
    fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'test'), { recursive: true });
    fs.writeFileSync(
      target,
      'function add(a, b) {\n  return a - b;\n}\nmodule.exports = { add };\n',
    );
    if (!fs.existsSync(path.join(dir, 'test', 'add.test.js'))) {
      fs.writeFileSync(
        path.join(dir, 'test', 'add.test.js'),
        `const assert = require('node:assert/strict');
const { add } = require('../src/add.js');
assert.equal(add(2, 3), 5);
console.log('ok');
`,
      );
    }
    execFileSync('git', ['add', '-A'], { cwd: dir, encoding: 'utf8' });
    // Commit on a prep branch only if main already fixed — keep main as remote truth.
  }
  return dir;
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
  fs.writeFileSync(path.join(dir, 'README.md'), '# gunnchai AI-UR-013 sandbox\nAllowlisted test repo only.\n');
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
    const output =
      err instanceof Error && 'stdout' in err ? String((err as { stdout: string }).stdout) : String(err);
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

export interface RecordedLiveDraftPrEvidence {
  schema?: string;
  sandbox_repo?: string;
  pr_url?: string;
  pr_number?: number;
  isDraft?: boolean;
  merge?: boolean;
  force_push?: boolean;
  push_main?: boolean;
}

export interface RecordedLiveDraftPrCheck {
  ok: boolean;
  path: string;
  pr_url: string | null;
  pr_number: number | null;
  gh_confirmed: boolean;
  notes: string;
}

/**
 * CI-safe gate: verify host-recorded allowlisted sandbox DRAFT PR evidence.
 * DRAFT_PR.json alone is NOT enough. Recorded evidence must cite a real sandbox DRAFT PR URL.
 */
export function verifyRecordedLiveDraftPr(cwd = process.cwd()): RecordedLiveDraftPrCheck {
  const evidencePath = path.join(cwd, 'artifacts', 'user-ready', 'AI_UR_013_LIVE_DRAFT_PR.json');
  if (!fs.existsSync(evidencePath)) {
    return {
      ok: false,
      path: evidencePath,
      pr_url: null,
      pr_number: null,
      gh_confirmed: false,
      notes: 'RECORDED_LIVE_PR_ABSENT',
    };
  }
  let raw: RecordedLiveDraftPrEvidence;
  try {
    raw = JSON.parse(fs.readFileSync(evidencePath, 'utf8')) as RecordedLiveDraftPrEvidence;
  } catch {
    return {
      ok: false,
      path: evidencePath,
      pr_url: null,
      pr_number: null,
      gh_confirmed: false,
      notes: 'RECORDED_LIVE_PR_INVALID_JSON',
    };
  }
  const prUrl = typeof raw.pr_url === 'string' ? raw.pr_url.trim() : '';
  const repo = String(raw.sandbox_repo || '');
  if (!prUrl || !/^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+\/?$/.test(prUrl)) {
    return {
      ok: false,
      path: evidencePath,
      pr_url: prUrl || null,
      pr_number: null,
      gh_confirmed: false,
      notes: 'RECORDED_LIVE_PR_BAD_URL',
    };
  }
  if (!ALLOWLISTED_SANDBOX_REPOS.some((n) => repo === n || repo.endsWith(`/${n}`) || n.endsWith(repo))) {
    return {
      ok: false,
      path: evidencePath,
      pr_url: prUrl,
      pr_number: raw.pr_number ?? null,
      gh_confirmed: false,
      notes: 'RECORDED_LIVE_PR_NOT_ALLOWLISTED',
    };
  }
  if (!prUrl.includes('gunnchai-ai-ur-013-sandbox')) {
    return {
      ok: false,
      path: evidencePath,
      pr_url: prUrl,
      pr_number: raw.pr_number ?? null,
      gh_confirmed: false,
      notes: 'RECORDED_LIVE_PR_URL_NOT_SANDBOX',
    };
  }
  if (raw.isDraft !== true || raw.merge === true || raw.force_push === true || raw.push_main === true) {
    return {
      ok: false,
      path: evidencePath,
      pr_url: prUrl,
      pr_number: raw.pr_number ?? null,
      gh_confirmed: false,
      notes: 'RECORDED_LIVE_PR_UNSAFE_FLAGS',
    };
  }

  let ghConfirmed = false;
  const pr = spawnSync(
    'gh',
    ['pr', 'view', prUrl, '--json', 'isDraft,state,merged,baseRefName,url'],
    { encoding: 'utf8' },
  );
  if (pr.status === 0) {
    try {
      const live = JSON.parse(pr.stdout || '{}') as {
        isDraft?: boolean;
        state?: string;
        merged?: boolean;
        baseRefName?: string;
      };
      if (live.isDraft === true && live.merged !== true && live.state !== 'MERGED') {
        ghConfirmed = true;
      } else {
        return {
          ok: false,
          path: evidencePath,
          pr_url: prUrl,
          pr_number: raw.pr_number ?? null,
          gh_confirmed: false,
          notes: `RECORDED_LIVE_PR_GH_NOT_DRAFT:${JSON.stringify(live)}`,
        };
      }
    } catch {
      /* fall through to artifact-only acceptance when gh JSON parse fails */
    }
  }

  return {
    ok: true,
    path: evidencePath,
    pr_url: prUrl,
    pr_number: raw.pr_number ?? null,
    gh_confirmed: ghConfirmed,
    notes: ghConfirmed
      ? 'RECORDED_LIVE_PR_VERIFIED_VIA_GH'
      : 'RECORDED_LIVE_PR_ARTIFACT_OK_GH_UNAVAILABLE',
  };
}

/**
 * CI digital acceptance for AI-UR-013 when LIVE_PR=0:
 * local allowlisted sandbox edit/test/commit + DRAFT semantics + recorded live DRAFT PR evidence.
 * Still rejects production push, merge/force/main, and DRAFT_PR.json-only without recorded live URL.
 */
export function evaluateCodingAgentCiDigitalGate(opts: {
  agent: CodingAgentResult;
  diffOnlyRejected: boolean;
  recorded: RecordedLiveDraftPrCheck;
}): { passed: boolean; notes: string; completeness: 'COMPLETE' | 'PARTIAL' } {
  const a = opts.agent;
  const localOk =
    a.ok &&
    a.mainUnchanged &&
    a.draftPr?.draft === true &&
    a.draftPr.merge === false &&
    a.draftPr.force_push === false &&
    a.draftPr.push_main === false &&
    a.draftPr.tests_passed === true &&
    a.draftPr.remote_pushed === false &&
    opts.diffOnlyRejected &&
    !fs.existsSync(path.join(a.sandbox, 'PROPOSED.diff'));
  // JSON-only without recorded live URL must fail.
  const jsonOnly =
    Boolean(a.draftPr) && !a.draftPr?.pr_url && !opts.recorded.ok;
  if (jsonOnly) {
    return {
      passed: false,
      completeness: 'PARTIAL',
      notes: 'CI_GATE_REJECTED_DRAFT_PR_JSON_ONLY',
    };
  }
  if (!localOk) {
    return {
      passed: false,
      completeness: 'PARTIAL',
      notes: `CI_GATE_LOCAL_SANDBOX_FAIL:${a.notes}`,
    };
  }
  if (!opts.recorded.ok) {
    return {
      passed: false,
      completeness: 'PARTIAL',
      notes: `CI_GATE_RECORDED_LIVE_PR_FAIL:${opts.recorded.notes}`,
    };
  }
  return {
    passed: true,
    completeness: 'COMPLETE',
    notes: `CI digital gate PASS: local allowlist/sandbox DRAFT semantics + recorded live sandbox DRAFT PR ${opts.recorded.pr_url} (${opts.recorded.notes}). Live open this run optional supplemental.`,
  };
}

function planTask(task: string): string[] {
  return [
    `Understand task: ${task}`,
    'Clone/worktree sandbox (never production)',
    'Edit source to satisfy failing tests',
    'Run tests; repair if needed',
    'Commit on agent branch',
    'Push allowlisted sandbox remote only',
    'Open GitHub DRAFT PR; verify main unchanged',
  ];
}

export function runCodingAgentDraftPr(
  sandbox: string,
  opts?: {
    task?: string;
    remoteUrl?: string;
    openGithubDraftPr?: boolean;
    githubRepo?: string;
  },
): CodingAgentResult {
  assertSandboxRepo(sandbox);
  const audit: string[] = [];
  const task = opts?.task ?? 'fix add() so add(2,3)===5';
  audit.push(`plan:${planTask(task).join('>')}`);

  // When opening a live PR, work from the allowlisted remote history (not an unrelated local seed).
  let workdir = sandbox;
  if (opts?.openGithubDraftPr && opts.remoteUrl) {
    workdir = cloneAllowlistedSandbox(opts.remoteUrl, path.join(sandbox, 'clone'));
    audit.push(`clone:${opts.remoteUrl}`);
  }

  const mainBefore = git(workdir, ['rev-parse', 'main']);
  const branch = `agent/ai-ur-013-fix-add-${Date.now().toString(36)}`;
  git(workdir, ['checkout', '-b', branch]);
  audit.push(`branch:${branch}`);

  const target = path.join(workdir, 'src', 'add.js');
  const before = fs.readFileSync(target, 'utf8');
  if (!before.includes('return a - b')) {
    return {
      ok: false,
      sandbox: workdir,
      branch,
      mainUnchanged: true,
      draftPr: null,
      notes: 'UNEXPECTED_SEED',
      completeness: 'PARTIAL',
    };
  }
  fs.writeFileSync(target, 'function add(a, b) {\n  return a + b;\n}\nmodule.exports = { add };\n');
  audit.push('edit:src/add.js');

  let tests = runSandboxTests(workdir);
  if (!tests.passed) {
    fs.writeFileSync(target, 'function add(a, b) {\n  return Number(a) + Number(b);\n}\nmodule.exports = { add };\n');
    audit.push('repair:src/add.js');
    tests = runSandboxTests(workdir);
  }
  if (!tests.passed) {
    return {
      ok: false,
      sandbox: workdir,
      branch,
      mainUnchanged: git(workdir, ['rev-parse', 'main']) === mainBefore,
      draftPr: null,
      notes: `TESTS_FAILED:${tests.output}`,
      completeness: 'PARTIAL',
    };
  }
  audit.push('tests:passed');

  git(workdir, ['add', 'src/add.js']);
  git(workdir, ['commit', '-m', 'fix: add() should add, not subtract']);
  const head = git(workdir, ['rev-parse', 'HEAD']);
  audit.push(`commit:${head.slice(0, 12)}`);

  git(workdir, ['checkout', 'main']);
  const mainAfter = git(workdir, ['rev-parse', 'main']);
  git(workdir, ['checkout', branch]);

  let remotePushed = false;
  let prUrl: string | null = null;
  let prNumber: number | null = null;

  const remoteUrl = opts?.remoteUrl;
  const openGh = opts?.openGithubDraftPr === true;
  if (remoteUrl) {
    if (!isAllowlistedSandboxRemote(remoteUrl)) {
      throw new Error(`SANDBOX_REMOTE_NOT_ALLOWLISTED:${remoteUrl}`);
    }
    try {
      execFileSync('git', ['remote', 'remove', 'sandbox'], {
        cwd: workdir,
        encoding: 'utf8',
        stdio: 'ignore',
      });
    } catch {
      /* no prior remote */
    }
    execFileSync('git', ['remote', 'add', 'sandbox', remoteUrl], { cwd: workdir, encoding: 'utf8' });
    git(workdir, ['push', '-u', 'sandbox', `HEAD:${branch}`], { allowPush: true });
    remotePushed = true;
    audit.push(`push:sandbox:${branch}`);
  }

  if (openGh && remotePushed) {
    const repo = opts?.githubRepo ?? 'gunnchOS3k/gunnchai-ai-ur-013-sandbox';
    if (!ALLOWLISTED_SANDBOX_REPOS.some((n) => repo === n || repo.endsWith(`/${n}`) || n.endsWith(repo))) {
      throw new Error(`SANDBOX_REPO_NOT_ALLOWLISTED:${repo}`);
    }
    const body = [
      '## Summary',
      '- Allowlisted sandbox coding agent fixed `src/add.js` so `add(2,3)===5`.',
      '- Tests were run in the sandbox and passed.',
      '- DRAFT only. Merge forbidden. Force-push forbidden. Production repos untouched.',
      '',
      '## Test plan',
      '- [x] `node test/add.test.js`',
    ].join('\n');
    const pr = spawnSync(
      'gh',
      [
        'pr',
        'create',
        '--repo',
        repo,
        '--draft',
        '--base',
        'main',
        '--head',
        branch,
        '--title',
        'fix: add() returns the sum (AI-UR-013 sandbox)',
        '--body',
        body,
      ],
      { encoding: 'utf8' },
    );
    if (pr.status === 0) {
      prUrl = (pr.stdout || '').trim().split('\n').filter(Boolean).pop() || null;
      const m = prUrl?.match(/\/pull\/(\d+)/);
      prNumber = m ? Number(m[1]) : null;
      audit.push(`draft_pr:${prUrl}`);
    } else {
      audit.push(`draft_pr_failed:${pr.stderr || pr.stdout}`);
    }
  }

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
      prUrl ? `- Live DRAFT PR: ${prUrl}` : '- Live GitHub DRAFT PR: not opened this run (local artifact only).',
      '',
      '## Test plan',
      '- [x] `node test/add.test.js` in the sandbox',
    ].join('\n'),
    tests_passed: true,
    test_output: tests.output,
    edited_files: ['src/add.js'],
    commit: head,
    remote_pushed: remotePushed,
    pr_url: prUrl,
    pr_number: prNumber,
    audit,
  };
  fs.writeFileSync(path.join(workdir, 'DRAFT_PR.json'), JSON.stringify(record, null, 2) + '\n');
  fs.writeFileSync(
    path.join(workdir, 'DRAFT_PR.md'),
    `# ${record.title}\n\nDRAFT: true\nMERGE: false\nPR: ${prUrl ?? '(local)'}\n\n${record.body}\n`,
  );

  const liveComplete = Boolean(prUrl) && remotePushed && mainAfter === mainBefore;
  return {
    ok:
      record.draft === true &&
      record.merge === false &&
      record.force_push === false &&
      record.push_main === false &&
      record.tests_passed &&
      mainAfter === mainBefore &&
      fs.existsSync(path.join(workdir, 'DRAFT_PR.json')) &&
      !fs.existsSync(path.join(workdir, 'PROPOSED.diff')),
    sandbox: workdir,
    branch,
    mainUnchanged: mainAfter === mainBefore,
    draftPr: record,
    notes: liveComplete
      ? `Sandbox branch + tests + live GitHub DRAFT PR ${prUrl}. No merge/force-push/main. Production blocked.`
      : 'Sandbox branch + tests + DRAFT_PR.json. Live GitHub DRAFT PR not opened this run → PARTIAL.',
    completeness: liveComplete ? 'COMPLETE' : 'PARTIAL',
  };
}

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  assertSafeGitArgs,
  isProductionRepo,
  proposedDiffOnly,
  runCodingAgentDraftPr,
  seedSandboxRepo,
} from '../../src/user-ready/coding_agent_pr';

describe('AI-UR-013 coding agent DRAFT PR', () => {
  it('blocks production repos and forbidden git', () => {
    expect(isProductionRepo(process.cwd())).toBe(true);
    expect(() => assertSafeGitArgs(['push', '--force', 'origin', 'main'])).toThrow(/FORBIDDEN_GIT/);
    expect(() => assertSafeGitArgs(['merge', 'agent/x'])).toThrow(/FORBIDDEN_GIT/);
  });

  it('rejects proposed-diff-only as acceptance', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'diff-only-'));
    const out = proposedDiffOnly(dir);
    expect(out.ok).toBe(false);
    expect(out.reason).toBe('DIFF_ONLY_NOT_A_DRAFT_PR');
  });

  it('edits a sandbox repo, runs tests, commits on a branch, writes a DRAFT PR, leaves main unchanged', () => {
    const sandbox = seedSandboxRepo();
    const agent = runCodingAgentDraftPr(sandbox);
    expect(agent.ok).toBe(true);
    expect(agent.mainUnchanged).toBe(true);
    expect(agent.draftPr?.draft).toBe(true);
    expect(agent.draftPr?.merge).toBe(false);
    expect(agent.draftPr?.force_push).toBe(false);
    expect(agent.draftPr?.push_main).toBe(false);
    expect(agent.draftPr?.remote_pushed).toBe(false);
    expect(agent.draftPr?.tests_passed).toBe(true);
    expect(fs.existsSync(path.join(sandbox, 'DRAFT_PR.json'))).toBe(true);
    const fixed = fs.readFileSync(path.join(sandbox, 'src', 'add.js'), 'utf8');
    expect(fixed).toContain('return a + b');
  });
});

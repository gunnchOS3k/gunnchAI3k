import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  assertSafeGitArgs,
  evaluateCodingAgentCiDigitalGate,
  isProductionRepo,
  proposedDiffOnly,
  runCodingAgentDraftPr,
  seedSandboxRepo,
  verifyRecordedLiveDraftPr,
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

  it('CI digital gate requires recorded live DRAFT PR; rejects JSON-only', () => {
    const sandbox = seedSandboxRepo();
    const agent = runCodingAgentDraftPr(sandbox);
    const missing = evaluateCodingAgentCiDigitalGate({
      agent,
      diffOnlyRejected: true,
      recorded: {
        ok: false,
        path: 'missing.json',
        pr_url: null,
        pr_number: null,
        gh_confirmed: false,
        notes: 'RECORDED_LIVE_PR_ABSENT',
      },
    });
    expect(missing.passed).toBe(false);
    expect(missing.notes).toMatch(/DRAFT_PR_JSON_ONLY|RECORDED_LIVE_PR/);

    const recorded = verifyRecordedLiveDraftPr(process.cwd());
    expect(recorded.ok).toBe(true);
    expect(recorded.pr_url).toMatch(/gunnchai-ai-ur-013-sandbox\/pull\/\d+/);
    const gate = evaluateCodingAgentCiDigitalGate({
      agent,
      diffOnlyRejected: true,
      recorded,
    });
    expect(gate.passed).toBe(true);
    expect(gate.completeness).toBe('COMPLETE');
  });
});

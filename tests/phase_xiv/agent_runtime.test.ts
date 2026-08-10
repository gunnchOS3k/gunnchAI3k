import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  AgentRuntime,
  HIGH_IMPACT_ACTIONS,
  planGoal,
  runLabReportE2E,
} from '../../src/phase_xiv';

describe('phase_xiv gunnchAgent runtime', () => {
  const cwd = process.cwd();

  it('covers high-impact approval actions', () => {
    expect(HIGH_IMPACT_ACTIONS).toEqual(
      expect.arrayContaining(['send', 'submit', 'delete', 'install', 'purchase', 'rfq', 'nda', 'merge', 'deploy']),
    );
  });

  it('plans, interrupts, resumes, and rolls back file writes', () => {
    const root = path.join(cwd, 'artifacts', 'phase_xiv', 'agent_audit', 'unit_runtime');
    fs.rmSync(root, { recursive: true, force: true });
    fs.mkdirSync(root, { recursive: true });
    const rt = new AgentRuntime({ sandboxRoot: root });
    rt.loadGraph(
      planGoal({
        goal: 'write then rollback',
        steps: [
          { id: 'w', title: 'write', tool: 'files', action: 'write', args: { path: 'a.txt', content: 'v1' } },
        ],
      }),
    );
    expect(rt.run()).toBe('completed');
    expect(fs.readFileSync(path.join(root, 'a.txt'), 'utf8')).toBe('v1');
    rt.interrupt();
    expect(rt.status).toBe('interrupted');
    const restored = rt.rollback();
    expect(restored).toContain('a.txt');
    expect(fs.existsSync(path.join(root, 'a.txt'))).toBe(false);
  });

  it('requires approval for delete and does not execute until approved', () => {
    const root = path.join(cwd, 'artifacts', 'phase_xiv', 'agent_audit', 'unit_delete');
    fs.rmSync(root, { recursive: true, force: true });
    fs.mkdirSync(root, { recursive: true });
    fs.writeFileSync(path.join(root, 'keep.txt'), 'x');
    const rt = new AgentRuntime({ sandboxRoot: root });
    rt.loadGraph(
      planGoal({
        goal: 'delete gated',
        steps: [{ id: 'd', title: 'delete file', tool: 'files', action: 'delete', args: { path: 'keep.txt' } }],
      }),
    );
    expect(rt.run()).toBe('awaiting_approval');
    expect(fs.existsSync(path.join(root, 'keep.txt'))).toBe(true);
    const appr = rt.approvals.list('pending')[0];
    rt.decideApproval(appr.id, true);
    expect(rt.resume()).toBe('completed');
    expect(fs.existsSync(path.join(root, 'keep.txt'))).toBe(false);
  });

  it('lab report E2E produces plot/docx/pdf and stops before submit', async () => {
    const res = await runLabReportE2E(cwd);
    expect(res.stoppedBeforeSubmit).toBe(true);
    expect(res.ok).toBe(true);
    expect(fs.existsSync(res.plotPath)).toBe(true);
    expect(fs.existsSync(res.docxPath)).toBe(true);
    expect(fs.existsSync(res.pdfPath)).toBe(true);
    expect(res.pendingApprovals.length).toBeGreaterThan(0);
  }, 30000);
});

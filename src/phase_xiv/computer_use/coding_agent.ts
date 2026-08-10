/** Coding agent E2E: inspect → edit → test → stop before merge. */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { AgentRuntime } from '../agent/runtime';
import { planGoal } from '../agent/planner';

export interface CodingAgentResult {
  ok: boolean;
  status: string;
  editedFile: string;
  testOutput: string;
  mergeApprovalPending: boolean;
}

export async function runCodingAgentE2E(cwd = process.cwd()): Promise<CodingAgentResult> {
  const root = path.join(cwd, 'artifacts', 'phase_xiv', 'coding_agent', `run_${Date.now()}`);
  fs.mkdirSync(root, { recursive: true });
  const fileRel = 'src/hello.ts';
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  fs.writeFileSync(path.join(root, fileRel), 'export const hello = () => "hi";\n');

  const rt = new AgentRuntime({
    sandboxRoot: root,
    auditPath: path.join(cwd, 'artifacts', 'phase_xiv', 'agent_audit', 'coding_agent.jsonl'),
  });
  rt.loadGraph(
    planGoal({
      goal: 'Edit hello and test; stop before merge',
      steps: [
        { id: 'inspect', title: 'Inspect file', tool: 'files', action: 'read', args: { path: fileRel } },
        {
          id: 'edit',
          title: 'Edit hello',
          tool: 'files',
          action: 'write',
          args: { path: fileRel, content: 'export const hello = () => "hello-phase-xiv";\n' },
          depends_on: ['inspect'],
        },
        {
          id: 'test',
          title: 'Run node syntax check',
          tool: 'shell',
          action: 'exec',
          args: { cmd: 'node', argv: ['--check', fileRel] },
          depends_on: ['edit'],
        },
        {
          id: 'merge',
          title: 'Merge PR (approval required)',
          tool: 'approval',
          action: 'merge',
          depends_on: ['test'],
        },
      ],
    }),
  );

  const status = rt.run();
  const edited = fs.readFileSync(path.join(root, fileRel), 'utf8');
  const testNode = rt.graph.nodes.get('test');
  const testOutput = JSON.stringify(testNode?.result ?? {});
  const mergeApprovalPending =
    status === 'awaiting_approval' && rt.approvals.list('pending').some((a) => a.action === 'merge');

  return {
    ok: mergeApprovalPending && edited.includes('hello-phase-xiv'),
    status,
    editedFile: path.join(root, fileRel),
    testOutput,
    mergeApprovalPending,
  };
}

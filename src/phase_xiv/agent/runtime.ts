/**
 * gunnchAgent runtime — planner/task graph/tools/approvals/sandbox/audit/
 * interrupt/resume/rollback/limits.
 */

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ApprovalGate, isHighImpact, type HighImpactAction } from './approval';
import { AgentAuditLog } from './audit';
import { LimitTracker, DEFAULT_AGENT_LIMITS, type AgentLimits } from './limits';
import { planGoal, type PlanInput } from './planner';
import { AgentSandbox } from './sandbox';
import { TaskGraph, type TaskNode } from './task_graph';
import { BrowserTool } from './tools/browser';
import { FilesTool } from './tools/files';
import { ShellTool } from './tools/shell';

export type RuntimeStatus = 'idle' | 'running' | 'interrupted' | 'awaiting_approval' | 'completed' | 'failed';

export interface AgentSessionState {
  session_id: string;
  status: RuntimeStatus;
  graph: TaskNode[];
  checkpoint_path: string;
  created_at: string;
  updated_at: string;
  last_error?: string;
}

export interface AgentRuntimeOptions {
  sandboxRoot: string;
  auditPath?: string;
  limits?: AgentLimits;
  networkAllowed?: boolean;
  artifactHandlers?: {
    docx?: (ctx: AgentRuntime) => string;
    pdf?: (ctx: AgentRuntime) => string;
  };
}

export class AgentRuntime {
  readonly session_id: string;
  readonly approvals = new ApprovalGate();
  readonly audit: AgentAuditLog;
  readonly sandbox: AgentSandbox;
  readonly limits: LimitTracker;
  graph: TaskGraph = new TaskGraph();
  status: RuntimeStatus = 'idle';
  private snapshotId: string;
  private checkpointPath: string;
  files: FilesTool;
  shell: ShellTool;
  browser: BrowserTool;
  private artifactHandlers: AgentRuntimeOptions['artifactHandlers'];
  private created_at: string;

  constructor(opts: AgentRuntimeOptions) {
    this.session_id = `sess_${crypto.randomBytes(6).toString('hex')}`;
    this.snapshotId = `snap_${this.session_id}`;
    this.audit = new AgentAuditLog(opts.auditPath);
    const limits = { ...DEFAULT_AGENT_LIMITS, ...(opts.limits || {}), networkAllowed: opts.networkAllowed ?? false };
    this.limits = new LimitTracker(limits);
    this.sandbox = new AgentSandbox(opts.sandboxRoot, limits);
    this.sandbox.beginSnapshot(this.snapshotId);
    this.files = new FilesTool(this.sandbox, this.limits, this.snapshotId);
    this.shell = new ShellTool(this.sandbox, this.limits);
    this.browser = new BrowserTool(this.sandbox, this.limits, limits.networkAllowed);
    this.artifactHandlers = opts.artifactHandlers;
    this.checkpointPath = path.join(opts.sandboxRoot, '.agent', `${this.session_id}.json`);
    this.created_at = new Date().toISOString();
    fs.mkdirSync(path.dirname(this.checkpointPath), { recursive: true });
    this.audit.record(this.session_id, 'session_start', {});
  }

  loadPlan(input: PlanInput): void {
    this.graph = planGoal(input);
    this.status = 'idle';
    this.persist();
  }

  loadGraph(graph: TaskGraph): void {
    this.graph = graph;
    this.persist();
  }

  interrupt(): void {
    this.status = 'interrupted';
    this.audit.record(this.session_id, 'interrupt', {});
    this.persist();
  }

  resume(): RuntimeStatus {
    if (this.status !== 'interrupted' && this.status !== 'awaiting_approval' && this.status !== 'idle') {
      return this.status;
    }
    this.audit.record(this.session_id, 'resume', { from: this.status });
    return this.run();
  }

  rollback(): string[] {
    const restored = this.sandbox.rollback(this.snapshotId);
    this.sandbox.beginSnapshot(this.snapshotId);
    this.audit.record(this.session_id, 'rollback', { restored });
    this.persist();
    return restored;
  }

  decideApproval(id: string, approve: boolean): void {
    const req = this.approvals.decide(id, approve);
    this.audit.record(this.session_id, 'approval_decision', { id, approve, action: req.action });
    if (!approve) {
      for (const n of this.graph.serialize()) {
        if (n.approval_id === id) this.graph.mark(n.id, 'blocked', { error: 'APPROVAL_DENIED' });
      }
      this.status = 'failed';
      this.persist();
      return;
    }
    for (const n of this.graph.serialize()) {
      if (n.approval_id === id && n.status === 'blocked') this.graph.mark(n.id, 'pending');
    }
    this.status = 'interrupted';
  }

  run(maxSteps = 32): RuntimeStatus {
    this.status = 'running';
    let steps = 0;
    while (steps < maxSteps) {
      if (this.status === 'interrupted') {
        this.persist();
        return this.status;
      }
      const ready = this.graph.ready();
      if (ready.length === 0) break;
      const node = ready[0];
      try {
        this.executeNode(node);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        this.graph.mark(node.id, 'failed', { error: msg });
        this.status = 'failed';
        this.audit.record(this.session_id, 'node_failed', { id: node.id, error: msg });
        this.persist();
        return this.status;
      }
      if (this.status === 'awaiting_approval') {
        this.persist();
        return this.status;
      }
      steps += 1;
    }
    this.status = this.graph.isComplete() ? 'completed' : this.status === 'running' ? 'completed' : this.status;
    if ([...this.graph.nodes.values()].some((n) => n.status === 'failed' || n.status === 'blocked')) {
      this.status = 'failed';
    }
    this.persist();
    return this.status;
  }

  private executeNode(node: TaskNode): void {
    this.graph.mark(node.id, 'running');
    this.audit.record(this.session_id, 'node_start', { id: node.id, tool: node.tool, action: node.action });

    if (node.action && isHighImpact(node.action)) {
      let approvalId = node.approval_id;
      if (!approvalId) {
        const req = this.approvals.prepare(node.action as HighImpactAction, node.title, node.args || {});
        approvalId = req.id;
        this.graph.mark(node.id, 'blocked', { approval_id: approvalId });
        this.status = 'awaiting_approval';
        this.audit.record(this.session_id, 'approval_required', { id: node.id, approval_id: approvalId, action: node.action });
        return;
      }
      this.approvals.requireApproved(approvalId);
    }

    let result: unknown = null;
    const tool = node.tool || 'noop';
    const action = node.action || 'noop';
    const args = node.args || {};

    if (tool === 'files') {
      if (action === 'read') result = this.files.read(String(args.path));
      else if (action === 'write') result = this.files.write(String(args.path), String(args.content ?? args.content_key ?? ''));
      else if (action === 'delete') {
        // delete is high-impact; if we got here approval passed
        this.files.delete(String(args.path));
        result = { deleted: args.path };
      } else if (action === 'list') result = this.files.list(String(args.path || '.'));
      else throw new Error(`UNKNOWN_FILES_ACTION:${action}`);
    } else if (tool === 'shell') {
      result = this.shell.exec(String(args.cmd || 'node'), (args.argv as string[]) || []);
    } else if (tool === 'browser') {
      result = args.url ? this.browser.openRemote(String(args.url)) : this.browser.openLocal(String(args.path));
    } else if (tool === 'artifacts') {
      if (action === 'docx' && this.artifactHandlers?.docx) result = this.artifactHandlers.docx(this);
      else if (action === 'pdf' && this.artifactHandlers?.pdf) result = this.artifactHandlers.pdf(this);
      else result = { deferred: true, action };
    } else if (tool === 'approval') {
      // already handled high-impact gate
      result = { prepared: true, action };
    } else if (tool === 'noop') {
      result = { ok: true };
    } else {
      throw new Error(`UNKNOWN_TOOL:${tool}`);
    }

    this.graph.mark(node.id, 'done', { result });
    this.audit.record(this.session_id, 'node_done', { id: node.id });
  }

  persist(): void {
    const state: AgentSessionState = {
      session_id: this.session_id,
      status: this.status,
      graph: this.graph.serialize(),
      checkpoint_path: this.checkpointPath,
      created_at: this.created_at,
      updated_at: new Date().toISOString(),
    };
    fs.writeFileSync(this.checkpointPath, JSON.stringify(state, null, 2) + '\n');
  }

  static restore(opts: AgentRuntimeOptions, checkpointPath: string): AgentRuntime {
    const raw = JSON.parse(fs.readFileSync(checkpointPath, 'utf8')) as AgentSessionState;
    const rt = new AgentRuntime(opts);
    (rt as { session_id: string }).session_id = raw.session_id;
    rt.graph = TaskGraph.deserialize(raw.graph);
    rt.status = raw.status === 'running' ? 'interrupted' : raw.status;
    rt.audit.record(rt.session_id, 'restore', { from: checkpointPath });
    return rt;
  }
}

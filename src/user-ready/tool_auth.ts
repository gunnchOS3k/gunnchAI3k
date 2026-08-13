/**
 * Tool authorization session: deny-by-default, explicit grant, high-impact approval.
 */

import { ApprovalGate, isHighImpact, type HighImpactAction } from '../phase_xiv/agent/approval';
import { PermissionBroker, type PermissionScope } from '../stage2/os/permissions';

export type ToolName = 'network' | 'cloud' | 'file_write' | 'shell' | 'browser' | 'memory';

const TOOL_SCOPE: Record<ToolName, PermissionScope> = {
  network: 'network',
  cloud: 'network',
  file_write: 'file',
  shell: 'device',
  browser: 'network',
  memory: 'memory',
};

export interface ToolAuthAudit {
  at: string;
  tool: ToolName;
  decision: 'granted' | 'denied' | 'approval_required' | 'allowed';
  reason: string;
}

export interface ToolInvokeResult {
  ok: boolean;
  tool: ToolName;
  decision: ToolAuthAudit['decision'];
  reason: string;
}

export class ToolAuthSession {
  readonly broker = new PermissionBroker();
  readonly approvals = new ApprovalGate();
  readonly audit: ToolAuthAudit[] = [];
  constructor(private readonly userId: string) {}

  grant(tool: ToolName): void {
    this.broker.grant(this.userId, TOOL_SCOPE[tool]);
    this.audit.push({
      at: new Date().toISOString(),
      tool,
      decision: 'granted',
      reason: 'explicit_user_grant',
    });
  }

  invoke(tool: ToolName, action: string, payload: Record<string, unknown> = {}): ToolInvokeResult {
    if (isHighImpact(action)) {
      const req = this.approvals.prepare(action as HighImpactAction, `${tool}:${action}`, payload);
      this.audit.push({
        at: new Date().toISOString(),
        tool,
        decision: 'approval_required',
        reason: `HIGH_IMPACT:${req.id}`,
      });
      return {
        ok: false,
        tool,
        decision: 'approval_required',
        reason: `APPROVAL_REQUIRED:${req.id}:${action}`,
      };
    }
    if (this.broker.check(this.userId, TOOL_SCOPE[tool]) !== 'granted') {
      this.audit.push({
        at: new Date().toISOString(),
        tool,
        decision: 'denied',
        reason: `PERMISSION_DENIED:${TOOL_SCOPE[tool]}`,
      });
      return {
        ok: false,
        tool,
        decision: 'denied',
        reason: `PERMISSION_DENIED:${tool}`,
      };
    }
    this.audit.push({
      at: new Date().toISOString(),
      tool,
      decision: 'allowed',
      reason: 'granted_scope',
    });
    return { ok: true, tool, decision: 'allowed', reason: 'granted_scope' };
  }

  approve(requestId: string): void {
    this.approvals.decide(requestId, true);
  }
}

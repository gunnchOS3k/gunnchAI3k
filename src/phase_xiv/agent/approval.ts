/** High-impact action approval gates. */

export type HighImpactAction =
  | 'send'
  | 'submit'
  | 'delete'
  | 'install'
  | 'purchase'
  | 'rfq'
  | 'nda'
  | 'merge'
  | 'deploy'
  | 'external_publish';

export const HIGH_IMPACT_ACTIONS: readonly HighImpactAction[] = [
  'send',
  'submit',
  'delete',
  'install',
  'purchase',
  'rfq',
  'nda',
  'merge',
  'deploy',
  'external_publish',
] as const;

export type ApprovalStatus = 'pending' | 'approved' | 'denied';

export interface ApprovalRequest {
  id: string;
  action: HighImpactAction;
  summary: string;
  prepared_payload: Record<string, unknown>;
  status: ApprovalStatus;
  created_at: string;
  decided_at: string | null;
}

export function isHighImpact(action: string): action is HighImpactAction {
  return (HIGH_IMPACT_ACTIONS as readonly string[]).includes(action);
}

export class ApprovalGate {
  private requests = new Map<string, ApprovalRequest>();
  private seq = 0;

  prepare(action: HighImpactAction, summary: string, prepared_payload: Record<string, unknown> = {}): ApprovalRequest {
    this.seq += 1;
    const req: ApprovalRequest = {
      id: `appr_${this.seq}`,
      action,
      summary,
      prepared_payload,
      status: 'pending',
      created_at: new Date().toISOString(),
      decided_at: null,
    };
    this.requests.set(req.id, req);
    return req;
  }

  decide(id: string, approve: boolean): ApprovalRequest {
    const req = this.requests.get(id);
    if (!req) throw new Error(`UNKNOWN_APPROVAL:${id}`);
    if (req.status !== 'pending') throw new Error(`APPROVAL_ALREADY_DECIDED:${id}`);
    req.status = approve ? 'approved' : 'denied';
    req.decided_at = new Date().toISOString();
    return req;
  }

  requireApproved(id: string): ApprovalRequest {
    const req = this.requests.get(id);
    if (!req) throw new Error(`UNKNOWN_APPROVAL:${id}`);
    if (req.status !== 'approved') throw new Error(`APPROVAL_REQUIRED:${req.action}`);
    return req;
  }

  list(status?: ApprovalStatus): ApprovalRequest[] {
    const all = [...this.requests.values()];
    return status ? all.filter((r) => r.status === status) : all;
  }
}

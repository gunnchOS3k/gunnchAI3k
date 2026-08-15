/**
 * AI-UR-012 Computer use — allowlisted local test environments only.
 * Permission + audit + cancel. No surveillance / production finance / medical.
 */

import { PermissionBroker } from '../stage2/os/permissions';

export type CuActionType = 'focus' | 'click' | 'type' | 'scroll' | 'read' | 'screenshot';

export interface CuTarget {
  role: string;
  name: string;
}

export interface CuAction {
  type: CuActionType;
  target: CuTarget;
  text?: string;
}

export interface CuAuditEntry {
  at: string;
  event: string;
  detail: string;
  ok: boolean;
}

export interface CuStepResult {
  ok: boolean;
  action: CuAction;
  observed: string;
  cancelled?: boolean;
}

const BLOCKED_ENV_MARKERS = [
  /surveillance/i,
  /production/i,
  /finance/i,
  /medical/i,
  /bank/i,
  /ehr|hipaa/i,
  /live.?desktop/i,
];

/** Only these lab env ids are operable. */
export const ALLOWLISTED_TEST_ENVS = new Set([
  'lab.local.test-ui',
  'lab.local.a11y-tree',
  'fixtures.user-ready.computer-use',
]);

export class SafeComputerUseRuntime {
  readonly permissions = new PermissionBroker();
  readonly audit: CuAuditEntry[] = [];
  private cancelled = false;
  private envId: string | null = null;

  constructor(private readonly userId: string) {}

  attachEnv(envId: string): { ok: boolean; reason: string } {
    for (const re of BLOCKED_ENV_MARKERS) {
      if (re.test(envId)) {
        this.audit.push({
          at: new Date().toISOString(),
          event: 'env_blocked',
          detail: envId,
          ok: false,
        });
        return { ok: false, reason: `ENV_BLOCKED:${envId}` };
      }
    }
    if (!ALLOWLISTED_TEST_ENVS.has(envId)) {
      this.audit.push({
        at: new Date().toISOString(),
        event: 'env_not_allowlisted',
        detail: envId,
        ok: false,
      });
      return { ok: false, reason: `ENV_NOT_ALLOWLISTED:${envId}` };
    }
    this.envId = envId;
    this.audit.push({
      at: new Date().toISOString(),
      event: 'env_attached',
      detail: envId,
      ok: true,
    });
    return { ok: true, reason: 'ENV_OK' };
  }

  grantDesktopControl(): void {
    this.permissions.grant(this.userId, 'screen');
    this.permissions.grant(this.userId, 'device');
    this.audit.push({
      at: new Date().toISOString(),
      event: 'permission_granted',
      detail: 'screen+device',
      ok: true,
    });
  }

  cancel(): void {
    this.cancelled = true;
    this.audit.push({
      at: new Date().toISOString(),
      event: 'cancel',
      detail: 'user_cancel',
      ok: true,
    });
  }

  run(
    actions: CuAction[],
    tree: Array<CuTarget & { value?: string }> = [],
  ): { ok: boolean; results: CuStepResult[]; reason: string } {
    if (!this.envId) {
      return { ok: false, results: [], reason: 'NO_ENV' };
    }
    if (
      this.permissions.check(this.userId, 'screen') !== 'granted' ||
      this.permissions.check(this.userId, 'device') !== 'granted'
    ) {
      this.audit.push({
        at: new Date().toISOString(),
        event: 'permission_denied',
        detail: 'desktop_control',
        ok: false,
      });
      return { ok: false, results: [], reason: 'DESKTOP_CONTROL_DENIED' };
    }
    const results: CuStepResult[] = [];
    for (const action of actions) {
      if (this.cancelled) {
        results.push({ ok: false, action, observed: 'CANCELLED', cancelled: true });
        this.audit.push({
          at: new Date().toISOString(),
          event: 'step_cancelled',
          detail: action.type,
          ok: false,
        });
        break;
      }
      if (action.type === 'screenshot' && /background|silent/i.test(action.target.name)) {
        this.audit.push({
          at: new Date().toISOString(),
          event: 'surveillance_blocked',
          detail: action.target.name,
          ok: false,
        });
        results.push({ ok: false, action, observed: 'SURVEILLANCE_FORBIDDEN' });
        return { ok: false, results, reason: 'SURVEILLANCE_FORBIDDEN' };
      }
      const found = tree.find(
        (n) => n.role === action.target.role && n.name === action.target.name,
      );
      const ok = Boolean(found) || action.type === 'scroll';
      const observed =
        found?.value || (ok ? `${action.type}:${action.target.name}` : 'NOT_FOUND');
      results.push({ ok, action, observed });
      this.audit.push({
        at: new Date().toISOString(),
        event: 'step',
        detail: `${action.type}:${action.target.name}:${observed}`,
        ok,
      });
      if (!ok) break;
    }
    const allOk = results.length > 0 && results.every((r) => r.ok);
    return {
      ok: allOk,
      results,
      reason: allOk ? 'OK' : results.some((r) => r.cancelled) ? 'CANCELLED' : 'STEP_FAILED',
    };
  }
}

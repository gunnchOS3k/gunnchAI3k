/**
 * gunnchai capability API — routes via ModelRouter (not hardcoded engines).
 */

import { ModelRouter, type OsTelemetrySim, type RouterInput } from '../fleet/router';
import type { TaskKind } from '../fleet/roles';
import { PermissionBroker, type PermissionScope } from './permissions';
import { SyncInterface } from './sync';
import type { UserIdentity } from './identity';

export type CapabilityName =
  | 'summarize'
  | 'translate'
  | 'tutor'
  | 'code'
  | 'search'
  | 'reason'
  | 'diagnose'
  | 'classify';

const CAP_TO_TASK: Record<CapabilityName, TaskKind> = {
  summarize: 'summarize',
  translate: 'translate',
  tutor: 'tutoring',
  code: 'code',
  search: 'search',
  reason: 'reason',
  diagnose: 'diagnose',
  classify: 'classify',
};

const CAP_PERMISSION: Partial<Record<CapabilityName, PermissionScope>> = {
  search: 'network',
  diagnose: 'device',
};

export interface CapabilityRequest {
  capability: CapabilityName;
  input: string;
  identity: UserIdentity;
  privacy?: RouterInput['privacy'];
  contextTokens?: number;
  telemetry?: Partial<OsTelemetrySim>;
  cloudConsent?: boolean;
  preference?: RouterInput['preference'];
}

export interface CapabilityResponse {
  ok: boolean;
  capability: CapabilityName;
  user_id: string;
  text: string;
  route: ReturnType<ModelRouter['route']>;
  sync: ReturnType<SyncInterface['status']>;
}

export class GunnchAiCapabilityApi {
  readonly router: ModelRouter;
  readonly permissions: PermissionBroker;
  readonly sync: SyncInterface;

  constructor(
    router = new ModelRouter(),
    permissions = new PermissionBroker(),
    sync = new SyncInterface(),
  ) {
    this.router = router;
    this.permissions = permissions;
    this.sync = sync;
    this.router.getFleet().ensureFixtureRefs();
  }

  invoke(req: CapabilityRequest): CapabilityResponse {
    const needed = CAP_PERMISSION[req.capability];
    if (needed) this.permissions.require(req.identity.user_id, needed);

    const route = this.router.route({
      task: CAP_TO_TASK[req.capability],
      privacy: req.privacy ?? 'personal',
      contextTokens: req.contextTokens ?? Math.min(2048, Math.ceil(req.input.length / 4) + 64),
      telemetry: req.telemetry,
      cloudConsent: req.cloudConsent ?? false,
      preference: req.preference ?? 'balanced',
      offline: req.telemetry?.offline,
      ramMb: req.telemetry?.availableRamMb,
    });

    this.sync.recordLocalWrite();
    const text = route.ok
      ? `[${req.capability}] via ${route.selectedModelId} @ ${route.location}: ${req.input.slice(0, 200)}`
      : `[${req.capability}] FAILED: ${route.reason}`;

    return {
      ok: route.ok,
      capability: req.capability,
      user_id: req.identity.user_id,
      text,
      route,
      sync: this.sync.status('local_default'),
    };
  }
}

import type { DecisionRequest } from './contracts';
import type { DecisionProvider } from './decision_provider';
import { evaluateRemoteEligibility } from './privacy_policy';
import { typesafeJevEnabled, typesafeLiveEnabled } from './flags';

export interface RouteDecision {
  provider: DecisionProvider | null;
  reason: string;
  remote_attempted: boolean;
}

export class DecisionRouter {
  constructor(
    private readonly remote: DecisionProvider | null,
    private readonly local: DecisionProvider,
    private readonly env: NodeJS.ProcessEnv = process.env,
  ) {}

  route(request: DecisionRequest): RouteDecision {
    const eligibility = evaluateRemoteEligibility(request);
    if (!eligibility.allowed) {
      return { provider: this.local, reason: eligibility.reason, remote_attempted: false };
    }
    if (!typesafeJevEnabled(this.env)) {
      return { provider: this.local, reason: 'FLAGS_OFF', remote_attempted: false };
    }
    if (this.remote?.remote && !typesafeLiveEnabled(this.env)) {
      return { provider: this.local, reason: 'LIVE_FLAG_OFF', remote_attempted: false };
    }
    if (!this.remote) {
      return { provider: this.local, reason: 'NO_REMOTE_PROVIDER', remote_attempted: false };
    }
    return { provider: this.remote, reason: 'REMOTE_ELIGIBLE', remote_attempted: true };
  }
}

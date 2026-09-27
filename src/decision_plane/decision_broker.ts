import type { DecisionRequest, DecisionResponse } from './contracts';
import { DECISION_POLICY_VERSION, validateDecisionRequest } from './contracts';
import { ConfidenceGate, type ConfidenceGateRecord, type TaskThresholds } from './confidence_gate';
import { DecisionCache } from './cache';
import { DecisionRouter } from './decision_router';
import { DeterministicDecisionFallback, type FallbackReason } from './fallback';
import { DecisionStateMinimizer } from './minimizer';
import { evaluateRemoteEligibility } from './privacy_policy';
import { systemOnePlaneEnabled, typesafeJevEnabled } from './flags';
import type { DecisionProvider } from './decision_provider';
import { TypeSafeError } from '../providers/typesafe/typesafe_errors';
import { DefaultCapabilityBroker, type ToolProposalV2 } from '../tools/tool_invocation_v2';

export interface BrokerEvaluateResult {
  response: DecisionResponse;
  gate: ConfidenceGateRecord;
  fallback_reason?: FallbackReason;
  minimized_dropped: string[];
  redacted_fields: string[];
}

export class DecisionBroker {
  private readonly fallback = new DeterministicDecisionFallback();
  private readonly minimizer = new DecisionStateMinimizer();
  private readonly cache = new DecisionCache();
  private readonly capabilityBroker = new DefaultCapabilityBroker();

  constructor(
    private readonly router: DecisionRouter,
    private readonly gate = new ConfidenceGate(),
    private readonly env: NodeJS.ProcessEnv = process.env,
    private readonly thresholds: Record<string, TaskThresholds> = {},
  ) {}

  async evaluate(request: DecisionRequest, signal?: AbortSignal): Promise<BrokerEvaluateResult> {
    const owned = {
      ...request,
      policy_version: request.policy_version ?? DECISION_POLICY_VERSION,
    };
    const valid = validateDecisionRequest(owned);
    if (!valid.ok) {
      const response = this.fallback.evaluate(owned, 'VALIDATION_FAILURE');
      return this.wrap(response, owned, 'VALIDATION_FAILURE');
    }

    const minimized = this.minimizer.minimize({
      state: owned.state,
      questions: owned.questions,
      privacy_class: owned.privacy_class,
      task_class: owned.task_class,
    });
    const minimizedRequest: DecisionRequest = { ...owned, state: minimized.state };

    if (!systemOnePlaneEnabled(this.env) || !typesafeJevEnabled(this.env)) {
      const response = this.fallback.evaluate(minimizedRequest, 'FLAGS_OFF');
      return this.wrap(response, minimizedRequest, 'FLAGS_OFF', minimized);
    }

    const privacy = evaluateRemoteEligibility(minimizedRequest);
    const routed = this.router.route(minimizedRequest);
    const provider = routed.provider;
    if (!provider || !privacy.allowed || routed.reason !== 'REMOTE_ELIGIBLE') {
      const reason = (!privacy.allowed ? privacy.reason : routed.reason) as FallbackReason;
      const response = this.fallback.evaluate(minimizedRequest, reason);
      return this.wrap(response, minimizedRequest, reason, minimized);
    }

    if (this.cache.eligible(minimizedRequest)) {
      const key = this.cache.key(minimizedRequest, provider.provider_id);
      const hit = this.cache.get(key);
      if (hit) return this.wrap(hit, minimizedRequest, undefined, minimized);
    }

    try {
      const response = await provider.evaluate(minimizedRequest, signal);
      if (this.cache.eligible(minimizedRequest)) {
        this.cache.set(this.cache.key(minimizedRequest, provider.provider_id), response);
      }
      return this.wrap(response, minimizedRequest, undefined, minimized);
    } catch (err) {
      const reason = mapProviderError(err);
      const response = this.fallback.evaluate(minimizedRequest, reason);
      return this.wrap(response, minimizedRequest, reason, minimized);
    }
  }

  /**
   * Jev/decision-plane may only propose tools. Capability Broker remains authority.
   */
  authorizeProposal(proposal: ToolProposalV2, consents: Set<string>) {
    return this.capabilityBroker.authorize(proposal, consents);
  }

  private wrap(
    response: DecisionResponse,
    request: DecisionRequest,
    fallback_reason?: FallbackReason,
    minimized?: { dropped_fields: string[]; redacted_fields: string[] },
  ): BrokerEvaluateResult {
    const gate = this.gate.evaluate({
      task_class: request.task_class,
      answers: response.answers,
      questions: request.questions,
      thresholds: this.thresholds[request.task_class],
    });
    response.provenance = {
      ...response.provenance,
      confidence_gate: gate.outcome,
      fallback_used: Boolean(fallback_reason) || response.provenance.fallback_used,
      production_default: false,
    };
    return {
      response,
      gate,
      fallback_reason,
      minimized_dropped: minimized?.dropped_fields ?? [],
      redacted_fields: minimized?.redacted_fields ?? [],
    };
  }
}

function mapProviderError(err: unknown): FallbackReason {
  if (err instanceof TypeSafeError) {
    const map: Record<string, FallbackReason> = {
      TIMEOUT: 'TIMEOUT',
      CONNECTION_FAILURE: 'PROVIDER_UNAVAILABLE',
      AUTH_FAILURE: 'AUTH_FAILURE',
      VALIDATION_FAILURE: 'VALIDATION_FAILURE',
      RATE_LIMIT: 'RATE_LIMIT',
      SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
      UNEXPECTED_RESPONSE: 'UNEXPECTED_RESPONSE',
      CIRCUIT_OPEN: 'CIRCUIT_OPEN',
      CANCELLED: 'CANCELLED',
      REQUEST_INVALID: 'VALIDATION_FAILURE',
      MODEL_UNAVAILABLE: 'PROVIDER_UNAVAILABLE',
    };
    return map[err.code] ?? 'PROVIDER_UNAVAILABLE';
  }
  return 'PROVIDER_UNAVAILABLE';
}

export function createDecisionBroker(remote: DecisionProvider | null, local: DecisionProvider, env?: NodeJS.ProcessEnv): DecisionBroker {
  return new DecisionBroker(new DecisionRouter(remote, local, env), new ConfidenceGate(), env);
}

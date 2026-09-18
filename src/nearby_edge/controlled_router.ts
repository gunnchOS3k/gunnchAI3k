/**
 * Controlled routing lane: deterministic → nearby-edge → remote-if-permitted → honest unavailable.
 * No behavior change when feature flags are off.
 */
import type { ModelProviderV2, CompletionRequestV2, CompletionResultV2 } from '../providers/model_provider_v2';
import { ModelRouterV2, type RouterV2Input, type RouterV2Result } from '../control/model_router_v2';
import { isFeatureEnabled } from '../config/feature_flags';
import { isTaskAllowed, type TaskClass } from '../config/live_provider_policy';
import type { NearbyEdgeProvider } from '../nearby_edge/NearbyEdgeProvider';

export type ControlledRouteStep =
  | 'deterministic'
  | 'nearby_edge'
  | 'remote_if_permitted'
  | 'honest_unavailable';

export interface ControlledRouteTrace {
  flags: {
    GUNNCHAI_LIVE_PROVIDER_INTEGRATION: boolean;
    GUNNCHAI_NEARBY_EDGE: boolean;
  };
  steps: Array<{ step: ControlledRouteStep; outcome: string }>;
  selected: ControlledRouteStep;
  ok: boolean;
  text?: string;
  error?: string;
  provenance?: unknown;
}

export class ControlledIntegrationRouter {
  private readonly baseRouter: ModelRouterV2;
  private readonly deterministic?: ModelProviderV2;
  private readonly nearby?: NearbyEdgeProvider | null;
  private readonly remote?: ModelProviderV2 | null;

  constructor(
    baseRouter?: ModelRouterV2,
    deterministic?: ModelProviderV2,
    nearby?: NearbyEdgeProvider | null,
    remote?: ModelProviderV2 | null,
  ) {
    this.baseRouter = baseRouter ?? new ModelRouterV2();
    this.deterministic = deterministic;
    this.nearby = nearby;
    this.remote = remote;
  }

  /** Baseline Pareto route — unchanged when flags off. */
  routeBaseline(input: RouterV2Input): RouterV2Result {
    return this.baseRouter.route(input);
  }

  async executeControlled(opts: {
    task_class: TaskClass;
    prompt: string;
    cloud_consent?: boolean;
    offline?: boolean;
  }): Promise<ControlledRouteTrace> {
    const flags = {
      GUNNCHAI_LIVE_PROVIDER_INTEGRATION: isFeatureEnabled('GUNNCHAI_LIVE_PROVIDER_INTEGRATION'),
      GUNNCHAI_NEARBY_EDGE: isFeatureEnabled('GUNNCHAI_NEARBY_EDGE'),
    };
    const steps: ControlledRouteTrace['steps'] = [];

    if (!flags.GUNNCHAI_LIVE_PROVIDER_INTEGRATION) {
      steps.push({ step: 'deterministic', outcome: 'FLAG_OFF_NO_BEHAVIOR_CHANGE' });
      return {
        flags,
        steps,
        selected: 'deterministic',
        ok: false,
        error: 'FEATURE_FLAGS_OFF',
      };
    }

    // 1) Deterministic / local micro path first
    if (this.deterministic) {
      const allowed = isTaskAllowed('smollm2-135m-instruct-q4_k_m', opts.task_class);
      if (allowed.ok) {
        const r = await this.deterministic.complete({ prompt: opts.prompt, max_tokens: 64 });
        steps.push({ step: 'deterministic', outcome: r.ok ? 'OK' : r.error ?? 'FAIL' });
        if (r.ok) {
          return { flags, steps, selected: 'deterministic', ok: true, text: r.text };
        }
      } else {
        steps.push({ step: 'deterministic', outcome: allowed.reason });
      }
    } else {
      steps.push({ step: 'deterministic', outcome: 'NO_DETERMINISTIC_PROVIDER' });
    }

    // 2) Nearby-edge
    if (flags.GUNNCHAI_NEARBY_EDGE && this.nearby) {
      const r = await this.nearby.complete({ prompt: opts.prompt, max_tokens: 64 });
      steps.push({ step: 'nearby_edge', outcome: r.ok ? 'OK' : r.error ?? 'FAIL' });
      if (r.ok) {
        return {
          flags,
          steps,
          selected: 'nearby_edge',
          ok: true,
          text: r.text,
          provenance: this.nearby.lastProvenance,
        };
      }
    } else {
      steps.push({
        step: 'nearby_edge',
        outcome: flags.GUNNCHAI_NEARBY_EDGE ? 'NO_NEARBY_PROVIDER' : 'FLAG_OFF',
      });
    }

    // 3) Remote if permitted
    if (!opts.offline && opts.cloud_consent && this.remote) {
      const r = await this.remote.complete({ prompt: opts.prompt, max_tokens: 64 });
      steps.push({ step: 'remote_if_permitted', outcome: r.ok ? 'OK' : r.error ?? 'FAIL' });
      if (r.ok) {
        return { flags, steps, selected: 'remote_if_permitted', ok: true, text: r.text };
      }
    } else {
      steps.push({
        step: 'remote_if_permitted',
        outcome: opts.offline ? 'OFFLINE' : opts.cloud_consent ? 'NO_REMOTE' : 'NO_CLOUD_CONSENT',
      });
    }

    // 4) Honest unavailable
    steps.push({ step: 'honest_unavailable', outcome: 'UNAVAILABLE' });
    return {
      flags,
      steps,
      selected: 'honest_unavailable',
      ok: false,
      error: 'HONEST_UNAVAILABLE',
    };
  }
}

export async function completeWithFlagsOffGuard(
  provider: ModelProviderV2,
  req: CompletionRequestV2,
): Promise<CompletionResultV2> {
  if (!isFeatureEnabled('GUNNCHAI_LIVE_PROVIDER_INTEGRATION')) {
    return {
      ok: false,
      text: '',
      provider_id: provider.meta.provider_id,
      model_id: provider.meta.model_id,
      error: 'FEATURE_FLAGS_OFF',
      finish_reason: 'error',
    };
  }
  return provider.complete(req);
}

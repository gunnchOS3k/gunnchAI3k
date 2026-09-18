import type { ModelProviderV2, CompletionRequestV2, CompletionResultV2 } from '../providers/model_provider_v2';
import { isTaskAllowed, loadLiveProviderPolicy, type TaskClass } from '../config/live_provider_policy';
import { isFeatureEnabled } from '../config/feature_flags';

export interface GatewayExecuteRequest {
  task_class: TaskClass;
  prompt: string;
  system?: string;
  max_tokens?: number;
}

export interface GatewayExecuteResult {
  ok: boolean;
  text: string;
  error?: string;
  provider_id?: string;
  model_id?: string;
  denied?: boolean;
}

/**
 * ProviderGateway — routes controlled tasks to LIVE micro provider.
 * llama.cpp schema stays behind ModelProviderV2 adapter.
 */
export class ProviderGateway {
  constructor(
    private readonly provider: ModelProviderV2 | null,
    private readonly modelId = 'smollm2-135m-instruct-q4_k_m',
    private readonly root?: string,
  ) {}

  capabilities(): Record<string, unknown> {
    const policy = loadLiveProviderPolicy(this.root);
    const entry = policy.providers[this.modelId];
    return {
      schema: 'gunnchai.nearby_edge.capabilities.v1',
      model_id: this.modelId,
      provider_id: entry?.provider_id ?? 'prov_llamacpp_live',
      promotion_state: entry?.promotion_state ?? 'CONTROLLED_INTEGRATION',
      production_default: false,
      allowed_task_classes: entry?.allowed_task_classes ?? [],
      disallowed_task_classes: entry?.disallowed_task_classes ?? [],
      live_provider_integration: isFeatureEnabled('GUNNCHAI_LIVE_PROVIDER_INTEGRATION'),
      nearby_edge: isFeatureEnabled('GUNNCHAI_NEARBY_EDGE'),
      on_device_local: false,
    };
  }

  async execute(req: GatewayExecuteRequest): Promise<GatewayExecuteResult> {
    if (!isFeatureEnabled('GUNNCHAI_LIVE_PROVIDER_INTEGRATION')) {
      return { ok: false, text: '', error: 'FLAG_OFF_LIVE_PROVIDER_INTEGRATION', denied: true };
    }
    if (!isFeatureEnabled('GUNNCHAI_NEARBY_EDGE')) {
      return { ok: false, text: '', error: 'FLAG_OFF_NEARBY_EDGE', denied: true };
    }
    const allowed = isTaskAllowed(this.modelId, req.task_class, this.root);
    if (!allowed.ok) {
      return { ok: false, text: '', error: allowed.reason, denied: true };
    }
    if (!this.provider) {
      return { ok: false, text: '', error: 'PROVIDER_UNAVAILABLE', denied: false };
    }
    const policy = loadLiveProviderPolicy(this.root);
    const entry = policy.providers[this.modelId];
    const maxTokens = Math.min(req.max_tokens ?? entry?.max_output_tokens ?? 64, entry?.max_output_tokens ?? 96);
    const creq: CompletionRequestV2 = {
      prompt: req.prompt,
      system: req.system ?? 'You are a concise micro-router for gunnchAI. Stay brief.',
      max_tokens: maxTokens,
      budget: { max_latency_ms: entry?.max_latency_ms ?? 60_000 },
    };
    const result: CompletionResultV2 = await this.provider.complete(creq);
    return {
      ok: result.ok,
      text: result.text,
      error: result.error,
      provider_id: result.provider_id,
      model_id: result.model_id,
    };
  }

  async health(): Promise<'healthy' | 'degraded' | 'down' | 'flag_off'> {
    if (!isFeatureEnabled('GUNNCHAI_NEARBY_EDGE')) return 'flag_off';
    if (!this.provider) return 'down';
    return this.provider.healthCheck();
  }
}

export function healthPayload(gateway: ProviderGateway, transport: string): Record<string, unknown> {
  return {
    schema: 'gunnchai.nearby_edge.healthz.v1',
    status: 'ok',
    transport,
    forbid_unauthenticated_lan: true,
    on_device_local: false,
    adb_reverse_is_not_on_device: true,
    production_default: false,
  };
}

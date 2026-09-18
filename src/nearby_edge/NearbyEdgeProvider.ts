import type {
  CompletionRequestV2,
  CompletionResultV2,
  ModelProviderV2,
  ModelProviderV2Meta,
} from '../providers/model_provider_v2';
import { isFeatureEnabled } from '../config/feature_flags';
import type { TransportMode } from './ProvenanceEnvelope';
import { buildProvenance } from './ProvenanceEnvelope';

export interface NearbyEdgeClientOptions {
  baseUrl: string;
  sessionToken: string;
  transport: TransportMode;
  meta?: Partial<ModelProviderV2Meta>;
}

/**
 * ModelProviderV2 client that talks to NearbyEdgeServer canonical API.
 * Used by ModelRouter when GUNNCHAI_NEARBY_EDGE is enabled.
 */
export class NearbyEdgeProvider implements ModelProviderV2 {
  readonly meta: ModelProviderV2Meta;
  private readonly baseUrl: string;
  private readonly sessionToken: string;
  private readonly transport: TransportMode;
  lastProvenance: ReturnType<typeof buildProvenance> | null = null;

  constructor(opts: NearbyEdgeClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, '');
    this.sessionToken = opts.sessionToken;
    this.transport = opts.transport;
    this.meta = {
      provider_id: 'prov_nearby_edge',
      model_id: 'nearby-edge-smollm2-135m',
      display_name: 'Nearby-Edge SmolLM2-135M (Mac)',
      family: 'local_gguf',
      location: 'local',
      tier_hint: 0,
      context_window_tokens: 512,
      max_output_tokens: 96,
      modalities: ['text'],
      supports_tools: false,
      supports_structured_output: false,
      supports_streaming: false,
      supports_computer_use: false,
      offline_capable: true,
      requires_cloud_consent: false,
      cost_per_1k_input_usd: 0,
      cost_per_1k_output_usd: 0,
      typical_latency_ms: 1500,
      energy_hint_j_per_1k: 0.4,
      health: 'unknown',
      privacy_class: 'device_local',
      hidden_cot_exposed: false,
      notes: 'Mac nearby-edge; ADB reverse ≠ on-device. CONTROLLED_INTEGRATION only.',
      ...opts.meta,
    };
  }

  async healthCheck(): Promise<ModelProviderV2Meta['health']> {
    if (!isFeatureEnabled('GUNNCHAI_NEARBY_EDGE')) return 'down';
    try {
      const res = await fetch(`${this.baseUrl}/v1/healthz`);
      if (!res.ok) return 'degraded';
      return 'healthy';
    } catch {
      return 'down';
    }
  }

  async complete(req: CompletionRequestV2): Promise<CompletionResultV2> {
    if (!isFeatureEnabled('GUNNCHAI_NEARBY_EDGE') || !isFeatureEnabled('GUNNCHAI_LIVE_PROVIDER_INTEGRATION')) {
      return {
        ok: false,
        text: '',
        provider_id: this.meta.provider_id,
        model_id: this.meta.model_id,
        error: 'FEATURE_FLAGS_OFF',
        finish_reason: 'error',
      };
    }
    try {
      const res = await fetch(`${this.baseUrl}/v1/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.sessionToken}`,
        },
        body: JSON.stringify({
          task_class: 'short_assist',
          prompt: req.prompt,
          system: req.system,
          max_tokens: req.max_tokens,
        }),
      });
      const body = (await res.json()) as CompletionResultV2 & {
        provenance?: ReturnType<typeof buildProvenance>;
        denied?: boolean;
        error?: string;
      };
      if (body.provenance) this.lastProvenance = body.provenance;
      return {
        ok: Boolean(body.ok),
        text: body.text ?? '',
        provider_id: this.meta.provider_id,
        model_id: this.meta.model_id,
        error: body.error,
        finish_reason: body.ok ? 'stop' : 'error',
      };
    } catch (err) {
      return {
        ok: false,
        text: '',
        provider_id: this.meta.provider_id,
        model_id: this.meta.model_id,
        error: err instanceof Error ? err.message : String(err),
        finish_reason: 'error',
      };
    }
  }
}

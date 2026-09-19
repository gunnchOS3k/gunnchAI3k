export type ProviderFamily =
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'deepseek'
  | 'mistral'
  | 'gemma'
  | 'qwen'
  | 'kimi'
  | 'glm'
  | 'llama'
  | 'local_gguf'
  | 'fixture';

export type ProviderLocation = 'local' | 'cloud' | 'hybrid';

export interface ModelProviderV2Meta {
  provider_id: string;
  model_id: string;
  display_name: string;
  family: ProviderFamily;
  location: ProviderLocation;
  tier_hint: 0 | 1 | 2 | 3 | 4;
  context_window_tokens: number;
  max_output_tokens: number;
  modalities: Array<'text' | 'image' | 'audio' | 'video' | 'screen' | 'documents'>;
  supports_tools: boolean;
  supports_structured_output: boolean;
  supports_streaming: boolean;
  supports_computer_use: boolean;
  offline_capable: boolean;
  requires_cloud_consent: boolean;
  cost_per_1k_input_usd: number;
  cost_per_1k_output_usd: number;
  typical_latency_ms: number;
  energy_hint_j_per_1k: number;
  health: 'unknown' | 'healthy' | 'degraded' | 'down';
  privacy_class: 'public' | 'personal' | 'sensitive' | 'device_local';
  hidden_cot_exposed: false;
  notes: string;
}

export interface CompletionRequestV2 {
  prompt: string;
  system?: string;
  max_tokens?: number;
  stream?: boolean;
  tools?: unknown[];
  structured_schema?: Record<string, unknown>;
  budget?: { max_latency_ms?: number; max_cost_usd?: number };
}

export interface CompletionResultV2 {
  ok: boolean;
  text: string;
  provider_id: string;
  model_id: string;
  usage?: { input_tokens: number; output_tokens: number };
  finish_reason?: string;
  error?: string;
}

/** Abstract provider — adapters for vendor APIs live above this layer. */
export interface ModelProviderV2 {
  readonly meta: ModelProviderV2Meta;
  complete(req: CompletionRequestV2): Promise<CompletionResultV2>;
  healthCheck(): Promise<ModelProviderV2Meta['health']>;
}

export class FixtureModelProvider implements ModelProviderV2 {
  constructor(public readonly meta: ModelProviderV2Meta) {}

  async complete(req: CompletionRequestV2): Promise<CompletionResultV2> {
    return {
      ok: true,
      text: `[fixture:${this.meta.model_id}] ${req.prompt.slice(0, 120)}`,
      provider_id: this.meta.provider_id,
      model_id: this.meta.model_id,
      usage: { input_tokens: Math.ceil(req.prompt.length / 4), output_tokens: 32 },
      finish_reason: 'stop',
    };
  }

  async healthCheck(): Promise<ModelProviderV2Meta['health']> {
    return this.meta.health;
  }
}

import {
  FixtureModelProvider,
  type ModelProviderV2,
  type ModelProviderV2Meta,
  type ProviderFamily,
} from './model_provider_v2';

function meta(
  partial: Omit<ModelProviderV2Meta, 'hidden_cot_exposed'> & { hidden_cot_exposed?: false },
): ModelProviderV2Meta {
  return { hidden_cot_exposed: false, ...partial };
}

/** Seed registry with replaceable fixtures — no hard single-provider dependency. */
export function createDefaultProviderFixtures(): ModelProviderV2[] {
  const families: Array<{ family: ProviderFamily; model: string; tier: 0 | 1 | 2 | 3 | 4; local: boolean }> = [
    { family: 'llama', model: 'llama-local-nano', tier: 0, local: true },
    { family: 'gemma', model: 'gemma-local-fast', tier: 1, local: true },
    { family: 'qwen', model: 'qwen-local-pro', tier: 2, local: true },
    { family: 'mistral', model: 'mistral-edge', tier: 1, local: true },
    { family: 'deepseek', model: 'deepseek-efficient', tier: 2, local: false },
    { family: 'openai', model: 'gpt-frontier-candidate', tier: 3, local: false },
    { family: 'anthropic', model: 'claude-frontier-candidate', tier: 3, local: false },
    { family: 'gemini', model: 'gemini-frontier-candidate', tier: 3, local: false },
    { family: 'kimi', model: 'kimi-long-context-candidate', tier: 3, local: false },
    { family: 'glm', model: 'glm-tools-candidate', tier: 2, local: false },
    { family: 'fixture', model: 'fixture-always', tier: 0, local: true },
  ];

  return families.map((f, i) =>
    new FixtureModelProvider(
      meta({
        provider_id: `prov_${f.family}`,
        model_id: f.model,
        display_name: f.model,
        family: f.family,
        location: f.local ? 'local' : 'cloud',
        tier_hint: f.tier,
        context_window_tokens: f.tier >= 3 ? 200000 : f.tier === 2 ? 128000 : 8192,
        max_output_tokens: 4096,
        modalities: f.family === 'gemini' ? ['text', 'image', 'audio', 'documents'] : ['text'],
        supports_tools: true,
        supports_structured_output: true,
        supports_streaming: true,
        supports_computer_use: f.family === 'anthropic' || f.family === 'openai',
        offline_capable: f.local,
        requires_cloud_consent: !f.local,
        cost_per_1k_input_usd: f.local ? 0 : 0.002 + i * 0.0001,
        cost_per_1k_output_usd: f.local ? 0 : 0.008 + i * 0.0001,
        typical_latency_ms: f.local ? 200 + f.tier * 200 : 800 + f.tier * 400,
        energy_hint_j_per_1k: f.local ? 0.5 : 0.05,
        health: 'healthy',
        privacy_class: f.local ? 'device_local' : 'personal',
        notes: 'Qualification candidate fixture — not a production pin.',
      }),
    ),
  );
}

export class ProviderRegistry {
  private readonly byId = new Map<string, ModelProviderV2>();

  constructor(providers: ModelProviderV2[] = createDefaultProviderFixtures()) {
    for (const p of providers) this.register(p);
  }

  register(provider: ModelProviderV2): void {
    this.byId.set(provider.meta.model_id, provider);
  }

  get(modelId: string): ModelProviderV2 | undefined {
    return this.byId.get(modelId);
  }

  list(): ModelProviderV2Meta[] {
    return [...this.byId.values()].map((p) => p.meta);
  }

  listProviders(): ModelProviderV2[] {
    return [...this.byId.values()];
  }

  snapshot(): ModelProviderV2Meta[] {
    return this.list();
  }
}

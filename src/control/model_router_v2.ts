import type { ModelProviderV2, ModelProviderV2Meta } from '../providers/model_provider_v2';
import { ProviderRegistry } from '../providers/provider_registry';
import type { ExecutionBudget } from './reasoning_policy';

export type RouterTier = 0 | 1 | 2 | 3 | 4;

export interface RouterObjectives {
  quality: number;
  latency: number;
  cost: number;
  energy: number;
  privacy: number;
  offline: number;
  tool_fit: number;
  verifier_fit: number;
}

export interface RouterV2Input {
  tier: RouterTier;
  budget: ExecutionBudget;
  offline: boolean;
  cloud_consent: boolean;
  needs_tools: boolean;
  needs_computer_use: boolean;
  needs_multimodal: boolean;
  privacy: ModelProviderV2Meta['privacy_class'];
  weights?: Partial<RouterObjectives>;
}

export interface ParetoCandidate {
  model_id: string;
  provider_id: string;
  scores: RouterObjectives;
  dominated: boolean;
  reason: string;
}

export interface RouterV2Result {
  ok: boolean;
  selected: ParetoCandidate | null;
  pareto_front: ParetoCandidate[];
  fallback_chain: string[];
  tier: RouterTier;
  reason: string;
}

const DEFAULT_WEIGHTS: RouterObjectives = {
  quality: 0.25,
  latency: 0.15,
  cost: 0.15,
  energy: 0.1,
  privacy: 0.15,
  offline: 0.1,
  tool_fit: 0.05,
  verifier_fit: 0.05,
};

function dominates(a: RouterObjectives, b: RouterObjectives, maximize: (keyof RouterObjectives)[]): boolean {
  let strictly = false;
  for (const k of maximize) {
    if (a[k] < b[k]) return false;
    if (a[k] > b[k]) strictly = true;
  }
  return strictly;
}

export class ModelRouterV2 {
  constructor(private readonly registry = new ProviderRegistry()) {}

  route(input: RouterV2Input): RouterV2Result {
    const weights = { ...DEFAULT_WEIGHTS, ...input.weights };
    const providers = this.registry.listProviders().filter((p) => this.eligible(p, input));
    const scored: ParetoCandidate[] = providers.map((p) => {
      const scores = this.score(p.meta, input);
      return {
        model_id: p.meta.model_id,
        provider_id: p.meta.provider_id,
        scores,
        dominated: false,
        reason: `tier_hint=${p.meta.tier_hint} loc=${p.meta.location}`,
      };
    });

    const dims = Object.keys(weights) as (keyof RouterObjectives)[];
    for (const a of scored) {
      a.dominated = scored.some((b) => b !== a && dominates(b.scores, a.scores, dims));
    }
    const front = scored.filter((c) => !c.dominated);
    const scalar = (c: ParetoCandidate) =>
      dims.reduce((s, k) => s + c.scores[k] * weights[k], 0);

    front.sort((a, b) => scalar(b) - scalar(a));
    const selected = front[0] ?? null;
    const fallback = [...front.slice(1), ...scored.filter((c) => c.dominated)]
      .sort((a, b) => scalar(b) - scalar(a))
      .map((c) => c.model_id);

    return {
      ok: Boolean(selected),
      selected,
      pareto_front: front,
      fallback_chain: selected ? [selected.model_id, ...fallback.filter((id) => id !== selected.model_id)] : fallback,
      tier: input.tier,
      reason: selected
        ? `Pareto selection among ${front.length} non-dominated of ${scored.length} eligible`
        : 'No eligible providers for constraints',
    };
  }

  private eligible(p: ModelProviderV2, input: RouterV2Input): boolean {
    const m = p.meta;
    if (m.health === 'down') return false;
    if (m.tier_hint > input.tier + 1) return false;
    if (input.offline && !m.offline_capable) return false;
    if (m.requires_cloud_consent && !input.cloud_consent) return false;
    if (!input.budget.allow_cloud && m.location === 'cloud') return false;
    if (input.needs_computer_use && !m.supports_computer_use) return false;
    if (input.needs_tools && !m.supports_tools) return false;
    if (input.needs_multimodal && !m.modalities.some((x) => x !== 'text')) return false;
    if (input.privacy === 'device_local' && m.location !== 'local') return false;
    return true;
  }

  private score(m: ModelProviderV2Meta, input: RouterV2Input): RouterObjectives {
    const quality = Math.min(1, (m.tier_hint + 1) / 5) * (m.health === 'healthy' ? 1 : 0.6);
    const latency = Math.max(0, 1 - m.typical_latency_ms / Math.max(input.budget.max_latency_ms, 1));
    const cost = Math.max(0, 1 - (m.cost_per_1k_input_usd + m.cost_per_1k_output_usd) * 50);
    const energy = Math.max(0, 1 - m.energy_hint_j_per_1k / 2);
    const privacy = m.location === 'local' || m.privacy_class === 'device_local' ? 1 : input.privacy === 'sensitive' ? 0.2 : 0.6;
    const offline = m.offline_capable ? 1 : 0;
    const tool_fit = m.supports_tools ? 1 : 0;
    const verifier_fit = m.supports_structured_output ? 1 : 0.5;
    return { quality, latency, cost, energy, privacy, offline, tool_fit, verifier_fit };
  }
}

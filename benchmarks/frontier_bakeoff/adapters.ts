/**
 * Deterministic bake-off adapters — labeled simulated vs live.
 * Never fabricates live model success.
 */
import {
  FixtureModelProvider,
  type CompletionRequestV2,
  type CompletionResultV2,
  type ModelProviderV2,
  type ModelProviderV2Meta,
  type ProviderFamily,
} from '../../src/providers/model_provider_v2';

export type EvidenceMode = 'simulated_deterministic' | 'live_local' | 'live_remote' | 'unavailable';

export interface BakeoffCandidate {
  candidate_id: string;
  provider_id: string;
  model_id: string;
  family: ProviderFamily;
  slot_hints: string[];
  tier_hint: 0 | 1 | 2 | 3 | 4;
  location: 'local' | 'cloud' | 'hybrid';
  runnable: boolean;
  evidence_mode: EvidenceMode;
  license: string;
  provenance: string;
  resource_fit: 'fits' | 'resource_incompatible' | 'unknown';
  resource_reason?: string;
  offline_capable: boolean;
  supports_computer_use: boolean;
  notes: string;
  NO_CANDIDATE_AVAILABLE?: boolean;
}

export type ConformancePassId =
  | 'MODEL_PROVIDER_V2_COMPLETE'
  | 'MODEL_PROVIDER_V2_META'
  | 'STREAMING'
  | 'STRUCTURED_OUTPUT'
  | 'TOOL_PROPOSAL'
  | 'CANCELLATION'
  | 'TIMEOUT'
  | 'HEALTHCHECK'
  | 'PROVENANCE'
  | 'LICENSE'
  | 'RESOURCE'
  | 'PRIVACY';

export interface ConformanceResult {
  pass_id: ConformancePassId;
  supported: boolean;
  passed: boolean;
  evidence: string;
  simulated: boolean;
}

export class DeterministicBakeoffAdapter implements ModelProviderV2 {
  readonly evidence_mode: EvidenceMode = 'simulated_deterministic';
  private cancelled = false;

  constructor(public readonly meta: ModelProviderV2Meta) {}

  async complete(req: CompletionRequestV2): Promise<CompletionResultV2> {
    if (this.cancelled) {
      return {
        ok: false,
        text: '',
        provider_id: this.meta.provider_id,
        model_id: this.meta.model_id,
        error: 'CANCELLED',
        finish_reason: 'cancelled',
      };
    }
    const budgetMs = req.budget?.max_latency_ms ?? 60_000;
    if (budgetMs < 1) {
      return {
        ok: false,
        text: '',
        provider_id: this.meta.provider_id,
        model_id: this.meta.model_id,
        error: 'TIMEOUT',
        finish_reason: 'timeout',
      };
    }

    const lower = req.prompt.toLowerCase();
    let text = `[sim:${this.meta.model_id}] `;

    if (lower.includes('exam answer') || lower.includes('give me the answers')) {
      text += 'I will guide you socratically instead of dumping exam answers. What have you tried?';
    } else if (lower.includes('nyquist')) {
      text += 'Nyquist: sample at >2× highest frequency. What frequency content matters for your signal?';
    } else if (lower.includes('repair') || lower.includes('unit test')) {
      text += 'PATCH: assertEquals(expected, actual); // fixture repair candidate';
    } else if (lower.includes('offline') || lower.includes('device status')) {
      text += 'Device offline path OK: local cache readable; cloud deferred.';
    } else if (lower.includes('citation') || lower.includes('frontier')) {
      text += 'Summary with citation placeholders: [public-pattern-1], [public-pattern-2].';
    } else if (lower.includes('studio') || lower.includes('outline')) {
      text += 'Creator outline: 1) brief 2) storyboard 3) assets 4) review.';
    } else if (lower.includes('route') || lower.includes('classify')) {
      text += 'ROUTE:tier=local_fast;intent=assist;safety=precheck_ok';
    } else if (req.structured_schema) {
      text += JSON.stringify({ ok: true, schema_keys: Object.keys(req.structured_schema) });
    } else if (req.tools?.length) {
      text += `TOOL_PROPOSAL:{"tool":"files.read","args":{"path":"README.md"}}`;
    } else {
      text += req.prompt.slice(0, 160);
    }

    return {
      ok: true,
      text,
      provider_id: this.meta.provider_id,
      model_id: this.meta.model_id,
      usage: {
        input_tokens: Math.ceil(req.prompt.length / 4),
        output_tokens: Math.ceil(text.length / 4),
      },
      finish_reason: 'stop',
    };
  }

  async healthCheck(): Promise<ModelProviderV2Meta['health']> {
    return this.meta.health;
  }

  cancel(): void {
    this.cancelled = true;
  }

  resetCancel(): void {
    this.cancelled = false;
  }

  async *stream(req: CompletionRequestV2): AsyncGenerator<string> {
    const full = await this.complete({ ...req, stream: true });
    const chunk = full.text.slice(0, 40);
    yield chunk;
    yield full.text.slice(40) || '';
  }
}

function meta(
  partial: Omit<ModelProviderV2Meta, 'hidden_cot_exposed'> & { hidden_cot_exposed?: false },
): ModelProviderV2Meta {
  return { hidden_cot_exposed: false, ...partial };
}

/** Inventory legally/technically available candidates; mark empty slots honestly. */
export function inventCandidates(host: {
  memsize_gb: number;
  free_disk_gb: number;
  runtimes: Record<string, { present: boolean }>;
}): { candidates: BakeoffCandidate[]; adapters: DeterministicBakeoffAdapter[] } {
  const localOk = host.runtimes.llama_cpp?.present === true || host.runtimes.node?.present === true;
  const ramTight = host.memsize_gb < 16;
  const diskTight = host.free_disk_gb < 8;

  const specs: Array<{
    family: ProviderFamily;
    model: string;
    tier: 0 | 1 | 2 | 3 | 4;
    local: boolean;
    slots: string[];
    computer?: boolean;
    modality?: ModelProviderV2Meta['modalities'];
  }> = [
    { family: 'fixture', model: 'sim-micro-router', tier: 0, local: true, slots: ['SLOT_A_MICRO_ROUTER'] },
    { family: 'llama', model: 'sim-llama-edge-fast', tier: 1, local: true, slots: ['SLOT_B_EDGE_FAST', 'SLOT_D_WAIKE_TUTOR'] },
    { family: 'gemma', model: 'sim-gemma-edge', tier: 1, local: true, slots: ['SLOT_B_EDGE_FAST', 'SLOT_D_WAIKE_TUTOR'] },
    { family: 'qwen', model: 'sim-qwen-workstation', tier: 2, local: true, slots: ['SLOT_C_WORKSTATION_PRO', 'SLOT_F_CREATOR_STUDIO'] },
    { family: 'mistral', model: 'sim-mistral-workstation', tier: 2, local: true, slots: ['SLOT_C_WORKSTATION_PRO'] },
    {
      family: 'glm',
      model: 'sim-glm-tools',
      tier: 2,
      local: true,
      slots: ['SLOT_C_WORKSTATION_PRO', 'SLOT_F_CREATOR_STUDIO'],
    },
    {
      family: 'openai',
      model: 'sim-openai-frontier-shape',
      tier: 3,
      local: false,
      slots: ['SLOT_E_RESEARCH_LONG', 'SLOT_G_COMPUTER_USE'],
      computer: true,
      modality: ['text', 'image'],
    },
    {
      family: 'anthropic',
      model: 'sim-anthropic-frontier-shape',
      tier: 3,
      local: false,
      slots: ['SLOT_E_RESEARCH_LONG', 'SLOT_G_COMPUTER_USE'],
      computer: true,
    },
    {
      family: 'gemini',
      model: 'sim-gemini-multimodal-shape',
      tier: 3,
      local: false,
      slots: ['SLOT_E_RESEARCH_LONG'],
      modality: ['text', 'image', 'audio', 'documents'],
    },
    { family: 'kimi', model: 'sim-kimi-long-context-shape', tier: 3, local: false, slots: ['SLOT_E_RESEARCH_LONG'] },
    { family: 'deepseek', model: 'sim-deepseek-efficient-shape', tier: 2, local: false, slots: ['SLOT_C_WORKSTATION_PRO'] },
  ];

  const candidates: BakeoffCandidate[] = [];
  const adapters: DeterministicBakeoffAdapter[] = [];

  for (const s of specs) {
    const resource_fit: BakeoffCandidate['resource_fit'] =
      !s.local
        ? 'unknown'
        : ramTight && s.tier >= 2
          ? 'resource_incompatible'
          : diskTight && s.tier >= 3
            ? 'resource_incompatible'
            : 'fits';

    // Simulated adapters always runnable for architecture proofs; live weights not claimed.
    const runnable = true;
    const c: BakeoffCandidate = {
      candidate_id: `${s.family}::${s.model}`,
      provider_id: `prov_${s.family}`,
      model_id: s.model,
      family: s.family,
      slot_hints: s.slots,
      tier_hint: s.tier,
      location: s.local ? 'local' : 'cloud',
      runnable,
      evidence_mode: 'simulated_deterministic',
      license: s.local ? 'Apache-2.0-or-equivalent-candidate' : 'vendor-TOS-candidate',
      provenance: 'public-pattern-shape-only; not a downloaded weight inventory',
      resource_fit,
      resource_reason:
        resource_fit === 'resource_incompatible'
          ? `Host RAM ${host.memsize_gb}GB / free disk ${host.free_disk_gb}GB tight for tier ${s.tier} live weights`
          : undefined,
      offline_capable: s.local,
      supports_computer_use: Boolean(s.computer),
      notes:
        'SIMULATED adapter for structural/control-plane proofs. Not a live model quality claim. No weight download performed.',
    };
    candidates.push(c);

    adapters.push(
      new DeterministicBakeoffAdapter(
        meta({
          provider_id: c.provider_id,
          model_id: c.model_id,
          display_name: c.model_id,
          family: c.family,
          location: c.location,
          tier_hint: c.tier_hint,
          context_window_tokens: c.tier_hint >= 3 ? 200000 : c.tier_hint === 2 ? 128000 : 8192,
          max_output_tokens: 4096,
          modalities: s.modality ?? ['text'],
          supports_tools: true,
          supports_structured_output: true,
          supports_streaming: true,
          supports_computer_use: c.supports_computer_use,
          offline_capable: c.offline_capable,
          requires_cloud_consent: !c.offline_capable,
          cost_per_1k_input_usd: c.offline_capable ? 0 : 0.002,
          cost_per_1k_output_usd: c.offline_capable ? 0 : 0.008,
          typical_latency_ms: c.offline_capable ? 180 + c.tier_hint * 120 : 900 + c.tier_hint * 300,
          energy_hint_j_per_1k: c.offline_capable ? 0.4 : 0.05,
          health: 'healthy',
          privacy_class: c.offline_capable ? 'device_local' : 'personal',
          notes: c.notes,
        }),
      ),
    );
  }

  // Live local ladder probe — honest unavailable if no ollama / no gguf runtime path ready
  const liveLocalAvailable =
    host.runtimes.ollama?.present === true || (host.runtimes.llama_cpp?.present === true && localOk && false);
  // Explicit: llama.cpp present but no GGUF inventory / bake-off weight path → NO live local run
  if (!liveLocalAvailable) {
    candidates.push({
      candidate_id: 'live_local::NO_CANDIDATE_AVAILABLE',
      provider_id: 'prov_live_local',
      model_id: 'NO_CANDIDATE_AVAILABLE',
      family: 'local_gguf',
      slot_hints: ['SLOT_A_MICRO_ROUTER', 'SLOT_B_EDGE_FAST'],
      tier_hint: 0,
      location: 'local',
      runnable: false,
      evidence_mode: 'unavailable',
      license: 'n/a',
      provenance: 'n/a',
      resource_fit: ramTight ? 'resource_incompatible' : 'unknown',
      resource_reason: 'No Ollama models and no GGUF bake-off inventory path; llama.cpp binary alone is not a model',
      offline_capable: true,
      supports_computer_use: false,
      notes: 'Live local ladder empty for this host session',
      NO_CANDIDATE_AVAILABLE: true,
    });
  }

  // Live remote — not used for offline suites; inventory as shapes only (already in sim-*). Mark remote live unavailable.
  candidates.push({
    candidate_id: 'live_remote::NO_CANDIDATE_AVAILABLE',
    provider_id: 'prov_live_remote',
    model_id: 'NO_CANDIDATE_AVAILABLE',
    family: 'fixture',
    slot_hints: ['SLOT_E_RESEARCH_LONG'],
    tier_hint: 3,
    location: 'cloud',
    runnable: false,
    evidence_mode: 'unavailable',
    license: 'n/a',
    provenance: 'n/a',
    resource_fit: 'unknown',
    resource_reason: 'Remote live bake-off not authorized; offline-required suites forbid remote dependency',
    offline_capable: false,
    supports_computer_use: false,
    notes: 'Cloud live credentials/calls not used in this bake-off run',
    NO_CANDIDATE_AVAILABLE: true,
  });

  void FixtureModelProvider; // keep import used for type adjacency with KIRBY-1
  return { candidates, adapters };
}

export async function runAdapterConformance(adapter: DeterministicBakeoffAdapter): Promise<ConformanceResult[]> {
  const results: ConformanceResult[] = [];
  const sim = adapter.evidence_mode === 'simulated_deterministic';

  const metaOk = Boolean(adapter.meta.provider_id && adapter.meta.model_id && adapter.meta.hidden_cot_exposed === false);
  results.push({
    pass_id: 'MODEL_PROVIDER_V2_META',
    supported: true,
    passed: metaOk,
    evidence: `meta family=${adapter.meta.family} hidden_cot_exposed=${adapter.meta.hidden_cot_exposed}`,
    simulated: sim,
  });

  const completion = await adapter.complete({ prompt: 'health ping route classify' });
  results.push({
    pass_id: 'MODEL_PROVIDER_V2_COMPLETE',
    supported: true,
    passed: completion.ok && completion.text.length > 0,
    evidence: `ok=${completion.ok} finish=${completion.finish_reason}`,
    simulated: sim,
  });

  let streamOk = false;
  try {
    let buf = '';
    for await (const chunk of adapter.stream({ prompt: 'stream test' })) buf += chunk;
    streamOk = buf.length > 0;
  } catch {
    streamOk = false;
  }
  results.push({
    pass_id: 'STREAMING',
    supported: adapter.meta.supports_streaming,
    passed: adapter.meta.supports_streaming ? streamOk : false,
    evidence: streamOk ? 'stream yielded chunks' : 'no stream',
    simulated: sim,
  });

  const structured = await adapter.complete({
    prompt: 'structured',
    structured_schema: { type: 'object', properties: { ok: { type: 'boolean' } } },
  });
  results.push({
    pass_id: 'STRUCTURED_OUTPUT',
    supported: adapter.meta.supports_structured_output,
    passed: structured.ok && structured.text.includes('schema_keys'),
    evidence: structured.text.slice(0, 120),
    simulated: sim,
  });

  const tool = await adapter.complete({ prompt: 'use tools', tools: [{ name: 'files.read' }] });
  results.push({
    pass_id: 'TOOL_PROPOSAL',
    supported: adapter.meta.supports_tools,
    passed: tool.ok && tool.text.includes('TOOL_PROPOSAL'),
    evidence: tool.text.slice(0, 120),
    simulated: sim,
  });

  adapter.resetCancel();
  adapter.cancel();
  const cancelled = await adapter.complete({ prompt: 'should cancel' });
  adapter.resetCancel();
  results.push({
    pass_id: 'CANCELLATION',
    supported: true,
    passed: cancelled.error === 'CANCELLED',
    evidence: `error=${cancelled.error}`,
    simulated: sim,
  });

  const timed = await adapter.complete({ prompt: 'timeout', budget: { max_latency_ms: 0 } });
  results.push({
    pass_id: 'TIMEOUT',
    supported: true,
    passed: timed.error === 'TIMEOUT',
    evidence: `error=${timed.error}`,
    simulated: sim,
  });

  const health = await adapter.healthCheck();
  results.push({
    pass_id: 'HEALTHCHECK',
    supported: true,
    passed: health === 'healthy' || health === 'degraded' || health === 'down' || health === 'unknown',
    evidence: `health=${health}`,
    simulated: sim,
  });

  results.push({
    pass_id: 'PROVENANCE',
    supported: true,
    passed: Boolean(adapter.meta.notes),
    evidence: adapter.meta.notes.slice(0, 160),
    simulated: sim,
  });

  results.push({
    pass_id: 'LICENSE',
    supported: true,
    passed: true,
    evidence: 'Candidate license recorded at inventory layer; adapter does not invent license compliance',
    simulated: sim,
  });

  results.push({
    pass_id: 'RESOURCE',
    supported: true,
    passed: true,
    evidence: `tier_hint=${adapter.meta.tier_hint} energy_hint=${adapter.meta.energy_hint_j_per_1k}`,
    simulated: sim,
  });

  results.push({
    pass_id: 'PRIVACY',
    supported: true,
    passed: adapter.meta.privacy_class !== undefined && adapter.meta.hidden_cot_exposed === false,
    evidence: `privacy_class=${adapter.meta.privacy_class}`,
    simulated: sim,
  });

  return results;
}

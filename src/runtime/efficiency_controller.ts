export interface EfficiencyIdeas {
  speculative_decoding_hints: boolean;
  cache_prompt_prefixes: boolean;
  modality_shedding: boolean;
  tier_downshift_on_thermal: boolean;
  early_exit_on_verifier_pass: boolean;
}

export interface EfficiencySample {
  task_id: string;
  success: boolean;
  latency_ms: number;
  cost_usd: number;
  energy_j: number;
}

export interface EfficiencyMetrics {
  tasks: number;
  successes: number;
  /** Primary metric: cost/energy/latency per successful task */
  cost_per_success_usd: number;
  energy_per_success_j: number;
  latency_per_success_ms: number;
  ideas_enabled: EfficiencyIdeas;
}

export class EfficiencyController {
  private readonly samples: EfficiencySample[] = [];

  constructor(
    private readonly ideas: EfficiencyIdeas = {
      speculative_decoding_hints: true,
      cache_prompt_prefixes: true,
      modality_shedding: true,
      tier_downshift_on_thermal: true,
      early_exit_on_verifier_pass: true,
    },
  ) {}

  record(sample: EfficiencySample): void {
    this.samples.push(sample);
  }

  metrics(): EfficiencyMetrics {
    const successes = this.samples.filter((s) => s.success);
    const n = Math.max(successes.length, 1);
    const sum = (k: keyof Pick<EfficiencySample, 'latency_ms' | 'cost_usd' | 'energy_j'>) =>
      successes.reduce((a, s) => a + s[k], 0);
    return {
      tasks: this.samples.length,
      successes: successes.length,
      cost_per_success_usd: sum('cost_usd') / n,
      energy_per_success_j: sum('energy_j') / n,
      latency_per_success_ms: sum('latency_ms') / n,
      ideas_enabled: this.ideas,
    };
  }
}

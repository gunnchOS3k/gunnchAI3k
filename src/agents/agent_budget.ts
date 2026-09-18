export interface AgentBudget {
  max_steps: number;
  max_tool_calls: number;
  max_tokens: number;
  max_wall_clock_ms: number;
  max_cost_usd: number;
  max_energy_j: number;
  max_parallel_agents: number;
  allow_background: boolean;
  require_owner_stop_control: true;
}

export interface AgentBudgetUsage {
  steps: number;
  tool_calls: number;
  tokens: number;
  wall_clock_ms: number;
  cost_usd: number;
  energy_j: number;
}

export const DEFAULT_AGENT_BUDGET: AgentBudget = {
  max_steps: 25,
  max_tool_calls: 20,
  max_tokens: 50000,
  max_wall_clock_ms: 120000,
  max_cost_usd: 0.5,
  max_energy_j: 50,
  max_parallel_agents: 4,
  allow_background: false,
  require_owner_stop_control: true,
};

export class AgentBudgetTracker {
  readonly usage: AgentBudgetUsage = {
    steps: 0,
    tool_calls: 0,
    tokens: 0,
    wall_clock_ms: 0,
    cost_usd: 0,
    energy_j: 0,
  };

  constructor(private readonly budget: AgentBudget = DEFAULT_AGENT_BUDGET) {}

  getBudget(): AgentBudget {
    return this.budget;
  }

  remaining(): Partial<AgentBudgetUsage> {
    return {
      steps: this.budget.max_steps - this.usage.steps,
      tool_calls: this.budget.max_tool_calls - this.usage.tool_calls,
      tokens: this.budget.max_tokens - this.usage.tokens,
      wall_clock_ms: this.budget.max_wall_clock_ms - this.usage.wall_clock_ms,
      cost_usd: this.budget.max_cost_usd - this.usage.cost_usd,
      energy_j: this.budget.max_energy_j - this.usage.energy_j,
    };
  }

  canContinue(): { ok: boolean; reason?: string } {
    // Allow exactly max_* units; reject only once usage exceeds the budget.
    if (this.usage.steps > this.budget.max_steps) return { ok: false, reason: 'MAX_STEPS' };
    if (this.usage.tool_calls > this.budget.max_tool_calls) return { ok: false, reason: 'MAX_TOOL_CALLS' };
    if (this.usage.tokens > this.budget.max_tokens) return { ok: false, reason: 'MAX_TOKENS' };
    if (this.usage.wall_clock_ms > this.budget.max_wall_clock_ms) return { ok: false, reason: 'MAX_WALL_CLOCK' };
    if (this.usage.cost_usd > this.budget.max_cost_usd) return { ok: false, reason: 'MAX_COST' };
    if (this.usage.energy_j > this.budget.max_energy_j) return { ok: false, reason: 'MAX_ENERGY' };
    return { ok: true };
  }

  record(partial: Partial<AgentBudgetUsage>): { ok: boolean; reason?: string } {
    for (const k of Object.keys(partial) as (keyof AgentBudgetUsage)[]) {
      this.usage[k] += partial[k] ?? 0;
    }
    return this.canContinue();
  }
}

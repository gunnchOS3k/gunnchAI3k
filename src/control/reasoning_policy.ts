export type ReasoningMode = 'instant' | 'low' | 'medium' | 'high' | 'research';

export interface ReasoningPolicyInput {
  task_kind: string;
  user_urgency: 'low' | 'normal' | 'high';
  offline: boolean;
  privacy: 'public' | 'personal' | 'sensitive' | 'device_local';
  device: { battery_percent: number; thermal: 'nominal' | 'fair' | 'serious' | 'critical'; ram_mb: number };
  cost_sensitive: boolean;
  verification_required: boolean;
  long_horizon: boolean;
  cloud_consent: boolean;
}

export interface ExecutionBudget {
  mode: ReasoningMode;
  max_steps: number;
  max_tool_calls: number;
  max_tokens: number;
  max_latency_ms: number;
  max_cost_usd: number;
  allow_cloud: boolean;
  require_verifier: boolean;
  persist_hidden_cot: false;
}

export interface TaskStateV2 {
  task_id: string;
  objective: string;
  plan_summary: string;
  completed_steps: string[];
  unresolved_questions: string[];
  tool_outputs: Array<{ tool: string; summary: string; trust: 'untrusted' | 'broker_verified' }>;
  citations: string[];
  verifier_outcomes: Array<{ verifier: string; passed: boolean; detail: string }>;
  user_visible_rationale: string;
  updated_at: string;
  /** Explicitly never store raw hidden chain-of-thought */
  hidden_cot: null;
}

const MODE_BUDGETS: Record<ReasoningMode, Omit<ExecutionBudget, 'mode' | 'allow_cloud' | 'persist_hidden_cot'>> = {
  instant: { max_steps: 1, max_tool_calls: 0, max_tokens: 512, max_latency_ms: 400, max_cost_usd: 0, require_verifier: false },
  low: { max_steps: 3, max_tool_calls: 2, max_tokens: 2048, max_latency_ms: 2000, max_cost_usd: 0.01, require_verifier: false },
  medium: { max_steps: 8, max_tool_calls: 6, max_tokens: 8192, max_latency_ms: 8000, max_cost_usd: 0.05, require_verifier: false },
  high: { max_steps: 20, max_tool_calls: 15, max_tokens: 32000, max_latency_ms: 30000, max_cost_usd: 0.25, require_verifier: true },
  research: { max_steps: 50, max_tool_calls: 40, max_tokens: 100000, max_latency_ms: 180000, max_cost_usd: 1.5, require_verifier: true },
};

export class ReasoningPolicyV2 {
  select(input: ReasoningPolicyInput): ExecutionBudget {
    let mode: ReasoningMode = 'medium';
    if (input.user_urgency === 'high' && !input.long_horizon) mode = 'low';
    if (input.task_kind === 'classify' || input.task_kind === 'route') mode = 'instant';
    if (input.long_horizon || input.task_kind === 'research') mode = 'research';
    if (input.verification_required && mode === 'instant') mode = 'low';
    if (input.device.thermal === 'critical' || input.device.battery_percent < 15) {
      mode = mode === 'research' ? 'medium' : mode === 'high' ? 'low' : 'instant';
    }
    if (input.cost_sensitive && (mode === 'research' || mode === 'high')) mode = 'medium';
    if (input.offline) {
      // select budget, not provider — cloud blocked separately
    }
    const base = MODE_BUDGETS[mode];
    return {
      mode,
      ...base,
      allow_cloud: !input.offline && input.cloud_consent && input.privacy !== 'device_local',
      persist_hidden_cot: false,
      require_verifier: base.require_verifier || input.verification_required,
    };
  }

  createTaskState(taskId: string, objective: string): TaskStateV2 {
    return {
      task_id: taskId,
      objective,
      plan_summary: '',
      completed_steps: [],
      unresolved_questions: [],
      tool_outputs: [],
      citations: [],
      verifier_outcomes: [],
      user_visible_rationale: '',
      updated_at: new Date().toISOString(),
      hidden_cot: null,
    };
  }

  updateContinuity(state: TaskStateV2, patch: Partial<Omit<TaskStateV2, 'task_id' | 'hidden_cot'>>): TaskStateV2 {
    return {
      ...state,
      ...patch,
      hidden_cot: null,
      updated_at: new Date().toISOString(),
    };
  }
}

import { AgentBudgetTracker, DEFAULT_AGENT_BUDGET, type AgentBudget } from './agent_budget';
import { ReasoningPolicyV2, type TaskStateV2 } from '../control/reasoning_policy';
import { ToolInvocationV2 } from '../tools/tool_invocation_v2';

export type SpecialistKind =
  | 'research'
  | 'coding'
  | 'waike_learning'
  | 'device_support'
  | 'creator'
  | 'network_research_engineering'
  | 'verifier';

export interface SpecialistSpec {
  kind: SpecialistKind;
  description: string;
  default_tools: string[];
  requires_verifier: boolean;
}

export const SPECIALISTS: Record<SpecialistKind, SpecialistSpec> = {
  research: {
    kind: 'research',
    description: 'Long-horizon research with citations',
    default_tools: ['retrieval', 'docs'],
    requires_verifier: true,
  },
  coding: {
    kind: 'coding',
    description: 'Code generation and repair',
    default_tools: ['repo', 'terminal', 'tests', 'compiler'],
    requires_verifier: true,
  },
  waike_learning: {
    kind: 'waike_learning',
    description: 'WAIKE tutoring and mastery',
    default_tools: ['curriculum', 'assessment'],
    requires_verifier: true,
  },
  device_support: {
    kind: 'device_support',
    description: 'Device OS diagnostics and support',
    default_tools: ['device_status'],
    requires_verifier: true,
  },
  creator: {
    kind: 'creator',
    description: 'Creator studio workflows',
    default_tools: ['studio'],
    requires_verifier: false,
  },
  network_research_engineering: {
    kind: 'network_research_engineering',
    description: 'Networking / research engineering',
    default_tools: ['simulation', 'digital_twin', 'research_corpus'],
    requires_verifier: true,
  },
  verifier: {
    kind: 'verifier',
    description: 'Critic / verifier specialist',
    default_tools: ['verify'],
    requires_verifier: false,
  },
};

export interface AgentRuntimeV2Options {
  budget?: AgentBudget;
  consents?: Set<string>;
  owner_stop_control?: boolean;
}

export class AgentRuntimeV2 {
  readonly budget: AgentBudgetTracker;
  readonly tools = new ToolInvocationV2();
  readonly policy = new ReasoningPolicyV2();
  private stopped = false;
  readonly owner_stop_control: boolean;

  constructor(private readonly opts: AgentRuntimeV2Options = {}) {
    this.budget = new AgentBudgetTracker(opts.budget ?? DEFAULT_AGENT_BUDGET);
    this.owner_stop_control = opts.owner_stop_control ?? true;
  }

  specialist(kind: SpecialistKind): SpecialistSpec {
    return SPECIALISTS[kind];
  }

  stop(owner = true): void {
    if (this.owner_stop_control && !owner) {
      throw new Error('OWNER_STOP_REQUIRED');
    }
    this.stopped = true;
  }

  isStopped(): boolean {
    return this.stopped;
  }

  runStep(
    state: TaskStateV2,
    kind: SpecialistKind,
    stepSummary: string,
  ): { state: TaskStateV2; ok: boolean; reason: string } {
    if (this.stopped) return { state, ok: false, reason: 'STOPPED' };
    const gate = this.budget.record({ steps: 1 });
    if (!gate.ok) return { state, ok: false, reason: gate.reason ?? 'BUDGET' };
    const spec = this.specialist(kind);
    const next = this.policy.updateContinuity(state, {
      completed_steps: [...state.completed_steps, stepSummary],
      plan_summary: state.plan_summary || `Specialize:${kind}`,
      user_visible_rationale: `Executed ${kind} step under budget`,
    });
    if (spec.requires_verifier) {
      next.unresolved_questions = [...next.unresolved_questions.filter((q) => q !== 'await_verifier'), 'await_verifier'];
    }
    return { state: next, ok: true, reason: 'OK' };
  }
}

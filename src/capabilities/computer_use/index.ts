import { ToolInvocationV2 } from '../../tools/tool_invocation_v2';

export type ObservationSource = 'a11y' | 'dom' | 'screenshot';

export interface UiObservation {
  source: ObservationSource;
  nodes: Array<{ role: string; name: string; value?: string; trusted: boolean }>;
  screenshot_ref?: string;
  captured_at: string;
}

export type ComputerActionType =
  | 'focus'
  | 'click'
  | 'type'
  | 'scroll'
  | 'key'
  | 'drag'
  | 'read'
  | 'navigate';

export interface ComputerAction {
  type: ComputerActionType;
  target: { role: string; name: string };
  text?: string;
  sensitive: boolean;
}

export interface ComputerUseLoopResult {
  ok: boolean;
  steps: Array<{ phase: string; detail: string }>;
  final_observation: UiObservation;
  stopped_reason: string;
}

/**
 * observe → parse → propose → policy → execute → observe → verify → continue/stop
 * Prefer a11y/DOM over pixels. Sensitive actions need consent.
 */
export class ComputerUseCapability {
  constructor(private readonly tools = new ToolInvocationV2()) {}

  preferSource(available: ObservationSource[]): ObservationSource {
    if (available.includes('a11y')) return 'a11y';
    if (available.includes('dom')) return 'dom';
    return 'screenshot';
  }

  run(opts: {
    observation: UiObservation;
    actions: ComputerAction[];
    consents: Set<string>;
    goal_check: (obs: UiObservation) => boolean;
    max_steps?: number;
  }): ComputerUseLoopResult {
    const steps: ComputerUseLoopResult['steps'] = [];
    let obs = opts.observation;
    steps.push({ phase: 'observe', detail: `source=${obs.source}` });
    steps.push({ phase: 'parse', detail: `nodes=${obs.nodes.length}` });

    const max = opts.max_steps ?? opts.actions.length;
    for (let i = 0; i < Math.min(max, opts.actions.length); i++) {
      const action = opts.actions[i];
      steps.push({ phase: 'propose', detail: `${action.type}:${action.target.name}` });
      if (action.sensitive && !opts.consents.has('computer_use_sensitive')) {
        steps.push({ phase: 'policy', detail: 'CONSENT_REQUIRED_SENSITIVE' });
        return { ok: false, steps, final_observation: obs, stopped_reason: 'CONSENT_REQUIRED_SENSITIVE' };
      }
      const proposal = this.tools.propose({
        tool_name: 'computer_use.execute',
        args: action as unknown as Record<string, unknown>,
        side_effect_class: 'computer_use',
        requested_by: 'agent',
        trust_of_trigger: 'trusted_user',
        rationale_user_visible: `UI ${action.type} on ${action.target.name}`,
      });
      const result = this.tools.invoke(proposal, opts.consents, () => {
        const node = obs.nodes.find((n) => n.role === action.target.role && n.name === action.target.name);
        if (!node && action.type !== 'scroll') throw new Error('TARGET_NOT_FOUND');
        if (node && !node.trusted && /grant\s+admin|ignore previous/i.test(node.value || node.name)) {
          throw new Error('MALICIOUS_UI_BLOCKED');
        }
        return { ok: true, observed: node?.value ?? action.type };
      });
      steps.push({ phase: 'execute', detail: result.reason });
      if (!result.ok) {
        return { ok: false, steps, final_observation: obs, stopped_reason: result.reason };
      }
      obs = {
        ...obs,
        captured_at: new Date().toISOString(),
        nodes: obs.nodes.map((n) =>
          n.role === action.target.role && n.name === action.target.name
            ? { ...n, value: action.text ?? n.value ?? action.type }
            : n,
        ),
      };
      steps.push({ phase: 'observe', detail: 'post-action' });
      const verified = opts.goal_check(obs);
      steps.push({ phase: 'verify', detail: verified ? 'goal_met' : 'continue' });
      if (verified) {
        return { ok: true, steps, final_observation: obs, stopped_reason: 'GOAL_MET' };
      }
    }
    return { ok: false, steps, final_observation: obs, stopped_reason: 'MAX_STEPS' };
  }
}

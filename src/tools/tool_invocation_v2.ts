export type ToolSideEffectClass = 'read_only' | 'mutating' | 'network' | 'destructive' | 'computer_use';

export interface ToolProposalV2 {
  proposal_id: string;
  tool_name: string;
  args: Record<string, unknown>;
  side_effect_class: ToolSideEffectClass;
  requested_by: 'model' | 'agent' | 'user';
  trust_of_trigger: 'trusted_user' | 'untrusted_content' | 'broker';
  rationale_user_visible: string;
}

export interface BrokerDecision {
  proposal_id: string;
  authorized: boolean;
  reason: string;
  requires_consent?: boolean;
}

export interface ToolInvocationResultV2 {
  proposal_id: string;
  ok: boolean;
  output: unknown;
  trust: 'untrusted' | 'broker_verified';
  reason: string;
}

export interface CapabilityBrokerAuth {
  authorize(proposal: ToolProposalV2, consents: Set<string>): BrokerDecision;
}

export class DefaultCapabilityBroker implements CapabilityBrokerAuth {
  authorize(proposal: ToolProposalV2, consents: Set<string>): BrokerDecision {
    if (proposal.trust_of_trigger === 'untrusted_content') {
      return {
        proposal_id: proposal.proposal_id,
        authorized: false,
        reason: 'UNTRUSTED_CONTENT_CANNOT_GRANT_PERMISSIONS',
      };
    }
    if (proposal.side_effect_class === 'destructive' && !consents.has('destructive')) {
      return { proposal_id: proposal.proposal_id, authorized: false, reason: 'CONSENT_REQUIRED_DESTRUCTIVE', requires_consent: true };
    }
    if (proposal.side_effect_class === 'computer_use' && !consents.has('computer_use')) {
      return { proposal_id: proposal.proposal_id, authorized: false, reason: 'CONSENT_REQUIRED_COMPUTER_USE', requires_consent: true };
    }
    if (proposal.side_effect_class === 'network' && !consents.has('network')) {
      return { proposal_id: proposal.proposal_id, authorized: false, reason: 'CONSENT_REQUIRED_NETWORK', requires_consent: true };
    }
    return { proposal_id: proposal.proposal_id, authorized: true, reason: 'AUTHORIZED' };
  }
}

export class ToolInvocationV2 {
  constructor(private readonly broker: CapabilityBrokerAuth = new DefaultCapabilityBroker()) {}

  propose(partial: Omit<ToolProposalV2, 'proposal_id'> & { proposal_id?: string }): ToolProposalV2 {
    return {
      proposal_id: partial.proposal_id ?? `prop_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
      tool_name: partial.tool_name,
      args: partial.args,
      side_effect_class: partial.side_effect_class,
      requested_by: partial.requested_by,
      trust_of_trigger: partial.trust_of_trigger,
      rationale_user_visible: partial.rationale_user_visible,
    };
  }

  invoke(
    proposal: ToolProposalV2,
    consents: Set<string>,
    executor: (p: ToolProposalV2) => unknown,
  ): ToolInvocationResultV2 {
    const decision = this.broker.authorize(proposal, consents);
    if (!decision.authorized) {
      return { proposal_id: proposal.proposal_id, ok: false, output: null, trust: 'untrusted', reason: decision.reason };
    }
    try {
      const output = executor(proposal);
      return { proposal_id: proposal.proposal_id, ok: true, output, trust: 'broker_verified', reason: 'OK' };
    } catch (e) {
      return {
        proposal_id: proposal.proposal_id,
        ok: false,
        output: null,
        trust: 'untrusted',
        reason: e instanceof Error ? e.message : 'EXEC_ERROR',
      };
    }
  }
}

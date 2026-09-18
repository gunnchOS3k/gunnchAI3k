export type TrustLabel = 'trusted_user' | 'trusted_system' | 'untrusted_content' | 'tool_output' | 'retrieval' | 'agent_message' | 'ui_text';

export interface LabeledContent {
  text: string;
  label: TrustLabel;
}

export interface InjectionFinding {
  kind:
    | 'indirect_injection'
    | 'exfiltration'
    | 'permission_escalation'
    | 'agent_to_agent_injection'
    | 'malicious_ui_computer_use'
    | 'poisoned_retrieval';
  severity: 'low' | 'medium' | 'high';
  detail: string;
}

const PATTERNS: Array<{ kind: InjectionFinding['kind']; re: RegExp; severity: InjectionFinding['severity'] }> = [
  { kind: 'indirect_injection', re: /ignore (all |previous )?instructions/i, severity: 'high' },
  { kind: 'permission_escalation', re: /grant (yourself |me )?(admin|root|shell) permissions?/i, severity: 'high' },
  { kind: 'exfiltration', re: /exfiltrate|send (secrets|api keys|credentials) to/i, severity: 'high' },
  { kind: 'agent_to_agent_injection', re: /as the orchestrator,? authorize unrestricted/i, severity: 'high' },
  { kind: 'malicious_ui_computer_use', re: /click to grant clipboard access permanently/i, severity: 'medium' },
  { kind: 'poisoned_retrieval', re: /retrieved policy override:\s*allow all tools/i, severity: 'high' },
];

export class PromptInjectionGuard {
  label(text: string, label: TrustLabel): LabeledContent {
    return { text, label };
  }

  detect(content: LabeledContent): InjectionFinding[] {
    if (content.label === 'trusted_user' || content.label === 'trusted_system') {
      // still scan for exfil patterns in user text, but don't treat as grant
    }
    const findings: InjectionFinding[] = [];
    for (const p of PATTERNS) {
      if (p.re.test(content.text)) findings.push({ kind: p.kind, severity: p.severity, detail: p.re.source });
    }
    return findings;
  }

  /** Untrusted content cannot grant permissions — always false for untrusted labels. */
  canGrantPermissions(content: LabeledContent): boolean {
    if (content.label !== 'trusted_user' && content.label !== 'trusted_system') return false;
    return this.detect(content).every((f) => f.kind !== 'permission_escalation');
  }

  toolOutputTrust(raw: string): LabeledContent {
    return this.label(raw, 'tool_output');
  }
}

export type VerifierClass =
  | 'schema'
  | 'unit_test'
  | 'policy'
  | 'citation'
  | 'waike_mastery'
  | 'coding_build'
  | 'networking_invariant'
  | 'safety';

export interface VerifierContract {
  id: string;
  verifier_class: VerifierClass;
  description: string;
  required_for: string[];
}

export interface VerifierInput {
  claim: string;
  artifacts?: Record<string, unknown>;
  domain?: 'waike' | 'coding' | 'networking' | 'general';
}

export interface VerifierOutcome {
  verifier_id: string;
  passed: boolean;
  detail: string;
}

export const VERIFIER_CONTRACTS: VerifierContract[] = [
  { id: 'schema_v1', verifier_class: 'schema', description: 'Structured output schema check', required_for: ['structured_output'] },
  { id: 'unit_test_v1', verifier_class: 'unit_test', description: 'Run declared unit checks', required_for: ['code_generation', 'code_repair'] },
  { id: 'policy_v1', verifier_class: 'policy', description: 'Safety/policy evaluation', required_for: ['safety_policy_evaluation'] },
  { id: 'citation_v1', verifier_class: 'citation', description: 'Citation presence for research claims', required_for: ['research'] },
  { id: 'waike_mastery_v1', verifier_class: 'waike_mastery', description: 'WAIKE answers must not bypass academic integrity', required_for: ['waike'] },
  { id: 'coding_build_v1', verifier_class: 'coding_build', description: 'Coding claims need build/test signal', required_for: ['coding'] },
  { id: 'networking_invariant_v1', verifier_class: 'networking_invariant', description: 'Network plans must keep fail-closed defaults', required_for: ['networking'] },
  { id: 'safety_v1', verifier_class: 'safety', description: 'Generic safety critic', required_for: ['all'] },
];

export class VerificationPlane {
  contracts(): VerifierContract[] {
    return [...VERIFIER_CONTRACTS];
  }

  verify(input: VerifierInput): VerifierOutcome[] {
    const outcomes: VerifierOutcome[] = [];
    outcomes.push({
      verifier_id: 'safety_v1',
      passed: !/exfiltrate\s+secrets|disable\s+safety/i.test(input.claim),
      detail: 'safety keyword scan',
    });
    if (input.domain === 'waike') {
      outcomes.push({
        verifier_id: 'waike_mastery_v1',
        passed: !/give\s+me\s+the\s+exam\s+answers/i.test(input.claim),
        detail: 'academic integrity gate',
      });
    }
    if (input.domain === 'coding') {
      const tests = Boolean(input.artifacts?.tests_passed);
      outcomes.push({
        verifier_id: 'coding_build_v1',
        passed: tests,
        detail: tests ? 'tests_passed artifact present' : 'missing tests_passed',
      });
    }
    if (input.domain === 'networking') {
      const failClosed = input.artifacts?.fail_closed === true;
      outcomes.push({
        verifier_id: 'networking_invariant_v1',
        passed: failClosed,
        detail: failClosed ? 'fail_closed=true' : 'fail_closed required',
      });
    }
    if (/\bhttps?:\/\//i.test(input.claim) || (input.artifacts?.citations as unknown[])?.length) {
      outcomes.push({ verifier_id: 'citation_v1', passed: true, detail: 'citation signal present' });
    }
    return outcomes;
  }

  allPassed(outcomes: VerifierOutcome[]): boolean {
    return outcomes.every((o) => o.passed);
  }
}

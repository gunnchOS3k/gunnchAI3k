import { boundLength, redactSecrets } from './redaction';
import type { DecisionQuestion, PrivacyClass } from './contracts';

export interface MinimizerInput {
  state: unknown;
  questions: Record<string, DecisionQuestion>;
  privacy_class: PrivacyClass;
  task_class: string;
  allowed_fields?: string[];
}

export interface MinimizedDecisionState {
  state: unknown;
  redacted_fields: string[];
  truncated: boolean;
  dropped_fields: string[];
}

const BLOCKED_ROOT_FIELDS = new Set([
  'passwords',
  'raw_auth_tokens',
  'api_keys',
  'private_keys',
  'medical_records',
  'financial_records',
  'student_records',
  'private_memory',
  'device_secrets',
  'chat_transcript',
  'full_transcript',
]);

export class DecisionStateMinimizer {
  minimize(input: MinimizerInput): MinimizedDecisionState {
    const dropped: string[] = [];
    let next = input.state;
    if (next && typeof next === 'object' && !Array.isArray(next)) {
      const src = next as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(src)) {
        if (BLOCKED_ROOT_FIELDS.has(k) || k.startsWith('_privileged_')) {
          dropped.push(k);
          continue;
        }
        if (input.allowed_fields && !input.allowed_fields.includes(k)) {
          dropped.push(k);
          continue;
        }
        out[k] = v;
      }
      next = out;
    }
    const redacted = redactSecrets(next);
    const bounded = boundLength(redacted.value);
    return {
      state: bounded.value,
      redacted_fields: redacted.redacted_fields,
      truncated: bounded.truncated,
      dropped_fields: dropped,
    };
  }
}

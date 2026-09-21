import * as fs from 'node:fs';
import * as path from 'node:path';

export type TaskClass =
  | 'intent_route'
  | 'micro_router'
  | 'short_assist'
  | 'health_probe'
  | 'capability_discovery'
  | 'long_form_tutor'
  | 'exam_answer_dump'
  | 'shell_proposal'
  | 'computer_use'
  | 'production_chat_default'
  | 'unbounded_generation';

export interface LiveProviderPolicy {
  schema: string;
  providers: Record<
    string,
    {
      provider_id: string;
      promotion_state: string;
      production_default: boolean;
      evidence_class: string;
      allowed_task_classes: TaskClass[];
      disallowed_task_classes: TaskClass[];
      max_output_tokens: number;
      max_latency_ms: number;
      requires_feature_flag: string;
    }
  >;
  nearby_edge: {
    requires_feature_flag: string;
    preferred_transport_pixel: string;
    allowed_transports: string[];
    forbid_unauthenticated_lan: boolean;
    idle_shutdown_ms: number;
    rate_limit: { requests_per_minute: number; burst: number };
  };
  gates_frozen_until_earned: Record<string, boolean>;
}

let cached: LiveProviderPolicy | null = null;

export function loadLiveProviderPolicy(root?: string): LiveProviderPolicy {
  if (cached) return cached;
  const base = root ?? path.resolve(__dirname, '../..');
  const p = path.join(base, 'config/live_provider_policy.json');
  cached = JSON.parse(fs.readFileSync(p, 'utf8')) as LiveProviderPolicy;
  return cached;
}

export function isTaskAllowed(modelId: string, task: TaskClass, root?: string): { ok: boolean; reason: string } {
  const policy = loadLiveProviderPolicy(root);
  const entry = policy.providers[modelId];
  if (!entry) return { ok: false, reason: 'UNKNOWN_MODEL' };
  if (entry.disallowed_task_classes.includes(task)) return { ok: false, reason: 'DISALLOWED_TASK_CLASS' };
  if (!entry.allowed_task_classes.includes(task)) return { ok: false, reason: 'NOT_IN_ALLOWED_SET' };
  if (entry.production_default) return { ok: false, reason: 'PRODUCTION_DEFAULT_FORBIDDEN_IN_POLICY' };
  return { ok: true, reason: 'ALLOWED' };
}

export function clearPolicyCache(): void {
  cached = null;
}

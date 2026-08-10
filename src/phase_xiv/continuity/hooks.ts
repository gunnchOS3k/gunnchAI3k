/** Cross-device AI continuity hooks — interface + local policy (no forced cloud sync). */

export type DeviceProfile = 'Student' | 'DS-XL' | 'Handheld' | 'Docked';

export interface ContinuityState {
  user_id: string;
  project_id: string | null;
  conversation_id: string | null;
  preferences: Record<string, string>;
  task_ids: string[];
  sensitive_blocked: boolean;
}

export interface ContinuityPolicy {
  sync_projects: boolean;
  sync_memory: boolean;
  sync_tasks: boolean;
  sync_conversations: boolean;
  sync_preferences: boolean;
  /** Sensitive context is not synced by default */
  sync_sensitive: boolean;
}

export const DEFAULT_CONTINUITY_POLICY: ContinuityPolicy = {
  sync_projects: true,
  sync_memory: false,
  sync_tasks: true,
  sync_conversations: true,
  sync_preferences: true,
  sync_sensitive: false,
};

export interface ContinuityEnvelope {
  from_device: DeviceProfile;
  to_device: DeviceProfile;
  policy: ContinuityPolicy;
  state: ContinuityState;
  transport: 'local_handoff' | 'user_approved_sync';
}

export class CrossDeviceContinuity {
  handoff(
    from_device: DeviceProfile,
    to_device: DeviceProfile,
    state: ContinuityState,
    policy: ContinuityPolicy = DEFAULT_CONTINUITY_POLICY,
  ): ContinuityEnvelope {
    const filtered: ContinuityState = {
      ...state,
      sensitive_blocked: !policy.sync_sensitive,
    };
    if (!policy.sync_projects) filtered.project_id = null;
    if (!policy.sync_conversations) filtered.conversation_id = null;
    if (!policy.sync_tasks) filtered.task_ids = [];
    if (!policy.sync_preferences) filtered.preferences = {};
    if (!policy.sync_memory) {
      // memory is external; continuity only carries explicit preferences when allowed
    }
    return {
      from_device,
      to_device,
      policy,
      state: filtered,
      transport: policy.sync_sensitive ? 'user_approved_sync' : 'local_handoff',
    };
  }
}

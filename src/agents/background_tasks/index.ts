export interface BackgroundTaskV2 {
  task_id: string;
  owner_id: string;
  objective: string;
  schedule: 'once' | 'interval' | 'on_event';
  interval_ms?: number;
  max_runtime_ms: number;
  max_retries: number;
  consent_scopes: string[];
  stop_controls: {
    owner_cancel: true;
    budget_exhausted_stop: true;
    indefinite_autonomy: false;
  };
  status: 'queued' | 'running' | 'paused' | 'completed' | 'cancelled' | 'failed';
  created_at: string;
  updated_at: string;
}

export class BackgroundTaskManager {
  private readonly tasks = new Map<string, BackgroundTaskV2>();

  create(input: Omit<BackgroundTaskV2, 'status' | 'created_at' | 'updated_at' | 'stop_controls'> & {
    stop_controls?: Partial<BackgroundTaskV2['stop_controls']>;
  }): BackgroundTaskV2 {
    if (input.stop_controls?.indefinite_autonomy) {
      throw new Error('INDEFINITE_AUTONOMY_FORBIDDEN');
    }
    const now = new Date().toISOString();
    const task: BackgroundTaskV2 = {
      ...input,
      stop_controls: {
        owner_cancel: true,
        budget_exhausted_stop: true,
        indefinite_autonomy: false,
      },
      status: 'queued',
      created_at: now,
      updated_at: now,
    };
    this.tasks.set(task.task_id, task);
    return task;
  }

  ownerCancel(taskId: string, ownerId: string): BackgroundTaskV2 {
    const t = this.require(taskId);
    if (t.owner_id !== ownerId) throw new Error('OWNER_MISMATCH');
    t.status = 'cancelled';
    t.updated_at = new Date().toISOString();
    return t;
  }

  list(ownerId?: string): BackgroundTaskV2[] {
    return [...this.tasks.values()].filter((t) => !ownerId || t.owner_id === ownerId);
  }

  private require(id: string): BackgroundTaskV2 {
    const t = this.tasks.get(id);
    if (!t) throw new Error('NOT_FOUND');
    return t;
  }
}

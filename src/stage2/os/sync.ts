/**
 * Sync interface with local-default policy.
 * Does NOT claim fake cloud sync.
 */

export type SyncMode = 'local_default' | 'user_approved_cloud';

export interface SyncStatus {
  mode: SyncMode;
  cloud_claimed: false;
  last_local_write_at: string | null;
  pending_cloud: number;
  note: string;
}

export class SyncInterface {
  private lastLocal: string | null = null;
  private pending = 0;

  status(mode: SyncMode = 'local_default'): SyncStatus {
    return {
      mode,
      cloud_claimed: false,
      last_local_write_at: this.lastLocal,
      pending_cloud: mode === 'local_default' ? 0 : this.pending,
      note:
        mode === 'local_default'
          ? 'Local-default policy active; no cloud sync claimed.'
          : 'User-approved cloud queue only — transport not asserted as complete.',
    };
  }

  recordLocalWrite(): void {
    this.lastLocal = new Date().toISOString();
  }

  enqueueCloudIfApproved(approved: boolean): { queued: boolean; reason: string } {
    if (!approved) return { queued: false, reason: 'cloud_not_approved' };
    this.pending += 1;
    return { queued: true, reason: 'queued_user_approved_not_transported' };
  }
}

export type MemoryPlane =
  | 'immediate_context'
  | 'working_task_state'
  | 'episodic'
  | 'project'
  | 'repo'
  | 'waike_learner'
  | 'long_term_user'
  | 'external_retrieval';

export interface MemoryRecord {
  id: string;
  plane: MemoryPlane;
  text: string;
  tags: string[];
  privacy: 'public' | 'personal' | 'sensitive' | 'device_local';
  trust: 'trusted' | 'untrusted';
  created_at: string;
  relevance_hint?: number;
}

export interface PrivacyPolicy {
  allow_planes: MemoryPlane[];
  redact_sensitive: boolean;
  untrusted_cannot_escalate: true;
}

export const DEFAULT_PRIVACY: PrivacyPolicy = {
  allow_planes: [
    'immediate_context',
    'working_task_state',
    'episodic',
    'project',
    'repo',
    'waike_learner',
    'long_term_user',
    'external_retrieval',
  ],
  redact_sensitive: true,
  untrusted_cannot_escalate: true,
};

export class MemoryPlaneStore {
  private readonly records: MemoryRecord[] = [];

  constructor(private readonly privacy: PrivacyPolicy = DEFAULT_PRIVACY) {}

  put(record: Omit<MemoryRecord, 'created_at'> & { created_at?: string }): MemoryRecord {
    if (!this.privacy.allow_planes.includes(record.plane)) {
      throw new Error('PLANE_DENIED');
    }
    const full: MemoryRecord = {
      ...record,
      created_at: record.created_at ?? new Date().toISOString(),
    };
    this.records.push(full);
    return full;
  }

  retrieve(query: string, limit = 5): MemoryRecord[] {
    const q = query.toLowerCase();
    return this.records
      .map((r) => ({
        r,
        score:
          (r.text.toLowerCase().includes(q) ? 2 : 0) +
          r.tags.filter((t) => t.toLowerCase().includes(q)).length +
          (r.relevance_hint ?? 0),
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((x) => {
        if (this.privacy.redact_sensitive && x.r.privacy === 'sensitive') {
          return { ...x.r, text: '[REDACTED_SENSITIVE]' };
        }
        return x.r;
      });
  }

  /** Poisoned retrieval stays labeled untrusted and cannot grant permissions. */
  asToolContext(records: MemoryRecord[]): Array<{ text: string; trust: 'trusted' | 'untrusted'; grants_permissions: false }> {
    return records.map((r) => ({
      text: r.text,
      trust: r.trust,
      grants_permissions: false as const,
    }));
  }
}

/**
 * gunnchMemory — encrypted file-backed store (AES-256-GCM / Fernet-like).
 */

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

export type MemoryDomain = 'USER' | 'PROJECT' | 'LEARNING' | 'DEVICE' | 'WORK';
export type SyncPolicy = 'local_only' | 'user_approved_sync' | 'disabled';

export interface MemoryRecord {
  id: string;
  type: string;
  owner: string;
  domain: MemoryDomain;
  project_scope: string | null;
  provenance: string;
  created_at: string;
  updated_at: string;
  confidence: number;
  sensitivity: 'public' | 'personal' | 'sensitive';
  expiration: string | null;
  sync_policy: SyncPolicy;
  content: string;
  paused?: boolean;
}

export interface MemoryWriteInput {
  type: string;
  owner: string;
  domain: MemoryDomain;
  project_scope?: string | null;
  provenance?: string;
  confidence?: number;
  sensitivity?: MemoryRecord['sensitivity'];
  expiration?: string | null;
  sync_policy?: SyncPolicy;
  content: string;
}

function deriveKey(userKey: string): Buffer {
  return crypto.pbkdf2Sync(userKey, 'gunnchMemory-stage2-v1', 100_000, 32, 'sha256');
}

export function encryptPayload(plaintext: string, userKey: string): string {
  const key = deriveKey(userKey);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from([1]), iv, enc, tag]).toString('base64url');
}

export function decryptPayload(token: string, userKey: string): string {
  const buf = Buffer.from(token, 'base64url');
  if (buf.length < 1 + 12 + 16) throw new Error('Invalid encrypted payload');
  if (buf[0] !== 1) throw new Error(`Unsupported crypto version ${buf[0]}`);
  const iv = buf.subarray(1, 13);
  const tag = buf.subarray(buf.length - 16);
  const data = buf.subarray(13, buf.length - 16);
  const key = deriveKey(userKey);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

export class GunnchMemoryStore {
  private records = new Map<string, MemoryRecord>();
  private disabled = false;
  private deletedIds = new Set<string>();

  constructor(
    private readonly rootDir: string,
    private readonly userKey: string,
  ) {
    fs.mkdirSync(rootDir, { recursive: true });
    this.load();
  }

  isDisabled(): boolean {
    return this.disabled;
  }

  disableMemory(): void {
    this.disabled = true;
    this.persistMeta();
  }

  enableMemory(): void {
    this.disabled = false;
    this.persistMeta();
  }

  write(input: MemoryWriteInput): MemoryRecord {
    if (this.disabled) {
      throw new Error('MEMORY_DISABLED: writes are rejected while memory is disabled');
    }
    const now = new Date().toISOString();
    const id = `mem_${crypto.randomBytes(8).toString('hex')}`;
    const record: MemoryRecord = {
      id,
      type: input.type,
      owner: input.owner,
      domain: input.domain,
      project_scope: input.project_scope ?? null,
      provenance: input.provenance ?? 'user',
      created_at: now,
      updated_at: now,
      confidence: input.confidence ?? 0.8,
      sensitivity: input.sensitivity ?? 'personal',
      expiration: input.expiration ?? null,
      sync_policy: input.sync_policy ?? 'local_only',
      content: input.content,
      paused: false,
    };
    this.records.set(id, record);
    this.persist(record);
    return record;
  }

  list(owner: string, opts?: { project_scope?: string | null; domain?: MemoryDomain }): MemoryRecord[] {
    return [...this.records.values()].filter((r) => {
      if (r.owner !== owner) return false;
      if (r.paused) return false;
      if (opts?.domain && r.domain !== opts.domain) return false;
      if (opts && Object.prototype.hasOwnProperty.call(opts, 'project_scope')) {
        if ((opts.project_scope ?? null) !== r.project_scope) return false;
      }
      if (r.expiration && Date.parse(r.expiration) < Date.now()) return false;
      return true;
    });
  }

  search(owner: string, query: string): MemoryRecord[] {
    const q = query.toLowerCase();
    return this.list(owner).filter(
      (r) =>
        r.content.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q) ||
        r.provenance.toLowerCase().includes(q),
    );
  }

  inspect(owner: string, id: string): MemoryRecord | null {
    const r = this.records.get(id);
    if (!r || r.owner !== owner) return null;
    return { ...r };
  }

  edit(
    owner: string,
    id: string,
    patch: Partial<Pick<MemoryRecord, 'content' | 'confidence' | 'type' | 'sensitivity' | 'expiration' | 'sync_policy'>>,
  ): MemoryRecord {
    const r = this.records.get(id);
    if (!r || r.owner !== owner) throw new Error('MEMORY_NOT_FOUND_OR_FORBIDDEN');
    if (this.disabled) throw new Error('MEMORY_DISABLED');
    Object.assign(r, patch, { updated_at: new Date().toISOString() });
    this.persist(r);
    return { ...r };
  }

  delete(owner: string, id: string): boolean {
    const r = this.records.get(id);
    if (!r || r.owner !== owner) return false;
    this.records.delete(id);
    this.deletedIds.add(id);
    const file = this.fileFor(id);
    if (fs.existsSync(file)) fs.unlinkSync(file);
    this.persistMeta();
    return true;
  }

  pause(owner: string, id: string): MemoryRecord {
    const r = this.records.get(id);
    if (!r || r.owner !== owner) throw new Error('MEMORY_NOT_FOUND_OR_FORBIDDEN');
    r.paused = true;
    r.updated_at = new Date().toISOString();
    this.persist(r);
    return { ...r };
  }

  export(owner: string): MemoryRecord[] {
    return this.list(owner).map((r) => ({ ...r }));
  }

  import(owner: string, records: MemoryRecord[]): number {
    if (this.disabled) throw new Error('MEMORY_DISABLED');
    let n = 0;
    for (const rec of records) {
      if (rec.owner !== owner) throw new Error('CROSS_USER_IMPORT_DENIED');
      if (this.deletedIds.has(rec.id)) continue;
      this.records.set(rec.id, { ...rec, owner });
      this.persist(this.records.get(rec.id)!);
      n += 1;
    }
    return n;
  }

  clearProject(owner: string, projectScope: string): number {
    let n = 0;
    for (const r of [...this.records.values()]) {
      if (r.owner === owner && r.project_scope === projectScope) {
        this.delete(owner, r.id);
        n += 1;
      }
    }
    return n;
  }

  resolvePreferenceContradiction(owner: string, key: string, value: string): MemoryRecord {
    const existing = this.search(owner, `pref:${key}`).filter((r) => r.type === 'preference');
    for (const e of existing) this.delete(owner, e.id);
    return this.write({
      owner,
      domain: 'USER',
      type: 'preference',
      content: `pref:${key}=${value}`,
      provenance: 'contradiction_resolver',
      confidence: 1,
      sensitivity: 'personal',
      sync_policy: 'local_only',
    });
  }

  assertNoCrossUserLeak(ownerA: string, ownerB: string): void {
    if (this.list(ownerA).some((r) => r.owner === ownerB)) throw new Error('CROSS_USER_LEAK');
    if (this.list(ownerB).some((r) => r.owner === ownerA)) throw new Error('CROSS_USER_LEAK');
  }

  assertNoCrossProjectLeak(owner: string, projectA: string, projectB: string): void {
    const a = this.list(owner, { project_scope: projectA });
    const b = this.list(owner, { project_scope: projectB });
    if (a.some((r) => r.project_scope === projectB)) throw new Error('CROSS_PROJECT_LEAK');
    if (b.some((r) => r.project_scope === projectA)) throw new Error('CROSS_PROJECT_LEAK');
  }

  requestCloudSync(owner: string, id: string, permitted: boolean): { ok: boolean; reason: string } {
    const r = this.inspect(owner, id);
    if (!r) return { ok: false, reason: 'not_found' };
    if (r.sync_policy === 'local_only' || r.sync_policy === 'disabled') {
      return { ok: false, reason: 'sync_policy_forbids_cloud' };
    }
    if (!permitted) return { ok: false, reason: 'cloud_without_permission' };
    if (r.sensitivity === 'sensitive') return { ok: false, reason: 'sensitive_blocks_cloud' };
    return { ok: true, reason: 'user_approved_sync_allowed_local_default_still_applies' };
  }

  wasDeleted(id: string): boolean {
    return this.deletedIds.has(id);
  }

  private fileFor(id: string): string {
    return path.join(this.rootDir, `${id}.enc`);
  }

  private metaPath(): string {
    return path.join(this.rootDir, '_meta.enc');
  }

  private persist(record: MemoryRecord): void {
    fs.writeFileSync(this.fileFor(record.id), encryptPayload(JSON.stringify(record), this.userKey), 'utf8');
  }

  private persistMeta(): void {
    const meta = { disabled: this.disabled, deletedIds: [...this.deletedIds] };
    fs.writeFileSync(this.metaPath(), encryptPayload(JSON.stringify(meta), this.userKey), 'utf8');
  }

  private load(): void {
    if (!fs.existsSync(this.rootDir)) return;
    if (fs.existsSync(this.metaPath())) {
      try {
        const meta = JSON.parse(decryptPayload(fs.readFileSync(this.metaPath(), 'utf8'), this.userKey));
        this.disabled = Boolean(meta.disabled);
        this.deletedIds = new Set(meta.deletedIds ?? []);
      } catch {
        /* ignore */
      }
    }
    for (const name of fs.readdirSync(this.rootDir)) {
      if (!name.endsWith('.enc') || name.startsWith('_')) continue;
      try {
        const record = JSON.parse(
          decryptPayload(fs.readFileSync(path.join(this.rootDir, name), 'utf8'), this.userKey),
        ) as MemoryRecord;
        if (!this.deletedIds.has(record.id)) this.records.set(record.id, record);
      } catch {
        /* skip */
      }
    }
  }
}

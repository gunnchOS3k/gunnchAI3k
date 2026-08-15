/**
 * AI-UR-008 Cowrite / Canvas workspace.
 * Real create / edit / persist / reopen with provenance.
 * Silent destructive overwrite is rejected (version conflict).
 * Offline-first: documents stay on local disk.
 */

import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface CowriteProvenance {
  at: string;
  op: 'create' | 'edit' | 'reopen' | 'reject_overwrite';
  actor: string;
  version: number;
  contentSha256: string;
  note?: string;
}

export interface CowriteDocument {
  id: string;
  title: string;
  content: string;
  version: number;
  contentSha256: string;
  createdAt: string;
  updatedAt: string;
  provenance: CowriteProvenance[];
}

export interface CowriteEditResult {
  ok: boolean;
  document: CowriteDocument | null;
  reason: string;
}

export class CowriteWorkspace {
  constructor(private readonly rootDir: string) {
    fs.mkdirSync(this.rootDir, { recursive: true });
  }

  private docPath(id: string): string {
    return path.join(this.rootDir, `${id}.json`);
  }

  private sha(content: string): string {
    return createHash('sha256').update(content, 'utf8').digest('hex');
  }

  create(actor: string, title: string, content: string): CowriteDocument {
    const id = `doc_${createHash('sha256').update(`${title}:${Date.now()}`).digest('hex').slice(0, 12)}`;
    const now = new Date().toISOString();
    const contentSha256 = this.sha(content);
    const doc: CowriteDocument = {
      id,
      title,
      content,
      version: 1,
      contentSha256,
      createdAt: now,
      updatedAt: now,
      provenance: [
        {
          at: now,
          op: 'create',
          actor,
          version: 1,
          contentSha256,
          note: 'offline_create',
        },
      ],
    };
    this.persist(doc);
    return doc;
  }

  /**
   * Edit requires expectedVersion. Stale expectedVersion → reject (no silent overwrite).
   */
  edit(
    actor: string,
    id: string,
    nextContent: string,
    expectedVersion: number,
  ): CowriteEditResult {
    const current = this.reopen(actor, id);
    if (!current) {
      return { ok: false, document: null, reason: 'NOT_FOUND' };
    }
    if (current.version !== expectedVersion) {
      const now = new Date().toISOString();
      current.provenance.push({
        at: now,
        op: 'reject_overwrite',
        actor,
        version: current.version,
        contentSha256: current.contentSha256,
        note: `STALE_VERSION:expected=${expectedVersion}:actual=${current.version}`,
      });
      this.persist(current);
      return {
        ok: false,
        document: current,
        reason: `VERSION_CONFLICT:expected=${expectedVersion}:actual=${current.version}`,
      };
    }
    const now = new Date().toISOString();
    const contentSha256 = this.sha(nextContent);
    current.content = nextContent;
    current.version += 1;
    current.contentSha256 = contentSha256;
    current.updatedAt = now;
    current.provenance.push({
      at: now,
      op: 'edit',
      actor,
      version: current.version,
      contentSha256,
    });
    this.persist(current);
    return { ok: true, document: current, reason: 'EDITED' };
  }

  /** Force overwrite without version check — intentionally denied for AI-UR-008 honesty. */
  silentOverwrite(_actor: string, _id: string, _content: string): never {
    throw new Error('SILENT_OVERWRITE_FORBIDDEN');
  }

  reopen(actor: string, id: string): CowriteDocument | null {
    const p = this.docPath(id);
    if (!fs.existsSync(p)) return null;
    const doc = JSON.parse(fs.readFileSync(p, 'utf8')) as CowriteDocument;
    const now = new Date().toISOString();
    doc.provenance.push({
      at: now,
      op: 'reopen',
      actor,
      version: doc.version,
      contentSha256: doc.contentSha256,
    });
    this.persist(doc);
    return doc;
  }

  list(): string[] {
    return fs
      .readdirSync(this.rootDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace(/\.json$/, ''));
  }

  private persist(doc: CowriteDocument): void {
    fs.writeFileSync(this.docPath(doc.id), JSON.stringify(doc, null, 2) + '\n', 'utf8');
  }
}

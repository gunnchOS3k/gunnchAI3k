/**
 * Continuance V — user-controlled local cross-device continuity.
 * Local store only; export/import for explicit device handoff (no silent cloud).
 */

import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { DeviceProfileId } from '../model_registry';
import type { ProductRoute } from './types';

export interface ContinuityTurn {
  at: string;
  capability: ProductRoute;
  queryPreview: string;
  summary: string;
}

export interface ContinuitySession {
  sessionId: string;
  deviceProfileId: DeviceProfileId;
  createdAt: string;
  updatedAt: string;
  lastCapability: ProductRoute;
  turns: ContinuityTurn[];
  notes: Record<string, string>;
}

export class ContinuityStore {
  private readonly storePath: string;
  private sessions = new Map<string, ContinuitySession>();

  constructor(cwd = process.cwd(), storeDir?: string) {
    const dir = storeDir ?? path.join(cwd, 'var', 'gunnchai', 'continuity');
    fs.mkdirSync(dir, { recursive: true });
    this.storePath = path.join(dir, 'sessions.json');
    this.load();
  }

  get(sessionId: string): ContinuitySession | null {
    return this.sessions.get(sessionId) ?? null;
  }

  list(): ContinuitySession[] {
    return [...this.sessions.values()].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    );
  }

  create(deviceProfileId: DeviceProfileId = 'student_14_5'): ContinuitySession {
    const session: ContinuitySession = {
      sessionId: randomUUID(),
      deviceProfileId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastCapability: 'continuity',
      turns: [],
      notes: {},
    };
    this.sessions.set(session.sessionId, session);
    this.persist();
    return session;
  }

  appendTurn(
    sessionId: string,
    turn: Omit<ContinuityTurn, 'at'> & { at?: string },
  ): ContinuitySession {
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = this.create();
      // re-key under requested id when creating fresh for known id
      this.sessions.delete(session.sessionId);
      session.sessionId = sessionId;
      this.sessions.set(sessionId, session);
    }
    session.turns.push({
      at: turn.at ?? new Date().toISOString(),
      capability: turn.capability,
      queryPreview: turn.queryPreview.slice(0, 160),
      summary: turn.summary.slice(0, 400),
    });
    session.turns = session.turns.slice(-40);
    session.lastCapability = turn.capability;
    session.updatedAt = new Date().toISOString();
    this.persist();
    return session;
  }

  setNote(sessionId: string, key: string, value: string): ContinuitySession {
    const session = this.sessions.get(sessionId) ?? this.create();
    if (session.sessionId !== sessionId) {
      this.sessions.delete(session.sessionId);
      session.sessionId = sessionId;
      this.sessions.set(sessionId, session);
    }
    session.notes[key] = value.slice(0, 1000);
    session.updatedAt = new Date().toISOString();
    this.persist();
    return session;
  }

  exportBundle(sessionId: string): {
    format: 'gunnchai-continuity-v1';
    exportedAt: string;
    session: ContinuitySession;
  } {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`CONTINUITY_NOT_FOUND:${sessionId}`);
    return {
      format: 'gunnchai-continuity-v1',
      exportedAt: new Date().toISOString(),
      session: structuredClone(session),
    };
  }

  importBundle(bundle: {
    format: string;
    session: ContinuitySession;
  }): ContinuitySession {
    if (bundle.format !== 'gunnchai-continuity-v1') {
      throw new Error('CONTINUITY_BAD_FORMAT');
    }
    const session = structuredClone(bundle.session);
    this.sessions.set(session.sessionId, session);
    this.persist();
    return session;
  }

  private load(): void {
    if (!fs.existsSync(this.storePath)) return;
    try {
      const raw = JSON.parse(fs.readFileSync(this.storePath, 'utf8')) as {
        sessions: ContinuitySession[];
      };
      this.sessions = new Map(raw.sessions.map((s) => [s.sessionId, s]));
    } catch {
      this.sessions = new Map();
    }
  }

  private persist(): void {
    fs.writeFileSync(
      this.storePath,
      JSON.stringify({ sessions: this.list() }, null, 2),
    );
  }
}

/** Filesystem/network sandbox for agent tools. */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { AgentLimits } from './limits';
import { DEFAULT_AGENT_LIMITS } from './limits';

export class AgentSandbox {
  readonly root: string;
  readonly limits: AgentLimits;
  private snapshots = new Map<string, Map<string, string | null>>();

  constructor(root: string, limits: AgentLimits = { ...DEFAULT_AGENT_LIMITS }) {
    this.root = path.resolve(root);
    this.limits = limits;
    fs.mkdirSync(this.root, { recursive: true });
  }

  resolve(rel: string): string {
    const full = path.resolve(this.root, rel);
    const relToRoot = path.relative(this.root, full);
    if (relToRoot.startsWith('..') || path.isAbsolute(relToRoot)) {
      throw new Error('SANDBOX_PATH_ESCAPE');
    }
    return full;
  }

  assertNetwork(allowedOverride?: boolean): void {
    const allowed = allowedOverride ?? this.limits.networkAllowed;
    if (!allowed) throw new Error('SANDBOX_NETWORK_DENIED');
  }

  beginSnapshot(id: string): void {
    this.snapshots.set(id, new Map());
  }

  trackWrite(snapshotId: string, rel: string, previous: string | null): void {
    const snap = this.snapshots.get(snapshotId);
    if (!snap) return;
    if (!snap.has(rel)) snap.set(rel, previous);
  }

  rollback(snapshotId: string): string[] {
    const snap = this.snapshots.get(snapshotId);
    if (!snap) return [];
    const restored: string[] = [];
    for (const [rel, prev] of snap) {
      const full = this.resolve(rel);
      if (prev === null) {
        if (fs.existsSync(full)) fs.rmSync(full, { force: true });
      } else {
        fs.mkdirSync(path.dirname(full), { recursive: true });
        fs.writeFileSync(full, prev);
      }
      restored.push(rel);
    }
    this.snapshots.delete(snapshotId);
    return restored;
  }
}

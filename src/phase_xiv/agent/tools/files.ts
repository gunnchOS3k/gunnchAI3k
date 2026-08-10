/** Sandboxed file tools. */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { AgentSandbox } from '../sandbox';
import type { LimitTracker } from '../limits';

export class FilesTool {
  constructor(
    private readonly sandbox: AgentSandbox,
    private readonly limits: LimitTracker,
    private readonly snapshotId?: string,
  ) {}

  read(rel: string): string {
    this.limits.recordToolCall();
    const full = this.sandbox.resolve(rel);
    return fs.readFileSync(full, 'utf8');
  }

  write(rel: string, content: string): string {
    this.limits.recordToolCall();
    if (Buffer.byteLength(content, 'utf8') > this.limits.limits.maxFileBytes) {
      throw new Error('LIMIT_FILE_BYTES');
    }
    const full = this.sandbox.resolve(rel);
    const prev = fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : null;
    if (this.snapshotId) this.sandbox.trackWrite(this.snapshotId, rel, prev);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
    return full;
  }

  delete(rel: string): void {
    this.limits.recordToolCall();
    const full = this.sandbox.resolve(rel);
    const prev = fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : null;
    if (this.snapshotId) this.sandbox.trackWrite(this.snapshotId, rel, prev);
    if (fs.existsSync(full)) fs.rmSync(full, { force: true });
  }

  list(rel = '.'): string[] {
    this.limits.recordToolCall();
    const full = this.sandbox.resolve(rel);
    if (!fs.existsSync(full)) return [];
    return fs.readdirSync(full);
  }
}

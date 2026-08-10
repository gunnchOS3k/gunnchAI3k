/** Append-only audit trail for agent actions. */

import * as fs from 'node:fs';
import * as path from 'node:path';

export interface AuditEvent {
  at: string;
  session_id: string;
  kind: string;
  detail: Record<string, unknown>;
}

export class AgentAuditLog {
  private events: AuditEvent[] = [];

  constructor(private readonly filePath?: string) {
    if (filePath) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
    }
  }

  record(session_id: string, kind: string, detail: Record<string, unknown> = {}): AuditEvent {
    const ev: AuditEvent = {
      at: new Date().toISOString(),
      session_id,
      kind,
      detail,
    };
    this.events.push(ev);
    if (this.filePath) {
      fs.appendFileSync(this.filePath, JSON.stringify(ev) + '\n');
    }
    return ev;
  }

  list(session_id?: string): AuditEvent[] {
    return session_id ? this.events.filter((e) => e.session_id === session_id) : [...this.events];
  }
}

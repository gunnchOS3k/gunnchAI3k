/**
 * Continuance VI — append-only local audit trail for assist/governance actions.
 */

import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ProductRoute } from './types';

export interface AuditEvent {
  id: string;
  at: string;
  actor: string;
  action: string;
  capability?: ProductRoute;
  requestId?: string;
  ok: boolean;
  detail: string;
  sourceAttribution?: string[];
}

export class AuditLog {
  private readonly events: AuditEvent[] = [];
  private readonly eventsPath: string;

  constructor(cwd = process.cwd(), storeDir?: string) {
    const dir = storeDir ?? path.join(cwd, 'var', 'gunnchai', 'audit');
    fs.mkdirSync(dir, { recursive: true });
    this.eventsPath = path.join(dir, 'audit.jsonl');
    this.loadTail();
  }

  record(input: {
    actor?: string;
    action: string;
    capability?: ProductRoute;
    requestId?: string;
    ok: boolean;
    detail: string;
    sourceAttribution?: string[];
  }): AuditEvent {
    const event: AuditEvent = {
      id: randomUUID(),
      at: new Date().toISOString(),
      actor: input.actor ?? 'local-product-service',
      action: input.action,
      capability: input.capability,
      requestId: input.requestId,
      ok: input.ok,
      detail: input.detail.slice(0, 800),
      sourceAttribution: input.sourceAttribution,
    };
    this.events.push(event);
    if (this.events.length > 2000) this.events.shift();
    fs.appendFileSync(this.eventsPath, `${JSON.stringify(event)}\n`);
    return event;
  }

  recent(limit = 50): AuditEvent[] {
    return this.events.slice(-limit);
  }

  private loadTail(): void {
    if (!fs.existsSync(this.eventsPath)) return;
    try {
      const lines = fs.readFileSync(this.eventsPath, 'utf8').trim().split('\n').filter(Boolean);
      for (const line of lines.slice(-500)) {
        this.events.push(JSON.parse(line) as AuditEvent);
      }
    } catch {
      // ignore corrupt tail; fresh append continues
    }
  }
}

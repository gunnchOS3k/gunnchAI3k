/** Scheduled / proactive tasks (local runner; no auto high-impact). */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { isHighImpact } from '../agent/approval';

export interface ScheduledTask {
  id: string;
  title: string;
  cron: string;
  action: string;
  payload: Record<string, unknown>;
  enabled: boolean;
  last_run_at: string | null;
  last_result: string | null;
}

export class ScheduledTaskRunner {
  private tasks = new Map<string, ScheduledTask>();

  constructor(private readonly storePath: string) {
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    this.load();
  }

  add(title: string, cron: string, action: string, payload: Record<string, unknown> = {}): ScheduledTask {
    if (isHighImpact(action)) {
      throw new Error(`SCHEDULED_HIGH_IMPACT_FORBIDDEN:${action}`);
    }
    const task: ScheduledTask = {
      id: `sched_${crypto.randomBytes(4).toString('hex')}`,
      title,
      cron,
      action,
      payload,
      enabled: true,
      last_run_at: null,
      last_result: null,
    };
    this.tasks.set(task.id, task);
    this.save();
    return task;
  }

  list(): ScheduledTask[] {
    return [...this.tasks.values()];
  }

  runDue(now = new Date()): ScheduledTask[] {
    const ran: ScheduledTask[] = [];
    for (const task of this.tasks.values()) {
      if (!task.enabled) continue;
      // Digital runner: treat every explicit runDue as a tick for enabled tasks.
      const result = this.execute(task);
      task.last_run_at = now.toISOString();
      task.last_result = result;
      ran.push(task);
    }
    this.save();
    return ran;
  }

  private execute(task: ScheduledTask): string {
    if (task.action === 'summarize_due') {
      const items = (task.payload.items as string[]) || [];
      return `summary:${items.length} due items`;
    }
    if (task.action === 'prefetch_offline') {
      return 'prefetch_prepared_local';
    }
    if (task.action === 'check_tests') {
      return 'tests_check_dry_run';
    }
    return `ran:${task.action}`;
  }

  private save(): void {
    fs.writeFileSync(this.storePath, JSON.stringify({ tasks: this.list() }, null, 2) + '\n');
  }

  private load(): void {
    if (!fs.existsSync(this.storePath)) return;
    const raw = JSON.parse(fs.readFileSync(this.storePath, 'utf8')) as { tasks: ScheduledTask[] };
    for (const t of raw.tasks || []) this.tasks.set(t.id, t);
  }
}

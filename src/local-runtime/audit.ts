import * as fs from 'node:fs';
import * as path from 'node:path';
import type { AuditRecord } from './types';

export class LocalAuditLog {
  private records: AuditRecord[] = [];

  constructor(private readonly persistDir?: string) {
    if (persistDir) {
      fs.mkdirSync(persistDir, { recursive: true });
    }
  }

  append(record: AuditRecord): void {
    this.records.push(record);
    if (this.persistDir) {
      const file = path.join(this.persistDir, `${record.auditId}.json`);
      fs.writeFileSync(file, JSON.stringify(record, null, 2), 'utf8');
    }
  }

  list(): AuditRecord[] {
    return [...this.records];
  }

  clear(): void {
    this.records = [];
  }
}

export function createAuditId(requestId: string): string {
  return `audit-${requestId}-${Date.now()}`;
}

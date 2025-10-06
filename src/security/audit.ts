import { Logger } from '../utils/logger';
import { Database } from 'sqlite3';
import crypto from 'crypto';

export interface AuditEvent {
  id: string;
  timestamp: Date;
  userId: string;
  action: string;
  resource: string;
  result: 'SUCCESS' | 'FAILURE' | 'PENDING';
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  hash: string;
}

export interface SecurityEvent {
  id: string;
  timestamp: Date;
  eventType: 'AUTHENTICATION' | 'AUTHORIZATION' | 'DATA_ACCESS' | 'AI_ACTION' | 'SECURITY_VIOLATION';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  userId: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

export class AuditManager {
  private db: Database;
  private logger: Logger;
  private encryptionKey: string;

  constructor(db: Database, encryptionKey: string) {
    this.db = db;
    this.logger = new Logger();
    this.encryptionKey = encryptionKey;
  }

  async initialize() {
    await this.createAuditTables();
    this.logger.info('Audit manager initialized with enterprise-grade security');
  }

  private async createAuditTables() {
    const tables = [
      `CREATE TABLE IF NOT EXISTS audit_events (
        id TEXT PRIMARY KEY,
        timestamp DATETIME NOT NULL,
        userId TEXT NOT NULL,
        action TEXT NOT NULL,
        resource TEXT NOT NULL,
        result TEXT NOT NULL,
        ipAddress TEXT,
        userAgent TEXT,
        metadata TEXT,
        hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS security_events (
        id TEXT PRIMARY KEY,
        timestamp DATETIME NOT NULL,
        eventType TEXT NOT NULL,
        severity TEXT NOT NULL,
        description TEXT NOT NULL,
        userId TEXT NOT NULL,
        ipAddress TEXT,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS ai_actions (
        id TEXT PRIMARY KEY,
        timestamp DATETIME NOT NULL,
        userId TEXT NOT NULL,
        action TEXT NOT NULL,
        approval_required BOOLEAN DEFAULT TRUE,
        approved_by TEXT,
        approved_at DATETIME,
        executed BOOLEAN DEFAULT FALSE,
        executed_at DATETIME,
        metadata TEXT,
        hash TEXT NOT NULL
      )`
    ];

    for (const table of tables) {
      await this.runQuery(table);
    }
  }

  async logAuditEvent(event: Omit<AuditEvent, 'id' | 'hash'>): Promise<string> {
    const id = this.generateSecureId();
    const hash = this.generateHash(event);
    
    const auditEvent: AuditEvent = {
      ...event,
      id,
      hash
    };

    const sql = `INSERT INTO audit_events 
                 (id, timestamp, userId, action, resource, result, ipAddress, userAgent, metadata, hash) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    await this.runQuery(sql, [
      auditEvent.id,
      auditEvent.timestamp.toISOString(),
      auditEvent.userId,
      auditEvent.action,
      auditEvent.resource,
      auditEvent.result,
      auditEvent.ipAddress,
      auditEvent.userAgent,
      JSON.stringify(auditEvent.metadata),
      auditEvent.hash
    ]);

    this.logger.info(`Audit event logged: ${event.action} by ${event.userId}`);
    return id;
  }

  async logSecurityEvent(event: Omit<SecurityEvent, 'id'>): Promise<string> {
    const id = this.generateSecureId();
    
    const securityEvent: SecurityEvent = {
      ...event,
      id
    };

    const sql = `INSERT INTO security_events 
                 (id, timestamp, eventType, severity, description, userId, ipAddress, metadata) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    
    await this.runQuery(sql, [
      securityEvent.id,
      securityEvent.timestamp.toISOString(),
      securityEvent.eventType,
      securityEvent.severity,
      securityEvent.description,
      securityEvent.userId,
      securityEvent.ipAddress,
      JSON.stringify(securityEvent.metadata)
    ]);

    this.logger.warn(`Security event logged: ${event.eventType} - ${event.description}`);
    return id;
  }

  async logAIAction(userId: string, action: string, metadata?: Record<string, any>): Promise<string> {
    const id = this.generateSecureId();
    const hash = this.generateHash({ userId, action, timestamp: new Date() });
    
    const sql = `INSERT INTO ai_actions 
                 (id, timestamp, userId, action, metadata, hash) 
                 VALUES (?, ?, ?, ?, ?, ?)`;
    
    await this.runQuery(sql, [
      id,
      new Date().toISOString(),
      userId,
      action,
      JSON.stringify(metadata),
      hash
    ]);

    this.logger.info(`AI action logged: ${action} by ${userId} - PENDING APPROVAL`);
    return id;
  }

  async approveAIAction(actionId: string, approvedBy: string): Promise<boolean> {
    const sql = `UPDATE ai_actions 
                 SET approved_by = ?, approved_at = CURRENT_TIMESTAMP, executed = TRUE, executed_at = CURRENT_TIMESTAMP 
                 WHERE id = ?`;
    
    await this.runQuery(sql, [approvedBy, actionId]);
    
    this.logger.info(`AI action approved: ${actionId} by ${approvedBy}`);
    return true;
  }

  async getAuditTrail(userId?: string, startDate?: Date, endDate?: Date): Promise<AuditEvent[]> {
    let sql = 'SELECT * FROM audit_events';
    const params: any[] = [];
    const conditions: string[] = [];
    
    if (userId) {
      conditions.push('userId = ?');
      params.push(userId);
    }
    
    if (startDate) {
      conditions.push('timestamp >= ?');
      params.push(startDate.toISOString());
    }
    
    if (endDate) {
      conditions.push('timestamp <= ?');
      params.push(endDate.toISOString());
    }
    
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    
    sql += ' ORDER BY timestamp DESC LIMIT 1000';
    
    const rows = await this.getQuery(sql, params);
    return rows.map(row => ({
      id: row.id,
      timestamp: new Date(row.timestamp),
      userId: row.userId,
      action: row.action,
      resource: row.resource,
      result: row.result,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      metadata: JSON.parse(row.metadata || '{}'),
      hash: row.hash
    }));
  }

  async getSecurityEvents(severity?: string, eventType?: string): Promise<SecurityEvent[]> {
    let sql = 'SELECT * FROM security_events';
    const params: any[] = [];
    const conditions: string[] = [];
    
    if (severity) {
      conditions.push('severity = ?');
      params.push(severity);
    }
    
    if (eventType) {
      conditions.push('eventType = ?');
      params.push(eventType);
    }
    
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    
    sql += ' ORDER BY timestamp DESC LIMIT 500';
    
    const rows = await this.getQuery(sql, params);
    return rows.map(row => ({
      id: row.id,
      timestamp: new Date(row.timestamp),
      eventType: row.eventType,
      severity: row.severity,
      description: row.description,
      userId: row.userId,
      ipAddress: row.ipAddress,
      metadata: JSON.parse(row.metadata || '{}')
    }));
  }

  async getPendingAIActions(): Promise<any[]> {
    const sql = 'SELECT * FROM ai_actions WHERE executed = FALSE ORDER BY timestamp DESC';
    const rows = await this.getQuery(sql);
    return rows.map(row => ({
      id: row.id,
      timestamp: new Date(row.timestamp),
      userId: row.userId,
      action: row.action,
      metadata: JSON.parse(row.metadata || '{}'),
      hash: row.hash
    }));
  }

  private generateSecureId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private generateHash(data: any): string {
    const dataString = JSON.stringify(data);
    return crypto.createHmac('sha256', this.encryptionKey).update(dataString).digest('hex');
  }

  private runQuery(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this);
        }
      });
    });
  }

  private getQuery(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
}

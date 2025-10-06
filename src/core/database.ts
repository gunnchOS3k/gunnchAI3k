import { Database } from 'sqlite3';
import { Logger } from '../utils/logger';
import { Decision, Pattern } from './learning';

export interface Task {
  id: string;
  description: string;
  assignee?: string;
  deadline?: Date;
  createdBy: string;
  createdAt: Date;
  completed?: boolean;
  completedAt?: Date;
}

export interface Meeting {
  id: string;
  title: string;
  time: string;
  url?: string;
  createdBy: string;
  createdAt: Date;
}

export interface ProgressUpdate {
  id: string;
  progress: string;
  project?: string;
  userId: string;
  timestamp: Date;
}

export interface Metrics {
  tasksCompleted: number;
  successRate: number;
  learningProgress: number;
}

export class DatabaseManager {
  private db: Database;
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
  }

  async initialize() {
    return new Promise<void>((resolve, reject) => {
      this.db = new Database('./data/gunnchai3k.db', (err) => {
        if (err) {
          this.logger.error('Failed to initialize database:', err);
          reject(err);
        } else {
          this.logger.info('Database initialized successfully');
          this.createTables().then(() => resolve()).catch(reject);
        }
      });
    });
  }

  private async createTables() {
    const tables = [
      `CREATE TABLE IF NOT EXISTS decisions (
        id TEXT PRIMARY KEY,
        decision TEXT NOT NULL,
        outcome TEXT NOT NULL,
        context TEXT,
        timestamp DATETIME NOT NULL,
        userId TEXT NOT NULL
      )`,
      
      `CREATE TABLE IF NOT EXISTS patterns (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        frequency INTEGER NOT NULL,
        successRate REAL NOT NULL,
        recommendations TEXT,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL
      )`,
      
      `CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        description TEXT NOT NULL,
        assignee TEXT,
        deadline DATETIME,
        createdBy TEXT NOT NULL,
        createdAt DATETIME NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        completedAt DATETIME
      )`,
      
      `CREATE TABLE IF NOT EXISTS meetings (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        time TEXT NOT NULL,
        url TEXT,
        createdBy TEXT NOT NULL,
        createdAt DATETIME NOT NULL
      )`,
      
      `CREATE TABLE IF NOT EXISTS progress_updates (
        id TEXT PRIMARY KEY,
        progress TEXT NOT NULL,
        project TEXT,
        userId TEXT NOT NULL,
        timestamp DATETIME NOT NULL
      )`,
      
      `CREATE TABLE IF NOT EXISTS metrics (
        id TEXT PRIMARY KEY,
        metric TEXT NOT NULL,
        value REAL NOT NULL,
        timestamp DATETIME NOT NULL
      )`
    ];

    for (const table of tables) {
      await this.runQuery(table);
    }
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

  async storeDecision(decision: Decision) {
    const id = this.generateId();
    const sql = `INSERT INTO decisions (id, decision, outcome, context, timestamp, userId) 
                 VALUES (?, ?, ?, ?, ?, ?)`;
    await this.runQuery(sql, [
      id,
      decision.decision,
      decision.outcome,
      decision.context,
      decision.timestamp.toISOString(),
      decision.userId
    ]);
    return id;
  }

  async getDecisions(userId?: string, limit: number = 100): Promise<Decision[]> {
    let sql = 'SELECT * FROM decisions';
    const params: any[] = [];
    
    if (userId) {
      sql += ' WHERE userId = ?';
      params.push(userId);
    }
    
    sql += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);
    
    const rows = await this.getQuery(sql, params);
    return rows.map(row => ({
      decision: row.decision,
      outcome: row.outcome,
      context: row.context,
      timestamp: new Date(row.timestamp),
      userId: row.userId
    }));
  }

  async createPattern(pattern: Pattern): Promise<string> {
    const id = this.generateId();
    const sql = `INSERT INTO patterns (id, type, description, frequency, successRate, recommendations, createdAt, updatedAt) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    await this.runQuery(sql, [
      id,
      pattern.type,
      pattern.description,
      pattern.frequency,
      pattern.successRate,
      JSON.stringify(pattern.recommendations),
      new Date().toISOString(),
      new Date().toISOString()
    ]);
    return id;
  }

  async updatePattern(pattern: Pattern) {
    const sql = `UPDATE patterns SET frequency = ?, successRate = ?, recommendations = ?, updatedAt = ? 
                 WHERE type = ? AND description = ?`;
    await this.runQuery(sql, [
      pattern.frequency,
      pattern.successRate,
      JSON.stringify(pattern.recommendations),
      new Date().toISOString(),
      pattern.type,
      pattern.description
    ]);
  }

  async getPatterns(): Promise<Pattern[]> {
    const sql = 'SELECT * FROM patterns ORDER BY frequency DESC';
    const rows = await this.getQuery(sql);
    return rows.map(row => ({
      type: row.type,
      description: row.description,
      frequency: row.frequency,
      successRate: row.successRate,
      recommendations: JSON.parse(row.recommendations || '[]')
    }));
  }

  async createTask(task: Omit<Task, 'id'>): Promise<string> {
    const id = this.generateId();
    const sql = `INSERT INTO tasks (id, description, assignee, deadline, createdBy, createdAt) 
                 VALUES (?, ?, ?, ?, ?, ?)`;
    await this.runQuery(sql, [
      id,
      task.description,
      task.assignee,
      task.deadline?.toISOString(),
      task.createdBy,
      task.createdAt.toISOString()
    ]);
    return id;
  }

  async getTasks(assignee?: string): Promise<Task[]> {
    let sql = 'SELECT * FROM tasks';
    const params: any[] = [];
    
    if (assignee) {
      sql += ' WHERE assignee = ?';
      params.push(assignee);
    }
    
    sql += ' ORDER BY createdAt DESC';
    
    const rows = await this.getQuery(sql, params);
    return rows.map(row => ({
      id: row.id,
      description: row.description,
      assignee: row.assignee,
      deadline: row.deadline ? new Date(row.deadline) : undefined,
      createdBy: row.createdBy,
      createdAt: new Date(row.createdAt),
      completed: row.completed === 1,
      completedAt: row.completedAt ? new Date(row.completedAt) : undefined
    }));
  }

  async createMeeting(meeting: Omit<Meeting, 'id'>): Promise<string> {
    const id = this.generateId();
    const sql = `INSERT INTO meetings (id, title, time, url, createdBy, createdAt) 
                 VALUES (?, ?, ?, ?, ?, ?)`;
    await this.runQuery(sql, [
      id,
      meeting.title,
      meeting.time,
      meeting.url,
      meeting.createdBy,
      meeting.createdAt.toISOString()
    ]);
    return id;
  }

  async addProgressUpdate(update: Omit<ProgressUpdate, 'id'>): Promise<string> {
    const id = this.generateId();
    const sql = `INSERT INTO progress_updates (id, progress, project, userId, timestamp) 
                 VALUES (?, ?, ?, ?, ?)`;
    await this.runQuery(sql, [
      id,
      update.progress,
      update.project,
      update.userId,
      update.timestamp.toISOString()
    ]);
    return id;
  }

  async getMetrics(metric?: string): Promise<Metrics> {
    // Calculate basic metrics
    const tasksQuery = 'SELECT COUNT(*) as count FROM tasks WHERE completed = TRUE';
    const tasksResult = await this.getQuery(tasksQuery);
    const tasksCompleted = tasksResult[0].count;

    const decisionsQuery = 'SELECT COUNT(*) as count FROM decisions';
    const decisionsResult = await this.getQuery(decisionsQuery);
    const totalDecisions = decisionsResult[0].count;

    const successfulDecisionsQuery = `SELECT COUNT(*) as count FROM decisions 
                                     WHERE outcome LIKE '%success%' OR outcome LIKE '%good%' OR outcome LIKE '%great%'`;
    const successfulResult = await this.getQuery(successfulDecisionsQuery);
    const successfulDecisions = successfulResult[0].count;

    const successRate = totalDecisions > 0 ? (successfulDecisions / totalDecisions) * 100 : 0;

    // Calculate learning progress based on pattern diversity
    const patternsQuery = 'SELECT COUNT(DISTINCT type) as count FROM patterns';
    const patternsResult = await this.getQuery(patternsQuery);
    const learningProgress = Math.min(100, patternsResult[0].count * 20);

    return {
      tasksCompleted,
      successRate: Math.round(successRate),
      learningProgress: Math.round(learningProgress)
    };
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  async close() {
    return new Promise<void>((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}

/**
 * Persistent AI Projects with isolation and restart continuity.
 */

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface ProjectFile {
  path: string;
  kind: 'pdf' | 'code' | 'notes' | 'other';
  content: string;
  added_at: string;
}

export interface ProjectConversation {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  at: string;
}

export interface ProjectTask {
  id: string;
  title: string;
  status: 'open' | 'done' | 'cancelled';
  created_at: string;
}

export interface ProjectDecision {
  id: string;
  summary: string;
  at: string;
}

export interface ProjectSource {
  id: string;
  title: string;
  uri: string;
  local: boolean;
}

export interface ProjectPermissions {
  network: boolean;
  cloud: boolean;
  memory: boolean;
  camera: boolean;
  mic: boolean;
}

export interface Project {
  id: string;
  name: string;
  owner: string;
  created_at: string;
  updated_at: string;
  files: ProjectFile[];
  instructions: string;
  conversations: ProjectConversation[];
  tasks: ProjectTask[];
  decisions: ProjectDecision[];
  sources: ProjectSource[];
  memory_scope: string;
  tools: string[];
  artifacts: Record<string, string>;
  permissions: ProjectPermissions;
}

export class ProjectStore {
  private projects = new Map<string, Project>();

  constructor(private readonly rootDir: string) {
    fs.mkdirSync(rootDir, { recursive: true });
    this.load();
  }

  create(owner: string, name: string, instructions = ''): Project {
    const now = new Date().toISOString();
    const id = `proj_${crypto.randomBytes(6).toString('hex')}`;
    const project: Project = {
      id,
      name,
      owner,
      created_at: now,
      updated_at: now,
      files: [],
      instructions,
      conversations: [],
      tasks: [],
      decisions: [],
      sources: [],
      memory_scope: `project:${id}`,
      tools: ['search', 'summarize', 'code'],
      artifacts: {},
      permissions: {
        network: false,
        cloud: false,
        memory: true,
        camera: false,
        mic: false,
      },
    };
    this.projects.set(id, project);
    this.persist(project);
    return this.clone(project);
  }

  get(owner: string, id: string): Project | null {
    const p = this.projects.get(id);
    if (!p || p.owner !== owner) return null;
    return this.clone(p);
  }

  list(owner: string): Project[] {
    return [...this.projects.values()].filter((p) => p.owner === owner).map((p) => this.clone(p));
  }

  addFile(owner: string, projectId: string, file: Omit<ProjectFile, 'added_at'>): Project {
    const p = this.require(owner, projectId);
    p.files.push({ ...file, added_at: new Date().toISOString() });
    return this.touch(p);
  }

  askAi(owner: string, projectId: string, question: string): { answer: string; project: Project } {
    const p = this.require(owner, projectId);
    const now = new Date().toISOString();
    p.conversations.push({
      id: `c_${crypto.randomBytes(4).toString('hex')}`,
      role: 'user',
      text: question,
      at: now,
    });
    const contextBits = [
      p.instructions,
      ...p.files.map((f) => `[${f.kind}:${f.path}] ${f.content.slice(0, 400)}`),
      ...p.decisions.map((d) => `decision: ${d.summary}`),
    ]
      .filter(Boolean)
      .join('\n');
    const answer = `Project(${p.name}) response using local context:\n${contextBits.slice(0, 800)}\n— Q: ${question}`;
    p.conversations.push({
      id: `c_${crypto.randomBytes(4).toString('hex')}`,
      role: 'assistant',
      text: answer,
      at: new Date().toISOString(),
    });
    p.artifacts[`answer_${Date.now()}`] = answer;
    return { answer, project: this.touch(p) };
  }

  addTask(owner: string, projectId: string, title: string): Project {
    const p = this.require(owner, projectId);
    p.tasks.push({
      id: `t_${crypto.randomBytes(4).toString('hex')}`,
      title,
      status: 'open',
      created_at: new Date().toISOString(),
    });
    return this.touch(p);
  }

  addDecision(owner: string, projectId: string, summary: string): Project {
    const p = this.require(owner, projectId);
    p.decisions.push({
      id: `d_${crypto.randomBytes(4).toString('hex')}`,
      summary,
      at: new Date().toISOString(),
    });
    return this.touch(p);
  }

  reopen(owner: string, projectId: string): Project | null {
    this.load();
    return this.get(owner, projectId);
  }

  assertIsolation(owner: string, aId: string, bId: string): void {
    const a = this.require(owner, aId);
    const b = this.require(owner, bId);
    const aText = JSON.stringify(a);
    for (const f of b.files) {
      if (aText.includes(f.content) && f.content.length > 8) {
        throw new Error('PROJECT_LEAK_FILE_CONTENT');
      }
    }
    for (const c of b.conversations) {
      if (a.conversations.some((x) => x.id === c.id)) throw new Error('PROJECT_LEAK_CONVERSATION');
    }
    if (a.memory_scope === b.memory_scope) throw new Error('PROJECT_LEAK_MEMORY_SCOPE');
  }

  private require(owner: string, id: string): Project {
    const p = this.projects.get(id);
    if (!p || p.owner !== owner) throw new Error('PROJECT_NOT_FOUND_OR_FORBIDDEN');
    return p;
  }

  private touch(p: Project): Project {
    p.updated_at = new Date().toISOString();
    this.persist(p);
    return this.clone(p);
  }

  private clone(p: Project): Project {
    return JSON.parse(JSON.stringify(p)) as Project;
  }

  private fileFor(id: string): string {
    return path.join(this.rootDir, `${id}.json`);
  }

  private persist(p: Project): void {
    fs.writeFileSync(this.fileFor(p.id), JSON.stringify(p, null, 2) + '\n');
  }

  private load(): void {
    this.projects.clear();
    if (!fs.existsSync(this.rootDir)) return;
    for (const name of fs.readdirSync(this.rootDir)) {
      if (!name.endsWith('.json')) continue;
      try {
        const p = JSON.parse(fs.readFileSync(path.join(this.rootDir, name), 'utf8')) as Project;
        this.projects.set(p.id, p);
      } catch {
        /* skip */
      }
    }
  }
}

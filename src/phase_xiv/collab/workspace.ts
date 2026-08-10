/** Collaboration workspace — shared content only; no personal memory leak. */

import * as crypto from 'node:crypto';

export interface CollabMember {
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
}

export interface CollabComment {
  id: string;
  user_id: string;
  text: string;
  at: string;
}

export interface CollabProject {
  id: string;
  name: string;
  members: CollabMember[];
  shared_artifacts: string[];
  comments: CollabComment[];
  tasks: Array<{ id: string; title: string; assignee: string | null }>;
}

export class CollaborationWorkspace {
  private projects = new Map<string, CollabProject>();
  /** Personal memories must never be copied into shared projects. */
  private personalMemory = new Map<string, string[]>();

  rememberPersonal(user_id: string, fact: string): void {
    if (!this.personalMemory.has(user_id)) this.personalMemory.set(user_id, []);
    this.personalMemory.get(user_id)!.push(fact);
  }

  create(name: string, owner: string): CollabProject {
    const p: CollabProject = {
      id: `collab_${crypto.randomBytes(4).toString('hex')}`,
      name,
      members: [{ user_id: owner, role: 'owner' }],
      shared_artifacts: [],
      comments: [],
      tasks: [],
    };
    this.projects.set(p.id, p);
    return p;
  }

  addMember(project_id: string, user_id: string, role: CollabMember['role'] = 'editor'): void {
    this.must(project_id).members.push({ user_id, role });
  }

  comment(project_id: string, user_id: string, text: string): CollabComment {
    const p = this.must(project_id);
    if (!p.members.some((m) => m.user_id === user_id)) throw new Error('NOT_A_MEMBER');
    // Strip accidental personal memory injection
    const personal = this.personalMemory.get(user_id) || [];
    let clean = text;
    for (const fact of personal) {
      if (clean.includes(fact)) clean = clean.replaceAll(fact, '[REDACTED_PERSONAL_MEMORY]');
    }
    const c = { id: `c_${crypto.randomBytes(3).toString('hex')}`, user_id, text: clean, at: new Date().toISOString() };
    p.comments.push(c);
    return c;
  }

  shareArtifact(project_id: string, artifact_id: string): void {
    this.must(project_id).shared_artifacts.push(artifact_id);
  }

  /** AI assistance scoped to shared content only. */
  assist(project_id: string, user_id: string, prompt: string): string {
    const p = this.must(project_id);
    if (!p.members.some((m) => m.user_id === user_id)) throw new Error('NOT_A_MEMBER');
    const personal = this.personalMemory.get(user_id) || [];
    for (const fact of personal) {
      if (prompt.includes(fact)) {
        throw new Error('PERSONAL_MEMORY_LEAK_BLOCKED');
      }
    }
    return `Shared-scope assist on ${p.name}: artifacts=${p.shared_artifacts.length} comments=${p.comments.length}`;
  }

  exportShared(project_id: string): Omit<CollabProject, never> {
    return structuredClone(this.must(project_id));
  }

  private must(id: string): CollabProject {
    const p = this.projects.get(id);
    if (!p) throw new Error(`UNKNOWN_COLLAB:${id}`);
    return p;
  }
}

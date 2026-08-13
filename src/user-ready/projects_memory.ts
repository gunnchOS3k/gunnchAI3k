/**
 * Project workspace + encrypted memory continuity (ChatGPT/Claude/Perplexity class).
 */

import { GunnchMemoryStore } from '../stage2/memory/store';
import { ProjectStore, type Project } from '../stage2/projects/store';

export interface ProjectMemorySession {
  project: Project;
  remembered: string[];
}

export class ProjectMemoryRuntime {
  readonly projects: ProjectStore;
  readonly memory: GunnchMemoryStore;

  constructor(projectDir: string, memoryDir: string, ownerKey: string) {
    this.projects = new ProjectStore(projectDir);
    this.memory = new GunnchMemoryStore(memoryDir, ownerKey);
  }

  start(owner: string, name: string, instructions: string): ProjectMemorySession {
    const project = this.projects.create(owner, name, instructions);
    this.memory.write({
      owner,
      domain: 'PROJECT',
      type: 'project_started',
      content: `Started project ${name}`,
      project_scope: project.id,
      sync_policy: 'local_only',
      sensitivity: 'personal',
    });
    return { project, remembered: [`Started project ${name}`] };
  }

  remember(owner: string, projectId: string, fact: string): void {
    this.projects.get(owner, projectId);
    this.memory.write({
      owner,
      domain: 'PROJECT',
      type: 'fact',
      content: fact,
      project_scope: projectId,
      sync_policy: 'local_only',
      sensitivity: 'personal',
    });
  }

  ask(owner: string, projectId: string, question: string): { answer: string; rememberedHits: string[] } {
    const { answer } = this.projects.askAi(owner, projectId, question);
    const hits = this.memory
      .search(owner, question)
      .filter((r) => r.project_scope === projectId)
      .map((r) => r.content);
    return {
      answer: hits.length ? `${answer}\nRemembered: ${hits.join(' | ')}` : answer,
      rememberedHits: hits,
    };
  }

  reopen(owner: string, projectId: string): ProjectMemorySession | null {
    const project = this.projects.reopen(owner, projectId);
    if (!project) return null;
    const remembered = this.memory
      .list(owner)
      .filter((r) => r.project_scope === projectId)
      .map((r) => r.content);
    return { project, remembered };
  }

  assertIsolation(owner: string, aId: string, bId: string): void {
    this.projects.assertIsolation(owner, aId, bId);
    this.memory.assertNoCrossProjectLeak(owner, aId, bId);
  }
}

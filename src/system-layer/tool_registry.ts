/**
 * Formal tool registry with provenance stamps (Stream B pre-human exhaustion).
 * Deny-by-default. Wraps the user-ready AGENT_TOOL_CATALOG without expanding privileges.
 */

import { createHash } from 'node:crypto';
import {
  AGENT_TOOL_CATALOG,
  type AgentToolId,
  type ToolSchema,
} from '../user-ready/agent_tools';

export type ToolRegistryDecision = 'allowed' | 'denied' | 'unknown_tool';

export interface ToolProvenance {
  registryVersion: string;
  toolId: AgentToolId | string;
  capability: string;
  permission: string;
  schemaSha256: string;
  decidedAt: string;
  decision: ToolRegistryDecision;
  reason: string;
}

export interface ToolRegistrySnapshot {
  schemaVersion: 'gunnchai.tool_registry.v1';
  registryVersion: string;
  toolCount: number;
  tools: ToolSchema[];
  claimBoundary: string;
}

const REGISTRY_VERSION = 'stream-b-pre-human-1';

function schemaHash(tool: ToolSchema): string {
  return createHash('sha256').update(JSON.stringify(tool)).digest('hex');
}

export class ToolRegistry {
  private readonly byId = new Map<string, ToolSchema>();

  constructor(catalog: ToolSchema[] = AGENT_TOOL_CATALOG) {
    for (const tool of catalog) {
      this.byId.set(tool.id, tool);
    }
  }

  list(): ToolSchema[] {
    return [...this.byId.values()];
  }

  get(id: string): ToolSchema | undefined {
    return this.byId.get(id);
  }

  /**
   * Resolve a tool invocation. Unknown tools are denied (fail-closed).
   */
  authorize(toolId: string): ToolProvenance {
    const decidedAt = new Date().toISOString();
    const tool = this.byId.get(toolId);
    if (!tool) {
      return {
        registryVersion: REGISTRY_VERSION,
        toolId,
        capability: '',
        permission: '',
        schemaSha256: '',
        decidedAt,
        decision: 'unknown_tool',
        reason: 'TOOL_NOT_IN_REGISTRY',
      };
    }
    return {
      registryVersion: REGISTRY_VERSION,
      toolId: tool.id,
      capability: tool.capability,
      permission: tool.permission,
      schemaSha256: schemaHash(tool),
      decidedAt,
      decision: 'allowed',
      reason: 'CATALOG_ALLOWLIST',
    };
  }

  snapshot(): ToolRegistrySnapshot {
    return {
      schemaVersion: 'gunnchai.tool_registry.v1',
      registryVersion: REGISTRY_VERSION,
      toolCount: this.byId.size,
      tools: this.list(),
      claimBoundary:
        'Registry enumerates allowlisted tools only. Not a claim of production LMS or live tutoring evidence.',
    };
  }
}

export function createDefaultToolRegistry(): ToolRegistry {
  return new ToolRegistry();
}

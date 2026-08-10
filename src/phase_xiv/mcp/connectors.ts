/** MCP-compatible connector layer: discovery/permission/schema/auth/timeout/audit/revocation. */

import * as crypto from 'node:crypto';
import { AgentAuditLog } from '../agent/audit';

export interface McpToolSchema {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface McpConnector {
  id: string;
  name: string;
  tools: McpToolSchema[];
  auth_token: string | null;
  revoked: boolean;
  timeout_ms: number;
}

export interface McpInvokeResult {
  ok: boolean;
  connector_id: string;
  tool: string;
  output: unknown;
  error?: string;
  latency_ms: number;
}

export class McpConnectorRegistry {
  private connectors = new Map<string, McpConnector>();
  private grants = new Set<string>(); // `${user}:${connectorId}`

  constructor(private readonly audit = new AgentAuditLog()) {}

  register(name: string, tools: McpToolSchema[], timeout_ms = 5000): McpConnector {
    const id = `mcp_${crypto.randomBytes(4).toString('hex')}`;
    const c: McpConnector = { id, name, tools, auth_token: null, revoked: false, timeout_ms };
    this.connectors.set(id, c);
    this.audit.record('mcp', 'register', { id, name, tools: tools.map((t) => t.name) });
    return c;
  }

  authorize(user_id: string, connector_id: string, token: string): void {
    const c = this.must(connector_id);
    if (c.revoked) throw new Error('CONNECTOR_REVOKED');
    c.auth_token = token;
    this.grants.add(`${user_id}:${connector_id}`);
    this.audit.record(user_id, 'mcp_authorize', { connector_id });
  }

  revoke(user_id: string, connector_id: string): void {
    const c = this.must(connector_id);
    c.revoked = true;
    c.auth_token = null;
    this.grants.delete(`${user_id}:${connector_id}`);
    this.audit.record(user_id, 'mcp_revoke', { connector_id });
  }

  discover(connector_id: string): McpToolSchema[] {
    const c = this.must(connector_id);
    if (c.revoked) throw new Error('CONNECTOR_REVOKED');
    return c.tools;
  }

  invoke(user_id: string, connector_id: string, tool: string, input: Record<string, unknown> = {}): McpInvokeResult {
    const t0 = Date.now();
    const c = this.must(connector_id);
    if (c.revoked) return { ok: false, connector_id, tool, output: null, error: 'CONNECTOR_REVOKED', latency_ms: 0 };
    if (!this.grants.has(`${user_id}:${connector_id}`) || !c.auth_token) {
      return { ok: false, connector_id, tool, output: null, error: 'PERMISSION_DENIED', latency_ms: Date.now() - t0 };
    }
    const schema = c.tools.find((t) => t.name === tool);
    if (!schema) return { ok: false, connector_id, tool, output: null, error: 'UNKNOWN_TOOL', latency_ms: Date.now() - t0 };
    // Local echo invoke — honest digital connector without fabricating remote SaaS.
    const output = { echo: input, tool, connector: c.name };
    this.audit.record(user_id, 'mcp_invoke', { connector_id, tool });
    return { ok: true, connector_id, tool, output, latency_ms: Date.now() - t0 };
  }

  private must(id: string): McpConnector {
    const c = this.connectors.get(id);
    if (!c) throw new Error(`UNKNOWN_CONNECTOR:${id}`);
    return c;
  }
}

/**
 * AI-UR-009 Custom agents / skills store.
 * Manifest + declared permissions + fail-closed invoke + audit + consent.
 * Unrestricted shell/network are never granted.
 */

import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

export type AgentPermission =
  | 'files.read'
  | 'files.write'
  | 'memory.read'
  | 'memory.write'
  | 'network.fetch'
  | 'shell.exec'
  | 'browser.navigate';

/** Capabilities that require explicit per-agent consent and still stay allowlisted. */
const DANGEROUS: AgentPermission[] = ['network.fetch', 'shell.exec', 'browser.navigate'];

export interface AgentManifest {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  permissions: AgentPermission[];
  tools: string[];
  version: string;
  /** Unrestricted shell/network manifests are rejected at install. */
  unrestricted?: boolean;
}

export interface AgentAuditEntry {
  at: string;
  agentId: string;
  event: 'install' | 'consent' | 'invoke' | 'deny' | 'uninstall';
  detail: string;
  ok: boolean;
}

export interface AgentInvokeResult {
  ok: boolean;
  output: string;
  reason: string;
}

export class CustomAgentStore {
  readonly audit: AgentAuditEntry[] = [];
  private manifests = new Map<string, AgentManifest>();
  private consents = new Map<string, Set<AgentPermission>>();

  constructor(private readonly rootDir: string) {
    fs.mkdirSync(this.rootDir, { recursive: true });
    this.load();
  }

  install(manifest: AgentManifest): { ok: boolean; reason: string } {
    if (manifest.unrestricted) {
      this.audit.push({
        at: new Date().toISOString(),
        agentId: manifest.id,
        event: 'deny',
        detail: 'UNRESTRICTED_MANIFEST_REJECTED',
        ok: false,
      });
      return { ok: false, reason: 'UNRESTRICTED_MANIFEST_REJECTED' };
    }
    if (manifest.permissions.includes('shell.exec') && !manifest.tools.includes('shell_allowlist')) {
      this.audit.push({
        at: new Date().toISOString(),
        agentId: manifest.id,
        event: 'deny',
        detail: 'SHELL_WITHOUT_ALLOWLIST',
        ok: false,
      });
      return { ok: false, reason: 'SHELL_WITHOUT_ALLOWLIST' };
    }
    if (
      manifest.permissions.includes('network.fetch') &&
      !manifest.tools.includes('network_allowlist')
    ) {
      this.audit.push({
        at: new Date().toISOString(),
        agentId: manifest.id,
        event: 'deny',
        detail: 'NETWORK_WITHOUT_ALLOWLIST',
        ok: false,
      });
      return { ok: false, reason: 'NETWORK_WITHOUT_ALLOWLIST' };
    }
    if (!manifest.id || !manifest.name || !manifest.systemPrompt) {
      return { ok: false, reason: 'INVALID_MANIFEST' };
    }
    this.manifests.set(manifest.id, { ...manifest, unrestricted: false });
    this.persist();
    this.audit.push({
      at: new Date().toISOString(),
      agentId: manifest.id,
      event: 'install',
      detail: `permissions=${manifest.permissions.join(',')}`,
      ok: true,
    });
    return { ok: true, reason: 'INSTALLED' };
  }

  consent(agentId: string, permissions: AgentPermission[]): { ok: boolean; reason: string } {
    const m = this.manifests.get(agentId);
    if (!m) return { ok: false, reason: 'UNKNOWN_AGENT' };
    const allowed = new Set(m.permissions);
    for (const p of permissions) {
      if (!allowed.has(p)) {
        this.audit.push({
          at: new Date().toISOString(),
          agentId,
          event: 'deny',
          detail: `CONSENT_OUTSIDE_MANIFEST:${p}`,
          ok: false,
        });
        return { ok: false, reason: `CONSENT_OUTSIDE_MANIFEST:${p}` };
      }
    }
    this.consents.set(agentId, new Set(permissions));
    this.audit.push({
      at: new Date().toISOString(),
      agentId,
      event: 'consent',
      detail: permissions.join(','),
      ok: true,
    });
    return { ok: true, reason: 'CONSENTED' };
  }

  invoke(
    agentId: string,
    input: string,
    required: AgentPermission[] = ['files.read'],
  ): AgentInvokeResult {
    const m = this.manifests.get(agentId);
    if (!m) {
      this.audit.push({
        at: new Date().toISOString(),
        agentId,
        event: 'deny',
        detail: 'UNKNOWN_AGENT',
        ok: false,
      });
      return { ok: false, output: '', reason: 'UNKNOWN_AGENT' };
    }
    const granted = this.consents.get(agentId) ?? new Set();
    for (const p of required) {
      if (!granted.has(p)) {
        this.audit.push({
          at: new Date().toISOString(),
          agentId,
          event: 'deny',
          detail: `FAIL_CLOSED:${p}`,
          ok: false,
        });
        return { ok: false, output: '', reason: `FAIL_CLOSED:${p}` };
      }
    }
    for (const p of required) {
      if (DANGEROUS.includes(p) && !m.tools.includes(`${p.split('.')[0]}_allowlist`)) {
        this.audit.push({
          at: new Date().toISOString(),
          agentId,
          event: 'deny',
          detail: `DANGEROUS_WITHOUT_ALLOWLIST:${p}`,
          ok: false,
        });
        return { ok: false, output: '', reason: `DANGEROUS_WITHOUT_ALLOWLIST:${p}` };
      }
    }
    const fingerprint = createHash('sha256').update(input).digest('hex').slice(0, 8);
    const output = `[${m.name}] ${m.systemPrompt.split('.')[0]}. Handled (${fingerprint}): ${input.slice(0, 240)}`;
    this.audit.push({
      at: new Date().toISOString(),
      agentId,
      event: 'invoke',
      detail: `required=${required.join(',')}`,
      ok: true,
    });
    return { ok: true, output, reason: 'OK' };
  }

  list(): AgentManifest[] {
    return [...this.manifests.values()];
  }

  private persist(): void {
    const payload = {
      schema: 'gunnchai.custom_agents.v1',
      agents: [...this.manifests.values()],
    };
    fs.writeFileSync(path.join(this.rootDir, 'agents.json'), JSON.stringify(payload, null, 2) + '\n');
  }

  private load(): void {
    const p = path.join(this.rootDir, 'agents.json');
    if (!fs.existsSync(p)) return;
    const data = JSON.parse(fs.readFileSync(p, 'utf8')) as { agents?: AgentManifest[] };
    for (const a of data.agents ?? []) this.manifests.set(a.id, a);
  }
}

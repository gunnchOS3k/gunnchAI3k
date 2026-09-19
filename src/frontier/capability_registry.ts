import * as fs from 'node:fs';
import * as path from 'node:path';

export type AdoptionStatus = 'research' | 'qualified' | 'adopted' | 'deferred' | 'rejected';
export type SideEffectClass = 'read_only' | 'mutating' | 'network' | 'destructive';
export type PrivacyClass = 'public' | 'personal' | 'sensitive' | 'device_local';

export interface FrontierCapability {
  id: string;
  name: string;
  capability_class: string;
  description: string;
  adoption_status: AdoptionStatus | string;
  maturity: string;
  local_offline_viable: boolean | string;
  cloud_optional: boolean;
  consent_required: boolean;
  verification_required: boolean;
  side_effect_class: SideEffectClass | string;
  privacy_class: PrivacyClass | string;
  budget_dimensions: string[];
  device_constraints: string[];
  provider_agnostic: boolean;
  hard_provider_pin: boolean;
  hidden_cot_required: boolean;
  broker_mediated: boolean;
  kirby_absorption_notes: string;
  qualification_slots: string[];
  integrations: string[];
  references: string[];
  evidence_refs: string[];
  gate_tokens: string[];
}

export interface CapabilityRegistryDoc {
  schema_version: string;
  identity: string;
  doctrine_ref: string;
  capabilities: FrontierCapability[];
}

export class CapabilityRegistry {
  constructor(private readonly doc: CapabilityRegistryDoc) {}

  static load(repoRoot = process.cwd()): CapabilityRegistry {
    const p = path.join(repoRoot, 'config', 'frontier_capabilities.json');
    const doc = JSON.parse(fs.readFileSync(p, 'utf8')) as CapabilityRegistryDoc;
    return new CapabilityRegistry(doc);
  }

  all(): FrontierCapability[] {
    return [...this.doc.capabilities];
  }

  get(id: string): FrontierCapability | undefined {
    return this.doc.capabilities.find((c) => c.id === id);
  }

  byClass(capabilityClass: string): FrontierCapability[] {
    return this.doc.capabilities.filter((c) => c.capability_class === capabilityClass);
  }

  requireBrokerMediated(id: string): boolean {
    const c = this.get(id);
    return Boolean(c?.broker_mediated);
  }

  snapshot(): CapabilityRegistryDoc {
    return JSON.parse(JSON.stringify(this.doc)) as CapabilityRegistryDoc;
  }
}

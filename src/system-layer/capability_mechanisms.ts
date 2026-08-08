/**
 * Continuance IV — best mechanism per capability.
 * LLM where generation quality matters; deterministic where checklists /
 * safety / auditability dominate; hybrid when both are needed.
 */

import type { SystemCapability } from './model_registry';

export type CapabilityMechanism =
  | 'llm'
  | 'deterministic'
  | 'hybrid'
  | 'local_rag'
  | 'local_rag_hybrid';

export interface CapabilityMechanismSpec {
  capability: SystemCapability;
  mechanism: CapabilityMechanism;
  rationale: string;
  usesLlamaCpp: boolean;
  usesLocalRag: boolean;
}

export const CAPABILITY_MECHANISMS: CapabilityMechanismSpec[] = [
  {
    capability: 'tutoring',
    mechanism: 'hybrid',
    rationale:
      'Deterministic rubric (concept/steps/check) + small LLM narrative for explanation quality.',
    usesLlamaCpp: true,
    usesLocalRag: true,
  },
  {
    capability: 'code',
    mechanism: 'hybrid',
    rationale:
      'Deterministic typed early-return scaffold; LLM may annotate but structure must pass eval.',
    usesLlamaCpp: true,
    usesLocalRag: false,
  },
  {
    capability: 'device_help',
    mechanism: 'deterministic',
    rationale:
      'Profile-aware local steps must be exact and auditable; no generative drift.',
    usesLlamaCpp: false,
    usesLocalRag: false,
  },
  {
    capability: 'a11y',
    mechanism: 'deterministic',
    rationale: 'WCAG checklist coverage is rule-based; LLM would add noise.',
    usesLlamaCpp: false,
    usesLocalRag: false,
  },
  {
    capability: 'game_coach',
    mechanism: 'hybrid',
    rationale: 'State analysis template + LLM tip phrasing when available.',
    usesLlamaCpp: true,
    usesLocalRag: false,
  },
  {
    capability: 'network',
    mechanism: 'deterministic',
    rationale: 'Connectivity checklist must be complete and local-only.',
    usesLlamaCpp: false,
    usesLocalRag: false,
  },
  {
    capability: 'rag',
    mechanism: 'local_rag_hybrid',
    rationale:
      'Local fixture retrieval + ranking required; optional LLM synthesis over grounded chunks.',
    usesLlamaCpp: true,
    usesLocalRag: true,
  },
  {
    capability: 'scientific',
    mechanism: 'hybrid',
    rationale:
      'Attribution + caveats stay deterministic; LLM wording only over local claims.',
    usesLlamaCpp: true,
    usesLocalRag: true,
  },
  {
    capability: 'translation',
    mechanism: 'hybrid',
    rationale: 'Offline glossary hits first; LLM only for passthrough gaps.',
    usesLlamaCpp: true,
    usesLocalRag: false,
  },
  {
    capability: 'workflow',
    mechanism: 'deterministic',
    rationale: 'Automatable audit steps must be stable and cloud-free.',
    usesLlamaCpp: false,
    usesLocalRag: false,
  },
  {
    capability: 'security',
    mechanism: 'deterministic',
    rationale:
      'Defensive explanations must refuse exploits; generative free-form is unsafe here.',
    usesLlamaCpp: false,
    usesLocalRag: false,
  },
];

export function mechanismFor(
  capability: SystemCapability,
): CapabilityMechanismSpec {
  const hit = CAPABILITY_MECHANISMS.find((m) => m.capability === capability);
  if (!hit) {
    throw new Error(`No mechanism registered for ${capability}`);
  }
  return hit;
}

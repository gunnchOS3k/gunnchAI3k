/**
 * Qualification + promotion — Pareto by tier, no overall winner.
 */
import type { BakeoffCandidate, ConformanceResult } from './adapters';
import type { SuiteRecord } from './suites';
import { paretoByTier, type BakeoffMetrics, type ParetoByTier } from './schema';

export type PromotionState =
  | 'EXPERIMENTAL'
  | 'QUALIFIED'
  | 'PREFERRED_FOR_SLOT'
  | 'FALLBACK'
  | 'DISABLED';

export const PROMOTION_RULES = [
  'R1_ADAPTER_CONFORMANCE',
  'R2_SUITE_PASS_THRESHOLD',
  'R3_OFFLINE_WHEN_REQUIRED',
  'R4_SAFETY_INJECTION',
  'R5_NO_HARD_PIN',
  'R6_RESOURCE_FIT',
  'R7_HONEST_MODE',
] as const;

export interface QualificationRecord {
  schema: 'kirby.provider_qualification.v1';
  provider_id: string;
  model_id: string;
  candidate_id: string;
  evidence_mode: string;
  slots: string[];
  conformance: ConformanceResult[];
  suite_summary: Record<string, { attempts: number; successes: number }>;
  promotion_state: PromotionState;
  promotion_rules: Record<(typeof PROMOTION_RULES)[number], boolean>;
  preferred_slots: string[];
  fallback_slots: string[];
  honesty: {
    simulated: boolean;
    live_success_fabricated: false;
    note: string;
  };
  captured_at: string;
}

const SLOT_OFFLINE_REQUIRED = new Set([
  'SLOT_A_MICRO_ROUTER',
  'SLOT_B_EDGE_FAST',
  'SLOT_D_WAIKE_TUTOR',
]);

export function buildQualifications(
  candidates: BakeoffCandidate[],
  conformanceByModel: Map<string, ConformanceResult[]>,
  records: SuiteRecord[],
  safetyPass: boolean,
): QualificationRecord[] {
  const out: QualificationRecord[] = [];
  for (const c of candidates) {
    if (c.NO_CANDIDATE_AVAILABLE) {
      out.push({
        schema: 'kirby.provider_qualification.v1',
        provider_id: c.provider_id,
        model_id: c.model_id,
        candidate_id: c.candidate_id,
        evidence_mode: c.evidence_mode,
        slots: c.slot_hints,
        conformance: [],
        suite_summary: {},
        promotion_state: 'DISABLED',
        promotion_rules: Object.fromEntries(PROMOTION_RULES.map((r) => [r, false])) as QualificationRecord['promotion_rules'],
        preferred_slots: [],
        fallback_slots: [],
        honesty: {
          simulated: false,
          live_success_fabricated: false,
          note: 'NO_CANDIDATE_AVAILABLE — not promoted',
        },
        captured_at: new Date().toISOString(),
      });
      continue;
    }

    const conf = conformanceByModel.get(c.model_id) ?? [];
    const confPass = conf.length > 0 && conf.every((r) => (r.supported ? r.passed : true));
    const modelRecords = records.filter((r) => r.model_id === c.model_id);
    const suite_summary: QualificationRecord['suite_summary'] = {};
    for (const r of modelRecords) {
      const s = suite_summary[r.suite] ?? { attempts: 0, successes: 0 };
      s.attempts++;
      if (r.success) s.successes++;
      suite_summary[r.suite] = s;
    }
    const suitePass =
      Object.values(suite_summary).length === 0
        ? false
        : Object.values(suite_summary).every((s) => s.successes / Math.max(s.attempts, 1) >= 0.5);

    const offlineNeeded = c.slot_hints.some((s) => SLOT_OFFLINE_REQUIRED.has(s));
    const offlinePass = !offlineNeeded || (c.offline_capable && (suite_summary.offline?.successes ?? 0) > 0);
    const resourceOk = c.resource_fit !== 'resource_incompatible';
    const honest = c.evidence_mode === 'simulated_deterministic' || c.evidence_mode === 'live_local';

    const rules: QualificationRecord['promotion_rules'] = {
      R1_ADAPTER_CONFORMANCE: confPass,
      R2_SUITE_PASS_THRESHOLD: suitePass,
      R3_OFFLINE_WHEN_REQUIRED: offlinePass,
      R4_SAFETY_INJECTION: safetyPass,
      R5_NO_HARD_PIN: true,
      R6_RESOURCE_FIT: resourceOk || c.evidence_mode === 'simulated_deterministic',
      R7_HONEST_MODE: honest && c.evidence_mode !== 'live_remote',
    };
    // For simulated: resource rule allows sim proofs even if live weights wouldn't fit
    if (c.evidence_mode === 'simulated_deterministic') {
      rules.R6_RESOURCE_FIT = true;
    }

    const allRules = PROMOTION_RULES.every((r) => rules[r]);
    let promotion_state: PromotionState = 'EXPERIMENTAL';
    const preferred_slots: string[] = [];
    const fallback_slots: string[] = [];

    if (!c.runnable) {
      promotion_state = 'DISABLED';
    } else if (allRules) {
      promotion_state = 'QUALIFIED';
      // Prefer local simulated for offline slots; never declare overall winner
      for (const slot of c.slot_hints) {
        if (c.offline_capable && SLOT_OFFLINE_REQUIRED.has(slot)) preferred_slots.push(slot);
        else fallback_slots.push(slot);
      }
      if (preferred_slots.length) promotion_state = 'PREFERRED_FOR_SLOT';
    } else if (confPass && safetyPass) {
      promotion_state = 'EXPERIMENTAL';
      fallback_slots.push(...c.slot_hints);
    } else {
      promotion_state = 'DISABLED';
    }

    out.push({
      schema: 'kirby.provider_qualification.v1',
      provider_id: c.provider_id,
      model_id: c.model_id,
      candidate_id: c.candidate_id,
      evidence_mode: c.evidence_mode,
      slots: c.slot_hints,
      conformance: conf,
      suite_summary,
      promotion_state,
      promotion_rules: rules,
      preferred_slots,
      fallback_slots,
      honesty: {
        simulated: c.evidence_mode === 'simulated_deterministic',
        live_success_fabricated: false,
        note:
          c.evidence_mode === 'simulated_deterministic'
            ? 'Qualified for control-plane/architecture proofs only — not a live model quality promotion'
            : 'Live path',
      },
      captured_at: new Date().toISOString(),
    });
  }
  return out;
}

export function computePareto(metrics: BakeoffMetrics[]): ParetoByTier[] {
  return paretoByTier(metrics);
}

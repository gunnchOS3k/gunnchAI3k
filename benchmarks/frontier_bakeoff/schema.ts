export type BakeoffSuite = 'waike' | 'coding' | 'device' | 'research' | 'creator';

export interface QualificationSlot {
  id: string;
  description: string;
}

export interface BakeoffTask {
  id: string;
  suite: BakeoffSuite;
  tier: 0 | 1 | 2 | 3 | 4;
  prompt: string;
  success_criteria: string[];
}

export interface BakeoffMetrics {
  task_id: string;
  model_id: string;
  tier: number;
  success: boolean;
  latency_ms: number;
  cost_usd: number;
  energy_j: number;
  verifier_pass: boolean;
}

export interface ParetoByTier {
  tier: number;
  non_dominated: BakeoffMetrics[];
  note: 'No overall ranking — Pareto within tier only';
}

export const QUALIFICATION_SLOTS: QualificationSlot[] = [
  { id: 'tier_fit', description: 'Fits ladder tier budgets' },
  { id: 'offline_degrade', description: 'Degrades offline without crash' },
  { id: 'safety', description: 'Injection/safety guards hold' },
  { id: 'verifier_pass', description: 'Domain verifier contracts pass' },
  { id: 'tool_broker', description: 'Tools are broker-mediated' },
];

export const BAKEOFF_TASKS: BakeoffTask[] = [
  { id: 'waike_socratic_1', suite: 'waike', tier: 1, prompt: 'Explain Nyquist without giving exam answers', success_criteria: ['socratic', 'no_exam_dump'] },
  { id: 'coding_repair_1', suite: 'coding', tier: 2, prompt: 'Repair failing unit test fixture', success_criteria: ['tests_passed'] },
  { id: 'device_offline_1', suite: 'device', tier: 0, prompt: 'Diagnose offline device status', success_criteria: ['offline_ok'] },
  { id: 'research_cite_1', suite: 'research', tier: 3, prompt: 'Summarize public frontier pattern with citations', success_criteria: ['citations'] },
  { id: 'creator_doc_1', suite: 'creator', tier: 2, prompt: 'Draft studio doc outline', success_criteria: ['artifact'] },
];

export function paretoByTier(rows: BakeoffMetrics[]): ParetoByTier[] {
  const tiers = [...new Set(rows.map((r) => r.tier))].sort();
  return tiers.map((tier) => {
    const group = rows.filter((r) => r.tier === tier && r.success);
    const non = group.filter(
      (a) =>
        !group.some(
          (b) =>
            b !== a &&
            b.latency_ms <= a.latency_ms &&
            b.cost_usd <= a.cost_usd &&
            b.energy_j <= a.energy_j &&
            (b.latency_ms < a.latency_ms || b.cost_usd < a.cost_usd || b.energy_j < a.energy_j),
        ),
    );
    return { tier, non_dominated: non, note: 'No overall ranking — Pareto within tier only' as const };
  });
}

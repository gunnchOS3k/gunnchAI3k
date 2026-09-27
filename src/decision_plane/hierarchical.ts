import type { DecisionQuestion, DecisionRequest } from './contracts';
import type { DecisionBroker } from './decision_broker';

export const HIGH_CARDINALITY_LIMIT = 24;

export interface HierarchicalRouteResult {
  stage1_eligible: string[];
  final_choice: string | null;
  used_hierarchy: boolean;
  reason: string;
}

export async function hierarchicalChoice(
  broker: DecisionBroker,
  base: Omit<DecisionRequest, 'questions'>,
  candidates: Record<string, unknown>,
  topK = 5,
): Promise<HierarchicalRouteResult> {
  const keys = Object.keys(candidates);
  if (keys.length === 0) return { stage1_eligible: [], final_choice: null, used_hierarchy: false, reason: 'EMPTY' };
  if (keys.length <= HIGH_CARDINALITY_LIMIT) {
    const questions: Record<string, DecisionQuestion> = {
      pick: { type: 'categorical_choice', choices: candidates, instructions: 'Select the best candidate.' },
    };
    const result = await broker.evaluate({ ...base, questions });
    const ans = result.response.answers.pick;
    return {
      stage1_eligible: keys,
      final_choice: ans && ans.type === 'categorical_choice' ? ans.choice : keys[0],
      used_hierarchy: false,
      reason: 'DIRECT',
    };
  }

  const questions: Record<string, DecisionQuestion> = {};
  for (const key of keys) {
    questions[`elig_${key}`] = {
      type: 'binary_probability',
      instructions: `Is candidate ${key} eligible/relevant?`,
      criteria: { true: candidates[key], false: 'Not relevant' },
    };
  }
  const stage1 = await broker.evaluate({ ...base, questions });
  const ranked = keys
    .map((key) => {
      const a = stage1.response.answers[`elig_${key}`];
      return { key, p: a && a.type === 'binary_probability' ? a.probability_true : 0 };
    })
    .sort((a, b) => b.p - a.p)
    .slice(0, topK);
  const top: Record<string, unknown> = {};
  for (const r of ranked) top[r.key] = candidates[r.key];
  const stage2 = await broker.evaluate({
    ...base,
    questions: {
      pick: { type: 'categorical_choice', choices: top, instructions: 'Select among the top eligible candidates.' },
    },
  });
  const ans = stage2.response.answers.pick;
  return {
    stage1_eligible: ranked.map((r) => r.key),
    final_choice: ans && ans.type === 'categorical_choice' ? ans.choice : ranked[0]?.key ?? null,
    used_hierarchy: true,
    reason: 'HIERARCHICAL',
  };
}

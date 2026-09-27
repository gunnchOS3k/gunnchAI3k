import type { ConfidenceGateOutcome, DecisionAnswer, DecisionQuestion } from './contracts';

export interface TaskThresholds {
  auto_branch_threshold: number | null;
  fallback_below: number | null;
  evidence: string;
  mutating?: boolean;
  sensitive?: boolean;
}

export interface ConfidenceGateInput {
  task_class: string;
  answers: Record<string, DecisionAnswer>;
  questions: Record<string, DecisionQuestion>;
  thresholds?: TaskThresholds;
  mutating?: boolean;
  sensitive?: boolean;
}

export interface ConfidenceGateRecord {
  outcome: ConfidenceGateOutcome;
  selected_threshold: number | null;
  reason: string;
  probabilities: Record<string, number>;
}

function answerConfidence(answer: DecisionAnswer): number {
  if (answer.type === 'binary_probability') {
    return Math.max(answer.probability_true, 1 - answer.probability_true);
  }
  return answer.confidence;
}

export class ConfidenceGate {
  constructor(private readonly byTask: Record<string, TaskThresholds> = {}) {}

  evaluate(input: ConfidenceGateInput): ConfidenceGateRecord {
    const thresholds = input.thresholds ?? this.byTask[input.task_class] ?? {
      auto_branch_threshold: null,
      fallback_below: null,
      evidence: 'no_task_calibration',
    };
    const mutating = input.mutating ?? thresholds.mutating ?? false;
    const sensitive = input.sensitive ?? thresholds.sensitive ?? false;
    const probs: Record<string, number> = {};
    let minConf = 1;
    for (const [name, answer] of Object.entries(input.answers)) {
      const c = answerConfidence(answer);
      probs[name] = c;
      if (c < minConf) minConf = c;
    }

    if (mutating || sensitive) {
      return {
        outcome: 'ESCALATE_DETERMINISTIC',
        selected_threshold: thresholds.auto_branch_threshold,
        reason: mutating
          ? 'MUTATING_DECISION_CANNOT_AUTO_AUTHORIZE'
          : 'SENSITIVE_DECISION_CANNOT_AUTO_AUTHORIZE',
        probabilities: probs,
      };
    }

    if (thresholds.auto_branch_threshold === null || thresholds.fallback_below === null) {
      return {
        outcome: 'ESCALATE_DETERMINISTIC',
        selected_threshold: null,
        reason: `CALIBRATION_INSUFFICIENT:${thresholds.evidence}`,
        probabilities: probs,
      };
    }

    if (minConf < thresholds.fallback_below) {
      return {
        outcome: 'FALLBACK',
        selected_threshold: thresholds.fallback_below,
        reason: 'BELOW_FALLBACK_THRESHOLD',
        probabilities: probs,
      };
    }
    if (minConf >= thresholds.auto_branch_threshold) {
      return {
        outcome: 'AUTO_BRANCH',
        selected_threshold: thresholds.auto_branch_threshold,
        reason: 'ABOVE_AUTO_BRANCH_THRESHOLD',
        probabilities: probs,
      };
    }
    return {
      outcome: 'ASK_USER',
      selected_threshold: thresholds.auto_branch_threshold,
      reason: 'BETWEEN_THRESHOLDS',
      probabilities: probs,
    };
  }
}

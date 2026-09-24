export interface BinarySample {
  y: 0 | 1;
  p: number;
}

export interface ChoiceSample {
  correct: string;
  predicted: string;
  probabilities: Record<string, number>;
}

export interface ScoreSample {
  y: number;
  yhat: number;
}

export interface ReliabilityBin {
  bin: number;
  count: number;
  avg_confidence: number;
  avg_accuracy: number;
}

export function clip01(p: number): number {
  return Math.min(1, Math.max(0, p));
}

export function brierScore(samples: BinarySample[]): number {
  if (!samples.length) return Number.NaN;
  return samples.reduce((s, x) => s + (x.p - x.y) ** 2, 0) / samples.length;
}

export function logLoss(samples: BinarySample[]): number {
  if (!samples.length) return Number.NaN;
  const eps = 1e-12;
  return (
    samples.reduce((s, x) => {
      const p = clip01(x.p);
      return s + -(x.y * Math.log(p + eps) + (1 - x.y) * Math.log(1 - p + eps));
    }, 0) / samples.length
  );
}

export function accuracyBinary(samples: BinarySample[], threshold = 0.5): number {
  if (!samples.length) return Number.NaN;
  return samples.filter((x) => (x.p >= threshold ? 1 : 0) === x.y).length / samples.length;
}

export function reliabilityBins(samples: BinarySample[], bins = 10): ReliabilityBin[] {
  const out: ReliabilityBin[] = [];
  for (let i = 0; i < bins; i++) {
    const lo = i / bins;
    const hi = (i + 1) / bins;
    const slice = samples.filter((x) => (i === bins - 1 ? x.p >= lo && x.p <= hi : x.p >= lo && x.p < hi));
    const avg_confidence = slice.length ? slice.reduce((s, x) => s + x.p, 0) / slice.length : 0;
    const avg_accuracy = slice.length ? slice.reduce((s, x) => s + x.y, 0) / slice.length : 0;
    out.push({ bin: i, count: slice.length, avg_confidence, avg_accuracy });
  }
  return out;
}

export function expectedCalibrationError(samples: BinarySample[], bins = 10): number {
  if (!samples.length) return Number.NaN;
  const rel = reliabilityBins(samples, bins);
  return rel.reduce((s, b) => s + (b.count / samples.length) * Math.abs(b.avg_confidence - b.avg_accuracy), 0);
}

export function auroc(samples: BinarySample[]): number {
  const pos = samples.filter((x) => x.y === 1);
  const neg = samples.filter((x) => x.y === 0);
  if (!pos.length || !neg.length) return Number.NaN;
  let better = 0;
  let ties = 0;
  for (const p of pos) {
    for (const n of neg) {
      if (p.p > n.p) better += 1;
      else if (p.p === n.p) ties += 1;
    }
  }
  return (better + 0.5 * ties) / (pos.length * neg.length);
}

export function choiceTop1(samples: ChoiceSample[]): number {
  if (!samples.length) return Number.NaN;
  return samples.filter((s) => s.predicted === s.correct).length / samples.length;
}

export function choiceNll(samples: ChoiceSample[]): number {
  if (!samples.length) return Number.NaN;
  const eps = 1e-12;
  return (
    samples.reduce((s, x) => s + -Math.log((x.probabilities[x.correct] ?? 0) + eps), 0) / samples.length
  );
}

export function entropy(probs: Record<string, number>): number {
  const eps = 1e-12;
  return Object.values(probs).reduce((s, p) => s + -(p + eps) * Math.log2(p + eps), 0);
}

export function mae(samples: ScoreSample[]): number {
  if (!samples.length) return Number.NaN;
  return samples.reduce((s, x) => s + Math.abs(x.yhat - x.y), 0) / samples.length;
}

export function rmse(samples: ScoreSample[]): number {
  if (!samples.length) return Number.NaN;
  return Math.sqrt(samples.reduce((s, x) => s + (x.yhat - x.y) ** 2, 0) / samples.length);
}

export function ordinalError(samples: ScoreSample[]): number {
  if (!samples.length) return Number.NaN;
  return samples.reduce((s, x) => s + Math.abs(Math.round(x.yhat) - Math.round(x.y)), 0) / samples.length;
}

export interface SelectiveAutomation {
  threshold: number;
  coverage: number;
  accuracy_at_coverage: number;
  error_rate_auto: number;
}

export function selectiveAutomation(samples: Array<BinarySample & { confidence: number }>, threshold: number): SelectiveAutomation {
  const auto = samples.filter((s) => s.confidence >= threshold);
  const coverage = samples.length ? auto.length / samples.length : 0;
  const accuracy_at_coverage = auto.length ? auto.filter((s) => (s.p >= 0.5 ? 1 : 0) === s.y).length / auto.length : Number.NaN;
  return {
    threshold,
    coverage,
    accuracy_at_coverage,
    error_rate_auto: Number.isNaN(accuracy_at_coverage) ? Number.NaN : 1 - accuracy_at_coverage,
  };
}

export const CALIBRATED_CLAIM_MIN_SAMPLES = 200;

export function mayClaimCalibrated(sampleCount: number): boolean {
  return sampleCount >= CALIBRATED_CLAIM_MIN_SAMPLES;
}

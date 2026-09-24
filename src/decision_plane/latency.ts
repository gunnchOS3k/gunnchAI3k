export interface LatencySample {
  total_ms: number;
  timeout: boolean;
  connect_ms?: number;
  provider_ms?: number;
}

export interface LatencySummary {
  n: number;
  p50: number | null;
  p95: number | null;
  p99: number | null;
  timeout_count: number;
  source: 'simulated_fixture' | 'live';
}

export function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

export function summarizeLatency(samples: LatencySample[], source: LatencySummary['source']): LatencySummary {
  const ok = samples.filter((s) => !s.timeout).map((s) => s.total_ms);
  return {
    n: samples.length,
    p50: percentile(ok, 50),
    p95: percentile(ok, 95),
    p99: percentile(ok, 99),
    timeout_count: samples.filter((s) => s.timeout).length,
    source,
  };
}

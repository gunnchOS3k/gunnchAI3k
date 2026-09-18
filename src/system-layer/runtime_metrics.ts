/**
 * Latency and memory metrics for pre-human engineering exhaustion.
 * Deterministic / process-local only — not a claim of production SLOs.
 */

export interface LatencySample {
  name: string;
  startedAtMs: number;
  endedAtMs: number;
  durationMs: number;
  ok: boolean;
  errorCode?: string;
}

export interface MemorySnapshot {
  at: string;
  rssBytes: number;
  heapUsedBytes: number;
  heapTotalBytes: number;
  externalBytes: number;
}

export interface RuntimeMetricsReport {
  schemaVersion: 'gunnchai.runtime_metrics.v1';
  label: 'SYNTHETIC' | 'PROCESS_LOCAL';
  latency: LatencySample[];
  memory: MemorySnapshot[];
  summary: {
    sampleCount: number;
    p50Ms: number | null;
    p95Ms: number | null;
    failureCount: number;
  };
}

function percentile(sorted: number[], p: number): number | null {
  if (!sorted.length) return null;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

export class RuntimeMetrics {
  private readonly latency: LatencySample[] = [];
  private readonly memory: MemorySnapshot[] = [];

  timeSync<T>(name: string, fn: () => T): T {
    const startedAtMs = Date.now();
    try {
      const result = fn();
      this.latency.push({
        name,
        startedAtMs,
        endedAtMs: Date.now(),
        durationMs: Date.now() - startedAtMs,
        ok: true,
      });
      return result;
    } catch (err) {
      this.latency.push({
        name,
        startedAtMs,
        endedAtMs: Date.now(),
        durationMs: Date.now() - startedAtMs,
        ok: false,
        errorCode: err instanceof Error ? err.name : 'ERROR',
      });
      throw err;
    }
  }

  async timeAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const startedAtMs = Date.now();
    try {
      const result = await fn();
      this.latency.push({
        name,
        startedAtMs,
        endedAtMs: Date.now(),
        durationMs: Date.now() - startedAtMs,
        ok: true,
      });
      return result;
    } catch (err) {
      this.latency.push({
        name,
        startedAtMs,
        endedAtMs: Date.now(),
        durationMs: Date.now() - startedAtMs,
        ok: false,
        errorCode: err instanceof Error ? err.name : 'ERROR',
      });
      throw err;
    }
  }

  sampleMemory(): MemorySnapshot {
    const mem = process.memoryUsage();
    const snap: MemorySnapshot = {
      at: new Date().toISOString(),
      rssBytes: mem.rss,
      heapUsedBytes: mem.heapUsed,
      heapTotalBytes: mem.heapTotal,
      externalBytes: mem.external,
    };
    this.memory.push(snap);
    return snap;
  }

  report(): RuntimeMetricsReport {
    const durations = this.latency
      .filter((s) => s.ok)
      .map((s) => s.durationMs)
      .sort((a, b) => a - b);
    return {
      schemaVersion: 'gunnchai.runtime_metrics.v1',
      label: 'PROCESS_LOCAL',
      latency: [...this.latency],
      memory: [...this.memory],
      summary: {
        sampleCount: this.latency.length,
        p50Ms: percentile(durations, 50),
        p95Ms: percentile(durations, 95),
        failureCount: this.latency.filter((s) => !s.ok).length,
      },
    };
  }
}

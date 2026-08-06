import { performance } from 'node:perf_hooks';
import type { ResourceMetrics } from './types';

export function captureResourceMetrics(): ResourceMetrics {
  const mem = process.memoryUsage();
  return {
    rssBytes: mem.rss,
    heapUsedBytes: mem.heapUsed,
    heapTotalBytes: mem.heapTotal,
    externalBytes: mem.external,
    arrayBuffersBytes: mem.arrayBuffers,
    uptimeSeconds: Number(process.uptime().toFixed(3)),
    capturedAt: new Date().toISOString(),
  };
}

export function nowMs(): number {
  return performance.now();
}

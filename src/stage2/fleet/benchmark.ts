/**
 * Local digital reference benchmark baseline across Stage 2 task lanes.
 * Does NOT invent competitor superiority scores.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { ModelRouter } from './router';
import type { TaskKind } from './roles';

export const BENCHMARK_TASKS: TaskKind[] = [
  'tutoring',
  'code',
  'device',
  'research',
  'network',
  'archive',
  'summarize',
  'translate',
];

export interface BenchmarkRow {
  task: TaskKind;
  selectedModelId: string | null;
  selectedRole: string | null;
  location: string;
  ok: boolean;
  latencyMsEstimate: number;
  costUnitsEstimate: number;
  notes: string;
}

export function runBenchmarkBaseline(router = new ModelRouter()): {
  schema: string;
  dated: string;
  mode: string;
  rows: BenchmarkRow[];
} {
  const rows: BenchmarkRow[] = BENCHMARK_TASKS.map((task) => {
    const decision = router.route({
      task,
      privacy: 'personal',
      contextTokens: 1024,
      preference: 'balanced',
      ramMb: 4096,
      cloudConsent: false,
    });
    const latencyMsEstimate =
      decision.selectedRole === 'NANO_LOCAL'
        ? 40
        : decision.selectedRole === 'LOCAL_FAST'
          ? 120
          : decision.selectedRole === 'LOCAL_PRO'
            ? 350
            : 80;
    return {
      task,
      selectedModelId: decision.selectedModelId,
      selectedRole: decision.selectedRole,
      location: decision.location,
      ok: decision.ok,
      latencyMsEstimate,
      costUnitsEstimate: decision.location === 'cloud' ? 1 : 0,
      notes: 'Local digital reference only — not a competitive superiority claim.',
    };
  });

  return {
    schema: 'gunnchai.stage2.model_benchmark_baseline.v1',
    dated: '2026-08-09',
    mode: 'local_digital_reference',
    rows,
  };
}

export function writeBenchmarkBaseline(cwd = process.cwd()): string {
  const report = runBenchmarkBaseline();
  const out = path.join(cwd, 'artifacts', 'stage2', 'MODEL_BENCHMARK_BASELINE.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
  return out;
}

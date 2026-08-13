import * as fs from 'node:fs';
import * as path from 'node:path';

export type CoverageStatus = 'COMPLETE' | 'PARTIAL' | 'OPEN';

export interface MarketTask {
  task_id: string;
  category: string;
  market_examples: string[];
  local_required: boolean;
  cloud_optional: boolean;
  implemented: boolean;
  coverage_status: CoverageStatus;
  actual_runtime_test: string | null;
  quality_metric: string;
  privacy_requirement: string;
  device_profiles: string[];
  evidence: string | null;
  gap: string;
}

export interface MarketTaskMatrix {
  schema: string;
  packet: string;
  dated: string;
  tasks: MarketTask[];
  next_packet: string[];
  model_tier_truth: Record<string, unknown>;
}

export function loadTaskMatrix(cwd = process.cwd()): MarketTaskMatrix {
  const p = path.join(cwd, 'benchmarks', 'GUNNCHAI_MARKET_TASK_MATRIX.json');
  return JSON.parse(fs.readFileSync(p, 'utf8')) as MarketTaskMatrix;
}

export function loadMarketBaseline(cwd = process.cwd()): Record<string, unknown> {
  const p = path.join(cwd, 'benchmarks', 'MARKET_AI_CAPABILITY_BASELINE.json');
  return JSON.parse(fs.readFileSync(p, 'utf8')) as Record<string, unknown>;
}

/**
 * Eval harness foundation — ≥50 tasks, result store with latency/cost/human_score.
 * Does NOT invent competitor superiority scores.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { GunnchAiCapabilityApi, type CapabilityName } from '../os/capability_api';
import { createIdentity } from '../os/identity';

export interface EvalTask {
  id: string;
  domain: string;
  prompt: string;
  expected_capability: CapabilityName;
  privacy_class: 'public' | 'personal' | 'sensitive' | 'device-local';
  offline_ok: boolean;
}

export interface EvalResult {
  id: string;
  ok: boolean;
  latency_ms: number;
  cost_units: number;
  model_id: string | null;
  human_score: number | null;
  notes: string;
}

export function loadCorpus(cwd = process.cwd()): EvalTask[] {
  const p = path.join(cwd, 'artifacts', 'stage2', 'eval', 'corpus.json');
  const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as { tasks: EvalTask[] };
  return raw.tasks;
}

export function runEvalHarness(cwd = process.cwd()): {
  count: number;
  passed: number;
  results: EvalResult[];
  storePath: string;
} {
  const api = new GunnchAiCapabilityApi();
  const identity = createIdentity('eval_user');
  api.permissions.grant(identity.user_id, 'network');
  api.permissions.grant(identity.user_id, 'device');
  api.permissions.grant(identity.user_id, 'memory');

  const tasks = loadCorpus(cwd);
  const results: EvalResult[] = [];
  for (const t of tasks) {
    const t0 = Date.now();
    const resp = api.invoke({
      capability: t.expected_capability,
      input: t.prompt,
      identity,
      privacy: t.privacy_class,
      telemetry: { offline: t.offline_ok, availableRamMb: 4096 },
      cloudConsent: false,
    });
    results.push({
      id: t.id,
      ok: resp.ok,
      latency_ms: Date.now() - t0,
      cost_units: resp.route.location === 'cloud' ? 1 : 0,
      model_id: resp.route.selectedModelId,
      human_score: null,
      notes: 'Foundation run — no competitor superiority scores.',
    });
  }

  const storeDir = path.join(cwd, 'artifacts', 'stage2', 'eval', 'results');
  fs.mkdirSync(storeDir, { recursive: true });
  const storePath = path.join(storeDir, 'latest.json');
  fs.writeFileSync(
    storePath,
    JSON.stringify(
      {
        schema: 'gunnchai.stage2.eval_results.v1',
        count: results.length,
        passed: results.filter((r) => r.ok).length,
        results,
      },
      null,
      2,
    ) + '\n',
  );
  return {
    count: results.length,
    passed: results.filter((r) => r.ok).length,
    results,
    storePath,
  };
}

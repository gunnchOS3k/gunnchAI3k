/**
 * Competitive AI harness — local/hybrid runs.
 * NEVER fabricates competitor scores; leave null / EXTERNAL_PENDING.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { SkillRegistry } from '../skills/registry';
import { LongContextEngine } from '../long_context/engine';
import { AgentRuntime } from '../agent/runtime';

export interface CompetitiveTask {
  id: string;
  domain: string;
  prompt: string;
  expected_capability: string;
  privacy_class: string;
  offline_ok: boolean;
  competitor_scores: Record<string, number | null>;
  competitor_status: string;
  notes?: string;
}

export interface CompetitiveResult {
  id: string;
  ok: boolean;
  latency_ms: number;
  gunnchai_score: number | null;
  competitor_scores: Record<string, number | null>;
  competitor_status: string;
  notes: string;
}

export function loadCompetitiveCorpus(cwd = process.cwd()): CompetitiveTask[] {
  const p = path.join(cwd, 'artifacts', 'phase_xiv', 'competitive', 'corpus.json');
  const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as { tasks: CompetitiveTask[] };
  return raw.tasks;
}

export function runCompetitiveHarness(cwd = process.cwd()): {
  count: number;
  passed: number;
  results: CompetitiveResult[];
  manifestPath: string;
} {
  const tasks = loadCompetitiveCorpus(cwd);
  const skills = new SkillRegistry();
  const lc = new LongContextEngine(path.join(cwd, 'artifacts', 'phase_xiv', 'competitive', 'memory'));
  lc.ingest('bench', [{ source: 'local', text: 'local competitive harness fixture for retrieval' }]);

  const results: CompetitiveResult[] = [];
  for (const t of tasks) {
    const t0 = Date.now();
    let ok = true;
    let notes = t.notes || 'local/hybrid digital run';
    try {
      if (t.domain === 'skills' || t.expected_capability === 'tutor') {
        const skillId =
          t.prompt.toLowerCase().includes('wireless')
            ? 'wireless_eng'
            : t.prompt.toLowerCase().includes('cyber')
              ? 'cyber'
              : t.prompt.toLowerCase().includes('game')
                ? 'game_coach'
                : 'math_tutor';
        ok = skills.invoke(skillId, t.prompt).ok;
      } else if (t.domain === 'agents' || t.domain === 'computer_use') {
        const root = path.join(cwd, 'artifacts', 'phase_xiv', 'competitive', 'agent_scratch', t.id);
        fs.mkdirSync(root, { recursive: true });
        fs.writeFileSync(path.join(root, 'note.txt'), t.prompt.slice(0, 200));
        const rt = new AgentRuntime({ sandboxRoot: root });
        rt.loadPlan({
          goal: t.prompt,
          steps: [{ id: 'read', title: 'read', tool: 'files', action: 'read', args: { path: 'note.txt' } }],
        });
        const status = rt.run();
        ok = status === 'completed';
      } else {
        const assembled = lc.assemble('bench', t.prompt, t.prompt.slice(0, 120));
        ok = assembled.summary.length > 0 && assembled.claimed_context_tokens === null;
      }
    } catch (e) {
      ok = false;
      notes = e instanceof Error ? e.message : String(e);
    }

    // Preserve null competitor scores — do not invent.
    results.push({
      id: t.id,
      ok,
      latency_ms: Date.now() - t0,
      gunnchai_score: ok ? 1 : 0,
      competitor_scores: { ...t.competitor_scores },
      competitor_status: t.competitor_status || 'EXTERNAL_PENDING',
      notes,
    });
  }

  const dated = new Date().toISOString().slice(0, 10);
  const outDir = path.join(cwd, 'artifacts', 'phase_xiv', 'competitive');
  fs.mkdirSync(outDir, { recursive: true });
  const manifestPath = path.join(outDir, `MANIFEST_${dated}.json`);
  const manifest = {
    schema: 'gunnchai.phase_xiv.competitive_manifest.v1',
    dated,
    count: results.length,
    passed: results.filter((r) => r.ok).length,
    competitor_scoring_policy: 'Do not fabricate competitor scores. null / EXTERNAL_PENDING without real API access.',
    tokens: {
      GUNNCHAI_FRONTIER_PRODUCT_PARITY: false,
      BETTER_THAN_CHATGPT: false,
      BETTER_THAN_CLAUDE: false,
      BETTER_THAN_GEMINI: false,
      BETTER_THAN_COPILOT: false,
      BETTER_THAN_PERPLEXITY: false,
    },
    results,
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  fs.writeFileSync(path.join(outDir, 'MANIFEST_LATEST.json'), JSON.stringify(manifest, null, 2) + '\n');
  return {
    count: results.length,
    passed: results.filter((r) => r.ok).length,
    results,
    manifestPath,
  };
}

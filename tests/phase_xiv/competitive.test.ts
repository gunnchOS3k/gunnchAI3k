import * as fs from 'node:fs';
import { loadCompetitiveCorpus, runCompetitiveHarness, PHASE_XIV_DOCTRINE } from '../../src/phase_xiv';

describe('phase_xiv competitive harness', () => {
  it('has ≥150 distinct tasks and leaves competitor scores null', () => {
    const tasks = loadCompetitiveCorpus();
    expect(tasks.length).toBeGreaterThanOrEqual(150);
    const prompts = new Set(tasks.map((t) => t.prompt));
    expect(prompts.size).toBe(tasks.length);
    for (const t of tasks) {
      expect(t.competitor_status).toBe('EXTERNAL_PENDING');
      for (const v of Object.values(t.competitor_scores)) expect(v).toBeNull();
    }
  });

  it('runs local/hybrid harness without fabricating competitor scores', () => {
    const out = runCompetitiveHarness(process.cwd());
    expect(out.count).toBeGreaterThanOrEqual(150);
    expect(out.passed).toBeGreaterThan(100);
    expect(fs.existsSync(out.manifestPath)).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(out.manifestPath, 'utf8'));
    expect(manifest.tokens.GUNNCHAI_FRONTIER_PRODUCT_PARITY).toBe(false);
    expect(PHASE_XIV_DOCTRINE.GUNNCHAI_FRONTIER_PRODUCT_PARITY).toBe(false);
    for (const r of manifest.results.slice(0, 20)) {
      for (const v of Object.values(r.competitor_scores)) expect(v).toBeNull();
      expect(r.competitor_status).toBe('EXTERNAL_PENDING');
    }
  }, 120000);
});

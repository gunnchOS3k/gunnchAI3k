import { loadCorpus, runEvalHarness } from '../../src/stage2';

describe('stage2 eval harness', () => {
  it('has ≥50 tasks across required domains', () => {
    const tasks = loadCorpus();
    expect(tasks.length).toBeGreaterThanOrEqual(50);
    const domains = new Set(tasks.map((t) => t.domain));
    for (const d of ['education', 'coding', 'research', 'office', 'device', 'network', 'archive', 'privacy']) {
      expect(domains.has(d)).toBe(true);
    }
  });

  it('runs result store with latency/cost/human_score fields', () => {
    const report = runEvalHarness();
    expect(report.count).toBeGreaterThanOrEqual(50);
    expect(report.passed).toBeGreaterThan(40);
    expect(report.results[0]).toEqual(
      expect.objectContaining({
        latency_ms: expect.any(Number),
        cost_units: expect.any(Number),
        human_score: null,
      }),
    );
  });
});

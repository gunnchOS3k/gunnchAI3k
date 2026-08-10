import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  ALL_MODEL_ROLES,
  ModelFleetRegistry,
  ModelRouter,
  writeModelCandidateMatrix,
  writeBenchmarkBaseline,
  runBenchmarkBaseline,
} from '../../src/stage2';

describe('stage2 fleet', () => {
  const cwd = process.cwd();

  it('covers all required roles and marks 135M as nano-only', () => {
    const fleet = new ModelFleetRegistry();
    fleet.ensureFixtureRefs(cwd);
    const roles = new Set(fleet.list().map((c) => c.role));
    for (const r of ALL_MODEL_ROLES) expect(roles.has(r)).toBe(true);
    const nano = fleet.byRole('NANO_LOCAL')[0];
    expect(nano.isNanoFallbackOnly).toBe(true);
    expect(nano.parameters).toMatch(/135/i);
  });

  it('writes dated MODEL_CANDIDATE_MATRIX json+md', () => {
    const { jsonPath, mdPath, matrix } = writeModelCandidateMatrix(cwd);
    expect(fs.existsSync(jsonPath)).toBe(true);
    expect(fs.existsSync(mdPath)).toBe(true);
    expect(matrix.dated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(matrix.candidates.length).toBeGreaterThanOrEqual(6);
  });

  it('routes by task/privacy/ram and builds fallback chain', () => {
    const router = new ModelRouter();
    router.getFleet().ensureFixtureRefs(cwd);
    const r = router.route({
      task: 'code',
      privacy: 'personal',
      contextTokens: 1024,
      ramMb: 4096,
      preference: 'quality',
      cloudConsent: false,
    });
    expect(r.ok).toBe(true);
    expect(r.selectedModelId).toBeTruthy();
    expect(r.location).toBe('local');
    expect(r.reason.length).toBeGreaterThan(10);
    expect(Array.isArray(r.fallbackChain)).toBe(true);
  });

  it('writes benchmark baseline across required lanes', () => {
    const out = writeBenchmarkBaseline(cwd);
    expect(fs.existsSync(out)).toBe(true);
    const baseline = runBenchmarkBaseline();
    expect(baseline.rows.map((x) => x.task).sort()).toEqual(
      ['archive', 'code', 'device', 'network', 'research', 'summarize', 'translate', 'tutoring'].sort(),
    );
    expect(baseline.rows.every((r) => r.ok)).toBe(true);
  });
});

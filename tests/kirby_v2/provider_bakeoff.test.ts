import * as fs from 'node:fs';
import * as path from 'node:path';
import { QUALIFICATION_SLOTS, BAKEOFF_TASKS, paretoByTier } from '../../benchmarks/frontier_bakeoff/schema';
import { inventCandidates, runAdapterConformance } from '../../benchmarks/frontier_bakeoff/adapters';
import { runProviderBakeoff } from '../../benchmarks/frontier_bakeoff/run_bakeoff';

const ROOT = path.resolve(__dirname, '../..');

describe('Kirby provider bake-off', () => {
  test('qualification slots A–G present', () => {
    const ids = QUALIFICATION_SLOTS.map((s) => s.id);
    for (const slot of [
      'SLOT_A_MICRO_ROUTER',
      'SLOT_B_EDGE_FAST',
      'SLOT_C_WORKSTATION_PRO',
      'SLOT_D_WAIKE_TUTOR',
      'SLOT_E_RESEARCH_LONG',
      'SLOT_F_CREATOR_STUDIO',
      'SLOT_G_COMPUTER_USE',
    ]) {
      expect(ids).toContain(slot);
    }
    expect(fs.existsSync(path.join(ROOT, 'config/provider_qualification_slots.yaml'))).toBe(true);
  });

  test('candidate inventory marks live gaps honestly', () => {
    const { candidates, adapters } = inventCandidates({
      memsize_gb: 8,
      free_disk_gb: 5,
      runtimes: { llama_cpp: { present: true }, ollama: { present: false }, node: { present: true } },
    });
    expect(adapters.length).toBeGreaterThan(0);
    expect(candidates.some((c) => c.NO_CANDIDATE_AVAILABLE)).toBe(true);
    expect(candidates.every((c) => c.evidence_mode !== 'live_remote' || c.NO_CANDIDATE_AVAILABLE)).toBe(true);
  });

  test('adapter conformance passes for deterministic adapters', async () => {
    const { adapters } = inventCandidates({
      memsize_gb: 8,
      free_disk_gb: 5,
      runtimes: { node: { present: true }, llama_cpp: { present: true }, ollama: { present: false } },
    });
    const results = await runAdapterConformance(adapters[0]);
    expect(results.every((r) => (r.supported ? r.passed : true))).toBe(true);
    expect(results.find((r) => r.pass_id === 'CANCELLATION')?.passed).toBe(true);
  });

  test('end-to-end bakeoff writes required artifacts and gate tokens', async () => {
    const result = await runProviderBakeoff(ROOT);
    const required = [
      'HOST_CAPABILITY_BASELINE.json',
      'host_baseline.json',
      'candidate_inventory.json',
      'adapter_conformance.json',
      'benchmark_results.jsonl',
      'pareto_fronts.json',
      'qualification_matrix.md',
      'qualification_matrix.json',
      'failure_matrix.md',
      'offline_results.md',
      'FINAL_BAKEOFF_REPORT.md',
    ];
    for (const f of required) {
      expect(fs.existsSync(path.join(result.outDir, f))).toBe(true);
    }
    expect(fs.existsSync(path.join(result.outDir, 'resource_profiles'))).toBe(true);
    expect(fs.existsSync(path.join(result.outDir, 'security_results'))).toBe(true);
    expect(fs.existsSync(path.join(result.outDir, 'routing_traces'))).toBe(true);
    expect(fs.existsSync(path.join(result.outDir, 'verification_traces'))).toBe(true);
    expect(fs.existsSync(path.join(result.outDir, 'provider_qualifications'))).toBe(true);
    expect(fs.existsSync(path.join(result.outDir, 'pixel6a/PIXEL_EDGE_STATUS.json'))).toBe(true);

    expect(result.gateTokens.PROVIDER_BAKEOFF_EXECUTED.status).toBe('PASS');
    expect(result.gateTokens.PROVIDER_BAKEOFF_OFFLINE_CORE.status).toBe('PASS');
    expect(result.gateTokens.PROVIDER_BAKEOFF_SAFETY_INJECTION.status).toBe('PASS');
    expect(result.gateTokens.PROVIDER_BAKEOFF_FALLBACK_CHAIN.status).toBe('PASS');
    expect(result.gateTokens.PROVIDER_BAKEOFF_NO_OVERALL_WINNER.status).toBe('PASS');

    const pixel = JSON.parse(fs.readFileSync(path.join(result.outDir, 'pixel6a/PIXEL_EDGE_STATUS.json'), 'utf8'));
    expect(pixel.PIXEL_EDGE_MODEL_BAKEOFF_NOT_RUN).toBe(true);

    const inventory = JSON.parse(fs.readFileSync(path.join(result.outDir, 'candidate_inventory.json'), 'utf8'));
    expect(inventory.candidates.some((c: { NO_CANDIDATE_AVAILABLE?: boolean }) => c.NO_CANDIDATE_AVAILABLE)).toBe(true);

    // No overall winner claim in pareto
    const pareto = JSON.parse(fs.readFileSync(path.join(result.outDir, 'pareto_fronts.json'), 'utf8'));
    expect(pareto.note).toMatch(/No overall ranking/);
  }, 60000);

  test('domain suites still cover WAIKE/coding/device/research/creator', () => {
    expect(BAKEOFF_TASKS.map((t) => t.suite)).toEqual(
      expect.arrayContaining(['waike', 'coding', 'device', 'research', 'creator', 'routing']),
    );
    const pareto = paretoByTier([
      { task_id: 'a', model_id: 'm1', tier: 1, success: true, latency_ms: 10, cost_usd: 0.01, energy_j: 1, verifier_pass: true },
      { task_id: 'a', model_id: 'm2', tier: 1, success: true, latency_ms: 20, cost_usd: 0.02, energy_j: 2, verifier_pass: true },
    ]);
    expect(pareto[0].non_dominated[0].model_id).toBe('m1');
  });
});

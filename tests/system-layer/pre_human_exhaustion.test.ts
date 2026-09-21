import { createDefaultToolRegistry } from '../../src/system-layer/tool_registry';
import { RuntimeMetrics } from '../../src/system-layer/runtime_metrics';
import { runSyntheticPreHumanSuite, SUITE_LABEL } from '../../src/system-layer/pre_human_eval/synthetic_suite';

describe('tool_registry', () => {
  it('deny-by-default for unknown tools and stamps provenance', () => {
    const reg = createDefaultToolRegistry();
    const denied = reg.authorize('not.a.tool');
    expect(denied.decision).toBe('unknown_tool');
    const ok = reg.authorize('waike.course.query');
    expect(ok.decision).toBe('allowed');
    expect(ok.schemaSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(reg.snapshot().toolCount).toBeGreaterThanOrEqual(8);
  });
});

describe('runtime_metrics', () => {
  it('records latency and memory samples', () => {
    const m = new RuntimeMetrics();
    m.sampleMemory();
    const v = m.timeSync('add', () => 1 + 1);
    expect(v).toBe(2);
    const report = m.report();
    expect(report.label).toBe('PROCESS_LOCAL');
    expect(report.summary.sampleCount).toBe(1);
    expect(report.memory.length).toBe(1);
  });
});

describe('SYNTHETIC pre-human suite', () => {
  it('passes labeled synthetic fixtures', () => {
    const report = runSyntheticPreHumanSuite();
    expect(report.label).toBe(SUITE_LABEL);
    expect(report.label).toBe('SYNTHETIC');
    expect(report.passed).toBe(true);
    expect(report.cases.every((c) => c.passed)).toBe(true);
  });
});

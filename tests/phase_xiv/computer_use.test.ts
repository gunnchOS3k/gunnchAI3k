import { ComputerUseRuntime, runCodingAgentE2E } from '../../src/phase_xiv';

describe('phase_xiv computer use + coding agent', () => {
  it('runs generic accessibility UI actions', () => {
    const cu = new ComputerUseRuntime();
    const res = cu.run(
      [
        { type: 'focus', target: { role: 'window', name: 'Editor' } },
        { type: 'type', target: { role: 'text', name: 'buffer' }, text: 'fix' },
      ],
      [
        { role: 'window', name: 'Editor', value: 'focused' },
        { role: 'text', name: 'buffer', value: 'typed' },
      ],
    );
    expect(res.every((r) => r.ok)).toBe(true);
  });

  it('coding agent E2E stops before merge', async () => {
    const out = await runCodingAgentE2E(process.cwd());
    expect(out.mergeApprovalPending).toBe(true);
    expect(out.ok).toBe(true);
  });
});

import { evaluateSourceGrounding } from '../../src/tutor/sourcePolicy';

describe('sourcePolicy', () => {
  it('accepts waike sources', () => {
    const r = evaluateSourceGrounding(['waike-research-ops/programs/software_builder.md']);
    expect(r.grounded).toBe(true);
  });
});

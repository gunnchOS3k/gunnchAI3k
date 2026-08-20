import { VALIDATION_IMPORTS_REQUIREMENT_PROOF, TARGET_REQUIREMENTS } from '../../src/evals/wave003/constants';
import { runWave003Eval } from '../../src/evals/wave003/runner';

describe('engineering wave003 independent validation', () => {
  jest.setTimeout(120_000);

  it('core scorer does not import requirement_proof as source of truth', () => {
    expect(VALIDATION_IMPORTS_REQUIREMENT_PROOF).toBe(false);
  });

  it('evaluates all 19 target requirements with evidence artifacts', async () => {
    const report = await runWave003Eval({
      writeEvidence: true,
      runReproduction: false,
    });

    expect(report.targetRequirements).toEqual([...TARGET_REQUIREMENTS]);
    expect(report.results).toHaveLength(19);
    expect(report.allTargetEvaluated).toBe(true);
    expect(report.doctrine.requirementProofRole).toBe('cross-check-only');
    expect(report.claimBoundaries.GENERAL_ASR).toBe(false);
    expect(report.claimBoundaries.GENERAL_VLM).toBe(false);

    for (const row of report.results) {
      expect(row.crossCheckRequirementProof).toBeDefined();
      expect(row.negativeCases.length).toBeGreaterThan(0);
    }
  });
});

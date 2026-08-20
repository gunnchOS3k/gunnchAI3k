import { VALIDATION_IMPORTS_REQUIREMENT_PROOF, TARGET_REQUIREMENTS } from '../../src/evals/wave003/constants';
import {
  canonicalizeResults,
  compareCanonicalRows,
  perturbCanonicalForRegression,
  releaseComplete,
} from '../../src/evals/wave003/reproduction';
import { runWave003Eval } from '../../src/evals/wave003/runner';
import type { RequirementEvalResult } from '../../src/evals/wave003/types';

describe('engineering wave003 independent validation', () => {
  jest.setTimeout(240_000);

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
    expect(report.claimBoundaries.GENERAL_BIAS_AUDIT).toBe(false);

    for (const row of report.results) {
      expect(row.crossCheckRequirementProof).toBeDefined();
      expect(row.negativeCases.length).toBeGreaterThan(0);
    }
  });

  it('perturbed reproduction comparison fails the release gate', async () => {
    const report = await runWave003Eval({
      writeEvidence: false,
      runReproduction: false,
    });
    const primary = canonicalizeResults(report.results);
    const perturbed = perturbCanonicalForRegression(primary);
    const cmp = compareCanonicalRows(primary, perturbed);
    expect(cmp.result).toBe('FAIL');
    expect(cmp.unexpected_differences.length).toBeGreaterThan(0);

    const release = releaseComplete({
      results: report.results.map((r: RequirementEvalResult, i: number) =>
        i === 0
          ? { ...r, validationState: perturbed[0]?.validationState ?? r.validationState }
          : r,
      ),
      independentDigitalReproduction: cmp.result,
    });
    expect(release).toBe(false);
    expect(cmp.result === 'PASS').toBe(false);
  });
});

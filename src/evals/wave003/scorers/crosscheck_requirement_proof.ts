/**
 * Cross-check ONLY — not imported by core wave003 scorer path when
 * VALIDATION_IMPORTS_REQUIREMENT_PROOF=false.
 */
import { GunnchAIProductService } from '../../../system-layer/product_service/service';
import { proveRequirements } from '../../../system-layer/os_integration/requirement_proof';
import type { RequirementEvalResult } from '../types';

export function crossCheckRequirementProof(
  repoRoot: string,
  scratchRoot: string,
  results: RequirementEvalResult[],
): void {
  const service = new GunnchAIProductService(repoRoot, {
    varRoot: `${scratchRoot}/crosscheck-product`,
  });
  const proof = proveRequirements(service);
  for (const row of results) {
    const node = proof.nodes.find((n) => n.id === row.requirementId);
    row.crossCheckRequirementProof = {
      runtimeProven: node?.status === 'RUNTIME',
      note:
        node?.status === 'RUNTIME'
          ? 'requirement_proof.ts agrees node is RUNTIME (cross-check only)'
          : `requirement_proof cross-check: status=${node?.status ?? 'MISSING'}`,
    };
  }
}

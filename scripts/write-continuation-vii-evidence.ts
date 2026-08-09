/**
 * Cont VII — regenerate platform evidence artifacts.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { getPlatformStatus } from '../src/system-layer/platform_status';
import { proveRequirements } from '../src/system-layer/os_integration/requirement_proof';
import { GunnchAIProductService } from '../src/system-layer/product_service/service';

async function main() {
  const cwd = process.cwd();
  const svc = new GunnchAIProductService(cwd, {
    varRoot: path.join(cwd, 'var', 'gunnchai-status'),
  });
  const proof = proveRequirements(svc);
  const status = await getPlatformStatus(cwd);
  proof.fullPlatformTokenEarned = !!status.tokens.FULL_GUNNCHAI3K_PLATFORM_DIGITAL_COMPLETE;
  proof.digitallyValidatedEarned = !!status.tokens.DIGITALLY_VALIDATED;

  const dir = path.join(cwd, 'evidence', 'system-layer');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'REQUIREMENT_PROOF_VII.json'), JSON.stringify(proof, null, 2));
  fs.writeFileSync(path.join(dir, 'REQUIREMENT_PROOF_VI.json'), JSON.stringify(proof, null, 2));
  fs.writeFileSync(
    path.join(dir, 'PRODUCT_SERVICE_STATUS.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        continuation: 'VII',
        productService: status.productService,
        osIntegration: status.osIntegration,
        tokens: status.tokens,
        requirements: status.requirements,
        requirementProof: status.requirementProof,
        gaps: status.gaps,
        optionalSurfaces: status.optionalSurfaces,
        claim: status.claim,
        topology: status.topology,
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify(
      {
        FULL: status.tokens.FULL_GUNNCHAI3K_PLATFORM_DIGITAL_COMPLETE,
        DIGITALLY_VALIDATED: status.tokens.DIGITALLY_VALIDATED,
        normative: status.requirementProof,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

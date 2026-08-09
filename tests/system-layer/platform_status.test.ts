import { getPlatformStatus } from '../../src/system-layer/platform_status';
import {
  CAPABILITY_EVAL_TOKEN,
  FULL_PLATFORM_TOKEN,
  REAL_LOCAL_INFERENCE_TOKEN,
  DIGITALLY_VALIDATED_TOKEN,
} from '../../src/system-layer/evaluation';
import { PRODUCT_SERVICE_TOKEN } from '../../src/system-layer/product_service/types';
import {
  DISCORD_SURFACE_NOTE,
  evaluateDigitalPlatformComplete,
} from '../../src/system-layer/platform_complete';

describe('platform status Cont VII', () => {
  it('treats Discord as non-normative and earns FULL when digital criteria prove', async () => {
    const status = await getPlatformStatus();
    expect(status.continuation).toBe('VII');
    expect(status.selectedArchitecture).toBe('llama.cpp');
    expect(status.productService.token).toBe(PRODUCT_SERVICE_TOKEN);
    expect(status.osIntegration.token).toBe('GUNNCHAI_OS_INTEGRATION_LOCAL_PASS');
    expect(status.requirementProof.discordNormative).toBe(false);
    expect(status.requirementProof.formerSchemaNodeCount).toBe(38);
    expect(status.requirementProof.allNormativeRuntime).toBe(true);
    expect(status.optionalSurfaces.join(' ')).toContain('Discord');
    expect(status.optionalSurfaces.some((s) => s === DISCORD_SURFACE_NOTE)).toBe(true);
    // Gaps must not treat Discord as an automatic FULL blocker.
    expect(status.gaps.join(' ')).not.toMatch(/Discord end-user product surface not fully wired/);

    if (status.eval.allPassed && status.osIntegration.earned) {
      expect(status.claim.fullPlatformDigitalComplete).toBe(true);
      expect(status.tokens[FULL_PLATFORM_TOKEN]).toBe(true);
      expect(status.tokens[DIGITALLY_VALIDATED_TOKEN]).toBe(true);
      expect(status.requirements.schemaOnlyIds).not.toEqual(
        expect.arrayContaining([FULL_PLATFORM_TOKEN]),
      );
    } else {
      expect(status.claim.fullPlatformDigitalComplete).toBe(false);
      expect(status.tokens[FULL_PLATFORM_TOKEN]).toBe(false);
    }

    expect(status.tokens[PRODUCT_SERVICE_TOKEN]).toBe(true);
    expect(status.tokens.GUNNCHAI_OS_INTEGRATION_LOCAL_PASS).toBe(true);
    expect(status.topology.planes.hostModelRuntime.qemuMayHostForwardModel).toBe(true);
    if (status.eval.allPassed) {
      expect(status.tokens[CAPABILITY_EVAL_TOKEN]).toBe(true);
    }
    if (status.realLocalInference && status.realInferenceCount > 0 && status.eval.allPassed) {
      expect(status.tokens[REAL_LOCAL_INFERENCE_TOKEN]).toBe(true);
    }
  }, 180_000);

  it('evaluateDigitalPlatformComplete rejects missing normative runtime', () => {
    const r = evaluateDigitalPlatformComplete({
      allNormativeRuntime: false,
      osIntegrationPass: true,
      capabilityEvalPass: true,
      productServicePass: true,
    });
    expect(r.earned).toBe(false);
    expect(r.missing).toContain('normative_ai_runtime');
  });
});

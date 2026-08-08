import { getPlatformStatus } from '../../src/system-layer/platform_status';
import {
  CAPABILITY_EVAL_TOKEN,
  FULL_PLATFORM_TOKEN,
  REAL_LOCAL_INFERENCE_TOKEN,
} from '../../src/system-layer/evaluation';

describe('platform status honesty', () => {
  it('never claims FULL_GUNNCHAI3K_PLATFORM_DIGITAL_COMPLETE in Continuance IV', async () => {
    const status = await getPlatformStatus();
    expect(status.continuation).toBe('IV');
    expect(status.selectedArchitecture).toBe('llama.cpp');
    expect(status.claim.fullPlatformDigitalComplete).toBe(false);
    expect(status.tokens[FULL_PLATFORM_TOKEN]).toBe(false);
    expect(status.tokens.DIGITALLY_VALIDATED).toBe(false);
    expect(status.gaps.length).toBeGreaterThan(0);
    expect(status.gaps.join(' ')).toMatch(/FULL_GUNNCHAI3K_PLATFORM_DIGITAL_COMPLETE/);
    if (status.eval.allPassed) {
      expect(status.tokens[CAPABILITY_EVAL_TOKEN]).toBe(true);
    }
    if (status.realLocalInference && status.realInferenceCount > 0 && status.eval.allPassed) {
      expect(status.tokens[REAL_LOCAL_INFERENCE_TOKEN]).toBe(true);
    }
  }, 180_000);
});

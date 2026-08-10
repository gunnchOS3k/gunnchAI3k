import { ModelRouter, type RouterFailureMode } from '../../src/stage2';

const MODES: RouterFailureMode[] = [
  'unavailable',
  'ram',
  'offline',
  'cloud_denied',
  'cloud_timeout',
  'context_too_large',
  'crash',
  'low_battery',
  'thermal',
];

describe('stage2 router failure modes', () => {
  for (const mode of MODES) {
    it(`handles ${mode}`, () => {
      const router = new ModelRouter();
      router.getFleet().ensureFixtureRefs();
      const r = router.route({
        task: 'research',
        privacy: 'personal',
        contextTokens: 1024,
        ramMb: 4096,
        cloudConsent: true,
        forceFailure: mode,
      });
      expect(r.failureMode).toBe(mode);
      // Must not throw; either degrade to nano/local or fail closed.
      expect(typeof r.ok).toBe('boolean');
      expect(r.reason.length).toBeGreaterThan(0);
      if (mode === 'cloud_denied') {
        expect(r.location).not.toBe('cloud');
      }
      if (mode === 'crash' || mode === 'cloud_timeout') {
        expect(r.ok).toBe(true);
        expect(r.selectedRole).toBe('NANO_LOCAL');
      }
      if (mode === 'context_too_large' || mode === 'ram') {
        // may fail closed if nothing fits
        expect(r.ok === false || r.selectedRole === 'NANO_LOCAL').toBe(true);
      }
    });
  }

  it('denies cloud when sensitive privacy', () => {
    const router = new ModelRouter();
    const r = router.route({
      task: 'code',
      privacy: 'sensitive',
      contextTokens: 512,
      cloudConsent: true,
      ramMb: 8192,
    });
    expect(r.ok).toBe(true);
    expect(r.location).toBe('local');
  });
});

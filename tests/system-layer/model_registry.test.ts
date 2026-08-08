/**
 * Wave C system-layer tests — model registry integrity.
 */

import {
  ModelRegistryService,
  verifyIntegrity,
} from '../../src/system-layer/model_registry';

describe('Wave C model_registry', () => {
  const service = new ModelRegistryService();

  it('registers versioned models with license + integrity + device profiles', () => {
    const models = service.list();
    expect(service.registry.selectedArchitecture).toBe('llama.cpp');
    expect(models.length).toBeGreaterThanOrEqual(11);
    for (const m of models) {
      expect(m.version).toMatch(/\d+\.\d+\.\d+/);
      expect(m.license).toBeTruthy();
      expect(m.integrity.algorithm).toBe('sha256');
      expect(m.integrity.hash).toMatch(/^[a-f0-9]{64}$/);
      expect(m.integrity.bytes).toBeGreaterThan(0);
      expect(m.deviceProfiles.length).toBeGreaterThan(0);
    }
  });

  it('verifies on-disk artifact hashes', () => {
    const results = service.verifyAll();
    expect(results.every((r) => r.ok)).toBe(true);
    const tutoring = service.getById('det-tutoring-v1');
    expect(tutoring).toBeDefined();
    expect(verifyIntegrity(tutoring!).ok).toBe(true);
  });

  it('never labels deterministic baselines as trained LLMs', () => {
    const dets = service
      .list()
      .filter((m) => m.backend === 'deterministic-baseline');
    expect(dets.length).toBeGreaterThanOrEqual(11);
    expect(dets.every((m) => m.isTrainedLlm === false)).toBe(true);
  });

  it('filters models by device profile', () => {
    const handheld = service.forDevice('handheld_hybrid');
    expect(handheld.every((m) => m.deviceProfiles.includes('handheld_hybrid'))).toBe(
      true,
    );
    // code model is student + ds-xl only
    expect(handheld.some((m) => m.capability === 'code')).toBe(false);
  });
});

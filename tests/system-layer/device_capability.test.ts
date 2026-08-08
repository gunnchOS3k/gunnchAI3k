import {
  detectDeviceCapability,
  listDeviceProfileIds,
  resolveProfileId,
} from '../../src/system-layer/device_capability';

describe('Wave C device capability detection stub', () => {
  it('loads Student / Handheld / DS-XL profiles', () => {
    const ids = listDeviceProfileIds();
    expect(ids).toEqual(
      expect.arrayContaining(['student_14_5', 'handheld_hybrid', 'ds_xl_coder']),
    );
  });

  it('resolves friendly aliases', () => {
    expect(resolveProfileId('Student')).toBe('student_14_5');
    expect(resolveProfileId('Handheld')).toBe('handheld_hybrid');
    expect(resolveProfileId('DS-XL')).toBe('ds_xl_coder');
  });

  it('reports inference budget without physical claims', () => {
    const student = detectDeviceCapability('Student');
    expect(student.profile.displayName).toBe('Student');
    expect(student.physicalClaim).toBe('none');
    expect(student.inferenceBudget.preferLocal).toBe(true);
    expect(student.profile.capabilities.tutoring).toBe(true);

    const handheld = detectDeviceCapability('Handheld');
    expect(handheld.profile.capabilities.code).toBe(false);
    expect(handheld.inferenceBudget.batteryConstrained).toBe(true);

    const dsxl = detectDeviceCapability('DS-XL');
    expect(dsxl.profile.preferredInference).toBe('optional-local-model');
    expect(dsxl.profile.capabilities.code).toBe(true);
  });
});

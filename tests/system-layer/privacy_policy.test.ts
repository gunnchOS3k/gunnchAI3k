import {
  evaluateCloudDisclosure,
  formatDisclosureBanner,
} from '../../src/system-layer/privacy_policy';

describe('Wave C privacy / local-cloud disclosure', () => {
  it('blocks cloud in local-only mode', () => {
    const d = evaluateCloudDisclosure({
      processingMode: 'local-only',
      userCloudConsent: true,
      containsSensitiveLocalData: false,
      capability: 'tutoring',
    });
    expect(d.cloudPermitted).toBe(false);
    expect(d.dataLeavesDevice).toBe(false);
    expect(d.userVisibleDisclosure).toMatch(/LOCAL-ONLY/i);
  });

  it('requires explicit consent when cloud-allowed', () => {
    const noConsent = evaluateCloudDisclosure({
      processingMode: 'cloud-allowed',
      userCloudConsent: false,
      containsSensitiveLocalData: false,
      capability: 'code',
    });
    expect(noConsent.cloudPermitted).toBe(false);
    expect(noConsent.requiresConsent).toBe(true);

    const yes = evaluateCloudDisclosure({
      processingMode: 'cloud-allowed',
      userCloudConsent: true,
      containsSensitiveLocalData: false,
      capability: 'code',
    });
    expect(yes.cloudPermitted).toBe(true);
    expect(yes.dataLeavesDevice).toBe(true);
    expect(yes.userVisibleDisclosure).toMatch(/CLOUD/i);
    expect(yes.userVisibleDisclosure).toMatch(/No API keys/i);
  });

  it('never permits cloud for sensitive local data', () => {
    const d = evaluateCloudDisclosure({
      processingMode: 'cloud-allowed',
      userCloudConsent: true,
      containsSensitiveLocalData: true,
      capability: 'rag',
    });
    expect(d.cloudPermitted).toBe(false);
  });

  it('formats a user-visible banner', () => {
    const d = evaluateCloudDisclosure({
      processingMode: 'local-only',
      userCloudConsent: false,
      containsSensitiveLocalData: false,
      capability: 'network',
    });
    const banner = formatDisclosureBanner(d);
    expect(banner).toMatch(/dataLeavesDevice=false/);
    expect(banner).toMatch(/cloudPermitted=false/);
  });
});

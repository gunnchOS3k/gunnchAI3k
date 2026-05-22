import { GUNNCHAI3K_ONLINE_AWAKE_MESSAGE } from '../src/announcements/online-awake';

describe('Online awake message', () => {
  it('uses gunnchAI3k bot voice and mentions Edmund in third person', () => {
    expect(GUNNCHAI3K_ONLINE_AWAKE_MESSAGE).toContain('gunnchAI3k is AWAKE');
    expect(GUNNCHAI3K_ONLINE_AWAKE_MESSAGE).toContain('Edmund Gunn Jr.');
    expect(GUNNCHAI3K_ONLINE_AWAKE_MESSAGE).not.toMatch(/Edmund here/i);
  });
});

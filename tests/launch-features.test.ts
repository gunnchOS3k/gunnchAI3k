import { NYU_GRADUATION_LAUNCH_MESSAGE } from '../src/announcements/nyu-graduation-launch';
import {
  getAnnouncementChannelId,
  shouldAllowAutoChannelDiscovery,
  shouldSendOnlineGreeting,
} from '../src/config/startup';
import {
  getMissionRoadmapResponse,
  isMissionRoadmapQuestion,
} from '../src/responses/mission-roadmap';
import {
  clearPendingLaunches,
  handleConfirmLaunchGraduationCommand,
  handleLaunchGraduationCommand,
  isAdminUser,
  isConfirmLaunchGraduationCommand,
  isLaunchGraduationCommand,
} from '../src/launch/graduation-admin';

describe('Startup greeting controls', () => {
  it('enables awake message by default unless SEND_ONLINE_GREETING=false', () => {
    expect(shouldSendOnlineGreeting({})).toBe(true);
    expect(shouldSendOnlineGreeting({ SEND_ONLINE_GREETING: 'true' })).toBe(true);
    expect(shouldSendOnlineGreeting({ SEND_ONLINE_GREETING: 'false' })).toBe(false);
  });

  it('disables auto channel discovery by default', () => {
    expect(shouldAllowAutoChannelDiscovery({})).toBe(false);
    expect(
      shouldAllowAutoChannelDiscovery({ ALLOW_AUTO_CHANNEL_DISCOVERY: 'true' })
    ).toBe(true);
  });

  it('reads announcement channel id when set', () => {
    expect(getAnnouncementChannelId({})).toBeUndefined();
    expect(
      getAnnouncementChannelId({ DISCORD_ANNOUNCEMENT_CHANNEL_ID: '123' })
    ).toBe('123');
  });
});

describe('NYU graduation announcement', () => {
  it('uses gunnchAI3k bot voice and third-person Edmund references', () => {
    expect(NYU_GRADUATION_LAUNCH_MESSAGE).toContain('gunnchAI3k');
    expect(NYU_GRADUATION_LAUNCH_MESSAGE).toContain(
      'Edmund Gunn Jr. has completed'
    );
    expect(NYU_GRADUATION_LAUNCH_MESSAGE).not.toMatch(
      /what's good family|Edmund here/i
    );
    expect(NYU_GRADUATION_LAUNCH_MESSAGE).toContain('PhD application');
    expect(NYU_GRADUATION_LAUNCH_MESSAGE).not.toMatch(/accepted to Oulu/i);
    expect(NYU_GRADUATION_LAUNCH_MESSAGE).toContain(
      'spectrumx-ai-ran-gary'
    );
  });
});

describe('Mission roadmap responses', () => {
  it('detects roadmap questions', () => {
    expect(isMissionRoadmapQuestion('@gunnchAI3k what is Edmund working on')).toBe(
      true
    );
    expect(isMissionRoadmapQuestion('what is the game jam')).toBe(true);
    expect(isMissionRoadmapQuestion('what is SpectrumX')).toBe(true);
    expect(isMissionRoadmapQuestion('what are the 7 global campuses')).toBe(true);
    expect(isMissionRoadmapQuestion('oulu plan')).toBe(true);
    expect(isMissionRoadmapQuestion('flashcards for math')).toBe(false);
  });

  it('includes game jam, hackathons, SpectrumX, and Oulu portfolio language', () => {
    const msg = getMissionRoadmapResponse();
    expect(msg).toContain('Summer 2026');
    expect(msg).toContain('hackathon');
    expect(msg).toContain('SpectrumX');
    expect(msg).toContain('7 global campuses');
    expect(msg).toContain('Oulu');
    expect(msg).toContain('application portfolio');
    expect(msg).not.toMatch(/accepted/i);
  });
});

describe('Admin graduation launch', () => {
  const adminId = 'admin-user-1';

  beforeEach(() => {
    clearPendingLaunches();
    process.env.ADMIN_USER_IDS = adminId;
  });

  afterEach(() => {
    delete process.env.ADMIN_USER_IDS;
    clearPendingLaunches();
  });

  it('detects launch commands', () => {
    expect(isLaunchGraduationCommand('launch graduation')).toBe(true);
    expect(isConfirmLaunchGraduationCommand('confirm launch graduation')).toBe(
      true
    );
  });

  it('refuses non-admins', async () => {
    const reply = jest.fn().mockResolvedValue(undefined);
    const message = {
      author: { id: 'other-user' },
      channel: { id: 'ch-1', send: jest.fn() },
      reply,
    };
    await handleLaunchGraduationCommand(message as any);
    expect(reply).toHaveBeenCalledWith('Launch command is admin-only.');
  });

  it('requires admin env for admins', async () => {
    delete process.env.ADMIN_USER_IDS;
    const reply = jest.fn().mockResolvedValue(undefined);
    const message = {
      author: { id: adminId },
      channel: { id: 'ch-1', send: jest.fn() },
      reply,
    };
    await handleLaunchGraduationCommand(message as any);
    expect(reply.mock.calls[0][0]).toContain('ADMIN_USER_IDS');
  });

  it('allows admin two-step confirm in same channel', async () => {
    const channelSend = jest.fn().mockResolvedValue(undefined);
    const reply = jest.fn().mockResolvedValue(undefined);
    const message = {
      author: { id: adminId },
      channel: { id: 'ch-1', send: channelSend },
      reply,
    };

    expect(isAdminUser(adminId)).toBe(true);
    await handleLaunchGraduationCommand(message as any);
    await handleConfirmLaunchGraduationCommand(message as any);

    expect(channelSend).toHaveBeenCalledWith(NYU_GRADUATION_LAUNCH_MESSAGE);
    expect(reply).toHaveBeenCalledWith(
      expect.stringContaining('Graduation transmission sent')
    );
  });
});

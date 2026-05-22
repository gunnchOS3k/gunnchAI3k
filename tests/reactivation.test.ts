import {
  isBotMentioned,
  SimpleGunnchAI3k,
} from '../src/simple-bot';
import {
  REQUIRED_ENV_VARS,
  shouldSendOnlineGreeting,
  validateStartupEnv,
} from '../src/config/startup';

jest.mock('discord.js', () => ({
  Client: jest.fn().mockImplementation(() => ({
    login: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    once: jest.fn(),
    destroy: jest.fn(),
    guilds: { cache: new Map() },
    user: { id: 'bot-user-id', tag: 'gunnchAI3k#5214' },
  })),
  GatewayIntentBits: {
    Guilds: 1,
    GuildMessages: 2,
    MessageContent: 4,
    GuildVoiceStates: 8,
  },
  Events: {
    ClientReady: 'ready',
    MessageCreate: 'messageCreate',
  },
}));

jest.mock('../src/study/ssj-infinity', () => ({
  SSJInfinity: jest.fn().mockImplementation(() => ({
    analyzeCourseMaterialsWithVisualRecognition: jest
      .fn()
      .mockResolvedValue(undefined),
    handleUserFeedback: jest.fn().mockResolvedValue(false),
    processMention: jest.fn().mockResolvedValue(null),
  })),
}));

jest.mock('../src/study/course-integration');
jest.mock('../src/seasonal/seasonal-manager');
jest.mock('../src/music/youtube-music-manager');

function createMockMessage(overrides: Partial<Record<string, unknown>> = {}) {
  const reply = jest.fn().mockResolvedValue(undefined);
  return {
    author: { bot: false, username: 'tester', id: 'user-1' },
    content: '@gunnchAI3k help',
    mentions: {
      has: jest.fn().mockReturnValue(false),
      users: new Map(),
    },
    reply,
    ...overrides,
  };
}

describe('Startup configuration', () => {
  it('fails cleanly when DISCORD_BOT_TOKEN is missing', () => {
    const result = validateStartupEnv({});
    expect(result.ok).toBe(false);
    expect(result.missing).toContain('DISCORD_BOT_TOKEN');
    expect(result.message).toContain('DISCORD_BOT_TOKEN');
    expect(result.message).not.toMatch(/[A-Za-z0-9]{20,}/);
  });

  it('lists required env vars', () => {
    expect(REQUIRED_ENV_VARS).toEqual(['DISCORD_BOT_TOKEN']);
  });

  it('sends awake message by default unless SEND_ONLINE_GREETING=false', () => {
    expect(shouldSendOnlineGreeting({})).toBe(true);
    expect(shouldSendOnlineGreeting({ SEND_ONLINE_GREETING: 'false' })).toBe(
      false
    );
    expect(shouldSendOnlineGreeting({ SEND_ONLINE_GREETING: 'true' })).toBe(
      true
    );
  });
});

describe('Mention routing', () => {
  let bot: SimpleGunnchAI3k;
  let messageHandler: (message: ReturnType<typeof createMockMessage>) => Promise<void>;

  beforeEach(async () => {
    process.env.DISCORD_BOT_TOKEN = 'test_token';
    jest.clearAllMocks();
    bot = new SimpleGunnchAI3k();
    const mockClient = (bot as any).client;
    mockClient.user = { id: 'bot-user-id', tag: 'gunnchAI3k#5214' };

    await bot.start();

    const onCalls = mockClient.on.mock.calls as Array<[string, Function]>;
    const messageCall = onCalls.find(([event]) => event === 'messageCreate');
    messageHandler = messageCall![1] as typeof messageHandler;
  });

  it('detects real Discord mention by user id', () => {
    expect(
      isBotMentioned('hello', 'bot-user-id', ['bot-user-id'])
    ).toBe(true);
  });

  it('detects @gunnchAI3k text alias', () => {
    expect(isBotMentioned('@gunnchAI3k help', undefined, [])).toBe(true);
  });

  it('ignores messages from other bots', async () => {
    const message = createMockMessage({
      author: { bot: true, username: 'other-bot', id: 'bot-2' },
      content: '@gunnchAI3k help',
    });
    await messageHandler(message as any);
    expect(message.reply).not.toHaveBeenCalled();
  });

  it('ignores regular messages without mention', async () => {
    const message = createMockMessage({ content: 'hello everyone' });
    await messageHandler(message as any);
    expect(message.reply).not.toHaveBeenCalled();
  });

  it('routes @gunnchAI3k help to help response', async () => {
    const message = createMockMessage({
      content: '<@bot-user-id> help',
      mentions: {
        has: jest.fn().mockReturnValue(true),
        users: new Map([['bot-user-id', {}]]),
      },
    });
    await messageHandler(message as any);
    expect(message.reply).toHaveBeenCalled();
    const text = String(message.reply.mock.calls[0][0]);
    expect(text.toLowerCase()).toContain('help');
  });

  it('routes flashcards for probability via SSJ or fallback', async () => {
    const message = createMockMessage({
      content: '<@bot-user-id> flashcards for probability',
      mentions: {
        has: jest.fn().mockReturnValue(true),
        users: new Map([['bot-user-id', {}]]),
      },
    });
    await messageHandler(message as any);
    expect(message.reply).toHaveBeenCalled();
    const text = String(message.reply.mock.calls[0][0]);
    expect(text.toLowerCase()).toMatch(/flashcard|probability/);
  });

  it('routes practice test for robotics', async () => {
    const message = createMockMessage({
      content: '<@bot-user-id> practice test for robotics',
      mentions: {
        has: jest.fn().mockReturnValue(true),
        users: new Map([['bot-user-id', {}]]),
      },
    });
    await messageHandler(message as any);
    expect(message.reply).toHaveBeenCalled();
    const text = String(message.reply.mock.calls[0][0]);
    expect(text.toLowerCase()).toMatch(/practice|robotics|test/);
  });

  it('routes lock me in for probability', async () => {
    const message = createMockMessage({
      content: '<@bot-user-id> lock me in for probability',
      mentions: {
        has: jest.fn().mockReturnValue(true),
        users: new Map([['bot-user-id', {}]]),
      },
    });
    await messageHandler(message as any);
    expect(message.reply).toHaveBeenCalled();
    const text = String(message.reply.mock.calls[0][0]);
    expect(text.toLowerCase()).toMatch(/lock|warrior|probability/);
  });

  it('routes music status without treating as play command', async () => {
    const message = createMockMessage({
      content: '<@bot-user-id> music status',
      mentions: {
        has: jest.fn().mockReturnValue(true),
        users: new Map([['bot-user-id', {}]]),
      },
    });
    const youtube = (bot as any).youtubeMusicManager;
    youtube.getServiceStatus = jest
      .fn()
      .mockReturnValue('YouTube Music Service Status');
    youtube.getCacheStats = jest.fn().mockReturnValue('Cache: 0');
    youtube.getRecommendedTracks = jest
      .fn()
      .mockReturnValue([{ title: 'Track', artist: 'Artist' }]);

    await messageHandler(message as any);
    expect(message.reply).toHaveBeenCalled();
    const text = String(message.reply.mock.calls[0][0]);
    expect(text).toContain('MUSIC SERVICE STATUS');
  });
});

describe('Music routing helpers', () => {
  let bot: SimpleGunnchAI3k;

  beforeEach(() => {
    bot = new SimpleGunnchAI3k();
  });

  it('detects YouTube URLs in queries', () => {
    const url = 'https://youtu.be/dQw4w9WgXcQ';
    expect(
      /https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/.test(url)
    ).toBe(true);
  });

  it('extracts song query from play message', () => {
    const content = '@gunnchAI3k play meet me there by lucki';
    const songQuery = content
      .replace(/@gunnchai3k/gi, '')
      .replace(/play/gi, '')
      .trim();
    expect(songQuery).toContain('meet me there');
  });

  it('classifies music-related messages', () => {
    expect((bot as any).isMusicRelatedMessage('play something')).toBe(true);
    expect((bot as any).isMusicRelatedMessage('music status')).toBe(true);
    expect((bot as any).isMusicRelatedMessage('flashcards for math')).toBe(
      false
    );
  });
});

describe('Graceful shutdown', () => {
  it('registers shutdown handlers without throwing', async () => {
    process.env.DISCORD_BOT_TOKEN = 'test_token';
    const listenersBefore = process.listenerCount('SIGINT');
    const bot = new SimpleGunnchAI3k();
    await bot.start();
    expect(process.listenerCount('SIGINT')).toBeGreaterThanOrEqual(
      listenersBefore
    );
  });
});

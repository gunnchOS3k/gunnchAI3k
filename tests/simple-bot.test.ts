import { SimpleGunnchAI3k } from '../src/simple-bot';

// Mock Discord.js
jest.mock('discord.js', () => ({
  Client: jest.fn().mockImplementation(() => ({
    login: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    once: jest.fn(),
    guilds: {
      cache: new Map()
    },
    user: {
      tag: 'gunnchAI3k#5214'
    }
  })),
  GatewayIntentBits: {
    Guilds: 1,
    MessageContent: 2,
    GuildVoiceStates: 4
  },
  Events: {
    Ready: 'ready',
    MessageCreate: 'messageCreate',
    InteractionCreate: 'interactionCreate'
  }
}));

// Mock other dependencies
jest.mock('../src/study/ssj-infinity');
jest.mock('../src/study/course-integration');
jest.mock('../src/seasonal/seasonal-manager');
jest.mock('../src/music/youtube-music-manager');

describe('SimpleGunnchAI3k', () => {
  let bot: SimpleGunnchAI3k;

  beforeEach(() => {
    jest.clearAllMocks();
    bot = new SimpleGunnchAI3k();
  });

  describe('Constructor', () => {
    it('should create a SimpleGunnchAI3k instance', () => {
      expect(bot).toBeDefined();
      expect(bot).toBeInstanceOf(SimpleGunnchAI3k);
    });
  });

  describe('Start Method', () => {
    it('should start without throwing errors', async () => {
      // Mock the client.login method
      const mockLogin = jest.fn().mockResolvedValue(undefined);
      (bot as any).client = {
        login: mockLogin,
        on: jest.fn(),
        once: jest.fn(),
        guilds: {
          cache: new Map()
        },
        user: {
          tag: 'gunnchAI3k#5214'
        }
      };

      await expect(bot.start()).resolves.not.toThrow();
      expect(mockLogin).toHaveBeenCalledWith(process.env.DISCORD_BOT_TOKEN);
    });
  });

  describe('Music Command Detection', () => {
    it('should detect music-related messages', () => {
      const musicMessages = [
        'play some music',
        'start a song',
        'youtube music',
        'put on some tunes'
      ];

      musicMessages.forEach(message => {
        const result = (bot as any).isMusicRelatedMessage(message);
        expect(result).toBe(true);
      });
    });

    it('should not detect non-music messages', () => {
      const nonMusicMessages = [
        'hello world',
        'study for exam',
        'help me learn',
        'what can you do'
      ];

      nonMusicMessages.forEach(message => {
        const result = (bot as any).isMusicRelatedMessage(message);
        expect(result).toBe(false);
      });
    });
  });
});

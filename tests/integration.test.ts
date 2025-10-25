import { SimpleGunnchAI3k } from '../src/simple-bot';

// Mock all dependencies
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

jest.mock('../src/study/ssj-infinity');
jest.mock('../src/study/course-integration');
jest.mock('../src/seasonal/seasonal-manager');
jest.mock('../src/music/youtube-music-manager');

describe('gunnchAI3k Integration Tests', () => {
  let bot: SimpleGunnchAI3k;

  beforeEach(() => {
    jest.clearAllMocks();
    bot = new SimpleGunnchAI3k();
  });

  describe('Bot Initialization', () => {
    it('should initialize all components', () => {
      expect(bot).toBeDefined();
      expect(bot).toBeInstanceOf(SimpleGunnchAI3k);
    });

    it('should have all required properties', () => {
      expect((bot as any).client).toBeDefined();
      expect((bot as any).ssjInfinity).toBeDefined();
      expect((bot as any).courseIntegration).toBeDefined();
      expect((bot as any).seasonalManager).toBeDefined();
      expect((bot as any).youtubeMusicManager).toBeDefined();
    });
  });

  describe('Music Command Detection', () => {
    it('should detect various music commands', () => {
      const musicCommands = [
        'play music',
        'start song',
        'youtube video',
        'put on music',
        'queue song'
      ];

      musicCommands.forEach(command => {
        const result = (bot as any).isMusicRelatedMessage(command);
        expect(result).toBe(true);
      });
    });
  });

  describe('Environment Variables', () => {
    it('should have required environment variables', () => {
      expect(process.env.DISCORD_BOT_TOKEN).toBeDefined();
      expect(process.env.DISCORD_CLIENT_ID).toBeDefined();
      expect(process.env.DISCORD_GUILD_ID).toBeDefined();
    });
  });

  describe('Bot Startup', () => {
    it('should start without errors', async () => {
      // Mock the client methods
      const mockLogin = jest.fn().mockResolvedValue(undefined);
      const mockOn = jest.fn();
      const mockOnce = jest.fn();

      (bot as any).client = {
        login: mockLogin,
        on: mockOn,
        once: mockOnce,
        guilds: {
          cache: new Map()
        },
        user: {
          tag: 'gunnchAI3k#5214'
        }
      };

      await expect(bot.start()).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle startup errors gracefully', async () => {
      const mockLogin = jest.fn().mockRejectedValue(new Error('Connection failed'));
      
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

      await expect(bot.start()).rejects.toThrow('Connection failed');
    });
  });
});

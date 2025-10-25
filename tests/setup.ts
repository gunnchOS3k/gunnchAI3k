// Jest setup file for gunnchAI3k tests
import 'dotenv/config';

// Mock environment variables for testing
process.env.DISCORD_BOT_TOKEN = 'test_token';
process.env.DISCORD_CLIENT_ID = 'test_client_id';
process.env.DISCORD_GUILD_ID = 'test_guild_id';

// Mock console methods to reduce noise in tests
const originalConsole = console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test timeout
jest.setTimeout(10000);

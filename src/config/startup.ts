/**
 * Startup configuration validation for gunnchAI3k.
 * Never logs secret values — only whether they are set.
 */

export const REQUIRED_ENV_VARS = ['DISCORD_BOT_TOKEN'] as const;

export const OPTIONAL_ENV_VARS = [
  'DISCORD_CLIENT_ID',
  'DISCORD_GUILD_ID',
  'OPENAI_API_KEY',
  'GITHUB_TOKEN',
  'SEND_ONLINE_GREETING',
] as const;

export interface StartupValidationResult {
  ok: boolean;
  missing: string[];
  message: string;
}

export function validateStartupEnv(
  env: NodeJS.ProcessEnv = process.env
): StartupValidationResult {
  const missing = REQUIRED_ENV_VARS.filter((key) => !env[key]?.trim());

  if (missing.length === 0) {
    return { ok: true, missing: [], message: '' };
  }

  const optionalHint = OPTIONAL_ENV_VARS.join(', ');
  const message = [
    'gunnchAI3k cannot start: required environment variables are missing.',
    '',
    `Missing: ${missing.join(', ')}`,
    '',
    'Set them in a local .env file (never commit .env) or your process manager.',
    `Copy env.example → .env and set DISCORD_BOT_TOKEN from the Discord Developer Portal.`,
    '',
    `Optional (feature-specific): ${optionalHint}`,
  ].join('\n');

  return { ok: false, missing: [...missing], message };
}

export function shouldSendOnlineGreeting(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = env.SEND_ONLINE_GREETING?.trim().toLowerCase();
  return raw === 'true' || raw === '1' || raw === 'yes';
}

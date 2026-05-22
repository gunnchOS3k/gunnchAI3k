/**
 * Manual NYU graduation announcement sender (never runs on npm start).
 *
 * Preview:  npm run announce:nyu-grad:preview
 * Dry-run:  npm run announce:nyu-grad:send  (ANNOUNCEMENT_DRY_RUN defaults true)
 * Live send: ANNOUNCEMENT_DRY_RUN=false ANNOUNCEMENT_CONFIRM=SEND_GRAD_LAUNCH npm run announce:nyu-grad:send
 */

import 'dotenv/config';
import { ChannelType, Client, GatewayIntentBits, TextChannel } from 'discord.js';
import { NYU_GRADUATION_LAUNCH_MESSAGE } from '../src/announcements/nyu-graduation-launch';

const CONFIRM_PHRASE = 'SEND_GRAD_LAUNCH';

function isDryRun(env: NodeJS.ProcessEnv): boolean {
  const raw = env.ANNOUNCEMENT_DRY_RUN?.trim().toLowerCase();
  if (raw === undefined || raw === '') return true;
  return raw !== 'false' && raw !== '0' && raw !== 'no';
}

async function main(): Promise<void> {
  const mode = process.argv[2] ?? 'send';

  if (mode === 'preview') {
    console.log(NYU_GRADUATION_LAUNCH_MESSAGE);
    return;
  }

  if (mode !== 'send') {
    console.error('Usage: tsx scripts/announce-nyu-grad.ts [preview|send]');
    process.exit(1);
  }

  console.log('--- NYU Graduation Launch Announcement ---');
  console.log(NYU_GRADUATION_LAUNCH_MESSAGE);
  console.log('--- end message ---\n');

  if (isDryRun(process.env)) {
    console.log(
      'DRY RUN: message not sent. Set ANNOUNCEMENT_DRY_RUN=false and ANNOUNCEMENT_CONFIRM=SEND_GRAD_LAUNCH to send.'
    );
    return;
  }

  if (process.env.ANNOUNCEMENT_CONFIRM?.trim() !== CONFIRM_PHRASE) {
    console.error(
      `Refusing to send: ANNOUNCEMENT_CONFIRM must be exactly "${CONFIRM_PHRASE}".`
    );
    console.error(
      'This prevents accidental broadcasts. Example:\n' +
        `  ANNOUNCEMENT_DRY_RUN=false ANNOUNCEMENT_CONFIRM=${CONFIRM_PHRASE} npm run announce:nyu-grad:send`
    );
    process.exit(1);
  }

  const token = process.env.DISCORD_BOT_TOKEN?.trim();
  const channelId = process.env.DISCORD_ANNOUNCEMENT_CHANNEL_ID?.trim();

  if (!token) {
    console.error('Missing DISCORD_BOT_TOKEN.');
    process.exit(1);
  }
  if (!channelId) {
    console.error('Missing DISCORD_ANNOUNCEMENT_CHANNEL_ID.');
    process.exit(1);
  }

  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  try {
    await client.login(token);
    const channel = await client.channels.fetch(channelId);

    if (
      !channel ||
      (channel.type !== ChannelType.GuildText &&
        channel.type !== ChannelType.GuildAnnouncement)
    ) {
      console.error(
        'Channel is missing or not a sendable text channel. Check DISCORD_ANNOUNCEMENT_CHANNEL_ID.'
      );
      process.exit(1);
    }

    const textChannel = channel as TextChannel;
    if (!textChannel.permissionsFor(client.user!)?.has('SendMessages')) {
      console.error('Bot lacks Send Messages permission in the announcement channel.');
      process.exit(1);
    }

    await textChannel.send(NYU_GRADUATION_LAUNCH_MESSAGE);
    console.log(`✅ Announcement sent to channel ${channelId}.`);
  } finally {
    client.destroy();
  }
}

main().catch((err) => {
  console.error('Announcement script failed:', err);
  process.exit(1);
});

/**
 * Admin-only in-channel graduation announcement (two-step confirm).
 */

import { Message } from 'discord.js';
import { NYU_GRADUATION_LAUNCH_MESSAGE } from '../announcements/nyu-graduation-launch';

const PENDING_TTL_MS = 2 * 60 * 1000;

interface PendingLaunch {
  userId: string;
  channelId: string;
  expiresAt: number;
}

const pendingByUser = new Map<string, PendingLaunch>();

export function parseAdminUserIds(env: NodeJS.ProcessEnv = process.env): string[] {
  const raw = env.ADMIN_USER_IDS?.trim();
  if (!raw) return [];
  return raw
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

export function isAdminUser(userId: string, env: NodeJS.ProcessEnv = process.env): boolean {
  const admins = parseAdminUserIds(env);
  return admins.length > 0 && admins.includes(userId);
}

function stripMentionNoise(content: string): string {
  return content.toLowerCase().replace(/<@!?\d+>/g, '').replace(/@gunnchai3k/gi, '').trim();
}

export function isLaunchGraduationCommand(content: string): boolean {
  const t = stripMentionNoise(content);
  return t.includes('launch graduation') && !t.includes('confirm');
}

export function isConfirmLaunchGraduationCommand(content: string): boolean {
  const t = stripMentionNoise(content);
  return t.includes('confirm launch graduation');
}

export async function handleLaunchGraduationCommand(
  message: Message
): Promise<boolean> {
  const admins = parseAdminUserIds();
  if (admins.length === 0) {
    await message.reply(
      'Launch command is disabled: set `ADMIN_USER_IDS` in the server environment (comma-separated Discord user IDs).'
    );
    return true;
  }

  if (!isAdminUser(message.author.id)) {
    await message.reply('Launch command is admin-only.');
    return true;
  }

  pendingByUser.set(message.author.id, {
    userId: message.author.id,
    channelId: message.channel.id,
    expiresAt: Date.now() + PENDING_TTL_MS,
  });

  await message.reply(
    `📋 **Graduation launch preview** (admin only)\n\n` +
      `This will post the NYU graduation transmission **in this channel only** after confirmation.\n\n` +
      `Reply within 2 minutes with:\n\`@gunnchAI3k confirm launch graduation\`\n\n` +
      `**Preview (first 400 chars):**\n${NYU_GRADUATION_LAUNCH_MESSAGE.slice(0, 400)}…`
  );
  return true;
}

export async function handleConfirmLaunchGraduationCommand(
  message: Message
): Promise<boolean> {
  const admins = parseAdminUserIds();
  if (admins.length === 0) {
    await message.reply(
      'Launch command is disabled: set `ADMIN_USER_IDS` in the server environment.'
    );
    return true;
  }

  if (!isAdminUser(message.author.id)) {
    await message.reply('Launch command is admin-only.');
    return true;
  }

  const pending = pendingByUser.get(message.author.id);
  if (!pending) {
    await message.reply(
      'No pending launch confirmation. Run `@gunnchAI3k launch graduation` first.'
    );
    return true;
  }

  if (Date.now() > pending.expiresAt) {
    pendingByUser.delete(message.author.id);
    await message.reply('Launch confirmation expired. Run `launch graduation` again.');
    return true;
  }

  if (pending.channelId !== message.channel.id) {
    await message.reply(
      'Confirm in the **same channel** where you ran `launch graduation`.'
    );
    return true;
  }

  pendingByUser.delete(message.author.id);
  await message.channel.send(NYU_GRADUATION_LAUNCH_MESSAGE);
  await message.reply('✅ Graduation transmission sent to this channel.');
  return true;
}

/** @internal test helper */
export function clearPendingLaunches(): void {
  pendingByUser.clear();
}

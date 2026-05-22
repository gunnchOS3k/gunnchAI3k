# Discord Launch Checklist — Edmund's Server

Use before making gunnchAI3k visible in the main server.

## Developer Portal

1. [ ] Bot token exists; copied **only** into local `.env` as `DISCORD_BOT_TOKEN` (never commit `.env`)
2. [ ] **Message Content Intent** enabled under Privileged Gateway Intents
3. [ ] **Guilds** and **Guild Messages** covered by default intents in code
4. [ ] **Guild Voice States** enabled only if you will test music/voice in VC

## Bot permissions (text launch)

- [ ] View Channel
- [ ] Send Messages
- [ ] Read Message History
- [ ] Embed Links (optional, for study embeds)

## Bot permissions (music test only)

- [ ] Connect
- [ ] Speak
- [ ] FFmpeg installed on the host running the bot

## Channels and env

- [ ] Private `#launch-test` channel created; only Edmund + trusted admins
- [ ] Channel ID copied to `DISCORD_ANNOUNCEMENT_CHANNEL_ID` for controlled posts
- [ ] `SEND_ONLINE_GREETING=false` for first `npm start`
- [ ] `ALLOW_AUTO_CHANNEL_DISCOVERY=false`
- [ ] `ADMIN_USER_IDS` set to Edmund's Discord user ID (and any co-admins), comma-separated

## Announcement safety

- [ ] `ANNOUNCEMENT_DRY_RUN=true` (or unset) before any send test
- [ ] `npm run announce:nyu-grad:preview` reviewed — bot voice, third person, no Oulu acceptance claim
- [ ] `ANNOUNCEMENT_CONFIRM` **not** set until final send
- [ ] Final send only with:
  - `ANNOUNCEMENT_DRY_RUN=false`
  - `ANNOUNCEMENT_CONFIRM=SEND_GRAD_LAUNCH`
  - `DISCORD_ANNOUNCEMENT_CHANNEL_ID` pointing at the intended channel

## In-channel tests (private channel)

- [ ] `@gunnchAI3k help`
- [ ] `@gunnchAI3k what is Edmund working on`
- [ ] `@gunnchAI3k what is SpectrumX`
- [ ] `@gunnchAI3k what is the game jam`
- [ ] `@gunnchAI3k music status`
- [ ] Admin: `launch graduation` → `confirm launch graduation` (optional; posts to **current channel only**)

## Go / no-go

- [ ] No startup spam (console: `Online greeting skipped…`)
- [ ] No secrets in logs or screenshots
- [ ] [LAUNCH_PROOF.md](./LAUNCH_PROOF.md) filled in for this run

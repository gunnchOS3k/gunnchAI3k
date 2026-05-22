# Launch Readiness Notes

Prior audit artifacts are present:

- [AUDIT_FEATURE_MATRIX.md](./AUDIT_FEATURE_MATRIX.md)
- [PROOF_OF_OPERATION.md](./PROOF_OF_OPERATION.md)
- [LIVE_DISCORD_PROOF_CHECKLIST.md](./LIVE_DISCORD_PROOF_CHECKLIST.md)
- [DISCORD_REACTIVATION_CHECKLIST.md](./DISCORD_REACTIVATION_CHECKLIST.md)

## Production entry

| Command | Entry |
|---------|--------|
| `npm start` | `node dist/simple-bot.js` (esbuild bundle of `src/simple-bot.ts`) |
| `npm run dev` | `tsx src/simple-bot.ts` |
| `npm run build` | esbuild → `dist/simple-bot.js` |

Legacy `src/index.ts` remains broken — do not use for launch.

## Discord requirements

- **Required env:** `DISCORD_BOT_TOKEN`
- **Intents:** Guilds, GuildMessages, MessageContent; GuildVoiceStates only if testing music/voice
- **Portal:** enable **Message Content Intent**

## Launch controls (this branch)

| Variable | Default | Purpose |
|----------|---------|---------|
| `SEND_ONLINE_GREETING` | `false` | Only literal `true` sends startup greeting |
| `DISCORD_ANNOUNCEMENT_CHANNEL_ID` | unset | Target channel when greeting enabled |
| `ALLOW_AUTO_CHANNEL_DISCOVERY` | `false` | Legacy general/chat scan — off by default |
| `ADMIN_USER_IDS` | unset | Required for `@gunnchAI3k launch graduation` |
| `ANNOUNCEMENT_DRY_RUN` | `true` (unset) | `announce:nyu-grad:send` prints only |
| `ANNOUNCEMENT_CONFIRM` | unset | Must be `SEND_GRAD_LAUNCH` for live send |

## Manual announcement

- Preview: `npm run announce:nyu-grad:preview`
- Send: see [DISCORD_LAUNCH_CHECKLIST.md](./DISCORD_LAUNCH_CHECKLIST.md)

## In-bot features

- Roadmap: `@gunnchAI3k what is Edmund working on` (and related phrases)
- Admin launch: `@gunnchAI3k launch graduation` → `@gunnchAI3k confirm launch graduation` (same channel, 2 min window)

Research repo referenced in messages: https://github.com/gunnchOS3k/spectrumx-ai-ran-gary

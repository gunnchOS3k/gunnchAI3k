# Launch Proof — NYU Grad / gunnchAI3k

**Date:** 2026-05-22  
**Branch:** `launch/nyu-grad-gunnchai3k`

## What changed

1. **Startup greeting hardened** — off unless `SEND_ONLINE_GREETING=true` (literal only); uses `DISCORD_ANNOUNCEMENT_CHANNEL_ID`; no guild-wide broadcast; auto-discovery only if `ALLOW_AUTO_CHANNEL_DISCOVERY=true`.
2. **NYU graduation announcement** — `NYU_GRADUATION_LAUNCH_MESSAGE` in bot voice (third-person Edmund); preview/send scripts with dry-run + `ANNOUNCEMENT_CONFIRM=SEND_GRAD_LAUNCH`.
3. **Mission roadmap mentions** — `@gunnchAI3k what is Edmund working on` (and related phrases).
4. **Admin launch** — `@gunnchAI3k launch graduation` → `confirm launch graduation` (2 min, same channel, `ADMIN_USER_IDS` required).

## Commands run

| Command | Result |
|---------|--------|
| `node -v` | PASS — v24.9.0 |
| `npm -v` | PASS — 11.6.0 |
| `npm run build` | PASS — esbuild `dist/simple-bot.js` (249.4kb) |
| `npm test` | PASS — 7 suites, **70/70** tests |
| `npm run announce:nyu-grad:preview` | PASS — bot-voice graduation message printed |
| `ANNOUNCEMENT_DRY_RUN=true npm run announce:nyu-grad:send` | PASS — dry-run, no Discord send |
| `npm run lint` | FAIL — no ESLint config (does not block launch) |

## Launch safety checks

| Check | Status |
|-------|--------|
| Automatic greeting disabled by default | YES |
| Preview uses gunnchAI3k voice (not Edmund first-person) | YES |
| Send protected by dry-run default | YES |
| Send requires `ANNOUNCEMENT_CONFIRM=SEND_GRAD_LAUNCH` | YES |
| `npm start` does not run announce script | YES |

## Manual Discord test checklist

- [ ] `SEND_ONLINE_GREETING=false npm start` — console: `Online greeting skipped…`
- [ ] `@gunnchAI3k help`
- [ ] `@gunnchAI3k what is Edmund working on`
- [ ] `@gunnchAI3k what is SpectrumX`
- [ ] `@gunnchAI3k what is the game jam`
- [ ] `@gunnchAI3k music status`
- [ ] Admin two-step launch in private channel (optional)

---

## Safe first launch procedure

### 1. Create local `.env`

```bash
DISCORD_BOT_TOKEN=your_token_here
SEND_ONLINE_GREETING=false
ALLOW_AUTO_CHANNEL_DISCOVERY=false
DISCORD_ANNOUNCEMENT_CHANNEL_ID=your_private_test_channel_id
ANNOUNCEMENT_DRY_RUN=true
ADMIN_USER_IDS=your_discord_user_id
```

### 2. Build

```bash
npm run build
```

### 3. Start bot

```bash
npm start
```

### 4. Private channel tests

- `@gunnchAI3k help`
- `@gunnchAI3k what is Edmund working on`
- `@gunnchAI3k what is SpectrumX`
- `@gunnchAI3k what is the game jam`
- `@gunnchAI3k music status`

### 5. Preview announcement

```bash
npm run announce:nyu-grad:preview
```

### 6. Dry-run send

```bash
ANNOUNCEMENT_DRY_RUN=true npm run announce:nyu-grad:send
```

### 7. Final send (when ready)

```bash
ANNOUNCEMENT_DRY_RUN=false ANNOUNCEMENT_CONFIRM=SEND_GRAD_LAUNCH npm run announce:nyu-grad:send
```

Requires `DISCORD_ANNOUNCEMENT_CHANNEL_ID` set to the target channel.

---

## Remaining blockers

- Live Discord token + Message Content Intent (manual)
- ESLint config missing (non-blocking)
- npm audit advisories from prior audit (non-blocking for text launch)
- Voice/music not part of this launch proof

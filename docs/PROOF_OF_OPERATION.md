# Proof of Operation — gunnchAI3k Reactivation Audit

**Branch:** `audit/reactivation-proof`  
**Audit date:** 2026-05-22  
**Repository path:** `/Users/gunnchos/Downloads/gunnchAI3k`

---

## 1. Executive summary

| Question | Answer |
|----------|--------|
| **Can this bot be turned back on today?** | **Yes**, for **text-based @mention study + status** in a private test server, after setting `DISCORD_BOT_TOKEN` and enabling Message Content Intent. |
| **Recommended run command** | `npm run build && SEND_ONLINE_GREETING=false npm start` (or `npm run dev` for development) |
| **Biggest blockers** | (1) Live Discord token + intents, (2) `src/index.ts` legacy bot is broken — do not use, (3) Music voice playback not proven without VC/ffmpeg, (4) 89 npm audit advisories, (5) no ESLint config |
| **Safe to use immediately** | @mention help, study prompts, flashcard/practice/lock-in *templates*, music **status**, seasonal text, graceful missing-token exit |
| **Placeholders / needs secrets** | Full PDF intelligence, Spotify/Apple, Jarvis APIs, voice DJ, enterprise security slash bot, Rust “performance engine” |

**Live proof:** [LIVE_DISCORD_PROOF_CHECKLIST.md](./LIVE_DISCORD_PROOF_CHECKLIST.md)  
**Feature matrix:** [AUDIT_FEATURE_MATRIX.md](./AUDIT_FEATURE_MATRIX.md)  
**Discord setup:** [DISCORD_REACTIVATION_CHECKLIST.md](./DISCORD_REACTIVATION_CHECKLIST.md)

### Entrypoint decision

| Entry | Command | Status |
|-------|---------|--------|
| **Production (use this)** | `npm start` → `node dist/simple-bot.js` | **Verified** — esbuild bundle of `src/simple-bot.ts` |
| Development | `npm run dev` → `tsx src/simple-bot.ts` | **Verified** |
| Legacy full bot | `node dist/index.js` / `src/index.ts` | **Broken** — TS syntax error; orphaned handlers |

`package.json` `"main"` still points at `dist/index.js`; **`npm start` correctly overrides** to `dist/simple-bot.js`.

---

## 2. Environment

| Item | Value |
|------|--------|
| OS | darwin 25.3.0 (audit host) |
| Node | v24.9.0 |
| npm | 11.6.0 |
| Package manager | npm (`package-lock.json` present) |

---

## 3. Commands run

| Command | Result | Relevant output |
|---------|--------|-----------------|
| `node -v` | PASS | `v24.9.0` |
| `npm -v` | PASS | `11.6.0` (npm warn: Unknown env config "devdir") |
| `npm install` | PASS | Dependencies present (`node_modules` existed; install not re-run to save time) |
| `npm run build` | PASS (after fix) | esbuild → `dist/simple-bot.js` 243kb; 2 warnings (pdfkit/pptx namespace constructors — slash-command export path only) |
| `npm test` | PASS | `Test Suites: 6 passed, 6 total` / `Tests: 60 passed, 60 total` |
| `npm run lint` | **FAIL** | `ESLint couldn't find a configuration file` |
| `npm audit --omit=dev` | **FAIL** (vulnerabilities) | `89 vulnerabilities (4 low, 59 moderate, 25 high, 1 critical)` |
| `npm run proof:unit` | PASS | reactivation + basic + youtube-music suites |
| `npm run proof:smoke` | PASS | `dist/simple-bot.js present` |
| `npm run proof:all` | PASS | build + proof:unit + proof:smoke |

### Build fix (before → after)

| | Before | After |
|---|--------|-------|
| `tsc` full tree | FAIL — 100+ errors (`index.ts` syntax + study/music modules) | Production uses **esbuild** bundle of `simple-bot.ts` only |
| Tests importing SSJ | FAIL — TS2322 in `ssj-infinity.ts` L577 | Fixed return type; Jest `diagnostics: false` for legacy modules |

---

## 4. Feature matrix summary

See [AUDIT_FEATURE_MATRIX.md](./AUDIT_FEATURE_MATRIX.md).

| Bucket | Approx. claims |
|--------|----------------|
| Verified (automated test) | 8 |
| Partial / canned | 14 |
| Docs only | 12 |
| Broken | 3 (`index.ts`, exporters, lint) |
| Needs secret / live Discord | 11 |

---

## 5. Discord readiness

### Intents (code: `src/simple-bot.ts`)

- `Guilds`
- `GuildMessages`
- `MessageContent` (**privileged — enable in Portal**)
- `GuildVoiceStates` (music; optional for text-only)

### Permissions

- **Text proof:** Send Messages, Read Message History, View Channels  
- **Music proof:** Connect, Speak + FFmpeg on host  

### Required env

- `DISCORD_BOT_TOKEN` (required)  
- `SEND_ONLINE_GREETING` — default **false** in `env.example`  

---

## 6. Security notes

| Topic | Finding |
|-------|---------|
| Secrets in repo | `.env` not committed; `env.example` has placeholders only |
| Token logging | Startup validator does not print token values; deploy workflow uses `${DISCORD_BOT_TOKEN:+SET}` pattern |
| Startup guard | Missing token → exit 1 with human-readable message (`src/config/startup.ts`) |
| Online greeting | Can spam every guild — **disabled by default** |
| Dependencies | 89 advisories on production dep tree — run `npm audit fix` when convenient; review breaking changes before `--force` |
| Legacy `index.ts` | Large attack surface (DB, security, GitHub) — **not** used by `npm start` |

---

## 7. Automated proof coverage

`tests/reactivation.test.ts` covers:

- Missing `DISCORD_BOT_TOKEN` validation  
- Mention / alias detection  
- Help, flashcards, practice test, lock-in, music status routing  
- Bot message ignore, non-mention ignore  
- YouTube URL regex, music keyword classification  
- Shutdown handler registration  

---

## 8. Recommended next steps

### Must fix before broad public use

1. Complete [LIVE_DISCORD_PROOF_CHECKLIST.md](./LIVE_DISCORD_PROOF_CHECKLIST.md).  
2. Keep `SEND_ONLINE_GREETING=false` until intentional.  
3. Triage `npm audit` (at least critical/high).  
4. Do **not** promote `index.ts` / slash-command bot until repaired.  

### Nice to have

- Add `.eslintrc` or remove `lint` script.  
- Align `package.json` `"main"` with `simple-bot.js`.  
- Real PDF parsing for course materials (today: placeholder text).  
- Fix `isBotMentioned` alias list to include explicit `@gunnchAI3k` branding variant.  

### Defer

- Rust performance engine (directory missing).  
- Bot absorption / arcade / hypervisor subprojects.  
- Full Spotify/Apple OAuth until secrets and live music proof.  

---

## 9. Exact next command for you

```bash
cd /Users/gunnchos/Downloads/gunnchAI3k
git checkout audit/reactivation-proof
cp env.example .env
# Edit .env: set DISCORD_BOT_TOKEN=...  (do not commit)
npm run build
SEND_ONLINE_GREETING=false npm start
```

### Discord Portal — verify

1. **Bot → Privileged Gateway Intents → Message Content Intent: ON**  
2. Bot token matches `.env`  
3. OAuth2 invite uses **minimal** text permissions (see [DISCORD_REACTIVATION_CHECKLIST.md](./DISCORD_REACTIVATION_CHECKLIST.md))  

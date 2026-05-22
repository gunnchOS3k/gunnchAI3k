# Discord Reactivation Checklist

Use this before adding gunnchAI3k to a public server. Never paste tokens into chat, commits, or screenshots.

## 1. Discord Developer Portal

1. Open [Discord Developer Portal](https://discord.com/developers/applications).
2. Select your **gunnchAI3k** application (or create one).
3. **Bot** tab:
   - Confirm bot user exists.
   - **Reset token** only if compromised; copy token into local `.env` as `DISCORD_BOT_TOKEN` (never commit).
   - Enable **Privileged Gateway Intents**:
     - **Message Content Intent** — **required** (bot reads message text for @mentions).
     - **Server Members Intent** — optional (not required for simple-bot).
4. **OAuth2 → URL Generator**:
   - Scopes: `bot`
   - Permissions: see sections below.
   - Copy invite URL; open in browser; add to a **private test server** first.

## 2. Required environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DISCORD_BOT_TOKEN` | **Yes** | Login |
| `SEND_ONLINE_GREETING` | No (default off) | `true` posts startup message to general/chat channels |
| `DISCORD_CLIENT_ID` | No | Slash-command bot (`index.ts`) only |
| `DISCORD_GUILD_ID` | No | Dev guild slash registration |
| Music/AI keys | No | Spotify, Apple, OpenAI, etc. |

Copy `env.example` → `.env` and fill in values locally.

## 3. Invite permissions

### Text-only proof (minimum)

- View Channels  
- Send Messages  
- Read Message History  
- Embed Links (optional, for rich study embeds)  
- Attach Files (optional)

**Do not grant** unless you intend to use the feature:

- Administrator  
- Manage Messages / Channels / Roles  
- Kick/Ban Members  

### Voice / music proof (additional)

- Connect  
- Speak  
- Use Voice Activity (optional)  
- Move Members (only if you want auto-follow)

Also install **FFmpeg** on the host and ensure the bot role can **Connect** + **Speak** in the target voice channel.

## 4. Channel setup (private test)

1. Create a private channel (e.g. `#bot-proof`).
2. Restrict visibility to you + the bot.
3. Place the bot role **below** roles it should not manage; ensure **Send Messages** + **Read Message History** in that channel.
4. Post test messages from [LIVE_DISCORD_PROOF_CHECKLIST.md](./LIVE_DISCORD_PROOF_CHECKLIST.md).

## 5. Startup verification

```bash
cd /path/to/gunnchAI3k
cp env.example .env
# Edit .env — set DISCORD_BOT_TOKEN only for first test
npm install
npm run build
SEND_ONLINE_GREETING=false npm start
```

Expected console (no token values printed):

- `Starting gunnchAI3k...`
- `gunnchAI3k is online as <name>#<discriminator>`
- `Online greeting disabled...` (unless you set `SEND_ONLINE_GREETING=true`)

If token is missing:

- Process exits with code `1` and a clear message listing `DISCORD_BOT_TOKEN`.

## 6. Safe server launch (production guild)

- [ ] Completed all items in [LIVE_DISCORD_PROOF_CHECKLIST.md](./LIVE_DISCORD_PROOF_CHECKLIST.md) in a private channel  
- [ ] `SEND_ONLINE_GREETING=false` for first production boot  
- [ ] Message Content Intent enabled  
- [ ] Bot lacks Admin / Manage Messages unless intentional  
- [ ] Logs reviewed — no token or API key printed  
- [ ] `npm audit` reviewed (see [PROOF_OF_OPERATION.md](./PROOF_OF_OPERATION.md))  

## 7. Troubleshooting

| Symptom | Check |
|---------|--------|
| Bot online but ignores messages | Message Content Intent; channel permissions |
| `Used disallowed intents` | Enable intents in Portal |
| Login failed | Token reset, no extra quotes/spaces in `.env` |
| Greeting spam | Set `SEND_ONLINE_GREETING=false` |
| Music silent | Voice permissions, FFmpeg, bot in VC |

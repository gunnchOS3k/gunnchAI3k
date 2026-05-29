# Discord Intents and Privacy

## Current intents (simple-bot.ts)

| Intent | Why | Privacy risk |
|--------|-----|--------------|
| Guilds | Slash commands, server context | Low |
| GuildMessages | Mention-based tutoring | Medium — message text processed |
| MessageContent | Parse @mention content | **Higher** — requires Discord approval |
| GuildVoiceStates | Music/voice features | Low–medium |

## Minimization strategy

1. **Primary path:** slash commands (`/waike`, `/explain`, `/quizme`, …) — no broad message logging.
2. **Secondary path:** @mentions (existing SSJ Infinity flow) — keep for compatibility.
3. **Fallback:** If Message Content Intent unavailable, bot operates via slash + buttons only.

## What we do not store in public repos

Tokens, student grades, transcripts, resumes, bulk DM exports.

## Server admin actions

- Use `/privacy` to show retention summary.
- Disable mention tutoring by removing Message Content intent (slash-only mode).

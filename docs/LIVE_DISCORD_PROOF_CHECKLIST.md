# Live Discord Proof Checklist

Run this **after** setting `DISCORD_BOT_TOKEN` in `.env` (never share the token). Use a **private channel** first.

## Start command

Verified production path:

```bash
npm run build && SEND_ONLINE_GREETING=false npm start
```

Development (same entry, no bundle):

```bash
SEND_ONLINE_GREETING=false npm run dev
```

## Expected console output

Capture a screenshot or log excerpt (redact token if any appears — there should be none).

- [ ] `🚀 Starting gunnchAI3k...`
- [ ] `🤖 gunnchAI3k is online as <bot>#<tag>`
- [ ] `ℹ️ Online greeting disabled...` (when `SEND_ONLINE_GREETING=false`)
- [ ] No `Unhandled promise rejection` / `Uncaught Exception`
- [ ] Learning/course init either succeeds or logs a graceful warning (no crash)

## Discord test messages

Replace `<@BOT_ID>` with a real mention or your server's `@gunnchAI3k` alias.

| # | Message | Expected response (summary) | Proves | Evidence | Pass |
|---|---------|----------------------------|--------|----------|:----:|
| 1 | `@gunnchAI3k help` | Help menu: study + music commands | Mention routing, help fallback | Screenshot | [ ] |
| 2 | `@gunnchAI3k flashcards for probability` | Flashcard activation or SSJ embed | Study / flashcards | Screenshot | [ ] |
| 3 | `@gunnchAI3k practice test for robotics` | Practice test activation text/embed | Study / practice test | Screenshot | [ ] |
| 4 | `@gunnchAI3k lock me in for probability` | Academic warrior / lock-in copy | Lock-in path | Screenshot | [ ] |
| 5 | `@gunnchAI3k music status` | YouTube service status block | Music status routing | Screenshot | [ ] |
| 6 | `@gunnchAI3k play https://youtu.be/VIDEO_ID` | Play acknowledgment or graceful “invalid/needs VC” | YouTube URL detection | Screenshot + console | [ ] |

### Optional voice proof

| # | Message | Expected | Proves | Pass |
|---|---------|----------|--------|:----:|
| 7 | Join VC, then `@gunnchAI3k play <song>` | Bot joins VC or explains missing deps | Voice + music | [ ] |

## Safe server launch

Before inviting to your main server:

- [ ] All six text tests pass in private channel  
- [ ] `SEND_ONLINE_GREETING=false` on first boot  
- [ ] Message Content Intent enabled in Portal  
- [ ] Bot role cannot delete/manage messages (unless you chose otherwise)  
- [ ] Channel permissions: Send Messages + Read History  
- [ ] No secrets in console logs  

## Sign-off

| Field | Value |
|-------|--------|
| Date | |
| Server (test) | |
| Bot version / branch | `audit/reactivation-proof` |
| Tester | |
| Ready for public server? | Yes / No — notes |

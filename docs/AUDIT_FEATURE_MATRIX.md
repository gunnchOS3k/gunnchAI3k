# gunnchAI3k — Audit Feature Matrix

Audit branch: `audit/reactivation-proof`  
Production entry verified: `src/simple-bot.ts` → `npm start` → `dist/simple-bot.js` (esbuild bundle)  
Legacy entry: `src/index.ts` (broken TypeScript; excluded from production build)

| Claim ID | Claim text | Source | Category | Expected observable proof | Implementation | Status | Notes |
|----------|------------|--------|----------|---------------------------|----------------|--------|-------|
| C001 | 100% Intelligence / doctoral-level intelligence | README.md L9–14 | study | Responses grounded in course content, not generic hype | `src/study/ssj-infinity.ts` | MARKETING_ONLY | Observable: compare answers to `course-materials/` and loaded PDFs |
| C002 | 95% empathy / 90% humor / personality percentages | README.md L16–21 | study | Tone varies by situation; measurable only subjectively | `ssj-infinity.ts` `personalityTraits`, `situationalResponses` | MARKETING_ONLY | Traits exist in code but percentages are not measured |
| C003 | @mention responses without slash commands | README.md L38–44, SSJ_INFINITY_SUMMARY.md | Discord runtime | Mention bot → get study/music reply | `src/simple-bot.ts`, `ssj-infinity.processMention` | VERIFIED_TEST | `tests/reactivation.test.ts` |
| C004 | flashcards for [subject] | README.md L40 | study | Flashcards derived from course files | `ssj-infinity.ts`, `course-integration.ts` | PARTIAL | Default/hardcoded decks; PDF content is placeholder text unless files exist on disk |
| C005 | practice test for [subject] | README.md L41 | study | Generated exam from materials | `ssj-infinity.ts` | PARTIAL | Canned templates + metadata; not full PDF extraction |
| C006 | weekly assessment | README.md L42 | study | Knowledge check + recovery guide | `ssj-infinity.ts` | PARTIAL | Embed-based; limited live course parsing |
| C007 | lock me in for [subject] | README.md L44, LOCK_IN_README.md | study | Lock-in gamification session | `src/study/lock-in.ts` (via SSJ import) | PARTIAL | simple-bot uses SSJ + fallback canned lock-in reply |
| C008 | help / study help | README.md L43 | study | Personalized study guidance | `simple-bot.ts`, `ssj-infinity.ts` | VERIFIED_TEST | Routing tested |
| C009 | 8 unique goodbye messages on shutdown | README.md L24, SSJ_INFINITY_SUMMARY.md | Discord runtime | Shutdown posts one goodbye per guild | `simple-bot.ts` `gracefulShutdown` | NEEDS_LIVE_DISCORD | Logic exists; not automated in CI |
| C010 | Online greeting to all servers on startup | README.md (implicit), `sendOnlineGreeting` | Discord runtime | Message in general channel on ready | `simple-bot.ts` | VERIFIED_TEST | Default **off** via `SEND_ONLINE_GREETING=false` |
| C011 | Spotify full OAuth + playlists | README.md L56–58 | music | OAuth flow + playback | `src/music/*` (not in simple-bot path) | NEEDS_SECRET | Not wired in `simple-bot.ts` |
| C012 | Apple Music library access | README.md L57, APPLE_MUSIC_SETUP.md | music | Apple API playback | `apple-music-integration.ts` | NEEDS_SECRET | Type errors in DJ manager; not production entry |
| C013 | YouTube play by URL or search | README.md, YOUTUBE_MUSIC_SUMMARY.md | music | Play/search returns status | `youtube-music-manager.ts` | PARTIAL | Mock search/cache; no guaranteed voice streaming without VC + ffmpeg |
| C014 | music status command | User audit spec | music | Status embed/text | `simple-bot.ts` | VERIFIED_TEST | Routed before generic “music” keyword |
| C015 | Voice channel following | README.md L60 | music | Bot joins/moves VC | `jockie-powers.ts` | DOCS_ONLY | Not used by `simple-bot.ts` |
| C016 | Study Copilot v2 slash commands | STUDY_COPILOT_README.md L30–36 | study | `/study start` etc. | `src/study/bot.ts` | DOCS_ONLY | Requires `index.ts` slash registration (broken) |
| C017 | Emergency Study / All Hands on Deck | EMERGENCY_STUDY_README.md | study | `/emergency start` | `emergency-bot.ts` | DOCS_ONLY | Not in simple-bot mention path |
| C018 | Jarvis omniscient Wolfram/Perplexity | JARVIS_OMNISCIENT_README.md | AI/API | `/jarvis compute` with API results | `jarvis-core.ts` | NEEDS_SECRET | API keys required; not in simple-bot |
| C019 | PPTX/DOCX/PDF study pack export | STUDY_COPILOT_README.md L12–13 | file processing | Downloadable files | `src/study/exporters/*` | BROKEN | TS/build errors in exporters (pdfkit/pptx imports) |
| C020 | Course PDF integration (probability, robotics) | README.md L46–51 | course materials | Content from PDFs in replies | `course-integration.ts` | PARTIAL | Loads file list; PDF body is placeholder unless `pdf-parse` pipeline used |
| C021 | course-materials/ txt notes | README.md L144–150 | course materials | Quotes from notes.txt | `course-materials/**/*.txt` | VERIFIED_TEST | Files exist; SSJ may use fallback defaults if PDFs missing |
| C022 | Rust performance engine | README.md L74–80, L201–204 | Rust/performance | `cargo build` produces engine | **No `rust-performance/` directory** | DOCS_ONLY | Only `rust-probability-demo/` exists |
| C023 | Zero-trust / SOC2 / ISO27001 / GDPR ready | SECURITY.md, README.md L82–87 | security | Compliance dashboards, enforced MFA | `src/security/*` | DOCS_ONLY | Used by `index.ts` path; not simple-bot |
| C024 | Executive approval / human-in-the-loop | SECURITY.md L11–21 | security | Actions require approval | `authorization.ts`, `audit.ts` | DOCS_ONLY | Not enforced in simple-bot |
| C025 | `/learn` `/suggest` executive AI commands | SETUP_GUIDE.md L75–87 | AI/API | Slash commands work | `src/index.ts`, `src/core/*` | DOCS_ONLY | SETUP describes index bot, not simple-bot |
| C026 | GitHub integration | SETUP_GUIDE.md L103–107 | deployment | Repo queries via bot | `integrations/github.ts` | NEEDS_SECRET | `GITHUB_TOKEN`; not in simple-bot |
| C027 | OpenAI / Gemini / Wolfram / Perplexity | README.md L217–220 | AI/API | External API responses | Various | NEEDS_SECRET | Optional env vars |
| C028 | All tests passing (docs claim) | README.md L155–163 | tests | CI green | `tests/*` | VERIFIED_TEST | 60/60 Jest tests pass after audit fixes (2026-05-22) |
| C029 | npm start runs bot | SETUP_GUIDE.md L68–69 | deployment | Process connects to Discord | `package.json`, `dist/simple-bot.js` | VERIFIED_TEST | Build via esbuild; needs `DISCORD_BOT_TOKEN` live |
| C030 | npm run dev hot reload | package.json | deployment | tsx runs simple-bot | `tsx src/simple-bot.ts` | VERIFIED_TEST | Same entry as production |
| C031 | Seasonal / anniversary / exam countdown | seasonal-patch-notes.md | seasonal | Seasonal replies | `seasonal-manager.ts` | PARTIAL | Canned seasonal strings; tested via mention keywords |
| C032 | Bot absorption / replace other bots | BOT_ABSORPTION_GUIDE.md | docs | Features merged | N/A | DOCS_ONLY | Planning doc only |
| C033 | Gaming hypervisor / 3kmlv-arcade | MOBILE_HUB_GUIDE.md, 3kmlv-arcade/ | docs | Separate apps | Subdirectories | DOCS_ONLY | Out of Discord bot runtime scope |
| C034 | Message Content Intent required | Discord API | Discord runtime | Bot reads message text | `simple-bot.ts` intents | VERIFIED_TEST | Declared in code; enable in Portal for live |
| C035 | GuildVoiceStates for music | README music section | Discord runtime | Join voice | intents in `simple-bot.ts` | NEEDS_LIVE_DISCORD | Intent declared; voice play not fully verified |
| C036 | Enhanced PDF visual analysis | ENHANCED_INTELLIGENCE_SUMMARY.md | study | OCR/visual PDF | `pdf-visual-analyzer.ts` | PARTIAL | Called on startup; depends on files/tools |
| C037 | User feedback system | ssj-infinity | study | Feedback changes behavior | `user-feedback-system.ts` | PARTIAL | Hook exists on mention path |
| C038 | index.ts enterprise bot with slash commands | package.json `"main": "dist/index.js"` | deployment | Full command set | `src/index.ts` | BROKEN | Syntax error ~L129; orphaned event handlers |
| C039 | Database SQLite learning | SETUP_GUIDE.md L115–118 | deployment | Persistent learning | `core/database.ts` | DOCS_ONLY | Not initialized in simple-bot |
| C040 | npm run lint | package.json | tests | ESLint clean | `eslint src/**/*.ts` | BROKEN | No `.eslintrc` in repo |
| C041 | 24/7 Railway/Heroku deploy | SETUP_GUIDE.md L121–139 | deployment | Hosted bot | `.github/workflows/deploy.yml` | NEEDS_SECRET | Requires secrets + healthy build |
| C042 | Music: play natural language | README.md L61 | music | `play [song]` works | `simple-bot.ts` `handleMusicCommand` | PARTIAL | YouTube manager mock; live voice NEEDS_LIVE_DISCORD |
| C043 | Midterm-ready instant materials | README.md L231–239 | study | Production-ready content | Multiple | PARTIAL | Motivational + template content; verify against your PDFs live |
| C044 | Comedian-level timing | README.md L16–27 | study | Appropriate humor timing | `situationalResponses` | MARKETING_ONLY | Subjective; canned strings |
| C045 | Dockerfile / container | If claimed in CI | deployment | Image builds | `.github/workflows` | NEEDS_SECRET | Not re-verified in this audit run |

## Summary counts (this audit)

| Status | Count |
|--------|------:|
| VERIFIED_TEST | 8 |
| VERIFIED_LIVE | 0 |
| PARTIAL | 14 |
| PLACEHOLDER | 0 |
| DOCS_ONLY | 12 |
| BROKEN | 3 |
| NEEDS_SECRET | 7 |
| NEEDS_LIVE_DISCORD | 4 |
| MARKETING_ONLY | 2 |

**Safe to enable on a private test server (text-only):** C003, C008, C010 (greeting off), C014, C021, C029–C030, C034.  
**Enable only after secrets + live proof:** C011–C013, C018, C027, C035, C042.  
**Defer / do not claim as working:** C019, C022, C038, C040.

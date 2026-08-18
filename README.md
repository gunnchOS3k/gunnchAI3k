# gunnchAI3k

Local-first intelligence for the gunnchOS3k ecosystem: capability routing, tutoring, creation/coding, research/citations, device help, accessibility, translation, connectivity diagnosis, and WAIKE curriculum consumption.

> **Not** a chatbot-only product. **Not** frontier-parity. **Not** “100% intelligence”, doctoral, or SSJ marketing. **Not** a University of Oulu affiliation or admission claim. `GUNNCHAI_FRONTIER_PRODUCT_PARITY` is hardcoded **false**.

Ecosystem portal: [gunnchos-research-portal](https://github.com/gunnchOS3k/gunnchos-research-portal) · Education ops: [waike-research-ops](https://github.com/gunnchOS3k/waike-research-ops)

Retired marketing (preserved, not deleted): [`docs/history/`](docs/history/README.md)

## What is this?

An intelligence **layer** that routes tasks to local fixtures, optional local GGUF/llama.cpp, or a **cloud stub that fails closed**. It is a supporting workload for devices, labs, and WAIKE education — not a dissertation paper and not a commercial assistant.

## Why does it exist?

Equitable, privacy-respecting assistance for education, creation, and device work — local-first by default, with explicit consent before anything may leave the device.

## Where does it fit?

Product Charter layer 5. Consumed by Device Lab AI workloads. Tutors against WAIKE digital-RC courses when the sibling repo is present.

## What is real today?

- Three **routing** stacks with tests (keyword Gate 1, system-layer policy, Stage 2 fleet constraint solver)
- Fixture-backed tutoring, device help, a11y, translation glossary, connectivity checklists
- WAIKE **contract discovery** + isolated Python grader (`src/waike-mastery/`) when `waike-research-ops` is adjacent
- Offline research/citation over a local corpus (fabricated `source_id` rejected)
- Coding-agent **sandbox** that stops at merge approval; production repo names are blocklisted
- Honest tokens: frontier / HUMAN_E6 / accredited / Fast-Pro quality stay false until earned

## What is simulated / modelled?

- Stage 2 `GunnchAiCapabilityApi.invoke` **echoes** the routed model id — it does not run eight specialist models
- Discord `/waike lesson` bodies and `src/tutor/waikeTutorCards.ts` are **hardcoded mocks**, not live `course.json`
- Cloud destinations are `cloud-policy-stub` / `CLOUD_NOT_IMPLEMENTED`
- Optional local-model provider still answers with fixture text unless llama.cpp + GGUF are actually present
- Personality/empathy percentages and “doctoral-level” copy — **retired** (see history)

## What is physical / external pending?

- On-device NPU/thermal correlation on EVT hardware
- Frontier benchmark campaigns (requirements exist; they are **not** completion evidence)
- Live Discord bot operation (`HUMAN_QA_PENDING` — needs a real token, never committed)

## Claim boundary

No frontier parity · no Oulu affiliation · no certification · no commercial standardized 6G · mock-safe security demos are not production SOC · nano 135M is fallback only.

UML: [`docs/uml/README.md`](docs/uml/README.md) · Reproducibility: [`REPRODUCIBILITY.md`](REPRODUCIBILITY.md) · Cite: [`CITATION.cff`](CITATION.cff)

## Try / inspect in 5 minutes

No API keys required. Node 20+.

```bash
npm ci
npm run test:local-runtime
npm run test:stage2
npm run test:waike-mastery
npm run test:journeys
```

Optional local inference (needs llama.cpp + GGUF on disk, still no cloud keys):

```bash
npm run local-runtime:health
npm run system-layer:probe
```

## Capability routing

Three classifiers exist. They are **not** one trained LLM.

| Stack | Source | What it decides |
|---|---|---|
| Gate 1 keyword | `src/local-runtime/runtime.ts` `inferCapability` | `tutoring` / `code_assistance` / `device_help` / `accessibility` / `connectivity_diagnosis` / … |
| System-layer policy | `src/system-layer/task_router.ts` `routeTask` | `local` / `cloud` / `reject` + disclosure (`privacy_policy.ts`) |
| Stage 2 fleet | `src/stage2/fleet/router.ts` `ModelRouter.route` | Role + RAM/offline/consent → candidate id (weights often **ABSENT**) |

Cloud is never silent: local-only mode blocks remote LLM URLs (`src/local-runtime/network.ts`). Sensitive / device-local privacy classes strip `OPTIONAL_FRONTIER_CLOUD`.

## Tutoring

- **WAIKE mastery (real consumption):** `src/waike-mastery/contract.ts` discovers `curriculum/digital_rc/*/course.json`. Grader is isolated Python after submission. Modes: `MASTERY_BENCHMARK` / `LEARNER_TUTOR` / `EDUCATOR_COPILOT` (`src/waike-mastery/modes.ts`). Instructor keys never in learner mode. Journey: [`docs/journeys/WAIKE_TO_GUNNCHAI.md`](docs/journeys/WAIKE_TO_GUNNCHAI.md).
- **Discord UX (mock lesson bodies):** slash commands in `src/tutor/discordInteractionRouter.ts`. Skill keywords: `src/tutor/skillRouter.ts`. Integrity: `src/tutor/academicIntegrityPolicy.ts` (refuses active-exam cheating).
- **Legacy study copilot:** `src/study/*` (NYU-era PDFs, SSJ/Jarvis/lock-in). Historical surface, not the supervisor path.

## Creation / coding

- Stage 2 `ProjectStore` (`src/stage2/projects/store.ts`) — local files/conversations; `askAi` concatenates context, not an LLM.
- Phase XIV coding agent (`src/phase_xiv/computer_use/coding_agent.ts`) — sandbox write + `node --check`, **stops before merge**.
- Draft-PR helper (`src/user-ready/coding_agent_pr.ts`) blocklists this repo and `waike-research-ops`; forbids force-push and push to main.

## Research / citations

Canonical path is **offline**: `src/stage2/research/foundation.ts`, `src/user-ready/research_citations.ts`. Unread or fabricated sources cannot be cited. Live web is consent-gated and currently incomplete (`benchmarks/NEXT_PACKET_OPEN.md`). Legacy Perplexity client in `src/study/research.ts` is not the current architecture.

## Device help

Deterministic checklists + fixtures: `src/system-layer/os_integration/product_surfaces.ts` `deviceTroubleshooting`, `fixtures/local-runtime/documents/device-help.md`. Loopback product-service on `127.0.0.1:8791` — digital topology, not physical NPU.

## Accessibility

Gate 1 `accessibility` + system `a11y`: plain-language swaps, WCAG AA **checklist** (contrast/focus/labels), input interpretation (switch/speech/handwriting). Not a full AT engine. Fixtures: `fixtures/local-runtime/documents/accessibility.md`.

## Translation

Stage 2 capability `translate` and system `translation`. Deterministic glossary (`hola` / `bonjour`) plus optional llama gap-fill. **Not a neural MT quality claim.**

## Connectivity diagnosis

Always-local `network` capability: bearer present, local DNS, offline cache, no forced cloud. **No outbound probes.** Stage 2 `diagnose` is a routed echo that requires device permission — not a radio diagnostic.

## WAIKE integration

| Path | Reality |
|---|---|
| `src/waike-mastery/*` + sibling `waike-research-ops` | **Real** course discovery + isolated grader |
| `docs/WAIKE_INTEGRATION.md`, tutor cards, `/waike lesson` | **Mock / hardcoded** unless labeled otherwise |
| `fixtures/system-layer/integrations/waike/` | Fixture subset so tests need no curriculum clone |

Set `WAIKE_REPO_ROOT` if the education repo is not `../waike-research-ops`.

## Privacy

- Default processing mode: `local-only`
- No student PII in public git (`docs/18_STUDENT_DATA_RETENTION_POLICY.md`)
- Discord: prefer slash commands; Message Content Intent is optional (`docs/16_DISCORD_INTENTS_AND_PRIVACY.md`)
- Memory store uses local AES-256-GCM files (`src/stage2/memory/store.ts`)
- Custom agents reject “unrestricted” manifests

## Model / runtime boundaries

| Tier | Honest status |
|---|---|
| Fixture provider | Deterministic. `isTrainedLlm: false` |
| Nano (SmolLM2-135M) | Fallback only |
| Local Fast / Pro GGUF | Registry **candidates**; weights often absent |
| Cloud / frontier | Optional stub; parity token **false** |
| Vision / speech / computer-use | Stubs or in-memory mocks |

See `models/local/MODEL_CARD.md`, `src/stage2/fleet/registry.ts`, `benchmarks/NEXT_PACKET_OPEN.md`.

## Benchmarks

```bash
npm run test:user-ready          # market task matrix (digital gates)
npm run user-ready:001           # packet 001; also :002 :003 :004
npm run prove:stage2             # fixture fleet eval
npm run system-layer:eval        # deterministic + optional llama
npm run system-layer:bench       # real llama.cpp if GGUF present
```

Matrix files: `benchmarks/GUNNCHAI_MARKET_TASK_MATRIX.json`, `benchmarks/MARKET_AI_CAPABILITY_BASELINE.json`. Open gaps: `benchmarks/NEXT_PACKET_OPEN.md`. These compare **surfaces**, not superiority scores.

## Tests (secrets-free)

| Command | What it covers |
|---|---|
| `npm run test:local-runtime` | Gate 1 fixture runtime |
| `npm run test:system-layer` | Task router, privacy, eval harness |
| `npm run test:os-integration` | Product surfaces + topology |
| `npm run test:stage2` | Fleet, citations, memory, projects |
| `npm run test:phase_xiv` | Agent sandbox / computer-use lab |
| `npm run test:independent-eval` | Honest tokens |
| `npm run test:user-ready` | Market packets |
| `npm run test:waike-mastery` | Modes, canary, live discovery if sibling present |
| `npm run test:journeys` | WAIKE→gunnchAI learner path (mocks labeled) |

`npm test` runs the Jest suite. `tests/setup.ts` injects **placeholder** Discord IDs. Do not commit `.env`. `npm run test:discord` / `test:cursor` / `test:github` point at **missing** files — do not treat them as green.

Live Discord (`npm run dev`) is **HUMAN_QA_PENDING**.

## Architecture

UML (current / future / legacy + traceability): [`docs/uml/`](docs/uml/README.md)

| Path | Role |
|---|---|
| `src/local-runtime/` | Gate 1 local-first runtime |
| `src/system-layer/` | Product service, OS HTTP client, deterministic backends |
| `src/stage2/` | Fleet, router, memory, projects, research |
| `src/waike-mastery/` | WAIKE contract + grader bridge |
| `src/tutor/` | Discord tutor UX |
| `src/user-ready/` | Market packets |
| `src/phase_xiv/` | Agent / coding-agent lab |
| `fixtures/` | Approved local corpora |
| `benchmarks/` | Task matrix + open gaps |
| `docs/history/` | Retired marketing |

## Environment

```bash
cp .env.example .env
```

Leave secrets blank. Local tests do not need keys. Discord/OpenAI/music values are optional and **must never be committed**. Older Discord-era list: `env.example`.

## Contribution path

Keep tokens honest. Label mocks. Never merge `main` from Cursor, never force-push, never commit credentials, never claim frontier AI or Oulu affiliation.

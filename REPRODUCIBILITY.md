# Reproducibility — gunnchAI3k

This repository is a local-first intelligence **prototype**. It does not produce RF results and does not claim frontier model quality.

```bash
git clone https://github.com/gunnchOS3k/gunnchAI3k.git
cd gunnchAI3k
npm ci
npm run test:local-runtime
npm run test:stage2
npm run test:waike-mastery
npm run test:journeys
```

Expected: Jest PASS for those suites. `test:waike-mastery` live discovery **skips** if `waike-research-ops` is not adjacent and `WAIKE_REPO_ROOT` is unset.

## Tool versions

| Tool | Guidance |
|---|---|
| Node | 20+ (`package.json` `engines`) |
| Python | 3.10+ for `prove:stage2` / WAIKE grader bridge |
| llama.cpp | Optional; only for `system-layer:bench` |

Record the commit SHA in any supervisor packet.

## What these tests prove

**Real today:** routing policy, fixture grounding, honest tokens, isolated WAIKE grader wiring.

**Synthetic / demo-only:** Stage 2 capability echo, Discord lesson bodies, cloud stub.

**Not claimed:** frontier parity, Oulu affiliation, neural MT quality, physical NPU, live Discord HUMAN_QA.

## Secrets

Copy `.env.example` locally if you run the Discord bot. Never commit `.env`. CI and the commands above use placeholders from `tests/setup.ts`.

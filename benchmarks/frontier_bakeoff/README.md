# Frontier bake-off harness (Kirby v2)

Qualification slots A–G, suites (Routing / WAIKE / Coding / Device / Research / Creator),
tool-use, bounded agent, computer-use (optional), long-context, multimodal, offline,
reliability, safety, plus Pareto-by-tier selection.

**Does not** pick a permanent winner or hard-code a model dependency.

## Run

```bash
npx tsx scripts/run_kirby_provider_bakeoff.ts
# or
npm run bakeoff:kirby
```

Artifacts: `artifacts/kirby_v2/bakeoff/`

Honesty: simulated deterministic adapters power architecture proofs when live models are unavailable. Live gaps are marked `NO_CANDIDATE_AVAILABLE`.

```text
NEXT_GUNNCHAI_ACTION=PROMOTE_QUALIFIED_PROVIDERS_AND_RUN_REAL_DEVICE_INTEGRATION
```

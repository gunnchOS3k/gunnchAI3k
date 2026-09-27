# KIRBY-5 — Jev / System One Decision Plane Adoption

**Branch:** `research/kirby-jev-system-one-adoption-v1`  
**Parent:** accepted `main`  
**Merge:** draft only; never automatic  
**Production default:** false  
**Live access this wave:** `LIVE_JEV_ACCESS_REQUIRED=true`

## Why

TypeSafe introduced System One models and Jev (September 2026). Jev is a typed decision API, not a chat model. KIRBY-5 absorbs the **capability pattern** (`SYSTEM_ONE_DECISION_PLANE`), not the vendor identity.

## Claim boundary

- Type / schema safety ≠ decision correctness.
- "No hallucinations" is not "cannot make incorrect decisions."
- Jev confidence cannot override deterministic policy.
- Jev cannot authorize destructive / sensitive / high-impact operations.
- Calibration, cost, and latency advantages are **vendor-asserted** until measured on gunnchAI workloads.

## What this wave ships

- Canonical decision contract and TypeSafe adapter (`POST /v1/systemone`, `GET /v1/models`, bearer auth)
- Decision broker, privacy policy, minimizer, redaction, cache, confidence gate, fallback
- Feature flags default OFF
- WAIKE / Capsule / research contracts
- Fixture eval suites and calibration math
- Honest gates: foundation pass; live and promotion gates unearned

## What this wave does not ship

- Live Jev bake-off (no `TYPESAFE_API_KEY` in this environment)
- Pixel-local inference claims
- Unauthenticated LAN inference
- SmolLM2-135M as `PRODUCTION_DEFAULT`
- Jev as production default

## Doctrine

`docs/frontier/KIRBY_DOCTRINE_V2.md` remains authoritative. Jev must fit the ten non-negotiables.

## Next action

```text
NEXT_GUNNCHAI_ACTION=OBTAIN_TYPESAFE_EARLY_ACCESS_AND_RUN_KIRBY5_LIVE_CALIBRATION_BAKEOFF
```

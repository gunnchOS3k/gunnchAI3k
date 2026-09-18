# KIRBY-4 — Controlled Product Integration + Nearby-Edge gunnchAI — A–Z Report

**Branch:** `integration/kirby-controlled-product-nearby-edge-v1`  
**Parent:** `research/kirby-live-provider-promotion-v1` @ `39025e2ac2f4500f4c96d7cf687b576e8b8397b7`  
**Date:** 2026-09-18  

## Executive verdict

SmolLM2-135M promoted **only** to `CONTROLLED_INTEGRATION` behind feature flags (default off). Mac NearbyEdgeServer provides a **canonical** secured API (not llama.cpp schema) with pairing, session auth, provenance, rate limits, and idle shutdown. Live micro execute **PASS** on Mac. Pixel physical ADB-reverse journey **FAIL (honest)** — device present but **`unauthorized`** (owner must re-allow USB debugging). Unearned gates remain false: `PIXEL6A_LIVE_LOCAL_MODEL_PASS`, `GUNNCHAI_ANDROID_PRODUCTION_CLIENT_PASS`, `PRODUCTION_DEFAULT_PROVIDER_FROZEN`.

**Next:** `NEXT_GUNNCHAI_ACTION=INTEGRATE_NEARBY_EDGE_PROVIDER_INTO_GUNNCHOS_CAPSULE_AND_WAIKE_PIXEL_PILOT`

---

### A — Branch + draft PR
Created `integration/kirby-controlled-product-nearby-edge-v1` from KIRBY-3 tip. Draft PR against `research/kirby-live-provider-promotion-v1`. Does **not** merge #50/#51/#52.

### B — Controlled promotion doctrine
`docs/frontier/CONTROLLED_PROVIDER_PROMOTION.md` — states RESEARCH_LIVE → CONTROLLED_INTEGRATION only; SmolLM2 **never** PRODUCTION_DEFAULT.

### C — Live provider policy
`config/live_provider_policy.yaml` + `.json` — allowed micro tasks (`intent_route`, `micro_router`, `short_assist`, `health_probe`, `capability_discovery`); disallows exam dump / shell / production chat default.

### D — Feature flags (default off)
`GUNNCHAI_LIVE_PROVIDER_INTEGRATION` and `GUNNCHAI_NEARBY_EDGE` via `src/config/feature_flags.ts` + `.env.example`. No behavior change when off (verified in tests).

### E — Nearby-edge module
`src/nearby_edge/` — NearbyEdgeServer, PairingService, SessionAuth, ProviderGateway, HealthEndpoint, ProvenanceEnvelope, RateLimiter, IdleShutdown, AuditLog, transport, resource_guard, ControlledIntegrationRouter, NearbyEdgeProvider.

### F — Canonical API
Endpoints: `/v1/healthz`, `/v1/capabilities`, `/v1/session/pair`, `/v1/session/revoke`, `/v1/execute`, `/v1/cancel`. Not llama.cpp HTTP schema above the adapter.

### G — Pairing protocol
`docs/frontier/NEARBY_EDGE_PAIRING_PROTOCOL.md` — one-time codes; hashed salt under `~/.gunnchai/nearby_edge/` (not git); no plaintext permanent secrets in repo.

### H — Transports
Prefer `ADB_REVERSE` for Pixel; also `LOCALHOST`, `LOCAL_LAN_TLS` (no unauthenticated open LAN). Default bind `127.0.0.1`.

### I — Provenance envelope
Every execute response includes provenance with `on_device_local=false`, `adb_reverse_is_not_on_device=true`, `production_default=false`.

### J — ModelRouter wiring
`ControlledIntegrationRouter` composes ModelRouter v2: deterministic → nearby-edge → remote-if-permitted → honest unavailable.

### K — Pilot UI (not production)
`pilot/nearby_edge_pwa/index.html` — `PILOT_CLIENT_NOT_PRODUCTION_UI`; intended via ADB reverse. Capsule not blocked.

### L — Physical Pixel journey
**FAIL (honest):** `PIXEL_NEARBY_EDGE_PHYSICAL_JOURNEY_PASS=false` — ADB shows `unauthorized`. Owner must tap Allow USB debugging. Mac localhost nearby-edge path still validated. Prior KIRBY-3 authorize cleared after adb daemon restart.

### M — WAIKE contract
`integrations/waike/nearby_edge_contract_v1.ts`

### N — Capsule contract
`integrations/gunnchos_capsule/nearby_edge_contract_v1.ts` — contract present; `wired_into_product=false` (next action).

### O — Pixel offline honesty
Documented + artifact `pixel_journey/OFFLINE_HONESTY.json` / journey log: when Mac unreachable, no fabricated Pixel-local success; local model pass stays false.

### P — Lifecycle
Idle shutdown clears sessions; `lifecycle/IDLE_SHUTDOWN.json`.

### Q — Resource guard (8GB)
`resource/MAC_8GB_GUARD.json` — micro allowed; 360M blocked on 8GB class.

### R — Security threat cases
`security/THREAT_CASES.json` + unauthenticated deny + disallowed task 403.

### S — Privacy labels
`privacy/LABELS.json` — device_local_adjacent; no cloud by default.

### T — Live micro earned tasks
`MICRO_EARNED_TASK_PASS=true` — real SmolLM2-135M completion via nearby-edge execute for `intent_route`.

### U — Fallback matrix
`fallback/FALLBACK_MATRIX.json` — flags-off, offline, cloud consent, nearby-down cells.

### V — Rollback
`lifecycle/ROLLBACK.json` — flags=0 restores prior behavior.

### W — Gates
See summary table. Unearned remain false.

### X — Tests
Kirby foundation + bakeoff + live + controlled: **36/36 PASS** (`artifacts/kirby_v2/controlled_integration/tests/KIRBY_CONTROLLED_TESTS.log`).

### Y — Artifacts tree
`artifacts/kirby_v2/controlled_integration/` — policy, flags, nearby_edge, pixel_journey, routing, security, privacy, lifecycle, resource, fallback, gates, tests, CONTROLLED_SUMMARY.json.

### Z — Next action
`NEXT_GUNNCHAI_ACTION=INTEGRATE_NEARBY_EDGE_PROVIDER_INTO_GUNNCHOS_CAPSULE_AND_WAIKE_PIXEL_PILOT`

---

## Gate summary

| Gate | Result |
|---|---|
| CONTROLLED_PROVIDER_PROMOTION_DOC | PASS |
| LIVE_PROVIDER_POLICY | PASS |
| FEATURE_FLAGS_DEFAULT_OFF | PASS |
| NEARBY_EDGE_SERVER | PASS |
| PAIRING_SESSION_AUTH | PASS |
| PROVENANCE_ON_RESPONSE | PASS |
| CONTROLLED_ROUTER_WIRED | PASS |
| PILOT_CLIENT_NOT_PRODUCTION_UI | PASS |
| PIXEL_NEARBY_EDGE_PHYSICAL_JOURNEY_PASS | FAIL (ADB unauthorized) |
| WAIKE_NEARBY_EDGE_CONTRACT | PASS |
| CAPSULE_NEARBY_EDGE_CONTRACT | PASS |
| PIXEL_OFFLINE_HONESTY | PASS |
| RESOURCE_GUARD_8GB | PASS |
| SECURITY_THREAT_CASES | PASS |
| PRIVACY_LABELS | PASS |
| FALLBACK_MATRIX | PASS |
| ROLLBACK_VIA_FLAGS | PASS |
| MICRO_EARNED_TASK_PASS | PASS |
| PIXEL6A_LIVE_LOCAL_MODEL_PASS | false (unearned) |
| GUNNCHAI_ANDROID_PRODUCTION_CLIENT_PASS | false (unearned) |
| PRODUCTION_DEFAULT_PROVIDER_FROZEN | false (unearned) |

## Honesty notes

- Pixel USB present but ADB **unauthorized** after daemon restart — physical ADB_REVERSE journey not claimed.
- ADB reverse ≠ on-device inference; `RUNTIME_ON_DEVICE_LOCAL` stays false.
- SmolLM2-135M is CONTROLLED_INTEGRATION only — not production default.
- Do not merge #50/#51/#52 via this PR.

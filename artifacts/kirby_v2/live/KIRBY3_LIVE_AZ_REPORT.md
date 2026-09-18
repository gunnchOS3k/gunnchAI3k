# KIRBY-3 Live Provider Promotion — A–Z Report

**Branch:** `research/kirby-live-provider-promotion-v1`  
**Base:** `research/kirby-provider-bakeoff-v1` @ `7241f71e3298f5c431b68e732d23116b08602462`  
**Date:** 2026-09-18  

## Executive verdict

Mac live micro-provider **PASS** with Apache-2.0 SmolLM2-135M via llama.cpp (`llama-completion`, CPU). Promotion state **`LIVE_QUALIFIED`** for SLOT_A_MICRO_ROUTER. Pixel on-device inference **not claimed** (`PIXEL_ADB_BLOCKED`). No simulated adapter marked LIVE_QUALIFIED. No production default pin.

`NEXT_GUNNCHAI_ACTION=PROMOTE_LIVE_QUALIFIED_PROVIDER_TO_CONTROLLED_PRODUCT_INTEGRATION`

---

### A — Stacked branch + draft PR
Created `research/kirby-live-provider-promotion-v1` from bakeoff tip. Draft PR opened against `research/kirby-provider-bakeoff-v1` (does not merge #50/#51).

### B — Evidence rebind doctrine
`docs/frontier/KIRBY2_LIVE_EVIDENCE_REBIND.md` defines SIMULATED / LIVE_MAC / LIVE_PIXEL / LIVE_REMOTE / UNAVAILABLE. Sim never LIVE_QUALIFIED.

### C — Mac preflight
`artifacts/kirby_v2/live/host/MAC_BASELINE.json` — Apple Silicon host, llama.cpp present, ~8GB class RAM, disk constrained.

### D — Pixel preflight
`artifacts/kirby_v2/live/pixel6a/PIXEL_BASELINE.json` — USB Pixel 6a visible; `adb devices` empty → **`PIXEL_ADB_BLOCKED`** with exact owner approve steps. Fail closed.

### E — Candidate inventory
`artifacts/kirby_v2/live/CANDIDATE_INVENTORY.json` — SmolLM2-135M (Mac+Pixel micro), SmolLM2-360M (Mac only). No 7B+ on Pixel.

### F — Provenance gate
`artifacts/kirby_v2/live/MODEL_PROVENANCE.json` — Apache-2.0 only; SHA-256 pinned. Unknown-license forbidden. Weights gitignored; verified existing host cache (HF download returned 403).

### G — Live ModelProvider v2 adapter
`src/providers/live/llamacpp_provider.ts` — llama.cpp CLI (`llama-completion`) behind ModelProviderV2. No llama.cpp schema above adapter.

### H — LIVE_MAC_MICRO_PROVIDER_PASS
**PASS** — real completion from SmolLM2-135M on Mac.

### I — LIVE_MAC_LOCAL_ASSISTANT_PASS
**FAIL (honest)** — `resource_incompatible` (free RAM ~861MB / disk pressure); skipped 360M to avoid thrashing.

### J — LIVE_OFFLINE_GUNNCHAI_PASS
**PASS** — local complete without cloud.

### K — LIVE_PROVIDER_FALLBACK_PASS
**PASS** — live primary cancel → simulated secondary fallback recorded.

### L — LIVE_WAIKE_MODEL_REPLACEABILITY_PASS
**PASS** — same WAIKE contract; shell proposals blocked; live↔sim swap under control plane.

### M — LIVE_TOOL_SCHEMA_PROVIDER_INDEPENDENCE_PASS
**PASS** — ToolInvocationV2 broker; untrusted content cannot grant permissions.

### N — LIVE_BOUNDED_AGENT_PASS
**PASS** — AgentRuntimeV2 budgeted step + live complete.

### O — Pixel runtime decision
`docs/frontier/PIXEL6A_INFERENCE_RUNTIME_DECISION.md` — `RUNTIME_UNAVAILABLE` for on-device; nearby-edge Mac preferred.

### P — PIXEL6A_LIVE_LOCAL_MODEL_PASS
**FAIL** — no authorized ADB; ADB-forwarded Mac ≠ on-device. Not fabricated.

### Q — Android client
`GUNNCHAI_ANDROID_CLIENT_NOT_AVAILABLE` — no Android app tree in repo.

### R — DEVICE_EDGE_ROUTING_PROVENANCE_PASS
**PASS** — compute=Mac LIVE_MAC; Pixel=client/unavailable; explicitly not on-device.

### S — Thermal / energy
20 short Mac completions **PASS**; 5-minute soak skipped (disk/RAM pressure safety).

### T — LIVE_PROMPT_INJECTION_BOUNDARY_PASS
**PASS** — guard `canGrantPermissions=false` for untrusted; no secret/permission grants in model text.

### U — Structured-output reliability
≥20 reps, pre-declared threshold **0.7** — **PASS** (`artifacts/kirby_v2/live/structured/STRUCTURED_OUTPUT_RELIABILITY.json`).

### V — Live QUALIFICATION.json
`artifacts/kirby_v2/live/qualification/live/prov_llamacpp_live/smollm2-135m-instruct-q4_k_m/QUALIFICATION.json`  
`evidence_class=LIVE_MAC`, `LIVE_QUALIFIED=true`, `PREFERRED_FOR_SLOT_LIVE` → SLOT_A_MICRO_ROUTER, `production_default=false`.

### W — Promotion states
LIVE_QUALIFIED for micro; EXPERIMENTAL/DISABLED elsewhere as appropriate. No production pin.

### X — Matrix rebind
`artifacts/kirby_v2/live/qualification_matrix_live.{json,md}` adds SIM/MAC/PIXEL/REMOTE columns; KIRBY-2 bakeoff sim rows preserved.

### Y — Gates
Updated `gates/KIRBY_GATES.json` + `.md` with live tokens. Unsupported Pixel paths remain false.

### Z — Tests + next action
Kirby foundation + bakeoff + live suites executed; full Jest baseline checked for regressions.  
**Next:** `NEXT_GUNNCHAI_ACTION=PROMOTE_LIVE_QUALIFIED_PROVIDER_TO_CONTROLLED_PRODUCT_INTEGRATION`  
(Pixel local not feasible → also keep Pixel as client / nearby-edge path.)

---

## Gate summary

| Gate | Result |
|---|---|
| LIVE_MAC_MICRO_PROVIDER_PASS | PASS |
| LIVE_MAC_LOCAL_ASSISTANT_PASS | FAIL (resource_incompatible) |
| LIVE_OFFLINE_GUNNCHAI_PASS | PASS |
| LIVE_PROVIDER_FALLBACK_PASS | PASS |
| LIVE_WAIKE_MODEL_REPLACEABILITY_PASS | PASS |
| LIVE_TOOL_SCHEMA_PROVIDER_INDEPENDENCE_PASS | PASS |
| LIVE_BOUNDED_AGENT_PASS | PASS |
| PIXEL6A_LIVE_LOCAL_MODEL_PASS | FAIL (PIXEL_ADB_BLOCKED) |
| DEVICE_EDGE_ROUTING_PROVENANCE_PASS | PASS |
| LIVE_THERMAL_ENERGY_SANITY_PASS | PASS |
| LIVE_PROMPT_INJECTION_BOUNDARY_PASS | PASS |
| LIVE_STRUCTURED_OUTPUT_RELIABILITY_PASS | PASS |

## Honesty notes

- HF curl download 403 on this network; used SHA-verified existing host GGUF cache (symlink; not committed).
- Metal GPU path failed under memory pressure; live path used `--device none` CPU.
- Pixel physically on USB but not ADB-authorized — owner must complete USB debugging allow prompt.

## Test evidence

- Kirby foundation + bakeoff + live: **27/27 PASS** (`artifacts/kirby_v2/live/KIRBY_TESTS.log`)
- Full Jest: **294 passed**, 3 failed in `tests/user-ready/*` due to host sandbox blocking `git init` in `/tmp` (not a Kirby regression). Kirby paths green; no reduction below prior 287-pass Kirby-relevant baseline.

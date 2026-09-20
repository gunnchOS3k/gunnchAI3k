# KIRBY-2 Provider Bake-Off A–Z Report

## A. Parent start
- Parent branch: `research/kirby-frontier-capability-adoption-v2`
- Expected SHA: `32d50c2bb47c80df01a6278c95415440bf3833b0`
- Actual parent SHA: `32d50c2bb47c80df01a6278c95415440bf3833b0` (match)

## B. Stacked branch
- Branch: `research/kirby-provider-bakeoff-v1`
- Continues KIRBY-1 without merging it first

## C. Host/device discovery
- MacBook Pro (Mac14,7), Apple M2, arm64, 8 GB RAM, Metal supported
- llama.cpp present; Ollama/Docker/Podman/MLX/vLLM absent
- Pixel 6a: not connected → `PIXEL_EDGE_MODEL_BAKEOFF_NOT_RUN=true`
- Evidence: `artifacts/kirby_v2/bakeoff/HOST_CAPABILITY_BASELINE.json` (+ `host_baseline.json`)

## D. Provider slots
- `config/provider_qualification_slots.yaml` — SLOT_A_MICRO_ROUTER … SLOT_G_COMPUTER_USE

## E. Candidate discovery
- Simulated architecture adapters inventory + honest `NO_CANDIDATE_AVAILABLE` for live local/remote
- Evidence: `artifacts/kirby_v2/bakeoff/candidate_inventory.json`

## F. Local-first ladder
- Prefer local/sim for offline suites; no remote required for offline-required paths
- Live GGUF/Ollama empty on this host

## G. Adapter conformance
- MODEL_PROVIDER_V2_*, STREAMING, STRUCTURED_OUTPUT, TOOL_PROPOSAL, CANCELLATION, TIMEOUT, HEALTHCHECK, PROVENANCE, LICENSE, RESOURCE, PRIVACY
- Evidence: `adapter_conformance.json` (simulated labeled; unsupported not faked)

## H. Suites A–F
- Routing, WAIKE, Coding, Device, Research, Creator executed via harness
- Raw rows: `benchmark_results.jsonl`

## I. Tool-use + bounded agent
- Tool loop + `BOUNDED_AGENT_RUNTIME_BEHAVIOR_PASS=true`

## J. Computer-use (optional)
- Synthetic local fixture UI only; `COMPUTER_USE_LIVE_MODEL=false`
- No sensitive accounts

## K. Long-context / multimodal
- Shape-level simulated; `LONG_CONTEXT_LIVE=false`

## L. Offline
- `OFFLINE_CORE_ASSISTANT_USABLE=true` (local sim adapters; no remote dependency)
- Evidence: `offline_results.md`

## M. Resource/efficiency
- `resource_profiles/` efficiency controller + per-model profiles

## N. Reliability
- 20 reps × categories + outage/malformed/timeout/cancel/resume on local sims

## O. Safety
- `UNTRUSTED_CONTENT_CANNOT_GRANT_PERMISSIONS=true`
- Evidence: `security_results/`

## P. Qualification + promotion
- Per-provider `qualification/<provider>/<model>/QUALIFICATION.json`
- States: EXPERIMENTAL / QUALIFIED / PREFERRED_FOR_SLOT / FALLBACK / DISABLED
- Promotion only when all 7 rules pass; sim preferred for offline slots only
- **No overall winner**

## Q. Pareto fronts
- Tier-local non-dominated sets only — `pareto_fronts.json`

## R. Pixel 6a
- Not run; reason under `artifacts/kirby_v2/bakeoff/pixel6a/`

## S. Mac qualification
- Micro/edge: sim preferred; workstation live weights resource-incompatible at 8 GB; sparse runtimes absent
- `mac_qualification.json`

## T. Proofs
- `MODEL_ROUTER_FALLBACK_CHAIN_PASS`
- `WAIKE_MODEL_REPLACEABILITY_PASS` (≥2 adapters)
- `TOOL_SCHEMA_PROVIDER_INDEPENDENCE_PASS` (≥2 adapters)

## U. Gates
- All `PROVIDER_BAKEOFF_*` tokens PASS (see `gates/KIRBY_GATES.json`)
- Optional Pixel/computer-use/long-context recorded with evidence flags

## V. Artifacts
- Full tree under `artifacts/kirby_v2/bakeoff/` including FINAL_BAKEOFF_REPORT.md

## W. Tests
- Kirby foundation 17/17 + bake-off 5/5 = 22/22 PASS

## X. Honesty / non-claims
- No permanent winner; no hard-coded model pin; no fabricated live model success
- Simulated vs unavailable live paths explicitly labeled

## Y. PR
- Draft stacked PR base `research/kirby-frontier-capability-adoption-v2`
- Do not merge automatically; review KIRBY-1 #50 before controlled promotion order

## Z. Preferred next
```text
NEXT_GUNNCHAI_ACTION=PROMOTE_QUALIFIED_PROVIDERS_AND_RUN_REAL_DEVICE_INTEGRATION
```

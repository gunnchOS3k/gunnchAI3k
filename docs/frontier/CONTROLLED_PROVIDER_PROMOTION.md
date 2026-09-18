# Controlled Provider Promotion (KIRBY-4)

## Purpose

Promote a **LIVE_QUALIFIED** micro-provider into a **controlled, reversible** product-integration lane.
This is **not** a production default pin.

## Promotion states

| State | Meaning | Product default? |
|---|---|---|
| `RESEARCH_ONLY` | Simulated / research harness only | No |
| `RESEARCH_LIVE` | Real host inference; evidence LIVE_* | No |
| `LIVE_QUALIFIED` | Passed live gates for a slot | No |
| `CONTROLLED_INTEGRATION` | Behind feature flags; earned tasks only | No |
| `PRODUCTION_DEFAULT` | Permanent default for product traffic | **Forbidden until earned** |

## SmolLM2-135M promotion bound

| From | To | Allowed? |
|---|---|---|
| `RESEARCH_LIVE` / `LIVE_QUALIFIED` | `CONTROLLED_INTEGRATION` | **Yes** (this PR) |
| `CONTROLLED_INTEGRATION` | `PRODUCTION_DEFAULT` | **No** (not earned) |

**Hard rule:** SmolLM2-135M-Instruct Q4_K_M must **not** be labeled `PRODUCTION_DEFAULT`.
Token `PRODUCTION_DEFAULT_PROVIDER_FROZEN=false` remains until a later earned promotion.

## Feature flags (default OFF)

- `GUNNCHAI_LIVE_PROVIDER_INTEGRATION=0` — no controlled-lane routing change
- `GUNNCHAI_NEARBY_EDGE=0` — NearbyEdgeServer not started / not registered

When both are off, product behavior matches KIRBY-3 baseline (no behavior change).

## Allowed task classes (CONTROLLED_INTEGRATION)

See `config/live_provider_policy.yaml`. SmolLM2 micro is allowed only for:

- `intent_route` / micro-router classification
- `short_assist` (bounded tokens)
- `health_probe` / capability discovery

Disallowed: long-form tutoring dumps, exam answer generation, shell proposals, computer-use, production chat default.

## Nearby-edge relationship

Mac may act as a **secure nearby-edge execution provider** for Pixel/WAIKE/Capsule clients.
ADB reverse ≠ on-device inference. Keep:

- `PIXEL6A_LIVE_LOCAL_MODEL_PASS=false`
- `GUNNCHAI_ANDROID_PRODUCTION_CLIENT_PASS=false`
- `RUNTIME_ON_DEVICE_LOCAL=false`

until genuine on-device runtime evidence exists.

## Rollback

Set flags to `0` / unset. No permanent wiring remains active. See rollback artifact under
`artifacts/kirby_v2/controlled_integration/lifecycle/ROLLBACK.json`.

## Next preferred action

`NEXT_GUNNCHAI_ACTION=INTEGRATE_NEARBY_EDGE_PROVIDER_INTO_GUNNCHOS_CAPSULE_AND_WAIKE_PIXEL_PILOT`

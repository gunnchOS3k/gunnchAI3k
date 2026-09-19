# KIRBY-2 → KIRBY-3 Live Evidence Rebind

## Purpose

KIRBY-2 proved the **provider-independent control plane** with **labeled simulated adapters**.
KIRBY-3 rebinds the same slots and gates against **real local models** and, where feasible,
**real Pixel 6a on-device execution** — without changing WAIKE or tool contracts.

## Evidence classes (mutually exclusive per claim)

| Class | Meaning | May set `LIVE_QUALIFIED` / `PREFERRED_FOR_SLOT_LIVE`? |
|---|---|---|
| `SIMULATED` | Deterministic bake-off adapters; architecture proofs only | **No** |
| `LIVE_MAC` | Real weights + real inference on this Mac host | Yes (Mac-local slots) |
| `LIVE_PIXEL` | Real on-device Pixel 6a inference (not ADB-forwarded Mac) | Yes (Pixel-local slots) |
| `LIVE_REMOTE` | Authenticated remote provider call with recorded response | Yes (remote slots only) |
| `UNAVAILABLE` | Attempted or scoped-out; no success fabricated | No |

## Hard honesty rules

1. **Simulated adapters are never production-qualified and never `LIVE_QUALIFIED`.**
2. **ADB-forwarded Mac inference ≠ on-device Pixel inference.** Mark as Mac edge assist + Pixel client.
3. **Do not claim Pixel inference if only Mac ran the model.**
4. **Do not fabricate remote-provider success** when keys/network are absent.
5. **Do not increase host hardware requirements** to force large models onto 8GB Mac / tiny Pixel.
6. KIRBY-2 sim results remain in `artifacts/kirby_v2/bakeoff/`; live results live under
   `artifacts/kirby_v2/live/`. Matrices add evidence columns — they do **not** silently replace sim rows.

## Slot rebind map

| Slot | KIRBY-2 evidence | KIRBY-3 target |
|---|---|---|
| SLOT_A_MICRO_ROUTER | SIMULATED preferred | LIVE_MAC micro if tiny GGUF runs |
| SLOT_B_EDGE_FAST | SIMULATED / resource gaps | LIVE_MAC or LIVE_PIXEL micro only if genuine |
| SLOT_C_WORKSTATION_PRO | SIMULATED shapes | LIVE_MAC only if fits without thrashing; else false |
| SLOT_D_WAIKE_TUTOR | SIMULATED replaceability | Live replaceability vs sim control plane |
| SLOT_E–G | Optional / deferred | Remain honest UNAVAILABLE unless live evidence exists |

## Promotion states (research PR)

- `EXPERIMENTAL` — adapter exists; incomplete evidence
- `LIVE_QUALIFIED` — live evidence_class + rules pass (**live only**)
- `PREFERRED_FOR_SLOT_LIVE` — live preferred for a slot (**live only**)
- `FALLBACK` — usable backup under resource/health constraints
- `DISABLED` — unavailable / blocked / incompatible
- **No production default pin** in this research PR

## Next-action policy

- Mac live succeeds → `NEXT_GUNNCHAI_ACTION=PROMOTE_LIVE_QUALIFIED_PROVIDER_TO_CONTROLLED_PRODUCT_INTEGRATION`
- Pixel local also succeeds → `NEXT_GUNNCHAI_ACTION=RUN_GUNNCHAI_PIXEL_USER_JOURNEY_AND_DEVICE_RESOURCE_QUALIFICATION`
- Pixel local not feasible → `NEXT_GUNNCHAI_ACTION=KEEP_PIXEL_AS_CLIENT_AND_QUALIFY_NEARBY_EDGE_EXECUTION`

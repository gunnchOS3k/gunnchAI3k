# Pixel 6a Inference Runtime Decision

## Question

Can gunnchAI3k run a **genuine on-device** micro-model on the connected Pixel 6a for KIRBY-3,
or must Pixel remain a **client** with nearby-edge (Mac) execution?

## Observed host state (updated after ADB authorize)

- USB: Pixel 6a on Mac USB bus.
- ADB: **authorized** — `adb devices -l` shows `device … product:bluejay model:Pixel_6a`.
- Token: **`PIXEL6A_ADB_CONNECTED=true`** (prior `PIXEL_ADB_BLOCKED` cleared).
- Device facts (preflight suite): Android 17 / SDK 37, `arm64-v8a`, ~5.5 GiB RAM total / ~2.2 GiB available, `/data` ~27 GiB free, battery ~20% AC charging, thermal status **0 (NONE)**.
- On-device packages/binaries: **no** Termux, llama.cpp, ollama, ExecuTorch, MediaPipe LLM, or GGUF weights found under probed paths.
- Android client APK in this gunnchAI3k tree: **`GUNNCHAI_ANDROID_CLIENT_NOT_AVAILABLE`**.

## Runtime classification

| Token | Selected | Meaning |
|---|---|---|
| `RUNTIME_ON_DEVICE_LOCAL` | **false** | Weights execute on Pixel SoC |
| `RUNTIME_NEARBY_EDGE_MAC` | **true (preferred)** | Mac runs live ModelProviderV2; Pixel is ADB client |
| `RUNTIME_ADB_FORWARDED_MAC` | **not claimed as Pixel local** | Port-forward to Mac llama-server ≠ on-device |
| `RUNTIME_UNAVAILABLE` | **false for client path** | ADB works; on-device local still unavailable |

**Decision:** Prefer **`RUNTIME_NEARBY_EDGE_MAC`**. Keep **`PIXEL6A_LIVE_LOCAL_MODEL_PASS=false`** until a verified on-device runtime + micro GGUF path exists. ADB connectivity alone never upgrades evidence to `LIVE_PIXEL`.

## Why on-device local stays false

1. No on-device inference binary/runtime (llama-cli/server, ollama, Termux+GGUF).
2. No gunnchAI Android client to host a local session.
3. Pushing/installing a full Android runtime + weights is out of scope for this research PR and would risk fabricating Pixel-local success.
4. Battery was ~20% at preflight — even with AC charge, skipping on-device model load is the safe default.

## Split-execution provenance

- Inference host = Mac (`LIVE_MAC`) when micro provider passes.
- Device role = **ADB-connected client** (`pixel6a_adb_client`).
- Evidence class for Pixel-local claims = `UNAVAILABLE`.
- Gate `DEVICE_EDGE_ROUTING_PROVENANCE_PASS` records Mac compute + Pixel client explicitly.

## Owner path to genuine LIVE_PIXEL (future)

1. Install a supported on-device runtime (e.g. Termux + llama.cpp Android build, or product Android client).
2. Place a **micro** Apache-2.0 GGUF (≪7B) with provenance on device.
3. Run inference **on device** (not via `adb reverse` to Mac).
4. Re-run `npm run bakeoff:kirby-live` and expect `evidence_class=LIVE_PIXEL`.

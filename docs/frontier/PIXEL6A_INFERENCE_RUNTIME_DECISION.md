# Pixel 6a Inference Runtime Decision

## Question

Can gunnchAI3k run a **genuine on-device** micro-model on the connected Pixel 6a for KIRBY-3,
or must Pixel remain a **client** with nearby-edge (Mac) execution?

## Observed host state (preflight)

- USB: Pixel 6a appears on the Mac USB bus (`IOUSBHostDevice`, Google Pixel 6a).
- ADB: `adb devices` lists **no** authorized devices after daemon restart.
- Classification: **`PIXEL_ADB_BLOCKED`** — physical attach ≠ debug authorization.
- Android client APK / Termux / MediaPipe LLM / ExecuTorch / llama.cpp-android packages:
  **not present** in this gunnchAI3k tree for on-device serving.

## Runtime classification

| Token | Selected | Meaning |
|---|---|---|
| `RUNTIME_ON_DEVICE_LOCAL` | **false** | Weights execute on Pixel SoC |
| `RUNTIME_NEARBY_EDGE_MAC` | **candidate** | Mac runs model; Pixel is client / UI |
| `RUNTIME_ADB_FORWARDED_MAC` | **not claimed as Pixel local** | Port-forward to Mac llama-server ≠ on-device |
| `RUNTIME_UNAVAILABLE` | **active until ADB authorize** | Cannot prove Pixel-local path |

**Decision token:** `RUNTIME_UNAVAILABLE` for on-device local inference in this PR,
with preferred product path `RUNTIME_NEARBY_EDGE_MAC` once Mac live qualifies.

## Why not force on-device

1. No authorized ADB session → cannot push runtimes, pull thermal stats, or start on-device servers.
2. No 7B+ models on Pixel by policy; even micro GGUF needs a runnable Android runtime + authorize.
3. Fabricating Pixel-local success would violate KIRBY honesty rules.

## Owner approve steps (exact) — clear `PIXEL_ADB_BLOCKED`

1. Unlock Pixel 6a; connect USB-C to this Mac.
2. On Pixel: **Settings → Developer options → USB debugging** = ON.
3. When prompted **Allow USB debugging?** → tap **Allow** (optionally Always allow this computer).
4. Set USB mode to **File transfer / MTP** (not Charge only) if the authorize prompt never appears.
5. On Mac: `adb kill-server && adb start-server && adb devices -l`
6. Expect a line like `<serial> device product:bluejay ... model:Pixel_6a`
7. Re-run: `npm run bakeoff:kirby-live` (or `tsx scripts/run_kirby_live_promotion.ts`)

Until step 6 succeeds, gates `PIXEL6A_LIVE_LOCAL_MODEL_PASS` and related remain **false**.

## Split-execution provenance

When Mac live succeeds and Pixel is client-only:

- Inference host = Mac (`LIVE_MAC`)
- Device role = client / display / input
- Evidence class for Pixel-local claims = `UNAVAILABLE`
- Gate `DEVICE_EDGE_ROUTING_PROVENANCE_PASS` may pass **only** if routing artifacts
  explicitly record Mac as compute and Pixel as client (never as local model host).

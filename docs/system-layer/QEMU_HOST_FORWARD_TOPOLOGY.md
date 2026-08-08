# QEMU host-forward topology (gunnchAI ↔ gunnchOS)

## Claim boundary

Documents how a **QEMU guest** `ai_interface` reaches a **host** gunnchAI3k product service / optional llama.cpp runtime.

Does **not** claim:

- physical device boot AI acceleration
- on-guest GGUF packaging requirement
- production cloud inference
- `FULL_GUNNCHAI3K_PLATFORM_DIGITAL_COMPLETE`

## Topology

```text
┌──────────────────────────────┐
│ gunnchOS QEMU guest          │
│  apps → ai_interface service │
│  HTTP client → 127.0.0.1:P   │
└──────────────┬───────────────┘
               │ QEMU user-net / hostfwd
               ▼
┌──────────────────────────────┐
│ Developer host               │
│  gunnchAI3k product-service  │
│  bind 127.0.0.1:8791         │
│  RAG + governance + audit    │
│  llama.cpp + GGUF (optional) │
│  deterministic SAFE_FALLBACK │
└──────────────────────────────┘
```

## Operator notes

1. Start host product service: `npm run product-service:serve` (port 8791).
2. Forward guest port to host (example): `-netdev user,id=n0,hostfwd=tcp:127.0.0.1:8791-:8791`.
3. Guest `ai_interface` uses `http://127.0.0.1:8791` as if local.
4. If llama.cpp/GGUF unavailable on host, product service still answers via deterministic baseline + SAFE_FALLBACK (`AI-LOCAL-011`).

## Contract endpoints for OS discovery

- `GET /v1/os/discover`
- `GET /v1/os/model-status`
- `GET /v1/os/rag-status`
- `POST /v1/assist/:capability` (timeoutMs + cancel supported)
- `POST /v1/governance/consent`
- `POST /v1/governance/model-rollback`
- `GET /v1/audit`

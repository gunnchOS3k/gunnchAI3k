# Continuance III — local runtime + capability depth

Builds on Wave C / PR #21 foundation (registry, router, privacy, structured eval, probes).

## Runtime choice

**llama.cpp** (GGUF). See `RUNTIME_ARCHITECTURE_CHOICE.md`.

## What runs offline without a model

All 11 capabilities produce structured offline essentials via the deterministic pack:

tutoring, code, device_help, a11y, game_coach, network, rag, scientific, translation, workflow, security.

## What runs with a real model

When `llama-cli`/`llama-server` + GGUF + memory budget are present, `LlamaCppBackend` executes real local inference and records measured latency. Otherwise probe + `scripts/install-llamacpp-path.sh` + metrics placeholders only.

## Tokens

| Token | Claimed when |
|-------|--------------|
| `GUNNCHAI3K_LOCAL_RUNTIME_CAPABILITY_EVAL_PASS` | All 11 capability structured evals pass |
| `GUNNCHAI3K_SYSTEM_LAYER_FOUNDATION_EVAL_PASS` | Original 6 foundation caps pass |
| `DIGITALLY_VALIDATED` | **Never** in this layer |
| `FULL_GUNNCHAI3K_PLATFORM_DIGITAL_COMPLETE` | **Not claimed** in Continuance III |

## Commands

```bash
npm run system-layer:probe
npm run system-layer:eval
npm run system-layer:status
npm run test:system-layer
bash scripts/install-llamacpp-path.sh
```

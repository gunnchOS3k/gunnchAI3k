# Continuance IV — real small local inference + evals

Builds on Continuance III / PR #22 (llama.cpp architecture selection, offline essentials).

## Runtime

**llama.cpp** + cached small GGUF (**SmolLM2-135M-Instruct Q4_K_M**, Apache-2.0).
Weights are downloaded via `scripts/download-small-gguf.sh` and **not** committed.

## Tokens

| Token | Claimed when |
|-------|--------------|
| `GUNNCHAI_REAL_LOCAL_INFERENCE_PASS` | Real llama.cpp inference measured + all capability evals pass |
| `GUNNCHAI3K_LOCAL_RUNTIME_CAPABILITY_EVAL_PASS` | All 11 capability structured evals pass |
| `GUNNCHAI3K_SYSTEM_LAYER_FOUNDATION_EVAL_PASS` | Foundation 6 caps pass |
| `DIGITALLY_VALIDATED` | **Never** in this layer |
| `FULL_GUNNCHAI3K_PLATFORM_DIGITAL_COMPLETE` | **Not claimed** in Continuance IV |

## Capability mechanisms

See `src/system-layer/capability_mechanisms.ts`:

- **Hybrid LLM**: tutoring, code, game_coach, scientific, translation
- **Local RAG hybrid**: rag (+ tutoring/scientific retrieval context)
- **Deterministic**: device_help, a11y, network, workflow, security

## Commands

```bash
brew install llama.cpp
bash scripts/download-small-gguf.sh
bash scripts/benchmark-local-inference.sh
npm run system-layer:probe
npm run system-layer:eval
npm run system-layer:status
npm run test:system-layer
```

## Evidence

- `evidence/system-layer/REAL_INFERENCE_BENCH.json`
- `evidence/system-layer/CONTINUATION_IV_STATUS.json`
- `models/local/manifest.json` + `MODEL_CARD.md`

# Wave C — gunnchAI3k AI system layer

Foundation for the product AI system layer. **Not** a DIGITALLY_VALIDATED claim.

## Modules

| Module | Path | Role |
|--------|------|------|
| Model registry | `src/system-layer/model_registry.ts` | Version, license, sha256 integrity, device profiles |
| Task router | `src/system-layer/task_router.ts` | tutoring/code/device_help/game_coach/network/RAG → local vs cloud |
| Local inference | `src/system-layer/local_inference/` | Adapter + deterministic CI baselines; optional llama.cpp / onnx probes |
| Evaluation harness | `src/system-layer/evaluation/` | Purpose, non-AI baseline, metric, latency, memory stub, fallback |
| Privacy policy | `src/system-layer/privacy_policy.ts` | Local/cloud disclosure; no silent cloud; no API keys |
| Device capability | `src/system-layer/device_capability.ts` | Student / Handheld / DS-XL profile stub |

## Commands

```bash
npm run test:system-layer
npx tsx -e "import { runEvaluationHarness } from './src/system-layer'; const r = await runEvaluationHarness(); console.log(JSON.stringify(r,null,2))"
```

## Honesty rules

- Fixture / deterministic backends are **NOT** trained LLMs.
- llama.cpp / onnxruntime are probed only; Wave C does **not** download weights or require admin install.
- Cloud stub acknowledges policy without inventing production keys.
- Eval token: `GUNNCHAI3K_SYSTEM_LAYER_FOUNDATION_EVAL_PASS` (structured metrics beat non-AI baselines).
- `DIGITALLY_VALIDATED` is **not** emitted by this layer.

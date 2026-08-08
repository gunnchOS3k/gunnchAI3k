# gunnchAI3k AI system layer (Continuance III)

Local-runtime depth on top of Wave C foundation. **Not** a DIGITALLY_VALIDATED or FULL platform claim.

## Modules

| Module | Path | Role |
|--------|------|------|
| Model registry | `src/system-layer/model_registry.ts` | Version, license, sha256, device profiles, selectedArchitecture=llama.cpp |
| Task router | `src/system-layer/task_router.ts` | 11 capabilities → local vs cloud policy |
| Local inference | `src/system-layer/local_inference/` | Selected llama.cpp runner + deterministic essentials |
| Evaluation harness | `src/system-layer/evaluation/` | baseline, dataset, metric, latency, memory, failure, privacy, fallback, model version |
| Privacy policy | `src/system-layer/privacy_policy.ts` | Local/cloud disclosure |
| Device capability | `src/system-layer/device_capability.ts` | Student / Handheld / DS-XL |
| Platform status | `src/system-layer/platform_status.ts` | Honest gaps + tokens |

## Commands

```bash
npm run test:system-layer
npm run system-layer:probe
npm run system-layer:eval
npm run system-layer:status
```

See `CONTINUATION_III.md` and `RUNTIME_ARCHITECTURE_CHOICE.md`.

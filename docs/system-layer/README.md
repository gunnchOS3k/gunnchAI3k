# gunnchAI3k AI system layer (Continuance V)

Callable local product service + real RAG + governance runtime on top of Continuance IV inference.
**Not** a DIGITALLY_VALIDATED or FULL platform claim.

## Modules

| Module | Path | Role |
|--------|------|------|
| Product service | `src/system-layer/product_service/` | gunnchOS-integrable local HTTP API |
| Model registry | `src/system-layer/model_registry.ts` | Version, license, sha256, device profiles, selectedArchitecture=llama.cpp |
| Capability mechanisms | `src/system-layer/capability_mechanisms.ts` | Best path: LLM / deterministic / hybrid / local RAG |
| Local RAG | `src/system-layer/local_rag.ts` + `product_service/rag_engine.ts` | ingest/chunk/index/search/attribution/delete/rebuild |
| Governance | `product_service/governance.ts` | purpose/consent/minimization/disclosure/version/eval/override/fallback/monitor/rollback |
| Task router | `src/system-layer/task_router.ts` | 11 capabilities → local vs cloud policy |
| Local inference | `src/system-layer/local_inference/` | Selected llama.cpp runner + deterministic essentials |
| Evaluation harness | `src/system-layer/evaluation/` | baseline, dataset, metric, latency, memory, real-inference token |
| Privacy policy | `src/system-layer/privacy_policy.ts` | Local/cloud disclosure |
| Device capability | `src/system-layer/device_capability.ts` | Student / Handheld / DS-XL |
| Platform status | `src/system-layer/platform_status.ts` | Honest gaps + tokens |

## Commands

```bash
bash scripts/download-small-gguf.sh
bash scripts/benchmark-local-inference.sh
npm run product-service:serve
npm run test:product-service
npm run test:system-layer
npm run system-layer:probe
npm run system-layer:eval
npm run system-layer:status
```

See `CONTINUATION_V.md`, `CONTINUATION_IV.md`, and `RUNTIME_ARCHITECTURE_CHOICE.md`.

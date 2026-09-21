# Traceability matrix — gunnchAI3k

| Diagram element | Source path |
|---|---|
| Gate 1 capability enum | `src/local-runtime/types.ts` |
| Keyword classifier | `src/local-runtime/runtime.ts` `inferCapability` |
| Fixture / local / cloud providers | `src/local-runtime/providers/` |
| Local-only network guard | `src/local-runtime/network.ts` |
| System capabilities | `src/system-layer/model_registry.ts` |
| Task router + disclosure | `src/system-layer/task_router.ts`, `privacy_policy.ts` |
| Deterministic backends | `src/system-layer/local_inference/backends/deterministic.ts` |
| Product surfaces | `src/system-layer/os_integration/product_surfaces.ts` |
| Stage 2 roles / candidates | `src/stage2/fleet/roles.ts`, `registry.ts` |
| Model router | `src/stage2/fleet/router.ts` |
| Capability HTTP | `src/stage2/os/http_adapter.ts`, `capability_api.ts` |
| Research / citations | `src/stage2/research/foundation.ts` |
| WAIKE discovery | `src/waike-mastery/contract.ts` |
| Mastery modes | `src/waike-mastery/modes.ts` |
| Discord slash UX (mock lessons) | `src/tutor/discordInteractionRouter.ts` |
| Skill keyword router | `src/tutor/skillRouter.ts` |
| Honest tokens | `src/waike-mastery/tokens.ts`, `src/user-ready/tokens.ts` |
| Benchmarks | `benchmarks/` |
| Journey test | `tests/journeys/waike_to_gunnchai.test.ts` |
| History | `docs/history/` |

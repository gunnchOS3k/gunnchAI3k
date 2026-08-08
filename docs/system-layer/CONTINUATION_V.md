# Continuance V — callable product service + RAG + governance

Builds on Continuance IV / PR #23 (real llama.cpp inference + 11 capability evals).

**Important:** `11/11` capability evals ≠ full platform complete. This continuation adds a real local product API, RAG lifecycle, and governance runtime so AI-CORE / AI-GOV / AI-LOCAL requirement nodes can move from `SCHEMA_ONLY` → `RUNTIME`.

## What shipped

| Area | Location |
|------|----------|
| Product service | `src/system-layer/product_service/` |
| HTTP API (127.0.0.1) | `product_service/server.ts` |
| Local RAG engine | ingest/chunk/index/search/attribution/delete/rebuild |
| Integration corpora | `fixtures/system-layer/integrations/{device-docs,waike,archive}` |
| Governance runtime | purpose/consent/minimization/disclosure/version/eval/override/fallback/monitoring/rollback |
| Continuity | local session store + user-controlled export/import |

## Tokens

| Token | Claimed when |
|-------|--------------|
| `GUNNCHAI_PRODUCT_SERVICE_LOCAL_PASS` | Product service health + local HTTP surface |
| `GUNNCHAI_REAL_LOCAL_INFERENCE_PASS` | Kept when llama.cpp real inference + evals still pass |
| `GUNNCHAI3K_LOCAL_RUNTIME_CAPABILITY_EVAL_PASS` | All 11 capability structured evals pass |
| `GUNNCHAI3K_SYSTEM_LAYER_FOUNDATION_EVAL_PASS` | Foundation 6 caps pass |
| `DIGITALLY_VALIDATED` | **Not claimed** |
| `FULL_GUNNCHAI3K_PLATFORM_DIGITAL_COMPLETE` | **Not claimed** (Discord/cloud production path incomplete) |

## Routes (gunnchOS-integrable)

```
GET  /health
GET  /version
GET  /v1/capabilities
GET  /v1/requirements
POST /v1/assist
POST /v1/assist/:capability   # tutoring|code|device_help|a11y|game_coach|network|rag|scientific|translation|workflow|security|continuity|content_adaptation|connection_path
POST /v1/rag/{ingest,chunk,index,search,attribution,delete,rebuild}
GET  /v1/rag/stats
GET/POST /v1/continuity/sessions
POST /v1/continuity/{export,import}
GET  /v1/governance/{status,monitor}
POST /v1/governance/{purpose,consent,minimization,override,rollback}
```

## Commands

```bash
npm run product-service:health
npm run product-service:serve
npm run product-service:rag-rebuild
npm run test:product-service
npm run test:system-layer
npm run system-layer:eval
npm run system-layer:status
```

## Evidence

- `evidence/system-layer/CONTINUATION_V_STATUS.json`
- `evidence/system-layer/PRODUCT_SERVICE_STATUS.json`
- `evidence/system-layer/REAL_INFERENCE_BENCH.json` (reproduced when available)

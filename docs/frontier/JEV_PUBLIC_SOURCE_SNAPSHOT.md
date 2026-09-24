# Public-source snapshot — TypeSafe System One / Jev

**Captured:** 2026-09-23  
**Purpose:** KIRBY-5 research. Do not reproduce more copyrighted text than needed.

## Sources

1. TypeSafe docs — "Introduction" / System One + Jev: https://docs.typesafe.ai/introduction and https://docs.typesafe.ai/concepts/system-one
2. OpenAPI 3.1 schema: https://api.typesafe.ai/openapi.json (info.version `0.2.0`)
3. Privacy policy: https://www.typesafe.ai/privacy (last updated Nov 19, 2025)
4. Master customer agreement / DPA: not independently retrieved in this wave (page not confirmed from this environment). Treat as external-cloud processing until reviewed.

## Exact claims used (paraphrase)

- `POST /v1/systemone` evaluates one or more questions against a shared `state`.
- `GET /v1/models` returns available model names/aliases.
- Auth is bearer API key.
- Question types: yes/no probability (`noul`), choice, score.
- Choice/score answers include probability distributions and confidence.
- Response includes `model` and `usage` (`input_tokens`, `output_tokens`).
- Vendor describes Jev as fast, typed, and trained for calibrated decisions. **Vendor-asserted.**
- Vendor says it will not train/fine-tune model weights on customer Input. **Vendor-asserted; terms can change.**
- Service is remote cloud processing. Not local. Not zero-retention by default.

## Independently verified this wave

- OpenAPI schema fetch from `https://api.typesafe.ai/openapi.json` succeeded (2026-09-23).
- Privacy policy page fetch succeeded (2026-09-23).
- Adapter contract tests against the OpenAPI shapes (fixture/mock) passed.

## Not independently verified

- Live `GET /v1/models` / `POST /v1/systemone` (no API key).
- Latency, cost, calibration on gunnchAI workloads.
- Pixel or on-device Jev (weights are not released; no self-host).
- DPA / customer agreement specifics.

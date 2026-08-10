# Model Candidate Matrix

**Dated:** 2026-08-09
**Schema:** gunnchai.stage2.model_candidate_matrix.v1

135M is Nano/fallback only. Large weights are never committed — registry + hashes only.

| ID | Role | Params | License | Context | RAM (MB) | Runtime | Notes |
|---|---|---|---|---:|---:|---|---|
| nano-smollm-135m | NANO_LOCAL | 135M | Apache-2.0 | 2048 | 256 | llama.cpp / fixture-deterministic | Nano/fallback only. Useful for always-on OS/device stubs; not the daily intelligence tier. |
| local-fast-smollm-360m | LOCAL_FAST | 360M | Apache-2.0 | 4096 | 768 | llama.cpp (GGUF, download-on-demand) | Common daily tasks. Weights not committed; registry entry only. |
| local-pro-qwen2-1_5b | LOCAL_PRO | 1.5B | Apache-2.0 | 8192 | 2048 | llama.cpp (GGUF, download-on-demand) | Deeper reasoning / longer context when RAM and power allow. |
| embed-minilm-l6 | EMBEDDING | 22M | Apache-2.0 | 512 | 128 | onnxruntime / deterministic-fixture | Local embeddings for RAG and memory search. |
| rerank-tiny-cross | RERANKER | fixture | MIT | 512 | 96 | deterministic-fixture | Reranking fixture for research/RAG pipelines. |
| vision-optional-stub | VISION | optional | MIT | 1024 | 512 | optional-local / deny-by-default | Optional Stage 2 hook; not required for fleet pass. |
| speech-optional-stub | SPEECH | optional | MIT | 0 | 256 | optional-local / deny-by-default | Optional Stage 2 hook; not required for fleet pass. |
| frontier-cloud-optional | OPTIONAL_FRONTIER_CLOUD | provider-dependent | provider ToS | 128000 | 0 | HTTPS provider API (consent-gated) | Escalation only with explicit consent. Never default. No production keys embedded. |

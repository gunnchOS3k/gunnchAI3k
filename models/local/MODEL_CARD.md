# Local GGUF model card (Continuance IV)

## Selected model

| Field | Value |
|-------|-------|
| Name | **SmolLM2-135M-Instruct** |
| Quant | Q4_K_M |
| Format | GGUF |
| Parameters | 135M |
| License | **Apache-2.0** |
| Model card | https://huggingface.co/HuggingFaceTB/SmolLM2-135M-Instruct |
| GGUF source | https://huggingface.co/bartowski/SmolLM2-135M-Instruct-GGUF |
| Filename | `SmolLM2-135M-Instruct-Q4_K_M.gguf` |
| SHA256 | `2e8040ceae7815abe0dcb3540b9995eaa1fa0d2ca9e797d0a635ae4433c68c2d` |
| Approx size | ~101 MiB |

## Policy

- Weights are **not** committed to Git (`models/local/*.gguf` is gitignored).
- Download/cache with `bash scripts/download-small-gguf.sh`.
- Runtime: **llama.cpp** (`llama-cli`).
- If this model fails on a host, try a materially smaller legitimate GGUF before declaring blocked (e.g. Q2_K of the same family).

## Why this model

Fits 8GB Apple Silicon student hosts under memory pressure where 1–3B models thrash. Prefer a real tiny open model over claiming “host too small” without attempting inference.

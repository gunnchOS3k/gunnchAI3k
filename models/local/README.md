# Local GGUF models

Place a small GGUF here (e.g. `*.gguf`) or set `GUNNCHAI3K_LOCAL_GGUF_PATH`.

Continuance IV selected architecture: **llama.cpp**.

See `MODEL_CARD.md` and `manifest.json` for the preferred SmolLM2-135M-Instruct Q4_K_M metadata (license, SHA256, model card URL).

**Tier honesty (AI-USER-READY-001):** SmolLM2-135M Q4_K_M 512-ctx is **Nano/fallback only**. License-compatible Fast/Pro *candidates* (SmolLM2-360M-Instruct Apache-2.0, Qwen2-1.5B-Instruct Apache-2.0) are registry-selected without inventing GGUF bytes. If those files are not in this directory, Local Fast/Pro stay **OPEN**. Never claim Fast/Pro quality from Nano weights.

```bash
brew install llama.cpp   # or scripts/install-llamacpp-path.sh
bash scripts/download-small-gguf.sh
bash scripts/benchmark-local-inference.sh
npm run system-layer:probe
npm run system-layer:eval
```

Weights are gitignored and must never be committed.

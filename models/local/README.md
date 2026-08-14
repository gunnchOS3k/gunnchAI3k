# Local GGUF models

Place a small GGUF here (e.g. `*.gguf`) or set `GUNNCHAI3K_LOCAL_GGUF_PATH`.

Continuance IV selected architecture: **llama.cpp**.

See `MODEL_CARD.md` and `manifest.json` for the preferred SmolLM2-135M-Instruct Q4_K_M metadata (license, SHA256, model card URL).

**Tier honesty (AI-USER-READY-002):** SmolLM2-135M Q4_K_M 512-ctx is **Nano/fallback only**. Local Fast is hashed SmolLM2-360M-Instruct Q4_K_M (`catalog.json` SHA-256). Download-on-demand: `bash scripts/download-local-fast-gguf.sh` (resume, integrity, quarantine). Local Pro remains **OPEN** without a pinned hashed GGUF. Never claim Fast/Pro quality from Nano weights. Never commit `*.gguf`.

```bash
brew install llama.cpp   # or scripts/install-llamacpp-path.sh
bash scripts/download-small-gguf.sh
bash scripts/benchmark-local-inference.sh
npm run system-layer:probe
npm run system-layer:eval
```

Weights are gitignored and must never be committed.

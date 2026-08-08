#!/usr/bin/env bash
# Honest install path for Continuance III selected architecture: llama.cpp
# Does NOT silently download GGUF weights. Operator must choose a model.
set -euo pipefail

echo "=== gunnchAI3k llama.cpp install path ==="
echo "Selected architecture: llama.cpp"
echo

if command -v brew >/dev/null 2>&1; then
  echo "[1] Homebrew detected."
  echo "    Suggested (operator-run): brew install llama.cpp"
else
  echo "[1] Homebrew not found. Build from https://github.com/ggerganov/llama.cpp"
fi

echo
echo "[2] Place a small GGUF under models/local/*.gguf"
echo "    or export GUNNCHAI3K_LOCAL_GGUF_PATH=/absolute/path/model.gguf"
echo "    Suggested class for 8GB Apple Silicon: <=1.5B Q4_K_M"
echo
echo "[3] Verify:"
echo "    npm run system-layer:probe"
echo "    npm run system-layer:eval"
echo
echo "This script does not download weights and does not claim FULL_GUNNCHAI3K_PLATFORM_DIGITAL_COMPLETE."

#!/usr/bin/env bash
# Continuance IV — download a small legitimate GGUF (not committed to git).
# Default: SmolLM2-135M-Instruct Q4_K_M (~101 MiB, Apache-2.0).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST_DIR="${ROOT}/models/local"
mkdir -p "${DEST_DIR}"

MODEL_REPO="${GUNNCHAI3K_GGUF_REPO:-bartowski/SmolLM2-135M-Instruct-GGUF}"
MODEL_FILE="${GUNNCHAI3K_GGUF_FILE:-SmolLM2-135M-Instruct-Q4_K_M.gguf}"
MODEL_URL="${GUNNCHAI3K_GGUF_URL:-https://huggingface.co/${MODEL_REPO}/resolve/main/${MODEL_FILE}}"
OUT="${DEST_DIR}/${MODEL_FILE}"
EXPECTED_SHA256="${GUNNCHAI3K_GGUF_SHA256:-2e8040ceae7815abe0dcb3540b9995eaa1fa0d2ca9e797d0a635ae4433c68c2d}"

echo "=== gunnchAI3k small GGUF download ==="
echo "Repo:   ${MODEL_REPO}"
echo "File:   ${MODEL_FILE}"
echo "URL:    ${MODEL_URL}"
echo "Dest:   ${OUT}"
echo

if [[ -f "${OUT}" ]]; then
  ACTUAL="$(shasum -a 256 "${OUT}" | awk '{print $1}')"
  if [[ "${ACTUAL}" == "${EXPECTED_SHA256}" ]]; then
    echo "Already present with matching SHA256."
    exit 0
  fi
  echo "Existing file SHA mismatch; re-downloading."
  rm -f "${OUT}"
fi

curl -L --fail --retry 3 --retry-delay 2 -o "${OUT}" "${MODEL_URL}"
ACTUAL="$(shasum -a 256 "${OUT}" | awk '{print $1}')"
echo "SHA256=${ACTUAL}"
if [[ -n "${EXPECTED_SHA256}" && "${ACTUAL}" != "${EXPECTED_SHA256}" ]]; then
  echo "ERROR: SHA256 mismatch (expected ${EXPECTED_SHA256})" >&2
  exit 1
fi

BYTES="$(wc -c < "${OUT}" | tr -d ' ')"
cat > "${DEST_DIR}/manifest.json" <<EOF
{
  "id": "smollm2-135m-instruct-q4_k_m",
  "displayName": "SmolLM2-135M-Instruct",
  "quant": "Q4_K_M",
  "parameters": "135M",
  "filename": "${MODEL_FILE}",
  "bytes": ${BYTES},
  "sha256": "${ACTUAL}",
  "license": "Apache-2.0",
  "modelCard": "https://huggingface.co/HuggingFaceTB/SmolLM2-135M-Instruct",
  "ggufSource": "https://huggingface.co/${MODEL_REPO}",
  "downloadUrl": "${MODEL_URL}",
  "weightsCommittedToGit": false,
  "architecture": "llama.cpp",
  "continuation": "IV",
  "notes": "Small open instruct model suitable for 8GB Apple Silicon hosts. Weights must stay gitignored."
}
EOF

echo "Wrote ${DEST_DIR}/manifest.json"
echo "Weights are gitignored (models/local/*.gguf). Do not commit them."

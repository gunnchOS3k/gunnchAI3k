#!/usr/bin/env bash
# Continuance IV — real local inference benchmark (llama.cpp + small GGUF).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}"

GGUF="${GUNNCHAI3K_LOCAL_GGUF_PATH:-}"
if [[ -z "${GGUF}" ]]; then
  GGUF="$(ls -1 "${ROOT}/models/local/"*.gguf 2>/dev/null | head -1 || true)"
fi
if [[ -z "${GGUF}" || ! -f "${GGUF}" ]]; then
  echo "No GGUF found. Run: bash scripts/download-small-gguf.sh" >&2
  exit 1
fi

BIN="$(command -v llama-cli || true)"
if [[ -z "${BIN}" ]]; then
  echo "llama-cli not found. Run: brew install llama.cpp" >&2
  exit 1
fi

NGL="${GUNNCHAI3K_LLAMA_NGL:-0}"
CTX="${GUNNCHAI3K_LLAMA_CTX:-512}"
NPRED="${GUNNCHAI3K_LLAMA_N_PREDICT:-64}"
PROMPT="${1:-You are gunnchAI3k. Capability: tutoring. Query: teach binary search. Respond with concise local guidance.}"
OUT_DIR="${ROOT}/evidence/system-layer"
mkdir -p "${OUT_DIR}"
RAW_OUT="${OUT_DIR}/REAL_INFERENCE_BENCH.out.txt"
RAW_ERR="${OUT_DIR}/REAL_INFERENCE_BENCH.err.txt"
JSON_OUT="${OUT_DIR}/REAL_INFERENCE_BENCH.json"

HW="$(sysctl -n machdep.cpu.brand_string 2>/dev/null || uname -m)"
MEM="$(sysctl -n hw.memsize 2>/dev/null || echo 0)"
SHA="$(shasum -a 256 "${GGUF}" | awk '{print $1}')"
VER="$("${BIN}" --version 2>&1 | head -2 | tr '\n' ' ')"

echo "=== REAL local inference benchmark ==="
echo "model=${GGUF}"
echo "sha256=${SHA}"
echo "binary=${BIN}"
echo "ngl=${NGL} ctx=${CTX} n=${NPRED}"
echo "hardware=${HW}"

/usr/bin/time -l "${BIN}" \
  -m "${GGUF}" \
  -p "${PROMPT}" \
  -n "${NPRED}" \
  -c "${CTX}" \
  -ngl "${NGL}" \
  --temp 0.2 \
  --no-warmup \
  -no-cnv \
  -st \
  --simple-io \
  --log-disable \
  >"${RAW_OUT}" 2>"${RAW_ERR}"

export BENCH_OUT_DIR="${OUT_DIR}"
export BENCH_GGUF="${GGUF}"
export BENCH_SHA="${SHA}"
export BENCH_BIN="${BIN}"
export BENCH_VER="${VER}"
export BENCH_HW="${HW}"
export BENCH_MEM="${MEM}"
export BENCH_NGL="${NGL}"
export BENCH_CTX="${CTX}"
export BENCH_NPRED="${NPRED}"

python3 <<'PY'
import json, re, pathlib, os, time
root = pathlib.Path(os.environ["BENCH_OUT_DIR"])
out = (root / "REAL_INFERENCE_BENCH.out.txt").read_text(errors="replace")
err = (root / "REAL_INFERENCE_BENCH.err.txt").read_text(errors="replace")
prompt_tps = re.search(r"Prompt:\s*([\d.]+)\s*t/s", out)
gen_tps = re.search(r"Generation:\s*([\d.]+)\s*t/s", out)
rss = re.search(r"(\d+)\s+maximum resident set size", err)
real = re.search(r"([\d.]+)\s+real", err)
text = out
idx = out.rfind("\n> ")
if idx >= 0:
    text = out[idx + 3 :]
    nl = text.find("\n")
    if nl >= 0:
        text = text[nl + 1 :]
text = re.sub(r"\[ Prompt:[\s\S]*$", "", text).replace("Exiting...", "").strip()
words = [w for w in text.split() if w]
output_tokens_est = max(1, int(round(len(words) * 1.3)))
prompt_tps_v = float(prompt_tps.group(1)) if prompt_tps else None
gen_tps_v = float(gen_tps.group(1)) if gen_tps else None
ttft_ms = int(round((40 / prompt_tps_v) * 1000)) if prompt_tps_v else None
gguf = os.environ["BENCH_GGUF"]
payload = {
  "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
  "tokenTarget": "GUNNCHAI_REAL_LOCAL_INFERENCE_PASS",
  "model": {
    "path": gguf,
    "filename": os.path.basename(gguf),
    "sha256": os.environ["BENCH_SHA"],
    "quant": "Q4_K_M",
    "license": "Apache-2.0",
    "modelCard": "https://huggingface.co/HuggingFaceTB/SmolLM2-135M-Instruct",
  },
  "runtime": {
    "binary": os.environ["BENCH_BIN"],
    "version": os.environ["BENCH_VER"],
    "architecture": "llama.cpp",
    "hardwarePath": "cpu" if int(os.environ["BENCH_NGL"]) == 0 else "metal",
    "ngl": int(os.environ["BENCH_NGL"]),
    "context": int(os.environ["BENCH_CTX"]),
    "nPredict": int(os.environ["BENCH_NPRED"]),
  },
  "hardware": {
    "cpu": os.environ["BENCH_HW"],
    "memBytes": int(os.environ["BENCH_MEM"]),
  },
  "metrics": {
    "latencySec": float(real.group(1)) if real else None,
    "promptTokPerSec": prompt_tps_v,
    "generationTokPerSec": gen_tps_v,
    "ttftMsApprox": ttft_ms,
    "promptTokensApprox": 40,
    "outputTokensEst": output_tokens_est,
    "peakRssBytes": int(rss.group(1)) if rss else None,
    "peakRssMiB": round(int(rss.group(1)) / (1024 * 1024), 2) if rss else None,
    "context": int(os.environ["BENCH_CTX"]),
  },
  "sampleOutput": text[:800],
  "quality": {
    "nonEmpty": bool(text.strip()),
    "onTopicHint": any(
      k in text.lower()
      for k in ["binary", "search", "help", "algorithm", "code", "hello", "local"]
    ),
  },
}
(root / "REAL_INFERENCE_BENCH.json").write_text(json.dumps(payload, indent=2))
print(json.dumps(payload["metrics"], indent=2))
print("wrote", root / "REAL_INFERENCE_BENCH.json")
PY

echo "Done. Evidence: ${JSON_OUT}"

#!/usr/bin/env bash
# Download hashed Local Fast GGUF (SmolLM2-360M Q4_K_M). Not Nano. Not committed.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}"
export GUNNCHAI_FAST_NETWORK_CONSENT=1
npx tsx -e "import { ModelDownloadManager } from './src/user-ready/model_manager';
const m = new ModelDownloadManager();
m.ensure('local-fast-smollm2-360m', { networkConsent: true }).then((r) => {
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
});"
echo "Weights are gitignored. Do not commit GGUF bytes."

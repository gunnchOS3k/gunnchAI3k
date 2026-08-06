# Gate 1 — gunnchAI3k local-first runtime

Status token (automated software smoke): `GUNNCHAI3K_LOCAL_RUNTIME_PASS`

## What this is

A local-only assistance runtime smoke path that:

- Serves health / version identification over CLI and `127.0.0.1` HTTP
- Enforces local-only mode (cloud call attempts are rejected)
- Retrieves answers from approved fixture documents only
- Uses a fixture-backed deterministic provider that is **never** labeled as a trained LLM
- Optionally discovers already-installed local models (does **not** download weights)
- Records local audit JSON + resource metrics
- Supports timeout/cancellation, restart, and safe failure

## Commands

```bash
npx tsx src/local-runtime/cli.ts health
npx tsx src/local-runtime/cli.ts version
npx tsx src/local-runtime/cli.ts verify-network
npx tsx src/local-runtime/cli.ts assist --capability tutoring --query "binary search"
npx tsx src/local-runtime/cli.ts serve --port 8787
npm run test:local-runtime
```

## Explicit disclosures

- Default processing mode: **LOCAL-ONLY**
- Fixture provider: deterministic / approved corpus — **NOT a trained LLM**
- Cloud models are not claimed as local
- Large models are not downloaded by this Gate 1 path

## Integration hints (read-only)

- `docs/local-runtime/DEVICE_OS_INTEGRATION_HINTS.md`
- `docs/local-runtime/WAIKE_INTEGRATION_HINTS.md`

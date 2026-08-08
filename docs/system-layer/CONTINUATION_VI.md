# Continuance VI — gunnchOS integration + remaining digital AI requirements

Builds on Continuance V / PR #24 (callable product service + RAG + governance).

**Doctrine:** Never merge casually. Never claim `FULL_GUNNCHAI3K_PLATFORM_DIGITAL_COMPLETE` unless every normative AI requirement is implemented, integrated, and evaluated — including production Discord/cloud paths. Continuance VI does **not** earn that token.

## What shipped

| Area | Location |
|------|----------|
| OS `ai_interface` client | `src/system-layer/os_integration/ai_interface_client.ts` |
| Capability / model / RAG discovery | `GET /v1/os/discover`, `/v1/os/model-status`, `/v1/os/rag-status` |
| Timeout + cancellation | `request_control.ts` + `POST /v1/assist/cancel` |
| Unavailable fallback | SAFE_FALLBACK + deterministic baseline (unchanged, OS-exposed) |
| Input interpretation | `POST /v1/assist/input_interpretation` |
| Safety alert explanation | `POST /v1/assist/safety_alert` |
| Content adaptation / connection path / continuity | retained + re-proven |
| Consent / audit / source attribution | governance + `/v1/audit` + RAG attribution |
| Model rollback | `POST /v1/governance/model-rollback` |
| Product surfaces | `os_integration/product_surfaces.ts` (WAIKE, code, device, Archive, connectivity, a11y) |
| Requirement re-proof | `os_integration/requirement_proof.ts` |
| QEMU topology | `os_integration/topology.ts` + `docs/system-layer/QEMU_HOST_FORWARD_TOPOLOGY.md` |

## Tokens

| Token | Status |
|-------|--------|
| `GUNNCHAI_PRODUCT_SERVICE_LOCAL_PASS` | Kept |
| `GUNNCHAI_OS_INTEGRATION_LOCAL_PASS` | **Earned** when normative AI nodes RUNTIME + OS discovery/timeout/cancel/fallback proven |
| `GUNNCHAI_REAL_LOCAL_INFERENCE_PASS` | Kept when llama.cpp + evals still pass |
| `GUNNCHAI3K_LOCAL_RUNTIME_CAPABILITY_EVAL_PASS` | Kept when 11/11 evals pass |
| `DIGITALLY_VALIDATED` | **Not claimed** |
| `FULL_GUNNCHAI3K_PLATFORM_DIGITAL_COMPLETE` | **Not claimed** |

## QEMU topology (explicit)

```
gunnchOS guest (ai_interface)
    → QEMU host-forward 127.0.0.1:GUEST → host:8791
        → gunnchAI3k product-service (127.0.0.1 only)
            → host llama.cpp/GGUF (optional) OR deterministic SAFE_FALLBACK
```

QEMU **may** host-forward the model runtime. That is a digital integration convenience, not an on-device NPU / physical AI claim.

## Commands

```bash
npm run product-service:serve
npm run test:product-service
npm run test:system-layer
npm run test:os-integration
npm run system-layer:status
```

## Evidence

- `evidence/system-layer/CONTINUATION_VI_STATUS.json`
- `evidence/system-layer/REQUIREMENT_PROOF_VI.json`
- `docs/system-layer/QEMU_HOST_FORWARD_TOPOLOGY.md`

# Connectivity Diagnosis Pack (Approved Fixture)

source_id: fixtures/local-runtime/documents/connectivity-diagnosis.md
approved: true
pack: connectivity-diagnosis-v1

## Local-Only Diagnosis Explanation

When wide-area connectivity is unavailable, essential services must continue on local packs. Diagnosis should:

1. State which bearer paths were checked (or not checked in local-only mode).
2. Prefer local mesh / dock Ethernet / offline packs over claiming carrier coverage.
3. Never invent a successful cloud call.
4. Explain that local-only mode rejects remote model endpoints by design.

## Disclosure

Processing mode: local. Cloud enhancement is optional and must be user-visible when enabled.

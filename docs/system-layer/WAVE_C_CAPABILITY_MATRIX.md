# Wave C capability matrix (honest status)

| Capability | Purpose | Non-AI baseline | Metric | System status | DIGITALLY_VALIDATED |
|------------|---------|-----------------|--------|---------------|---------------------|
| tutoring | Concept + steps + check | echo-glossary | tutoring_rubric_coverage | Foundation eval (deterministic) | **No** |
| code | Typed early-return guard | regex-snippet-dump | code_structure_score | Foundation eval (deterministic) | **No** |
| device_help | Profile-aware local steps | static-faq-line | device_profile_awareness | Foundation eval (deterministic) | **No** |
| game_coach | State + actionable tips | generic-try-harder | game_coach_actionability | Foundation eval (deterministic) | **No** |
| network | Local diagnosis checklist | check-wifi-string | network_checklist_completeness | Foundation eval (deterministic) | **No** |
| rag | Ranked local sources | first-doc-dump | rag_source_attribution | Foundation + Gate 1 local-runtime bridge | **No** |

## Backend availability (this environment)

| Backend | Available for CI | Notes |
|---------|------------------|-------|
| deterministic-baseline | Yes | In-process; always used for foundation metrics |
| local-runtime-fixture | Yes | Existing Gate 1 path |
| llama.cpp | Probe only | No admin install / no GGUF download |
| onnxruntime | Probe only | Not installed; no forced npm install |
| cloud | Policy stub only | No production keys |

## Tokens

- Pass token when structured eval beats baselines: `GUNNCHAI3K_SYSTEM_LAYER_FOUNDATION_EVAL_PASS`
- Explicitly **not** claimed: `DIGITALLY_VALIDATED`
- Physical: freeze — no purchases

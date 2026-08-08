# Continuance III capability matrix (honest status)

| Capability | Purpose | Non-AI baseline | Metric | Status | FULL_PLATFORM |
|------------|---------|-----------------|--------|--------|---------------|
| tutoring | Concept + steps + check | echo-glossary | tutoring_rubric_coverage | Offline essential + llama.cpp when available | **No** |
| code | Typed early-return guard | regex-snippet-dump | code_structure_score | Offline essential + llama.cpp when available | **No** |
| device_help | Profile-aware local steps | static-faq-line | device_profile_awareness | Offline essential | **No** |
| a11y | WCAG-oriented fixes | make-it-pretty | a11y_checklist_coverage | Offline essential | **No** |
| game_coach | State + actionable tips | generic-try-harder | game_coach_actionability | Offline essential | **No** |
| network | Diagnosis + optimizer tips | check-wifi-string | network_checklist_completeness | Offline essential | **No** |
| rag | Ranked local sources | first-doc-dump | rag_source_attribution | Local-runtime fixture bridge | **No** |
| scientific | Local attribution + caveats | unsourced-assert | scientific_attribution_score | Offline essential | **No** |
| translation | Offline glossary/passthrough | identity-copy | translation_structure_score | Offline essential | **No** |
| workflow | Offline automatable steps | todo-one-liner | workflow_step_completeness | Offline essential | **No** |
| security | Defensive explanation only | scary-warning | security_explanation_score | Offline essential; refuses exploits | **No** |

## Backend availability

| Backend | Role | Notes |
|---------|------|-------|
| **llama.cpp** | **Selected architecture** | Real run if binary+GGUF+RAM; else probe + install path |
| deterministic-baseline | Offline essentials | Always available; NOT a trained LLM |
| local-runtime-fixture | RAG bridge | Gate 1 corpus |
| onnxruntime | Non-primary probe only | Not selected |
| cloud | Policy stub | No production keys |

## Tokens

- Capability eval: `GUNNCHAI3K_LOCAL_RUNTIME_CAPABILITY_EVAL_PASS`
- Foundation eval: `GUNNCHAI3K_SYSTEM_LAYER_FOUNDATION_EVAL_PASS`
- Explicitly **not** claimed: `DIGITALLY_VALIDATED`, `FULL_GUNNCHAI3K_PLATFORM_DIGITAL_COMPLETE`

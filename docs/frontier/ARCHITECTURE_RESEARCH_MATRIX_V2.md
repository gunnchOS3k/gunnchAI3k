# Architecture Research Matrix v2 — Frontier inspiration (public patterns only)

**Claim boundary:** Inspiration and qualification *candidates*. Not proprietary internals. Not hard product dependencies.

| Family | Public pattern signals (high level) | Kirby absorption target | Qualification slot |
|---|---|---|---|
| GPT-5.6 | Adaptive reasoning effort, tools, structured outputs, long context, multimodal | ReasoningPolicy + ToolInvocation + ContextManager | tier 2–3 coding/research |
| Claude Sonnet 5 | Long-horizon agents, computer use, careful tool use | AgentRuntime + ComputerUse + Verifier | tier 3 computer-use |
| Gemini | Native multimodal, long context, streaming | MultimodalObservation + ContextManager | tier 2 multimodal |
| DeepSeek | Efficient reasoning / coding cost profile | EfficiencyController + Model Ladder | tier 1–2 cost |
| Mistral | Strong local/edge-friendly open weights patterns | Local/offline inference ladder | tier 0–2 local |
| Gemma | On-device / open local assist | Tier 0–1 nano/local | offline |
| Kimi | Long-context research patterns | ContextManager + ProjectMemory | research suite |
| GLM | Bilingual + tool calling patterns | Provider adapters + ToolInvocation | provider health |
| Llama | Open local inference substrate | Local inference + replaceability | offline |
| Qwen | Multilingual + coding local/cloud | Router Pareto + coding suite | coding |

Historical references (do not resurrect wholesale): `phase-xiii/frontier-ai-requirements`, `phase-xiv/ai-frontier-convergence`, CX0 Capability Broker PR #48.

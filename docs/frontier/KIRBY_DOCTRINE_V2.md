# Kirby Doctrine v2 — gunnchAI Frontier Capability Adoption

**Status:** Research / architecture doctrine (additive). Does not change accepted production defaults.  
**Identity:** gunnchAI remains one product identity that *absorbs* frontier capabilities ("Kirby") rather than becoming a thin wrapper around any single vendor model.  
**Accepted-main baseline this wave targets:** `076b7ccd7c3f71d3299ead9a72e45291cd33689a` (verify at preflight).

## Doctrine

gunnchAI is a **model operating layer**: providers and models are replaceable substrates; capability classes are first-class; routing, tools, memory, verification, consent, and budgets are product-owned. Frontier models (cloud or local) are absorbed when they qualify on evidence — never hard-wired as the product.

Kirby absorption means: observe a frontier pattern → normalize into a capability class → qualify via bake-off / gates → promote into the ladder with fallbacks → keep offline and identity intact.

## Ten non-negotiables

1. **One gunnchAI identity** — Users interact with gunnchAI, not a vendor brand or ephemeral model name.
2. **Local-first / offline** — Core assist paths degrade gracefully offline; cloud is opt-in and consent-gated.
3. **Model replaceability** — No permanent hard dependency on a single provider or model as a product requirement.
4. **Consent & privacy** — Sensitive actions, cloud offload, memory retention, and computer-use require explicit consent classes.
5. **Deterministic verification** — Claims that matter (WAIKE correctness, code, networking, device ops) pass verifier contracts; vibes are not gates.
6. **Bounded autonomy** — Agents and background tasks have budgets, stop conditions, and owner controls; no indefinite unsupervised autonomy.
7. **Device-aware budgets** — Latency, RAM, thermal, battery, cost, and energy constrain reasoning effort and tool use.
8. **Integration fidelity** — WAIKE, Device OS, creator, and research surfaces use explicit contracts; models propose, brokers authorize.
9. **No hidden CoT dependence** — Product continuity uses TaskState (objective, plan summary, steps, questions, tool outputs, citations, verifier outcomes, user-visible rationale). Raw hidden chain-of-thought is not persisted as a control plane.
10. **Untrusted content cannot grant permissions** — Prompt injection, tool output, retrieval, UI text, and agent-to-agent messages are labeled untrusted and cannot escalate authority.

## Absorption loop

```text
frontier signal → capability registry entry → provider metadata →
router Pareto selection → tool proposals → Capability Broker auth →
verify → bake-off evidence → gate token (honest) → optional promote
```

## Claim boundary

- This package is an **executable foundation** + doctrine + harness.
- Do **not** claim human-validation, real-device performance, or model quality wins without evidence artifacts.
- Preferred next action after this wave: `NEXT_GUNNCHAI_ACTION=RUN_PROVIDER_BAKEOFF_AND_PROMOTE_QUALIFIED_CAPABILITIES`.

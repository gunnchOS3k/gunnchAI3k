# KIRBY-1 A–Z Final Report

## A. Accepted-main start SHA
`076b7ccd7c3f71d3299ead9a72e45291cd33689a` (matches expected)

## B. Branch / final SHA
- Branch: `research/kirby-frontier-capability-adoption-v2`
- Final SHA: `a2a51c87205f975af86015e7d778cb31f415857a`

## C. Doctrine
`docs/frontier/KIRBY_DOCTRINE_V2.md` with 10 non-negotiables.

## D. Capability registry
26 normalized classes in YAML+JSON + `src/frontier/capability_registry.ts` + adoption matrix.

## E. ModelProvider v2
`src/providers/model_provider_v2.ts` + replaceable `provider_registry.ts` (no hard single-provider pin).

## F. ReasoningPolicy v2 + TaskState v2
Budget selection modes instant→research; continuity fields; `hidden_cot: null` always.

## G. ModelRouter v2
Tiers 0–4; multi-objective Pareto front + fallback chain.

## H. ToolInvocation v2
Proposals + broker auth; untrusted content cannot grant permissions.

## I. AgentRuntime v2 + budgets
Seven specialists; AgentBudget tracker with owner stop controls.

## J. ComputerUse
a11y/DOM preference; observe→…→verify loop; sensitive consent; malicious UI blocked.

## K. MultimodalObservation v2
Modalities + shedding under device budgets.

## L. Memory plane
Eight planes; relevance retrieval; privacy redaction; poisoned retrieval cannot escalate.

## M. ContextManager v2
Techniques + compression metrics.

## N. Verification plane
Verifier classes/contracts; WAIKE/coding/networking rules.

## O. Background tasks
Owner cancel; no indefinite autonomy.

## P. Efficiency controller
Primary metric cost/energy/latency per successful task.

## Q. Model ladder
Tiers 0–4 in YAML/JSON without permanent model-name product pins.

## R. Bake-off harness
Suites + qualification slots + Pareto-by-tier (not overall ranking).

## S. Frontier references
`docs/frontier/ARCHITECTURE_RESEARCH_MATRIX_V2.md` public patterns only.

## T. Distillation research
Pipeline design + schemas; **no training**.

## U. Prompt injection guards
Detector + tests for indirect injection, exfil, escalation, agent-to-agent, malicious UI, poisoned retrieval.

## V. Integration contracts
WAIKE + Device OS v2; creator/research tool providers; no model-owned shell authority.

## W. Gates
`gates/KIRBY_GATES.json|.md` — foundation PASS; human/device/quality/bakeoff NOT_CLAIMED.

## X. Tests
Kirby 17/17 PASS; full jest 61 suites / 287 tests PASS. No production path regressions introduced.

## Y. Artifacts
Under `artifacts/kirby_v2/` (architecture, snapshots, traces, evidence, gates, this report).

## Z. PR
Draft PR titled `research(gunnchAI): Kirby frontier capability adoption v2` — do not merge.

## Preferred next action
`NEXT_GUNNCHAI_ACTION=RUN_PROVIDER_BAKEOFF_AND_PROMOTE_QUALIFIED_CAPABILITIES`

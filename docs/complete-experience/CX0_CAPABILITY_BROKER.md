# CX0 Capability Broker Contract

**Status:** DRAFT additive contract  
**Base:** origin/main `65b799e`  
**Normative target:** product-service `/v1/assist` as the Complete Experience assistance broker.

## Problem

Multiple parallel capability surfaces exist:

1. `src/system-layer/product_service` — structured `/v1/assist` + provenance (richest)
2. `src/system-layer/capability_mechanisms.ts` — mechanism routing
3. `src/stage2/os/capability_api.ts` — Stage2 echo API
4. `src/local-runtime` — Gate-1 providers / CapabilityKind
5. `PermissionBroker` — OS permission scopes only (not capability routing)

## Decision (additive)

- **Capability Broker v1** is the single CX0 contract for system assistance.
- product-service `assist` is the **normative implementation target**.
- Stage2 + local-runtime remain **adapters/legacy** beneath the broker.
- No capability removal; high-end paths may declare remote/cloud without deleting local.

## Non-goals

- Do not change WAIKE adapter pin behavior in this PR.
- Do not claim COMPLETE for gunnchAI domain.

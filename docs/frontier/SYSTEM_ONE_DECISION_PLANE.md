# System One Decision Plane

**Status:** KIRBY-5 research / `CONTRACT_VALIDATED`  
**Identity:** gunnchAI  
**Umbrella capability:** `SYSTEM_ONE_DECISION_PLANE`  
**Production default:** false

gunnchAI adds a **decision plane** beside the generative plane.

```text
System One / reflex: classify, score, choose, route, verify, detect uncertainty
System Two / generative: explain, reason deeply, write, code, research, plan
gunnchAI owns when each is used, plus policy, privacy, tools, memory, fallbacks
```

TypeSafe Jev is one candidate implementation (`provider_id: typesafe`, `model_family: system_one`). Models are discovered at runtime from `GET /v1/models`. `jev-latest` is not hard-pinned.

## Canonical contract

Product code uses `binary_probability`, `categorical_choice`, and `ordinal_score`.

The TypeSafe adapter maps:

| gunnchAI | TypeSafe |
|---|---|
| `binary_probability` | `noul` |
| `categorical_choice` | `choice` |
| `ordinal_score` | `score` |

Vendor names do not leak through product surfaces.

## Architecture

```text
gunnchAI identity / TaskState / policy
        ↓
deterministic hard policy
        ↓
Decision Broker (privacy / consent / budget / flags)
        ↓
  local/deterministic          remote allowed?
        ↓                            ↓
        │                    DecisionProvider (TypeSafe/Jev)
        └──────────┬─────────────────┘
                   ↓
        typed distributions
                   ↓
        Confidence Gate → act / fallback / escalate
```

Modules live in `src/decision_plane/` and `src/providers/typesafe/`.

## Where it should be used first

Intent routing, fuzzy ModelRouterV2 features, retrieval rerank, tool-class **proposal**, verifier triage, bounded-agent advice, WAIKE tutor-mode routing, injection **signal**, bulk triage.

## Where it must not be used

User-facing chat generation, code/essay writing, hidden CoT store, permission authority, destructive authorization, sole security boundary, sole grading authority, offline provider, gunnchAI identity.

## Flags (default OFF)

`GUNNCHAI_SYSTEM_ONE_DECISION_PLANE`, `GUNNCHAI_TYPESAFE_JEV`, `GUNNCHAI_TYPESAFE_LIVE`, plus per-task `GUNNCHAI_JEV_*` flags. Turning them all off restores pre-KIRBY-5 behavior.

# Component — current

Three routing stacks plus WAIKE mastery. Discord tutor UX is a separate surface.

```mermaid
flowchart TB
  subgraph surfaces
    CLI[local-runtime CLI]
    HTTP[Stage 2 HTTP /v1/capability]
    PS[product-service :8791]
    DISC[Discord slash UX]
  end
  subgraph routers
    G1[Gate 1 inferCapability]
    TR[system-layer TaskRouter]
    MR[stage2 ModelRouter]
  end
  subgraph backends
    FIX[FixtureBackedProvider]
    DET[DeterministicBaselineBackend]
    LLAMA[optional llama.cpp]
    CLOUD[CloudProviderStub fails closed]
  end
  subgraph waike
    CTR[waike-mastery contract]
    GRD[isolated Python grader]
    WAIKE[(sibling waike-research-ops)]
  end
  CLI --> G1 --> FIX
  HTTP --> MR
  MR --> FIX
  PS --> TR --> DET
  TR --> LLAMA
  TR --> CLOUD
  DISC --> CTR
  CTR --> WAIKE
  CTR --> GRD
```

There is no production cloud inference in this checkout. Stage 2 invoke currently **echoes** the selected model id (`src/stage2/os/capability_api.ts`).

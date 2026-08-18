# State machine — agent / task (current)

Coding-agent and WAIKE diagnosis states that exist in code. Not a learned planner.

```mermaid
stateDiagram-v2
  [*] --> Routed: capability classified
  Routed --> LocalFixture: local-only or always-local cap
  Routed --> CloudDenied: attemptCloud without consent
  Routed --> CloudStubFail: cloud-allowed + CloudProviderStub
  LocalFixture --> GroundedAnswer: fixture retrieve ok
  LocalFixture --> Unsupported: capability unsupported
  GroundedAnswer --> [*]
  CloudDenied --> [*]
  CloudStubFail --> [*]

  state CodingAgent {
    [*] --> SandboxWrite
    SandboxWrite --> SyntaxCheck: node --check
    SyntaxCheck --> AwaitingMergeApproval
    AwaitingMergeApproval --> [*]: stop (no merge)
  }

  state WaikeDiagnosis {
    [*] --> GAP_IDENTIFIED
    GAP_IDENTIFIED --> REMEDIATION_OFFERED
    REMEDIATION_OFFERED --> REASSESSED
    REASSESSED --> CERTAINLY_FILLED: transferOk
    REASSESSED --> GAP_IDENTIFIED: still weak
  }
```

Sources: `src/local-runtime/runtime.ts`, `src/phase_xiv/computer_use/coding_agent.ts`, `src/user-ready/coding_agent_pr.ts`, `src/waike-mastery/diagnosis.ts`.

# Class — capability and model (current)

Types that exist in TypeScript. Weights are registry metadata, not committed binaries.

```mermaid
classDiagram
  class CapabilityKind {
    tutoring
    code_assistance
    device_help
    accessibility
    connectivity_diagnosis
    document_retrieval
  }
  class SystemCapability {
    tutoring code device_help a11y
    game_coach network rag scientific
    translation workflow security
  }
  class CapabilityName {
    summarize translate tutor code
    search reason diagnose classify
  }
  class ModelRole {
    NANO_LOCAL
    LOCAL_FAST
    LOCAL_PRO
    EMBEDDING RERANKER
    VISION SPEECH
    OPTIONAL_FRONTIER_CLOUD
  }
  class ModelCandidate {
    id
    role
    weightsStatus
    isNanoFallbackOnly
    artifactRef
  }
  class ProviderKind {
    fixture-backed-deterministic
    optional-local-model
    cloud
  }
  class MasteryMode {
    MASTERY_BENCHMARK
    LEARNER_TUTOR
    EDUCATOR_COPILOT
  }
  ModelRouter --> ModelCandidate : selects
  ModelCandidate --> ModelRole
  GunnchAiCapabilityApi --> CapabilityName
  LocalFirstRuntime --> CapabilityKind
  TaskRouter --> SystemCapability
  ModePermissions --> MasteryMode
```

Sources: `src/local-runtime/types.ts`, `src/system-layer/model_registry.ts`, `src/stage2/fleet/roles.ts`, `src/stage2/os/capability_api.ts`, `src/waike-mastery/modes.ts`.

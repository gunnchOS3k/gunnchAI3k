# Use case — current

Actors: learner, instructor, device-os caller, maintainer, prospective supervisor. gunnchAI3k does not execute RAN control and does not claim frontier chat quality.

```mermaid
flowchart LR
  subgraph actors
    L[Learner]
    I[Instructor]
    D[Device Lab / device-os]
    M[Maintainer]
    S[Prospective supervisor]
  end
  subgraph gunnchai [gunnchAI3k]
    UC1[Ask a local-only capability]
    UC2[Take a WAIKE practice path]
    UC3[Request coding/project help]
    UC4[Cite local research corpus]
    UC5[Diagnose device or connectivity]
    UC6[Inspect honest tokens and UML]
  end
  L --> UC1
  L --> UC2
  L --> UC3
  L --> UC4
  L --> UC5
  I --> UC2
  D --> UC1
  D --> UC5
  M --> UC6
  S --> UC6
  S --> UC1
```

Code: `src/local-runtime/runtime.ts`, `src/waike-mastery/modes.ts`, `src/stage2/os/capability_api.ts`, `src/system-layer/os_integration/product_surfaces.ts`.

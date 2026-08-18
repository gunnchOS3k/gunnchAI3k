# Deployment — current (local / edge / cloud)

```mermaid
flowchart LR
  subgraph local [Developer / supervisor laptop]
    NODE[Node 20 Jest + tsx]
    FIX[fixtures/]
    GGUF[optional GGUF on disk]
    LLAMA[optional llama-cli]
  end
  subgraph loopback [127.0.0.1 only]
    PS[product-service :8791]
    CAP[Stage 2 HTTP adapter]
  end
  subgraph sibling [Optional sibling checkout]
    WAIKE[waike-research-ops digital_rc]
    PY[Python grader]
  end
  subgraph github [GitHub]
    REPO[gunnchOS3k/gunnchAI3k]
    GHA[Actions: mastery / stage2 / user-ready]
  end
  subgraph cloud [Not implemented]
    STUB[CloudProviderStub]
  end
  NODE --> FIX
  NODE --> PS
  NODE --> CAP
  GGUF --> LLAMA
  PS --> WAIKE
  CAP --> STUB
  REPO --> GHA
```

No production web host is claimed. QEMU host-forward topology is documented in `docs/system-layer/QEMU_HOST_FORWARD_TOPOLOGY.md` as **digital**, not physical EVT.

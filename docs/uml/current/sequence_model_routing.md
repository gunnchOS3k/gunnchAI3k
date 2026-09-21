# Sequence — model routing (current)

Happy path for a local tutoring request. Cloud is omitted unless `cloudConsent` and `cloud-allowed` are both set; even then the cloud provider **throws** `CLOUD_NOT_IMPLEMENTED`.

```mermaid
sequenceDiagram
  participant U as Caller
  participant RT as LocalFirstRuntime
  participant INF as inferCapability
  participant NET as LocalOnlyNetworkGuard
  participant RET as retrieveLocalDocuments
  participant P as FixtureBackedProvider
  U->>RT: handle(query, processingMode=local-only)
  RT->>INF: classify keywords
  INF-->>RT: capability=tutoring
  RT->>NET: assertCloudCallAllowed
  NET-->>RT: blocked (local-only)
  RT->>RET: retrieveByCapabilityHint
  RET-->>RT: fixture excerpts
  RT->>P: generate(grounded text)
  P-->>U: RuntimeResponse + Disclosure
```

Stage 2 variant: caller → `GunnchAiCapabilityApi.invoke` → `ModelRouter.route` → echo `[tutor] via ${selectedModelId}` (`src/stage2/os/capability_api.ts`, `src/stage2/fleet/router.ts`).

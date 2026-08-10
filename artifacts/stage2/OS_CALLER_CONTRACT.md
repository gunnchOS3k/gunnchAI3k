# OS Caller Contract — Stage 2 (AI ↔ device-os)

**Status:** DRAFT note for device-os agent wiring (WAIKE / Device Manager / Creator).
**Doctrine:** PHYSICAL_EXECUTION_FREEZE=ACTIVE; no frontier parity claim.

## Package boundary

| Concern | Owner |
|---|---|
| OS capability *API shape* / permission UX | `gunnchos-device-os` |
| Model fleet, router, memory, projects, research runtime | `gunnchAI3k` (`src/stage2`) |
| Shared identity | `user_id` string on both sides |

## HTTP adapter (gunnchAI3k)

- `GET /health`
- `GET /v1/capabilities`
- `POST /v1/capability/{summarize|translate|tutor|code|search|reason|diagnose|classify}`

Body:

```json
{
  "user_id": "u_demo",
  "input": "text",
  "cloudConsent": false,
  "grant": ["network", "device", "memory"]
}
```

Start from TypeScript:

```ts
import { GunnchAiCapabilityApi, startCapabilityHttpServer } from './src/stage2';
const api = new GunnchAiCapabilityApi();
const server = await startCapabilityHttpServer(api, 8792);
```

## Python call site (sibling)

```python
import urllib.request, json
req = urllib.request.Request(
    "http://127.0.0.1:8792/v1/capability/tutor",
    data=json.dumps({"user_id":"u1","input":"OFDM basics","grant":["memory"]}).encode(),
    headers={"content-type":"application/json"},
    method="POST",
)
print(urllib.request.urlopen(req).read().decode())
```

## Sync policy

Local-default. Do **not** claim cloud sync complete from this contract.

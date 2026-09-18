# Nearby-Edge Pairing Protocol v1

## Goals

- One-time owner-mediated pairing between a client (Pixel pilot / Capsule / WAIKE) and Mac NearbyEdgeServer
- No plaintext permanent secrets committed to git
- Prefer **ADB_REVERSE** for Pixel pilot (USB tether; not LAN exposure)
- Canonical API is gunnchAI NearbyEdge — **not** raw llama.cpp HTTP schema

## Transports (ordered preference for Pixel)

1. `ADB_REVERSE` — `adb reverse tcp:<port> tcp:<port>`; Pixel localhost → Mac server
2. `LOCALHOST` — same-host loopback (dev / Mac-local clients)
3. `LOCAL_LAN_TLS` — TLS on private LAN only; requires pairing + mutual auth; **never** unauthenticated open LAN

Unauthenticated LAN inference endpoints are **forbidden**.

## One-time pairing flow

1. Owner starts NearbyEdgeServer with `GUNNCHAI_NEARBY_EDGE=1`.
2. Server generates ephemeral pairing code (TTL ≤ 120s) + session binding material; stores **hashed** secret under `~/.gunnchai/nearby_edge/` (gitignored).
3. Client presents pairing code over preferred transport (`POST /v1/session/pair`).
4. Server returns short-lived session token (HMAC-bound); client stores in secure local storage only.
5. Subsequent `/v1/execute` requires `Authorization: Bearer <session>` + provenance envelope on every response.
6. Idle shutdown clears in-memory sessions; re-pair required after expiry/revoke.

## Endpoints (canonical)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/v1/healthz` | none (local/ADB only) | Liveness |
| GET | `/v1/capabilities` | session | Allowed task classes + model identity |
| POST | `/v1/session/pair` | pairing code | Create session |
| POST | `/v1/session/revoke` | session | Revoke |
| POST | `/v1/execute` | session | Controlled completion |
| POST | `/v1/cancel` | session | Cancel in-flight |

## Honesty labels

- Compute host: Mac (`LIVE_MAC` / nearby-edge)
- Device role: Pixel ADB client when using ADB_REVERSE
- Never claim `LIVE_PIXEL` or on-device local solely because ADB reverse works

## Secrets policy

- No permanent pairing secrets in repository
- Example env vars only in `.env.example`
- Audit log records pair/revoke/execute/deny events without raw prompts when privacy_class=sensitive

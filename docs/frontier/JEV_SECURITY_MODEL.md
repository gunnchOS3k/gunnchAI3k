# Jev security model (KIRBY-5)

## Authority

```text
Jev decision → proposal only → deterministic policy → Capability Broker
  → consent → tool-specific verifier → execution
```

Jev never bypasses the broker. Untrusted content cannot grant permissions.

## Injection boundary

User / retrieved / tool content may populate `state` only.

Product-owned code controls question names, instructions, criteria, allowed choices, thresholds, and branch mappings.

Untrusted text cannot redefine system policy, permission thresholds, tool authority, privacy class, consent, or capability-broker rules.

Jev may emit a **defense-in-depth** injection signal. It is not the sole security boundary. Deterministic `PromptInjectionGuard` still runs.

## Side effects

Mutating / sensitive decisions: Jev confidence can never independently authorize the action. `ConfidenceGate` returns `ESCALATE_DETERMINISTIC`.

## Credentials

Never print, commit, fixture, log, or provenance-store `TYPESAFE_API_KEY`. Auth headers are redacted before tracing.

## Network

No unauthenticated LAN inference. Capsule contract forbids it. Nearby-edge remains KIRBY-4's authenticated pairing path and is unchanged by this wave.

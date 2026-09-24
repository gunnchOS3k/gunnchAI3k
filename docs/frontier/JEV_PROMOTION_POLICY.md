# Jev promotion policy

Ladder:

```text
RESEARCH → CONTRACT_VALIDATED → LIVE_EVALUATED → QUALIFIED_PER_TASK
  → CONTROLLED_INTEGRATION → PILOT → PRODUCTION_DEFAULT
```

KIRBY-5 may advance only as far as evidence earns.

This wave: **RESEARCH + CONTRACT_VALIDATED**.

Not earned: `LIVE_EVALUATED`, any `*_QUALIFIED` promotion token, `CONTROLLED_INTEGRATION`, `PILOT`, `PRODUCTION_DEFAULT`.

`JEV_PRODUCTION_DEFAULT=false` is frozen.

A capability can qualify independently. There is no overall Jev pass/fail requirement.

If Jev loses a task, report it. If deterministic code is better, keep deterministic code. If a local micro-router is sufficient, prefer local-first.

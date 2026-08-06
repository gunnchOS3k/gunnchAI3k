# Device OS integration hints (read-only)

Supporting repository: `gunnchos-device-os`

Gate 1 local runtime in gunnchAI3k does **not** claim physical boot or dock continuity.

Suggested future wiring (not implemented here):

1. Device-help responses may cite fixture pack `device-help-v1` and point operators to device-os docs/boot manifests.
2. Health metrics from this runtime can be attached as a software evidence event beside device-os boot probes.
3. Prefer `ring_input` / boot evidence schemas from the field-kit Gate 1 contracts when correlating sessions.

Do not overwrite device-os Gate 1 workstreams A/B/C from this repository.

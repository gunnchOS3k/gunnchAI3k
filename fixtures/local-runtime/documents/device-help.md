# Device Help Pack (Approved Fixture)

source_id: fixtures/local-runtime/documents/device-help.md
approved: true
pack: device-help-v1
integration_hint: gunnchos-device-os/docs (read-only)

## Local Health Check

1. Confirm the device identity file is present.
2. Confirm storage is writable for evidence/audit logs.
3. Confirm input adapters report a heartbeat when available.
4. If display or input is unavailable, record a safe failure and continue with CLI diagnostics.

## Safe Failure

Never claim physical boot success from software-only probes.

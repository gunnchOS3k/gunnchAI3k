# Jev / TypeSafe data privacy review

**Accessed:** 2026-09-23  
**Sources:** https://www.typesafe.ai/privacy (last updated Nov 19, 2025); TypeSafe public docs  
**Classification:** remote cloud processing. **Not** private, local, or zero-retention.

## Facts captured from public pages

- Inputs (prompts, data, instructions, and other Input) may be processed to provide the service.
- TypeSafe's public privacy policy states it will not train or fine-tune model weights on customer Input.
- The same policy still lists using personal data to provide, maintain, **improve**, debug, administer, and enhance the Services. "No training" is not "no processing" and is not "zero retention."
- Input may be disclosed to service providers.
- Retention is "as long as reasonably necessary" to provide the Services.
- Services are hosted in the United States.
- Privacy / legal terms can change.

The KIRBY-5 spec's "without prior consent" phrasing is a conservative reading. The page accessed on 2026-09-23 states a no-train/no-fine-tune rule on Input, not a consent-gated exception. We still treat the service as external-cloud processing.

## KIRBY-5 policy

| Privacy class | Remote Jev |
|---|---|
| public | May qualify when flags + network + consent policy allow |
| personal | Explicit cloud consent + task allowlist |
| sensitive | Default DENY |
| device_local | Always DENY |

Also DENY when `offline=true` or `cloud_consent=false`.

Do not send passwords, raw auth tokens, API keys, private keys, unrestricted medical/financial records, raw student records, raw private memory, or device secrets.

`DecisionStateMinimizer` redacts secrets, drops blocked fields, and bounds length. Requests carry a dense decision state, not a full chat transcript by default.

**Do not claim Jev is private or local.** Provenance always sets `remote: true` and `on_device_local: false` for the live TypeSafe provider.

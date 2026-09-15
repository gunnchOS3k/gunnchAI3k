# HUMAN_E6 evaluation harness (Prompt 18)

**Evidence class:** `HUMAN_VALIDATION_PENDING`  
**Accepted main under test (refresh before sessions):** see `PINNED_SHA.txt`.

This package is **executable protocol tooling** only. It does **not** set `HUMAN_E6=true`.
Wave003 digital results remain separate and insufficient for human pass.

## Contents
- `PROTOCOL.md` — participant criteria, tasks, metrics, consent, rubric, stop conditions
- `schemas/HUMAN_E6_RESULT.schema.json` — result schema
- `templates/ISSUE_TEMPLATE.md` — defect / session issue template
- `templates/RESULT_TEMPLATE.json` — blank result to copy
- `scripts/validate_human_e6_result.py` — schema-ish validator (stdlib only)

## Owner actions
1. Recruit adult evaluators.
2. Run protocol against current SHA.
3. Validate JSON; file results under `evals/human_e6/results/` (gitignored samples OK).
4. Only owner may flip `HUMAN_E6` in release packets after pass bar.

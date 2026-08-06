# WAIKE research-ops integration hints (read-only)

Supporting repository: `waike-research-ops`

Gate 1 smoke uses approved **local fixtures** under `fixtures/local-runtime/` so offline tests do not require cloning curriculum corpora.

Suggested future wiring:

1. Map fixture `source_id` paths to public WAIKE knowledge maps when expanding beyond smoke fixtures.
2. Keep source grounding prefixes aligned with `src/tutor/sourcePolicy.ts` (`waike-research-ops/`, `knowledge/`, …).
3. Never treat fixture-backed deterministic text as a trained LLM completion in student-facing disclosures.

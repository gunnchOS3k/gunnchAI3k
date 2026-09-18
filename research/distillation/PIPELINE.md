# Distillation research pipeline (design only — DO NOT TRAIN)

## Stages

1. **Collect** — task traces with TaskState v2 continuity fields (no hidden CoT).
2. **Filter** — drop unsafe, injected, or permission-escalating traces.
3. **Schema validate** — structured outputs + verifier outcomes required.
4. **Split** — train/val/test by task suite; leakage checks across splits.
5. **Export** — datasets for future local student models (not executed here).

## Leakage checks

- No identical `objective+tool_outputs` across train/test.
- No user long-term memory in public exports.
- Untrusted retrieval text never labeled as system policy.

# WAIKE → gunnchAI3k journey

Supporting education workload: a learner (or instructor) starts from **waike-research-ops** course packages and is routed into gunnchAI3k modes. This is **not** an extra dissertation paper.

## Reality labels

| Step | Implementation | Label |
|---|---|---|
| Resolve WAIKE root | `src/waike-mastery/contract.ts` `resolveWaikeRoot` | **REAL** (env, sibling, or nested spine path) |
| Discover digital-RC courses | `discoverCoursesFromContract` reads `curriculum/digital_rc/*/course.json` | **REAL** when sibling present; else skip |
| Learner cannot read answer keys | `LEARNER_TUTOR` in `src/waike-mastery/modes.ts` | **REAL** permission split |
| Isolated grade after submission | `src/waike-mastery/grader_bridge.ts` spawns WAIKE Python | **REAL** bridge; needs sibling + Python |
| Discord `/waike lesson` body | `src/tutor/discordInteractionRouter.ts` | **MOCK** — not a `course.json` loader |
| Tutor cards list | `src/tutor/waikeTutorCards.ts` | **MOCK** — hardcoded two cards |
| Curriculum index | `src/tutor/curriculumIndex.ts` | **MOCK** — one hardcoded id |
| Skill keyword route | `src/tutor/skillRouter.ts` | **KEYWORD MOCK** of domain routing |
| Gate 1 tutoring text | `fixtures/local-runtime/documents/tutoring-basics.md` | **FIXTURE** (approved subset, not live WAIKE) |

## Automated walk

```bash
npm run test:journeys
```

The test asserts the permission split and labels mocks. Live discovery is skipped (not failed) when `waike-research-ops` is absent.

Manual instructor walk: EDUCATOR_COPILOT may read keys; `mayPublishGradesWithoutHuman` stays false (`hitlGradingRequired`).

## Blockers

- `HUMAN_QA_PENDING`: live Discord `/waike` against a real guild
- Mastery PASS tokens stay false unless the real-runtime family is earned (`src/waike-mastery/tokens.ts`)
- No transcripts, grades, or PII in this git tree

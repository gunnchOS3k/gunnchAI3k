# Jaelysa — AI Security & Reliability Sprint

**Role title:** AI Security & Reliability Project Collaborator  
**Repository:** [gunnchOS3k/gunnchAI3k](https://github.com/gunnchOS3k/gunnchAI3k)  
**Mentor track:** gunnchOS3k MLV  
**Milestone:** Jaelysa Career-Fair Ready Sprint  
**Project board:** Jaelysa — AI Security & Reliability Sprint

## Purpose

This 6-week apprenticeship helps Jaelysa build career-fair-ready experience in AI security, model reliability, prompt-injection testing, threat modeling, and secure configuration — using real GitHub issues, pull requests, and documentation artifacts in an open-source AI academic assistant.

## Time expectation

**3–5 hours per week**, asynchronous. Work is tracked on GitHub Issues and the project board. Weekly check-ins use the mentorship templates in `docs/mentorship/`.

## 6-week plan

| Week | Focus | Primary issues | Outcomes |
|------|-------|----------------|----------|
| **1** | GitHub onboarding & sprint structure | #1 Onboarding, #11 Weekly check-in template | Repo setup documented, contributor profile PR, sprint tracker in place |
| **2** | Model training literacy & responsible AI docs | #2 Model-training walkthrough, #7 Model/system card templates | Beginner training walkthrough, model card templates with example |
| **3** | Reliability & threat modeling | #3 Reliability checklist & failure catalog, #4 Threat model | Repo-specific failure cases, STRIDE-style risk register |
| **4** | Prompt injection & secure configuration | #5 Prompt-injection test library, #6 Secure config audit | 20+ defensive test cases, `SECURITY.md` / env guidance |
| **5** | Validation & optional stretch coding | #8 AI security test plan, #10 Stretch safe-response evaluator (optional) | Repeatable test plan mapped to npm scripts |
| **6** | Portfolio & career-fair readiness | #9 Case study, #12 Final review package | Case study, resume bullets, 30-second pitch, pinned repo story |

## Issue roadmap

Issues are labeled `jaelysa-track` and grouped by theme:

| # | Issue | Theme | Difficulty |
|---|-------|-------|------------|
| 1 | [Jaelysa Onboarding] Contributor profile, setup, and learning goals | Onboarding | Beginner |
| 2 | [AI Foundation] Create a beginner model-training walkthrough notebook | Model training | Beginner |
| 3 | [AI Reliability] Create AI reliability checklist and failure-case catalog | Reliability | Beginner–intermediate |
| 4 | [Threat Modeling] Create gunnchAI3k AI assistant threat model | Security | Intermediate |
| 5 | [Prompt Injection] Build prompt-injection test case library | Security / testing | Intermediate |
| 6 | [Secure Config] Audit secrets, environment variables, and safe setup docs | Security hardening | Intermediate |
| 7 | [Model Card] Create model card and AI system card templates | Documentation | Beginner |
| 8 | [Testing] Add AI security and reliability test plan | Testing | Intermediate |
| 9 | [Portfolio] Build Jaelysa's AI security case study | Portfolio | Beginner |
| 10 | [Stretch] Prototype safe-response evaluator for gunnchAI3k outputs | Stretch coding | Advanced |
| 11 | [Mentor Review] Weekly check-in template and sprint tracker | Mentorship | Beginner |
| 12 | [Final Review] Career-fair readiness package | Portfolio / review | Beginner |

**Suggested order:** 1 → 11 → 2 → 7 → 3 → 4 → 5 → 6 → 8 → (10) → 9 → 12

## Mentor expectations (Edmund / gunnchOS3k MLV)

- Review PRs within **3–5 business days** when labeled `mentor-review`.
- Leave constructive feedback focused on clarity, safety, and learning — not perfection on the first pass.
- Move issues on the project board during weekly check-ins: **Backlog → Ready → In Progress → Review → Done**.
- Unblock environment setup (Discord tokens, API keys) without sharing production secrets in chat or commits.
- Confirm defensive security framing: document risks and mitigations; do not publish exploit recipes.
- Help Jaelysa connect completed work to resume bullets and recruiter-friendly language.

## Jaelysa expectations

- Comment on assigned issues with progress, blockers, and PR links.
- Open **small, focused PRs** (one issue per PR when possible).
- Never commit secrets, tokens, or real student data.
- Ask questions in issue threads; use the weekly check-in template.
- Aim for **at least 2 meaningful merged PRs** before the final review issue.
- Complete the case study and career-fair package even if stretch goals are skipped.

## Final outcomes

By the end of the sprint, Jaelysa should have:

1. **GitHub contributions** — merged PRs with documentation, checklists, test plans, and/or security artifacts
2. **Case study** — `docs/portfolio/jaelysa-ai-security-case-study.md` (recruiter-readable)
3. **Demo or walkthrough** — short Loom/screenshot walkthrough of threat model, prompt-injection tests, or reliability checklist (optional but recommended)
4. **Resume bullets** — 3 bullets tied to real repo links
5. **Career fair pitch** — 30-second spoken intro using STAR format

## Related files

- Project board workflow: [`JAELYSA_PROJECT_BOARD_WORKFLOW.md`](./JAELYSA_PROJECT_BOARD_WORKFLOW.md)
- Setup script: [`scripts/create-jaelysa-ai-security-board.sh`](../../scripts/create-jaelysa-ai-security-board.sh)
- AI security docs (to be created via issues): `docs/ai-security/`
- Portfolio docs (to be created via issues): `docs/portfolio/`

## How to bootstrap GitHub tracking

From the repo root, after reviewing the script:

```bash
# If gh lacks project scope:
gh auth refresh -s project

# Dry review (no GitHub writes):
bash -n scripts/create-jaelysa-ai-security-board.sh

# Create labels, milestone, issues, and project (live):
bash scripts/create-jaelysa-ai-security-board.sh
```

> **Note:** Issue numbers in this doc are placeholders until the bootstrap script is run.

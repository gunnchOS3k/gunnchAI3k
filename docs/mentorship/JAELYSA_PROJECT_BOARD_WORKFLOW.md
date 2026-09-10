# Jaelysa Project Board Workflow

**Project:** Jaelysa — AI Security & Reliability Sprint  
**Repository:** [gunnchOS3k/gunnchAI3k](https://github.com/gunnchOS3k/gunnchAI3k)  
**Milestone:** Jaelysa Career-Fair Ready Sprint

This document describes how Edmund (mentor) and Jaelysa should use the GitHub Project board statuses during the 6-week AI Security & Reliability apprenticeship.

## Board columns / statuses

| Status | Meaning | Who moves it | Typical signals |
|--------|---------|--------------|-----------------|
| **Backlog** | Planned work, not started this week | Mentor | Issue exists, acceptance criteria understood |
| **Ready** | Unblocked; Jaelysa can start | Mentor | Environment works, dependencies merged, time allocated |
| **In Progress** | Active work | Jaelysa | Branch open, draft PR, or issue comment with WIP notes |
| **Review** | PR open or doc ready for mentor review | Jaelysa | PR linked in issue; label `mentor-review` if needed |
| **Done** | Accepted and merged or explicitly complete | Mentor | PR merged or issue closed with summary comment |

## Status flow

```text
Backlog → Ready → In Progress → Review → Done
                ↑___________________|
                   (rework loop)
```

If mentor review requests changes, move the item back to **In Progress** until the PR is updated, then return to **Review**.

## Issue order (recommended backlog → ready queue)

Use this order when promoting issues from **Backlog** to **Ready**:

1. `[Jaelysa Onboarding] Contributor profile, setup, and learning goals`
2. `[Mentor Review] Weekly check-in template and sprint tracker`
3. `[AI Foundation] Create a beginner model-training walkthrough notebook`
4. `[Model Card] Create model card and AI system card templates`
5. `[AI Reliability] Create AI reliability checklist and failure-case catalog`
6. `[Threat Modeling] Create gunnchAI3k AI assistant threat model`
7. `[Prompt Injection] Build prompt-injection test case library`
8. `[Secure Config] Audit secrets, environment variables, and safe setup docs`
9. `[Testing] Add AI security and reliability test plan`
10. `[Stretch] Prototype safe-response evaluator for gunnchAI3k outputs` *(optional)*
11. `[Portfolio] Build Jaelysa's AI security case study`
12. `[Final Review] Career-fair readiness package`

## Weekly rhythm (3–5 hours async)

### Jaelysa

- Pick the top **Ready** issue (or continue **In Progress**).
- Comment on the issue: goal for the week, files touched, blockers.
- Open a PR early (draft is fine) and link it in the issue.
- Move issue to **Review** when ready for mentor feedback.
- Fill in `docs/mentorship/JAELYSA_WEEKLY_CHECKIN_TEMPLATE.md` copy for the week.

### Edmund (mentor)

- During check-in, move completed work to **Done**.
- Promote the next 1–2 issues to **Ready**.
- Review PRs labeled `mentor-review` or in **Review**.
- Keep stretch goal (#10) in **Backlog** until core security docs are underway.

## Labels to watch

| Label | Use on board |
|-------|----------------|
| `jaelysa-track` | All sprint issues |
| `good-first-task` | Safe to mark **Ready** in week 1 |
| `beginner-friendly` | Prioritize early in sprint |
| `mentor-review` | Should be in **Review** column |
| `stretch-goal` | Keep in **Backlog** until week 5+ |
| `career-fair-ready` | Week 6 focus; tie to issues #9 and #12 |
| `portfolio-outcome` | Link to case study / final package |

## Setting status in GitHub Projects v2

If the bootstrap script created a **Status** single-select field:

1. Open the project: **Jaelysa — AI Security & Reliability Sprint**
2. Use the board or table view
3. Set **Status** per the table above

If status automation was not configured (missing `project` token scope), run:

```bash
gh auth refresh -s project
bash scripts/create-jaelysa-ai-security-board.sh
```

Or set statuses manually in the GitHub UI — the columns above are the source of truth.

## Definition of Done (per issue)

An issue moves to **Done** when:

- All acceptance criteria in the issue body are met
- A PR is merged (or mentor approves doc-only delivery)
- The issue has a closing comment summarizing what shipped and where files live
- Resume-outcome bullet is copied into the weekly check-in or case study draft

## Career-fair checkpoint (week 6)

Before closing `[Final Review] Career-fair readiness package`, confirm on the board:

- At least **2 issues** in **Done** with merged PRs
- **Portfolio** and **Final Review** issues in **Review** or **Done**
- Case study links to real issue/PR URLs
- One GitHub repo or project pinned for recruiter demos

## Automation notes

The script `scripts/create-jaelysa-ai-security-board.sh`:

- Creates the project and links it to `gunnchOS3k/gunnchAI3k`
- Adds all sprint issues to the project
- Attempts to create a **Status** field with: Backlog, Ready, In Progress, Review, Done
- Sets new items to **Backlog** when field IDs are available

If field automation fails, manual status updates in the Projects UI are sufficient — this workflow doc remains authoritative.

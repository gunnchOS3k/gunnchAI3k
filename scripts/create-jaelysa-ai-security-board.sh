#!/usr/bin/env bash
# Create Jaelysa AI Security & Reliability sprint labels, milestone, issues, and project board.
# Idempotent: safe to re-run; skips existing labels, milestone, issues, and project when found.
#
# Usage (from repo root):
#   bash scripts/create-jaelysa-ai-security-board.sh
#
# Requires: gh CLI authenticated with repo scope; project scope for board automation:
#   gh auth refresh -s project

set -euo pipefail

OWNER="gunnchOS3k"
REPO="gunnchAI3k"
REPO_FULL="gunnchOS3k/gunnchAI3k"
PROJECT_TITLE="Jaelysa — AI Security & Reliability Sprint"
MILESTONE_TITLE="Jaelysa Career-Fair Ready Sprint"
MILESTONE_DESCRIPTION="6-week AI security and reliability apprenticeship sprint for Jaelysa focused on model training literacy, prompt-injection testing, threat modeling, AI reliability, secure configuration, and portfolio-ready GitHub contributions."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
WORKFLOW_DOC="${REPO_ROOT}/docs/mentorship/JAELYSA_PROJECT_BOARD_WORKFLOW.md"

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${BLUE}[INFO]${NC} $*" >&2; }
ok()    { echo -e "${GREEN}[OK]${NC} $*" >&2; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*" >&2; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

require_gh() {
  if ! command -v gh >/dev/null 2>&1; then
    error "GitHub CLI (gh) is required but not installed."
    exit 1
  fi
  if ! command -v jq >/dev/null 2>&1; then
    error "jq is required for project field automation."
    exit 1
  fi
}

check_auth() {
  info "Checking gh authentication..."
  if ! gh auth status >/dev/null 2>&1; then
    error "gh is not authenticated. Run: gh auth login"
    exit 1
  fi
  ok "gh authenticated"
  info "Verifying repository access..."
  gh repo view "${REPO_FULL}" >/dev/null
  ok "Repository ${REPO_FULL} is accessible"
}

has_project_scope() {
  local scopes
  scopes="$(gh auth status -t 2>&1 | sed -n 's/.*Token scopes: //p' | head -1 || true)"
  [[ "${scopes}" == *"project"* ]]
}

label_exists() {
  local name="$1"
  gh label list --repo "${REPO_FULL}" --limit 200 --json name --jq ".[] | select(.name==\"${name}\") | .name" | grep -q .
}

create_label() {
  local name="$1"
  local color="$2"
  local description="$3"
  if label_exists "${name}"; then
    info "Label exists: ${name}"
    return 0
  fi
  gh label create "${name}" --repo "${REPO_FULL}" --color "${color}" --description "${description}"
  ok "Created label: ${name}"
}

create_labels() {
  info "Creating labels (idempotent)..."
  create_label "jaelysa-track"        "B60205" "Work items for Jaelysa's AI security & reliability apprenticeship track"
  create_label "ai-security"          "D93F0B" "AI security topics: threats, mitigations, and defensive controls"
  create_label "reliability"          "0E8A16" "AI reliability, failure modes, and safe assistant behavior"
  create_label "prompt-injection"     "E99695" "Prompt-injection testing and safe-response expectations"
  create_label "threat-modeling"      "5319E7" "Threat modeling and risk registers for gunnchAI3k"
  create_label "model-training"       "1D76DB" "Model training literacy and evaluation concepts"
  create_label "documentation"        "0075CA" "Documentation deliverables and templates"
  create_label "beginner-friendly"    "C2E0C6" "Suitable for early apprenticeship contributors"
  create_label "portfolio-outcome"    "FEF2C0" "Produces resume or portfolio artifacts"
  create_label "good-first-task"      "7057FF" "Good first task for new contributors"
  create_label "mentor-review"        "FBCA04" "Needs mentor review before merge or close"
  create_label "stretch-goal"         "D4C5F9" "Optional advanced stretch work"
  create_label "github-onboarding"    "BFD4F2" "GitHub workflow and repo onboarding"
  create_label "security-hardening"   "B60205" "Secure configuration and hardening improvements"
  create_label "testing"              "F9D0C4" "Testing plans, cases, and validation work"
  create_label "career-fair-ready"    "0E8A16" "Career-fair and recruiter-ready deliverables"
}

get_milestone_number() {
  gh api "repos/${REPO_FULL}/milestones" --paginate \
    --jq ".[] | select(.title==\"${MILESTONE_TITLE}\") | .number" | head -1
}

create_milestone() {
  info "Creating milestone (idempotent)..."
  local number
  number="$(get_milestone_number || true)"
  if [[ -n "${number}" ]]; then
    ok "Milestone exists: #${number} ${MILESTONE_TITLE}"
    echo "${number}"
    return 0
  fi
  number="$(gh api "repos/${REPO_FULL}/milestones" \
    -f title="${MILESTONE_TITLE}" \
    -f description="${MILESTONE_DESCRIPTION}" \
    -f state="open" \
    --jq '.number')"
  ok "Created milestone: #${number} ${MILESTONE_TITLE}"
  echo "${number}"
}

find_issue_number_by_title() {
  local title="$1"
  gh issue list --repo "${REPO_FULL}" --state all --limit 500 \
    --json number,title \
    --jq ".[] | select(.title==\"${title}\") | .number" | head -1
}

create_issue_if_missing() {
  local title="$1"
  local labels_csv="$2"
  local body="$3"

  local existing
  existing="$(find_issue_number_by_title "${title}" || true)"
  if [[ -n "${existing}" ]]; then
    info "Issue exists: #${existing} — ${title}"
    echo "${existing}"
    return 0
  fi

  local number
  number="$(gh issue create \
    --repo "${REPO_FULL}" \
    --title "${title}" \
    --label "${labels_csv}" \
    --milestone "${MILESTONE_TITLE}" \
    --body "${body}" \
    | sed -n 's|.*/issues/\([0-9]*\).*|\1|p')"
  ok "Created issue: #${number} — ${title}"
  echo "${number}"
}

# --- Issue bodies -----------------------------------------------------------

body_issue_01() {
  cat <<'EOF'
## Purpose

Get Jaelysa comfortable with the **gunnchAI3k** repository and GitHub workflow while documenting her learning goals in AI security, cybersecurity, model training, and reliable AI systems.

## Tasks

- [ ] Fork or clone the repository
- [ ] Confirm Node.js version (18+ per README)
- [ ] Run `npm install`
- [ ] Run `npm run build` if possible
- [ ] Run `npm test` if possible
- [ ] Create a contributor profile markdown file
- [ ] Add learning goals around AI, cybersecurity, model training, and reliable systems
- [ ] Open at least one small PR (profile or setup notes)

## Suggested file

`docs/contributors/jaelysa-ai-security-reliability-profile.md`

## Acceptance criteria

- [ ] Setup notes are documented (what worked, versions, any blockers)
- [ ] Contributor profile exists with learning goals
- [ ] At least one small PR is opened and linked in this issue

## Resume outcome

> Completed onboarding into an open-source AI assistant project, documenting setup, tooling, learning goals, and first GitHub contribution.

## Notes

- Do **not** commit secrets or real API tokens.
- Ask questions in this issue thread; tag mentor for `mentor-review` when ready.
EOF
}

body_issue_02() {
  cat <<'EOF'
## Purpose

Help Jaelysa understand the code and concepts behind training an AI/ML model — train/test split, features, labels, training, evaluation, and common failure cases — in beginner-friendly language.

## Tasks

- [ ] Create a simple notebook or TypeScript/Python walkthrough explaining:
  - Train/test split
  - Features and labels
  - Training loop (high level)
  - Evaluation metrics
  - Failure cases
- [ ] Use a small safe public/demo dataset or synthetic data (no private student data)
- [ ] Explain **accuracy**, **precision**, **recall**, **false positives**, and **false negatives**
- [ ] Add comments written for a beginner reader

## Suggested files

- `docs/ai-security/model-training-intro.md`
- `notebooks/model_training_intro.ipynb` **OR** `examples/model-training-intro/`

## Acceptance criteria

- [ ] A beginner can follow the walkthrough and explain how a basic model is trained
- [ ] Evaluation metrics are defined with plain-language examples
- [ ] At least 3 failure cases are documented (e.g., overfitting, label noise, imbalanced classes)

## Resume outcome

> Built and documented a beginner machine-learning training workflow with evaluation metrics and failure-case analysis.

## Checklist for PR

- [ ] No large binary datasets committed
- [ ] Links to any external datasets cited
- [ ] Runnable instructions in the doc README section
EOF
}

body_issue_03() {
  cat <<'EOF'
## Purpose

Define what **reliable behavior** means for gunnchAI3k as an academic AI study assistant, and give maintainers a practical pre-ship checklist.

## Tasks

- [ ] Identify likely failure cases for gunnchAI3k, including at minimum:
  - Hallucinated academic answers
  - Unsafe study guidance
  - Poor or missing citations
  - File parsing errors
  - Prompt misunderstanding
  - Emotional tone mismatch
  - Privacy leakage
- [ ] Create a maintainer checklist before shipping AI features
- [ ] Assign severity levels: **low**, **medium**, **high**, **critical**
- [ ] For each failure case, document a **detection method** and **mitigation idea**

## Suggested files

- `docs/ai-security/AI_RELIABILITY_CHECKLIST.md`
- `docs/ai-security/AI_FAILURE_CASE_CATALOG.md`

## Acceptance criteria

- [ ] Checklist is practical and repo-specific (references gunnchAI3k flows: Discord, uploads, model calls)
- [ ] At least **15** failure cases documented in the catalog
- [ ] Each failure case has severity, detection method, and mitigation

## Resume outcome

> Created an AI reliability checklist and failure-case catalog for an academic AI assistant system.

## Table template (failure catalog)

| ID | Failure case | Severity | Detection | Mitigation | Owner hint |
|----|--------------|----------|-----------|------------|------------|
| F-01 | ... | high | ... | ... | tutor/safety |
EOF
}

body_issue_04() {
  cat <<'EOF'
## Purpose

Connect cybersecurity concepts to the **gunnchAI3k** architecture: Discord bot, model APIs, file uploads, music integrations, and logging.

## Tasks

- [ ] Identify **assets**, including:
  - API keys (OpenAI, Gemini, Wolfram, Perplexity)
  - Discord bot token
  - User messages and uploaded files
  - Generated study materials
  - Logs and model outputs
  - Student-related data (handle carefully — no real PII in repo)
  - Music service credentials (Spotify, Apple Music)
- [ ] Identify **trust boundaries**: Discord, local env, external APIs, uploads, model calls, cache/DB, logs
- [ ] Identify **attackers / threats**: malicious Discord user, compromised dependency, leaked token, prompt-injection attacker, accidental misuse, insider/admin mistake
- [ ] Create a risk table with **impact**, **likelihood**, and **mitigation**
- [ ] Optionally structure threats using **STRIDE**

## Suggested files

- `docs/ai-security/THREAT_MODEL.md`
- `docs/ai-security/AI_SECURITY_RISK_REGISTER.md`

## Acceptance criteria

- [ ] At least **10** repo-specific threats documented
- [ ] Each threat has mitigation and a verification idea (how would we know it works?)
- [ ] Sensitive data handling and secret storage are explicitly addressed

## Resume outcome

> Developed a threat model and AI security risk register for a Discord-based AI assistant.

## Risk register template

| ID | Threat | Asset | STRIDE (optional) | Impact | Likelihood | Mitigation | Verification |
|----|--------|-------|-------------------|--------|------------|------------|--------------|
| T-01 | ... | Discord token | Spoofing | critical | medium | ... | ... |
EOF
}

body_issue_05() {
  cat <<'EOF'
## Purpose

Document and test ways users may try to **manipulate gunnchAI3k** through prompts — for defensive testing only. No harmful exploit instructions beyond safe, educational examples.

## Tasks

- [ ] Create benign prompt-injection examples appropriate for an **academic assistant**
- [ ] Include attempts to:
  - Override system behavior
  - Reveal secrets or environment details
  - Ignore academic integrity rules
  - Fabricate citations
  - Mishandle uploaded content
  - Expose private data
- [ ] Define **expected safe behavior** for each test
- [ ] Add a table: test name, attack goal, sample prompt, risk, expected safe response, notes
- [ ] Optionally add `tests/security/prompt-injection-cases.test.ts` as a fixture list (no live API calls required initially)

## Suggested files

- `docs/ai-security/PROMPT_INJECTION_TESTS.md`
- `tests/security/prompt-injection-cases.test.ts` (if appropriate)

## Acceptance criteria

- [ ] At least **20** test cases documented
- [ ] No harmful exploit instructions — defensive framing only
- [ ] Each test has expected safe behavior and risk level

## Resume outcome

> Designed prompt-injection test cases and expected safe-response criteria for an AI assistant.

## Safety note

Sample prompts should be **red-team style but educational**. Do not include instructions for stealing real credentials or attacking third-party services.
EOF
}

body_issue_06() {
  cat <<'EOF'
## Purpose

Ensure the repository does **not** encourage unsafe secret handling. Document required environment variables and safer setup guidance for all integrations.

## Tasks

- [ ] Review README setup instructions
- [ ] Review `.env.example` if present
- [ ] Confirm real tokens/API keys are not committed (search history if needed — report to mentor, do not paste secrets)
- [ ] Document required environment variables
- [ ] Add safer guidance for:
  - Discord bot token
  - OpenAI key
  - Gemini key
  - Wolfram key
  - Perplexity key
  - Spotify credentials
  - Apple Music credentials
  - Other third-party API keys used by the repo
- [ ] Add a prominent **"never commit secrets"** warning
- [ ] Create or update `SECURITY.md`

## Suggested files

- `docs/security/SECURE_CONFIGURATION.md`
- `.env.example` (if missing or incomplete)
- `SECURITY.md` (if missing)

## Acceptance criteria

- [ ] Secret-handling guidance is clear and beginner-friendly
- [ ] Required environment variables are documented with purpose (not example real values)
- [ ] `SECURITY.md` exists or is updated with reporting/contact guidance

## Resume outcome

> Improved secure configuration documentation for an AI assistant using multiple API integrations.

## PR checklist

- [ ] No real secrets in diff
- [ ] `.env` remains gitignored
- [ ] Mentor review requested (`mentor-review` label)
EOF
}

body_issue_07() {
  cat <<'EOF'
## Purpose

Teach **responsible AI documentation** by creating model card and AI system card templates tailored to gunnchAI3k features.

## Tasks

- [ ] Create `MODEL_CARD_TEMPLATE.md` (for ML/model components)
- [ ] Create `AI_SYSTEM_CARD_TEMPLATE.md` (for end-to-end assistant features)
- [ ] Include sections: intended use, limitations, evaluation, risks, data notes, privacy notes, failure modes, responsible use
- [ ] Fill out an **example** card for a simple model-training demo (can reference Issue #2 artifact)

## Suggested files

- `docs/ai-security/MODEL_CARD_TEMPLATE.md`
- `docs/ai-security/AI_SYSTEM_CARD_TEMPLATE.md`
- `docs/ai-security/examples/simple-model-card-example.md`

## Acceptance criteria

- [ ] Templates are beginner-friendly with prompts/questions in each section
- [ ] Templates are useful for future gunnchAI3k AI features
- [ ] At least one example card is fully filled out

## Resume outcome

> Created model-card and AI system-card templates to document intended use, limitations, risks, and evaluation of AI features.
EOF
}

body_issue_08() {
  cat <<'EOF'
## Purpose

Turn security and reliability documentation into a **repeatable validation plan** mapped to this repository's npm scripts and folder structure.

## Tasks

- [ ] Review existing `npm` scripts in `package.json`
- [ ] Identify where security/reliability tests should live
- [ ] Draft test categories:
  - Unit
  - Integration
  - Prompt-injection (fixture-based)
  - File-processing safety
  - Secret handling (static checks)
  - Response safety
  - Citation quality
- [ ] Separate **beginner** tasks (docs/fixtures) from **advanced** tasks (CI automation, live API tests)
- [ ] Propose how to run tests locally and in CI later
- [ ] Add `tests/security/README.md` index

## Suggested files

- `docs/ai-security/AI_SECURITY_TEST_PLAN.md`
- `tests/security/README.md`

## Acceptance criteria

- [ ] Test plan maps to actual repo scripts and directories
- [ ] Beginner vs advanced work is clearly separated
- [ ] Future automation path is documented (even if not implemented yet)

## Resume outcome

> Authored an AI security and reliability test plan for repeatable validation of assistant behavior.
EOF
}

body_issue_09() {
  cat <<'EOF'
## Purpose

Turn Jaelysa's sprint work into a **career-fair-ready** case study recruiters can skim in under 5 minutes.

## Tasks

- [ ] Create a case study covering: project context, problem, her contributions, tools, screenshots (optional), and learnings
- [ ] Write a **30-second career fair pitch**
- [ ] Include **3 resume bullets** linked to real PRs/issues
- [ ] Add a reflection section:
  - What I learned about AI training
  - What I learned about AI reliability
  - What I learned about AI security

## Suggested file

`docs/portfolio/jaelysa-ai-security-case-study.md`

## Acceptance criteria

- [ ] Case study is understandable to a non-technical recruiter
- [ ] Case study links to her PRs and closed issues
- [ ] Resume bullets and pitch are included in the doc

## Resume outcome

> Prepared a career-fair-ready AI security case study explaining threat modeling, reliability testing, prompt-injection risks, and GitHub contributions.

## STAR story prompt

Prepare one **STAR** (Situation, Task, Action, Result) story about finding and documenting a concrete risk in gunnchAI3k.
EOF
}

body_issue_10() {
  cat <<'EOF'
## Purpose

Optional **advanced** task after beginner issues: prototype a simple, explainable evaluator that flags risky patterns in gunnchAI3k AI outputs.

## Tasks

- [ ] Prototype an evaluator (TypeScript utility, test fixture, or design doc first) that checks for:
  - Fabricated citation warning
  - Secret exposure warning
  - Unsupported certainty / overconfidence
  - Academic integrity risk signals
  - Unsafe file handling references
  - Tone mismatch (basic heuristics OK)
- [ ] Keep logic simple and explainable — prefer rules/regex over opaque ML
- [ ] Document limitations clearly

## Suggested files

- `src/security/safe-response-evaluator.ts`
- `tests/security/safe-response-evaluator.test.ts`
- `docs/ai-security/SAFE_RESPONSE_EVALUATOR.md`

## Acceptance criteria

- [ ] Evaluator defines clear categories with examples
- [ ] Tests or documented examples show expected behavior
- [ ] Documentation explains false positives and limitations

## Resume outcome

> Prototyped a safe-response evaluator to flag reliability and security risks in AI assistant outputs.

## Note

This is a **stretch** issue — skip if core documentation issues are not yet complete.
EOF
}

body_issue_11() {
  cat <<'EOF'
## Purpose

Keep the apprenticeship structured when schedules are busy: reusable weekly check-ins and a visible 6-week sprint map.

## Tasks

- [ ] Create a weekly check-in template with sections:
  - What I worked on
  - Blockers
  - What I learned
  - Next step
  - PR/issue links
- [ ] Create a 6-week sprint tracker mapping **Week 1** through **Week 6** to issues and career outcomes
- [ ] Link to `docs/mentorship/JAELYSA_AI_SECURITY_RELIABILITY_SPRINT.md`

## Suggested files

- `docs/mentorship/JAELYSA_WEEKLY_CHECKIN_TEMPLATE.md`
- `docs/mentorship/JAELYSA_6_WEEK_SPRINT_TRACKER.md`

## Acceptance criteria

- [ ] Template is easy to copy each week
- [ ] Six-week sprint is visible with issue references
- [ ] Work maps to career-fair outcomes (case study, resume bullets, pitch)

## Resume outcome

> Participated in a structured AI security mentorship sprint using weekly technical check-ins and GitHub-based project tracking.
EOF
}

body_issue_12() {
  cat <<'EOF'
## Purpose

Ensure Jaelysa leaves the sprint with a **complete package**, not scattered docs — ready for career fairs by fall.

## Tasks

- [ ] Collect links to all merged PRs
- [ ] Collect links to all completed issues
- [ ] Finalize resume bullets (minimum 3)
- [ ] Finalize 30-second pitch
- [ ] Finalize case study (`docs/portfolio/jaelysa-ai-security-case-study.md`)
- [ ] Identify one GitHub repo/project to pin
- [ ] Write one recruiter story using **STAR** format

## Suggested file

`docs/portfolio/jaelysa-career-fair-readiness-package.md`

## Acceptance criteria

- [ ] Final package includes GitHub links, case study, resume bullets, and pitch
- [ ] At least **2** meaningful PRs are merged or ready for review
- [ ] Jaelysa can clearly explain what she contributed in a 60-second conversation

## Resume outcome

> Completed an AI security and reliability portfolio package with GitHub contributions, technical documentation, and recruiter-ready project narrative.

## Mentor sign-off

- [ ] Mentor reviewed package
- [ ] Career-fair talking points approved
EOF
}

create_all_issues() {
  info "Creating issues (idempotent)..."
  local -a issue_numbers=()

  local n
  n="$(create_issue_if_missing \
    "[Jaelysa Onboarding] Contributor profile, setup, and learning goals" \
    "jaelysa-track,github-onboarding,beginner-friendly,good-first-task,portfolio-outcome" \
    "$(body_issue_01)")"
  issue_numbers+=("${n}")

  n="$(create_issue_if_missing \
    "[AI Foundation] Create a beginner model-training walkthrough notebook" \
    "jaelysa-track,model-training,beginner-friendly,portfolio-outcome" \
    "$(body_issue_02)")"
  issue_numbers+=("${n}")

  n="$(create_issue_if_missing \
    "[AI Reliability] Create AI reliability checklist and failure-case catalog" \
    "jaelysa-track,reliability,testing,portfolio-outcome" \
    "$(body_issue_03)")"
  issue_numbers+=("${n}")

  n="$(create_issue_if_missing \
    "[Threat Modeling] Create gunnchAI3k AI assistant threat model" \
    "jaelysa-track,threat-modeling,ai-security,security-hardening,portfolio-outcome" \
    "$(body_issue_04)")"
  issue_numbers+=("${n}")

  n="$(create_issue_if_missing \
    "[Prompt Injection] Build prompt-injection test case library" \
    "jaelysa-track,prompt-injection,ai-security,testing,portfolio-outcome" \
    "$(body_issue_05)")"
  issue_numbers+=("${n}")

  n="$(create_issue_if_missing \
    "[Secure Config] Audit secrets, environment variables, and safe setup docs" \
    "jaelysa-track,ai-security,security-hardening,documentation,mentor-review" \
    "$(body_issue_06)")"
  issue_numbers+=("${n}")

  n="$(create_issue_if_missing \
    "[Model Card] Create model card and AI system card templates" \
    "jaelysa-track,model-training,reliability,documentation,portfolio-outcome" \
    "$(body_issue_07)")"
  issue_numbers+=("${n}")

  n="$(create_issue_if_missing \
    "[Testing] Add AI security and reliability test plan" \
    "jaelysa-track,testing,ai-security,reliability,mentor-review" \
    "$(body_issue_08)")"
  issue_numbers+=("${n}")

  n="$(create_issue_if_missing \
    "[Portfolio] Build Jaelysa's AI security case study" \
    "jaelysa-track,portfolio-outcome,documentation,career-fair-ready" \
    "$(body_issue_09)")"
  issue_numbers+=("${n}")

  n="$(create_issue_if_missing \
    "[Stretch] Prototype safe-response evaluator for gunnchAI3k outputs" \
    "jaelysa-track,stretch-goal,ai-security,reliability,testing" \
    "$(body_issue_10)")"
  issue_numbers+=("${n}")

  n="$(create_issue_if_missing \
    "[Mentor Review] Weekly check-in template and sprint tracker" \
    "jaelysa-track,documentation,mentor-review,career-fair-ready" \
    "$(body_issue_11)")"
  issue_numbers+=("${n}")

  n="$(create_issue_if_missing \
    "[Final Review] Career-fair readiness package" \
    "jaelysa-track,portfolio-outcome,career-fair-ready,mentor-review" \
    "$(body_issue_12)")"
  issue_numbers+=("${n}")

  printf '%s\n' "${issue_numbers[@]}"
}

find_project_number() {
  gh project list --owner "${OWNER}" --limit 100 --format json 2>/dev/null \
    | jq -r ".projects[]? // .[]? | select(.title==\"${PROJECT_TITLE}\") | .number" \
    | head -1
}

create_or_get_project() {
  if ! has_project_scope; then
    warn "GitHub token lacks 'project' scope."
    warn "Run: gh auth refresh -s project"
    echo ""
    return 1
  fi

  local project_number
  project_number="$(find_project_number || true)"
  if [[ -z "${project_number}" ]]; then
    info "Creating project: ${PROJECT_TITLE}"
    project_number="$(gh project create --owner "${OWNER}" --title "${PROJECT_TITLE}" --format json --jq '.number')"
    ok "Created project #${project_number}"
  else
    ok "Project exists: #${project_number} — ${PROJECT_TITLE}"
  fi

  info "Linking project to repository..."
  gh project link "${project_number}" --owner "${OWNER}" --repo "${REPO}" >/dev/null 2>&1 || true

  echo "${project_number}"
}

add_issues_to_project() {
  local project_number="$1"
  shift
  local -a issue_numbers=("$@")

  info "Adding issues to project #${project_number}..."
  local num url
  for num in "${issue_numbers[@]}"; do
    [[ -z "${num}" ]] && continue
    url="https://github.com/${REPO_FULL}/issues/${num}"
    if gh project item-add "${project_number}" --owner "${OWNER}" --url "${url}" >/dev/null 2>&1; then
      ok "Added issue #${num} to project"
    else
      warn "Could not add issue #${num} (may already be on project)"
    fi
  done
}

setup_project_status_field() {
  local project_number="$1"
  info "Configuring Status field on project #${project_number}..."

  local fields_json
  fields_json="$(gh project field-list "${project_number}" --owner "${OWNER}" --format json 2>/dev/null || echo '{"fields":[]}')"

  local status_field_id
  status_field_id="$(echo "${fields_json}" | jq -r '.fields[] | select(.name=="Status") | .id' | head -1)"

  if [[ -z "${status_field_id}" ]]; then
    gh project field-create "${project_number}" --owner "${OWNER}" \
      --name "Status" \
      --data-type "SINGLE_SELECT" \
      --single-select-options "Backlog,Ready,In Progress,Review,Done" >/dev/null 2>&1 || {
        warn "Could not create Status field automatically."
        return 1
      }
    fields_json="$(gh project field-list "${project_number}" --owner "${OWNER}" --format json)"
    status_field_id="$(echo "${fields_json}" | jq -r '.fields[] | select(.name=="Status") | .id' | head -1)"
  fi

  local project_id backlog_option_id
  project_id="$(gh project view "${project_number}" --owner "${OWNER}" --format json --jq '.id' 2>/dev/null || true)"
  backlog_option_id="$(echo "${fields_json}" | jq -r '.fields[] | select(.name=="Status") | .options[]? | select(.name=="Backlog") | .id' | head -1)"

  if [[ -z "${project_id}" || -z "${status_field_id}" || -z "${backlog_option_id}" ]]; then
    warn "Status field automation incomplete — use ${WORKFLOW_DOC}"
    return 1
  fi

  ok "Status field ready (Backlog, Ready, In Progress, Review, Done)"
  echo "${project_id}|${status_field_id}|${backlog_option_id}"
}

ensure_workflow_doc() {
  if [[ -f "${WORKFLOW_DOC}" ]]; then
    ok "Workflow doc present: ${WORKFLOW_DOC}"
  else
    warn "Missing workflow doc: ${WORKFLOW_DOC}"
    warn "Create docs/mentorship/JAELYSA_PROJECT_BOARD_WORKFLOW.md before mentoring."
  fi
}

print_summary() {
  local -a issue_numbers=("$@")
  echo ""
  echo "========================================"
  echo " Jaelysa AI Security Sprint — Summary"
  echo "========================================"
  echo "Repository:     ${REPO_FULL}"
  echo "Milestone:      ${MILESTONE_TITLE}"
  echo "Project board:  ${PROJECT_TITLE}"
  echo "Workflow doc:   ${WORKFLOW_DOC}"
  echo ""
  echo "Labels (16):"
  echo "  jaelysa-track, ai-security, reliability, prompt-injection,"
  echo "  threat-modeling, model-training, documentation, beginner-friendly,"
  echo "  portfolio-outcome, good-first-task, mentor-review, stretch-goal,"
  echo "  github-onboarding, security-hardening, testing, career-fair-ready"
  echo ""
  echo "Issues (${#issue_numbers[@]}):"
  local num
  for num in "${issue_numbers[@]}"; do
    echo "  https://github.com/${REPO_FULL}/issues/${num}"
  done
  echo ""
  echo "Next: review board at https://github.com/users/${OWNER}/projects"
  echo "========================================"
}

main() {
  require_gh
  check_auth
  ensure_workflow_doc

  create_labels
  create_milestone >/dev/null

  issue_numbers=()
  while IFS= read -r line; do
    [[ -n "${line}" ]] && issue_numbers+=("${line}")
  done < <(create_all_issues)

  local project_number=""
  if project_number="$(create_or_get_project)"; then
    add_issues_to_project "${project_number}" "${issue_numbers[@]}"
    setup_project_status_field "${project_number}" >/dev/null || \
      warn "Set statuses manually — see ${WORKFLOW_DOC}"
  else
    warn "Project board not created. After refreshing auth, re-run this script."
  fi

  print_summary "${issue_numbers[@]}"
}

main "$@"

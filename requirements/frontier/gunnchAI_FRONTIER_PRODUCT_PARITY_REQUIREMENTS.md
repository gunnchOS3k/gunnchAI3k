# gunnchAI Frontier Product Parity Requirements

**Document class:** Competitive gap requirements / expanded definition of done  
**Applies to:** `gunnchAI3k`, `gunnchos-device-os` AI interface, WAIKE, games, Archive, networking, device diagnostics, first-party applications  
**Source basis:** August 2026 comparative analysis of ChatGPT, Claude, Gemini, Microsoft Copilot, and Perplexity.  
**Status:** Normative expansion of the gunnchAI competitive completion bar.  
**Important:** This document does **not** invalidate earlier gunnchAI completion tokens. It establishes a higher frontier-product parity target.

---

## 1. Core doctrine

Historical token:

```text
FULL_GUNNCHAI3K_PLATFORM_DIGITAL_COMPLETE
```

means the previously accepted gunnchAI requirements were digitally implemented.

It does **not** mean gunnchAI is competitive with the strongest AI products.

New bar:

```text
GUNNCHAI_FRONTIER_PRODUCT_PARITY
```

A feature does not earn parity merely because an endpoint exists.

```text
PARITY != FEATURE EXISTS
```

Parity means:

```text
feature works
+ feature is integrated
+ feature is usable
+ feature is evaluated
+ feature competes successfully
```

---

## 2. Current strategic strengths to preserve

The architecture already has meaningful strengths:

```text
local inference
local RAG
model registry
task router
local/cloud policy
governance/privacy
OS ai_interface
WAIKE tutoring
code help
device troubleshooting
accessibility path
game coaching
networking diagnosis
Archive/scientific attribution
translation/workflow/security routes
capability evaluation
```

Do not replace these with a cloud chatbot.

gunnchAI's defensible differentiation should remain:

```text
useful offline
user-owned encrypted memory
same AI across gunnchOS devices
deep OS control
network-aware intelligence
Ring/spatial interaction
education-aware tutoring
hardware troubleshooting
game coaching
Archive scientific assistant
accessibility assistant
connection optimizer
transparent local/cloud routing
```

---

# PART A — MODEL FLEET

## AI-MODEL-001 — Multi-model architecture

The 135M validation model is a useful tiny fallback, not the final intelligence tier.

Target architecture:

```text
gunnchAI Router
    |
    +-- Nano Local
    |     always available
    |     tiny OS/device tasks
    |
    +-- Local Fast
    |     common daily tasks
    |
    +-- Local Pro
    |     deeper reasoning / multimodal
    |
    +-- Specialized Models
    |     speech / vision / embeddings / reranking / coding as justified
    |
    +-- Optional Frontier Cloud
          OpenAI / Anthropic / Google / other supported provider
          user-controlled escalation
```

Exact model sizes/names are not frozen by this requirements document.

---

## AI-MODEL-002 — Replaceable model engines

gunnchAI owns:
- routing;
- orchestration;
- memory;
- privacy;
- permissions;
- RAG;
- tools;
- skills;
- agents;
- OS integration;
- education;
- games;
- network/device intelligence;
- evaluation.

Foundation models remain replaceable engines.

Avoid vendor lock-in at the architecture layer.

---

## AI-MODEL-003 — Automatic model routing

Router decisions may consider:
- task type;
- privacy;
- offline state;
- latency;
- context length;
- device RAM;
- NPU/GPU availability;
- power;
- cost;
- user preference;
- quality target.

Record routing explanation in debug mode.

---

## AI-MODEL-004 — Long context

Implement scalable context handling with:
- direct model context;
- retrieval;
- summarization;
- project memory;
- chunking;
- cache;
- relevance selection.

Do not claim million-token equivalence unless the selected model/runtime actually supports and passes it.

---

# PART B — MEMORY

## AI-MEM-001 — gunnchMemory

Memory is not chat history.

Required memory domains:

```text
USER MEMORY
  preferences
  accessibility
  language
  communication preferences
  learning level
  recurring goals
  explicitly remembered facts

PROJECT MEMORY
  files
  conversations
  decisions
  tasks
  sources
  generated artifacts

LEARNING MEMORY
  mastered concepts
  weak concepts
  evidence
  courses
  assignments
  tutor strategy

DEVICE MEMORY
  display preferences
  input layouts
  Ring calibration
  game controls
  power/performance preferences

WORK MEMORY
  projects
  collaborators
  documents
  routines
```

---

## AI-MEM-002 — User ownership

Users must be able to:

```text
view
edit
delete
pause
export
import
encrypt
project-isolate
opt in/out of cross-device sync
```

No hidden permanent memory.

---

## AI-MEM-003 — Memory correctness

Evaluate:
- incorrect memories;
- stale memories;
- cross-user leakage;
- project leakage;
- deletion compliance;
- contradiction handling;
- provenance of remembered facts.

---

# PART C — PROJECTS / WORKSPACES

## AI-PROJ-001 — Persistent projects

A project contains:

```text
files
instructions
chats
people
tasks
memory
sources
tools
generated artifacts
```

Examples:
- Calculus II;
- thesis;
- game project;
- job search;
- wireless lab;
- business plan.

---

## AI-PROJ-002 — Project-scoped memory

Projects must isolate context unless the user explicitly allows cross-project memory.

---

# PART D — WEB SEARCH / RESEARCH

## AI-SEARCH-001 — Current web search

Required:
- search;
- open/read;
- source attribution;
- date awareness;
- conflicting-source handling;
- citation rendering;
- safety/privacy policy.

Offline mode must clearly state when current web data is unavailable.

---

## AI-RESEARCH-001 — gunnchResearch

A deep research request should support:

```text
understand question
-> research plan
-> search web/databases
-> read sources
-> identify uncertainty
-> search again
-> compare sources
-> run calculations/code
-> synthesize
-> cite
-> generate report
-> follow-up
```

Sources may include:
- web;
- local files;
- WAIKE;
- Archive;
- GitHub;
- research papers;
- 7GC results;
- network telemetry;
- device docs;
- course content.

---

## AI-RESEARCH-002 — Citation integrity

Required:
- citations point to actual sources;
- quoted text traceable;
- unsupported claims identified;
- source freshness recorded;
- source disagreement surfaced;
- scientific provenance preserved.

---

# PART E — AGENT RUNTIME

## AI-AGENT-001 — gunnchAgent Runtime

Required:

```text
planner
task graph
sub-agents
tool execution
browser
shell
files
gunnchOS actions
rollback
approval gates
sandbox
audit trail
interrupt
resume
scheduled work
```

---

## AI-AGENT-002 — Approval boundaries

Actions with meaningful consequence require policy/approval, such as:
- sending messages;
- submitting assignments;
- deleting user files;
- purchasing;
- external publication;
- changing critical device settings;
- installing privileged software.

gunnchAI should complete preparation autonomously while preserving user authority.

---

## AI-AGENT-003 — Computer use

gunnchAI must be able to interact with the actual gunnchOS application environment through supported APIs/accessibility/computer-use tooling.

Do not reduce computer use to hardcoded app-specific demo actions.

---

# PART F — CODE EXECUTION / CODING AGENT

## AI-CODE-001 — Sandboxed execution

Support:
- shell;
- Python;
- project-specific toolchains;
- resource limits;
- network policy;
- filesystem scope;
- timeout;
- logs;
- rollback/cleanup.

---

## AI-CODE-002 — Coding agent

Required workflows:
- inspect repo;
- understand task;
- edit;
- build;
- test;
- diagnose;
- fix;
- explain;
- package;
- stop for approval at merge/deploy boundaries.

The target is substantially beyond one-turn code suggestions.

---

# PART G — MULTIMODAL

## AI-MM-001 — Vision

Understand:
- images;
- screenshots;
- documents;
- charts;
- whiteboards;
- circuit boards;
- error dialogs;
- gameplay;
- network topology;
- lab setups.

---

## AI-MM-002 — Screen awareness

With user permission, gunnchAI can understand the active screen/window to support contextual help.

Examples:
- assignment question;
- compiler error;
- Ring pairing issue;
- Device Manager diagnostics.

---

## AI-MM-003 — Audio understanding

Support:
- speech;
- voice commands;
- transcription;
- audio events where relevant;
- media/context analysis within policy.

---

## AI-MM-004 — Camera context

Camera access must be:
- explicit;
- revocable;
- indicator-visible;
- app/session scoped.

---

# PART H — REAL-TIME VOICE

## AI-VOICE-001

Target:
- full-duplex conversation;
- interruption/barge-in;
- low latency;
- local wake/activation option;
- local ASR;
- local TTS;
- noise suppression;
- screen/app/device context;
- Ring gesture integration.

---

## AI-VOICE-002 — Voice action safety

Voice may prepare high-impact actions but must respect approval boundaries.

---

# PART I — CREATION / ARTIFACTS

## AI-CREATE-001 — First-class artifact generation

gunnchAI must create usable:

```text
DOCX
XLSX
PPTX
PDF
SVG/diagrams
notebooks
websites
applications
reports
code projects
```

through actual application/document tooling.

---

## AI-CREATE-002 — Iterative editing

User should be able to request targeted edits:

> "Make slide 4 clearer."

without regenerating unrelated content.

Track artifact versions.

---

# PART J — CONNECTORS / MCP / SKILLS

## AI-TOOLS-001 — MCP-compatible tool layer

Support an open tool protocol rather than a closed-only connector model.

Required:
- discovery;
- permission;
- schema;
- auth;
- timeout;
- audit;
- revocation.

---

## AI-SKILL-001 — gunnchSkills

Examples:

```text
Wireless Engineering
Cybersecurity Analyst
Math Tutor
Resume Coach
Research Assistant
WAIKE Instructor
Archive Naturalist
Anime Coach
Pedestrian Coach
Beat Link Host
Network Troubleshooter
Device Repair Assistant
6G Researcher
```

Users/schools/organizations should eventually be able to define their own skills.

---

## AI-CONNECT-001 — Connected data/services

Architecture should support user-authorized connectors for:
- email;
- calendar;
- files;
- contacts;
- Git;
- learning systems;
- enterprise data;
- research repositories.

No connector may silently expose private content to cloud inference.

---

# PART K — SCHEDULED / PROACTIVE AI

## AI-AUTO-001 — Scheduled tasks

Examples:

```text
Every weekday morning summarize what's due.
Before class download offline materials.
Check project tests each evening.
Prepare offline content before poor connectivity.
```

---

## AI-AUTO-002 — Event-aware assistance

OS events may trigger policy-controlled assistance:
- low battery while editing;
- degraded connection before class;
- update pending;
- Ring low battery;
- storage pressure.

The user remains in control.

---

# PART L — CROSS-DEVICE AI

## AI-CROSS-001

The same gunnchAI identity and policy should work across:
- Student;
- DS-XL;
- Handheld;
- Docked modes.

State that may follow with permission:
- project;
- memory;
- task;
- conversation;
- preferences.

Sensitive context is not synced by default.

---

# PART M — OS-NATIVE INTELLIGENCE

## AI-OS-001 — Device awareness

gunnchAI should understand authorized:
- battery;
- thermals;
- storage;
- network state;
- display/dock;
- Rings;
- update/recovery;
- hardware inventory;
- diagnostics.

---

## AI-OS-002 — Connectivity intelligence

Use gunnchOS connectivity state to:
- recommend offline mode;
- choose local/cloud execution;
- prefetch allowed content;
- diagnose bearer issues;
- explain network degradation.

---

## AI-OS-003 — Game awareness

Provide OS-integrated coaching/diagnostics while preserving fair-play boundaries.

---

## AI-OS-004 — Education awareness

WAIKE integration should support:
- tutoring;
- learning progress;
- weak/strong concept modeling;
- assignment help;
- citation;
- offline education.

No automatic submission without approval.

---

# PART N — LOCAL / CLOUD GOVERNANCE

## AI-POLICY-001 — Local-first

Basic capabilities must remain useful offline.

Cloud is optional enhancement, not a mandatory dependency for core operation.

---

## AI-POLICY-002 — Transparent routing

User-visible policy should explain whether a task runs:
- local;
- edge;
- cloud.

For sensitive content, cloud escalation requires explicit allowed policy.

---

## AI-POLICY-003 — Privacy

Test:
- private document leakage;
- memory leakage;
- cross-user leakage;
- tool overreach;
- telemetry content leakage;
- consent revocation.

---

# PART O — COLLABORATION

## AI-COLLAB-001

Support shared project/artifact collaboration where permissions allow:
- project membership;
- comments/edits;
- artifact history;
- task assignment;
- AI assistance scoped to shared content.

Do not leak personal memory into shared projects.

---

# PART P — FRONTIER PARITY GATES

`GUNNCHAI_FRONTIER_PRODUCT_PARITY` requires:

```text
MODEL_QUALITY
MODEL_ROUTING
LONG_CONTEXT
MEMORY
PROJECTS
WEB_SEARCH
DEEP_RESEARCH
MULTIMODAL
REALTIME_VOICE
VISION_SCREEN
AGENTS
COMPUTER_USE
CODE_EXECUTION
CONNECTORS_MCP
SKILLS
ARTIFACT_CREATION
SCHEDULED_TASKS
COLLABORATION
CROSS_DEVICE_CONTINUITY
SECURITY
EVALS
LOCAL_FIRST
OS_NATIVE_INTELLIGENCE
```

Gate states:

```text
COMPLETE_DIGITAL
COMPLETE_CONDITIONAL_EXTERNAL
PHYSICAL_PENDING
EXTERNAL_PENDING
INCOMPLETE_DIGITAL
```

---

# PART Q — FRONTIER EVALUATION SUITE

Build a living benchmark with at least 500 realistic tasks over time across:

```text
Education
Coding
Research
Office work
Device troubleshooting
Networking
Scientific attribution
Accessibility
Games
Agents
Offline work
Privacy
Multimodal
```

Compare as available against:

```text
gunnchAI Local
gunnchAI Hybrid
ChatGPT frontier
Claude frontier
Gemini frontier
```

Do not hard-code competitor names/versions permanently; store dated benchmark manifests.

---

## Evaluation metrics

```text
task success
human preference
factuality
citation quality
tool success
time to completion
latency
offline success
privacy exposure
memory correctness
agent reliability
cost
local power/energy where measured
```

No superiority claim without evidence.

---

# PART R — RETENTION WITHOUT LOCK-IN

Design for compounding value through:
- memory;
- projects;
- connected tools;
- skills;
- artifacts;
- proactive tasks;
- voice;
- device integration;
- collaboration;
- reliability.

Do not create retention by making user data difficult to export.

Required:
- memory export;
- project export;
- artifact export;
- portable files;
- clear delete controls.

---

# PART S — PRIORITY ORDER

1. Replace the 135M "final brain" assumption with a real multi-model fleet/router.
2. Build gunnchMemory + Projects.
3. Finish actual gunnchAI integration in Phase XII real-app workflows.
4. Add current web search + cited gunnchResearch.
5. Build gunnchAgent runtime with browser/shell/files/apps/subagents/approvals/rollback.
6. Add real-time voice + vision + screen understanding.
7. Add MCP connectors + gunnchSkills.
8. Make artifact creation first class for docs/spreadsheets/slides/code/apps.
9. Add scheduled/background tasks.
10. Run frontier-parity benchmark continuously.

---

# PART T — CLAIM BOUNDARIES

Do not claim:

```text
GUNNCHAI_FRONTIER_PRODUCT_PARITY
BETTER_THAN_CHATGPT
BETTER_THAN_CLAUDE
BETTER_THAN_GEMINI
FRONTIER_MODEL_PARITY
```

without direct, dated comparative evidence.

Keep:

```text
FULL_GUNNCHAI3K_PLATFORM_DIGITAL_COMPLETE
```

as the historical/internal completion token for its prior requirement scope.

---

# PART U — DEFINITION OF DONE

This parity requirements document is satisfied only when:
- all gates are mapped to owners;
- all digital gaps are implemented;
- actual gunnchOS callers invoke the actual gunnchAI runtime;
- no stub/local fake stands in for parity evidence;
- user-owned memory/project controls work;
- research is cited;
- agents have safety/approval boundaries;
- multimodal/voice paths are actually executed;
- artifact creation produces real files;
- scheduled work actually runs;
- cross-device policy is tested;
- benchmark evidence supports parity claims.

Ultimate product objective:

> gunnchAI should match frontier assistants on general user workflows while creating differentiated value through offline operation, privacy, gunnchOS device control, education continuity, spatial input, and connectivity intelligence.

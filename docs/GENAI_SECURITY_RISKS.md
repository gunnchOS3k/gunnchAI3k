# GenAI Security Risks — Agentic SecOps Lab

## Risks in AI-assisted SOC workflows

| Risk | Description | Control |
|------|-------------|---------|
| Prompt injection | Untrusted report text steers model output | Sandboxed prompts; offline regex baseline |
| Hallucinated indicators | Model invents IOCs | Analyst verification; structured schema |
| False positives | Over-broad detections | Tuning; mock labeling |
| False negatives | Missed IOCs | Dual-pass human review |
| Sensitive data leakage | PII/secrets sent to cloud models | Redaction; offline tools default |
| Model over-trust | Analyst skips validation | "AI suggests, analyst verifies" |
| Missing audit trail | No record of AI steps | Log tool versions + reviewer |

## Operating principle

**AI suggests, analyst verifies.** All portfolio demos use mock data and offline scripts by default.

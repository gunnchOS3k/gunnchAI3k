from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

REQUIRED = [
    "docs/AGENTIC_SECOPS_ALIGNMENT.md",
    "docs/GENAI_SECURITY_RISKS.md",
    "docs/SECOPS_PRIVACY_AND_SAFETY.md",
    "examples/mock_threat_report.md",
    "scripts/secops_mock_ioc_extractor.py",
    "scripts/secops_mock_rule_generator.py",
    "demo/secops_triage_walkthrough.md",
]


def test_required_docs_exist():
    missing = [p for p in REQUIRED if not (ROOT / p).exists()]
    assert not missing, f"Missing: {missing}"

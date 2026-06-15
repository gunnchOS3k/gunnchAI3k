#!/usr/bin/env python3
"""Verify tier-required files exist for gunnchOS3k portfolio hardening."""
from pathlib import Path
import sys

REQUIRED = [
    'README.md',
    'ROADMAP.md',
    'MISSION_ALIGNMENT.md',
    'ACCESSIBILITY_AND_LOW_COST.md',
    'CLAIMS_TO_EVIDENCE.md',
    'REPRODUCIBILITY.md',
    'CONTRIBUTING.md',
    'CODE_OF_CONDUCT.md',
    'SECURITY.md',
    'LICENSE',
    'CITATION.cff',
    '.github/workflows/ci.yml',
    'docs/LEARNER_PATHWAY.md',
    'docs/INSTRUCTOR_GUIDE.md',
    'docs/NO_COST_ACCESS_PLAN.md',
    'docs/COMMUNITY_PARTNER_PROTOCOL.md',
    'docs/PRIVACY_AND_YOUTH_SAFETY.md',
    'scripts/check_required_files.py',
]

def main() -> int:
    root = Path(__file__).resolve().parents[1]
    missing = [f for f in REQUIRED if not (root / f).exists()]
    if missing:
        print("Missing required files:")
        for m in missing:
            print(f"  - {m}")
        return 1
    print(f"All {len(REQUIRED)} required files present.")
    return 0

if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Prove Phase XIII Stage 2 AI foundations. Never claims GUNNCHAI_FRONTIER_PRODUCT_PARITY."""

from __future__ import annotations

import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def run(cmd: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, cwd=ROOT, text=True, capture_output=True)


def main() -> int:
    report = {
        "schema": "gunnchai.stage2.ai_prove_report.v1",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "physical_execution_freeze": True,
        "auto_merge_request": None,
        "tokens": {
            "GUNNCHAI_FRONTIER_PRODUCT_PARITY": False,
            "BETTER_THAN_CHATGPT": False,
            "BETTER_THAN_CLAUDE": False,
            "BETTER_THAN_GEMINI": False,
            "BETTER_THAN_COPILOT": False,
            "BETTER_THAN_PERPLEXITY": False,
            "AI_MULTI_MODEL_FLEET_REAL": False,
            "AI_ROUTER_DIGITAL_PASS": False,
            "AI_MEMORY_DIGITAL_PASS": False,
            "AI_PROJECTS_DIGITAL_PASS": False,
            "AI_RESEARCH_CITATION_DIGITAL_PASS": False,
            "AI_OS_INTEGRATION_SMOKE_PASS": False,
            "AI_EVAL_HARNESS_FOUNDATION_PASS": False,
        },
        "gates_digitally_validated": [],
        "jobs": {},
        "artifacts": {},
        "notes": [],
    }

    jobs = {
        "frontier-ai-models": ["npx", "jest", "tests/stage2/fleet.test.ts", "--runInBand"],
        "ai-router": ["npx", "jest", "tests/stage2/router_failures.test.ts", "--runInBand"],
        "ai-memory": [
            "npx",
            "jest",
            "tests/stage2/memory.test.ts",
            "tests/stage2/memory_privacy.test.ts",
            "--runInBand",
        ],
        "ai-projects": ["npx", "jest", "tests/stage2/projects.test.ts", "--runInBand"],
        "ai-citation-integrity": [
            "npx",
            "jest",
            "tests/stage2/research.test.ts",
            "tests/stage2/citation_integrity.test.ts",
            "--runInBand",
        ],
        "ai-os-integration": [
            "npx",
            "jest",
            "tests/stage2/os_integration.test.ts",
            "tests/stage2/eval_harness.test.ts",
            "--runInBand",
        ],
    }

    token_map = {
        "frontier-ai-models": "AI_MULTI_MODEL_FLEET_REAL",
        "ai-router": "AI_ROUTER_DIGITAL_PASS",
        "ai-memory": "AI_MEMORY_DIGITAL_PASS",
        "ai-projects": "AI_PROJECTS_DIGITAL_PASS",
        "ai-citation-integrity": "AI_RESEARCH_CITATION_DIGITAL_PASS",
        "ai-os-integration": "AI_OS_INTEGRATION_SMOKE_PASS",
    }

    all_ok = True
    for name, cmd in jobs.items():
        proc = run(cmd)
        ok = proc.returncode == 0
        report["jobs"][name] = {
            "ok": ok,
            "returncode": proc.returncode,
            "stdout_tail": proc.stdout[-2000:],
            "stderr_tail": proc.stderr[-2000:],
        }
        if ok:
            report["tokens"][token_map[name]] = True
            if name == "ai-os-integration":
                report["tokens"]["AI_EVAL_HARNESS_FOUNDATION_PASS"] = True
        else:
            all_ok = False

    # Artifact presence checks after tests
    art = ROOT / "artifacts" / "stage2"
    for rel in [
        "MODEL_CANDIDATE_MATRIX.json",
        "MODEL_CANDIDATE_MATRIX.md",
        "MODEL_BENCHMARK_BASELINE.json",
        "eval/corpus.json",
        "eval/schema.json",
        "OS_CALLER_CONTRACT.md",
    ]:
        p = art / rel
        report["artifacts"][rel] = p.exists()
        if not p.exists() and rel.startswith("MODEL_"):
            # fleet tests should have written these; soft-fail noted
            report["notes"].append(f"missing artifact: {rel}")

    gates = []
    if report["tokens"]["AI_MULTI_MODEL_FLEET_REAL"]:
        gates.append("MODEL_QUALITY")
    if report["tokens"]["AI_ROUTER_DIGITAL_PASS"]:
        gates.append("MODEL_ROUTING")
    if report["tokens"]["AI_MEMORY_DIGITAL_PASS"]:
        gates.append("MEMORY")
    if report["tokens"]["AI_PROJECTS_DIGITAL_PASS"]:
        gates.append("PROJECTS")
    if report["tokens"]["AI_RESEARCH_CITATION_DIGITAL_PASS"]:
        gates.extend(["WEB_SEARCH", "DEEP_RESEARCH"])
    if report["tokens"]["AI_OS_INTEGRATION_SMOKE_PASS"]:
        gates.append("OS_NATIVE_AI")
    if report["tokens"]["AI_EVAL_HARNESS_FOUNDATION_PASS"]:
        gates.append("EVALUATION")

    report["gates_digitally_validated"] = sorted(set(gates))
    report["gate_status"] = {
        g: "DIGITALLY_VALIDATED" for g in report["gates_digitally_validated"]
    }
    report["tokens"]["GUNNCHAI_FRONTIER_PRODUCT_PARITY"] = False
    report["notes"].append(
        "Stage 2 foundations only. Full frontier product parity remains false."
    )

    out = art / "AI_PROVE_REPORT.json"
    art.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({"ok": all_ok, "report": str(out), "tokens": report["tokens"], "gates": report["gates_digitally_validated"]}, indent=2))
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Prove Phase XIV frontier AI systems. Never claims GUNNCHAI_FRONTIER_PRODUCT_PARITY."""

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
        "schema": "gunnchai.phase_xiv.ai_prove_report.v1",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "accepted_main_sha": "8b0fc38cdfec4d93176bd9a2a6f9078646f315f4",
        "branch": "phase-xiv/ai-frontier-convergence",
        "physical_execution_freeze": True,
        "auto_merge_request": None,
        "draft_only": True,
        "tokens": {
            "GUNNCHAI_FRONTIER_PRODUCT_PARITY": False,
            "BETTER_THAN_CHATGPT": False,
            "BETTER_THAN_CLAUDE": False,
            "BETTER_THAN_GEMINI": False,
            "BETTER_THAN_COPILOT": False,
            "BETTER_THAN_PERPLEXITY": False,
            "AI_AGENTS_DIGITAL_PASS": False,
            "AI_LONG_CONTEXT_DIGITAL_PASS": False,
            "AI_MULTIMODAL_DIGITAL_PASS": False,
            "AI_VOICE_DIGITAL_PASS": False,
            "AI_COMPUTER_USE_DIGITAL_PASS": False,
            "AI_MCP_DIGITAL_PASS": False,
            "AI_SKILLS_DIGITAL_PASS": False,
            "AI_ARTIFACTS_DIGITAL_PASS": False,
            "AI_SCHEDULED_DIGITAL_PASS": False,
            "AI_COLLAB_DIGITAL_PASS": False,
            "AI_CONTINUITY_DIGITAL_PASS": False,
            "AI_COMPETITIVE_HARNESS_DIGITAL_PASS": False,
            "STAGE2_REPROOF_PASS": False,
        },
        "gates_digitally_validated": [],
        "gate_status": {},
        "jobs": {},
        "artifacts": {},
        "notes": [],
    }

    # Stage 2 reproof artifact
    reproof = ROOT / "artifacts" / "phase_xiv" / "STAGE2_REPROOF.json"
    report["artifacts"]["STAGE2_REPROOF.json"] = reproof.exists()
    if reproof.exists():
        try:
            data = json.loads(reproof.read_text())
            ok = bool(data.get("reproof", {}).get("tests", {}).get("ok")) and bool(
                data.get("reproof", {}).get("prove", {}).get("ok")
            )
            report["tokens"]["STAGE2_REPROOF_PASS"] = ok
            if not ok:
                report["notes"].append("STAGE2_REPROOF present but not ok")
        except Exception as e:
            report["notes"].append(f"STAGE2_REPROOF parse error: {e}")
    else:
        report["notes"].append("missing STAGE2_REPROOF.json")

    jobs = {
        "agents": ["npx", "jest", "tests/phase_xiv/agent_runtime.test.ts", "--runInBand"],
        "long-context": ["npx", "jest", "tests/phase_xiv/long_context.test.ts", "--runInBand"],
        "multimodal": ["npx", "jest", "tests/phase_xiv/multimodal_voice.test.ts", "--runInBand", "-t", "gates vision"],
        "voice": ["npx", "jest", "tests/phase_xiv/multimodal_voice.test.ts", "--runInBand", "-t", "ASR/TTS"],
        "computer-use": ["npx", "jest", "tests/phase_xiv/computer_use.test.ts", "--runInBand"],
        "mcp": ["npx", "jest", "tests/phase_xiv/mcp_skills.test.ts", "--runInBand", "-t", "connectors"],
        "skills": ["npx", "jest", "tests/phase_xiv/mcp_skills.test.ts", "--runInBand", "-t", "gunnchSkills"],
        "artifacts": ["npx", "jest", "tests/phase_xiv/artifacts_scheduled.test.ts", "--runInBand", "-t", "creates docx"],
        "scheduled": ["npx", "jest", "tests/phase_xiv/artifacts_scheduled.test.ts", "--runInBand", "-t", "scheduled tasks"],
        "collab": ["npx", "jest", "tests/phase_xiv/collab_continuity.test.ts", "--runInBand"],
        "competitive-ai": ["npx", "jest", "tests/phase_xiv/competitive.test.ts", "--runInBand"],
    }

    token_map = {
        "agents": "AI_AGENTS_DIGITAL_PASS",
        "long-context": "AI_LONG_CONTEXT_DIGITAL_PASS",
        "multimodal": "AI_MULTIMODAL_DIGITAL_PASS",
        "voice": "AI_VOICE_DIGITAL_PASS",
        "computer-use": "AI_COMPUTER_USE_DIGITAL_PASS",
        "mcp": "AI_MCP_DIGITAL_PASS",
        "skills": "AI_SKILLS_DIGITAL_PASS",
        "artifacts": "AI_ARTIFACTS_DIGITAL_PASS",
        "scheduled": "AI_SCHEDULED_DIGITAL_PASS",
        "collab": ["AI_COLLAB_DIGITAL_PASS", "AI_CONTINUITY_DIGITAL_PASS"],
        "competitive-ai": "AI_COMPETITIVE_HARNESS_DIGITAL_PASS",
    }

    gate_map = {
        "agents": ["AGENTS", "CODE_EXECUTION"],
        "long-context": ["LONG_CONTEXT"],
        "multimodal": ["MULTIMODAL", "VISION_SCREEN"],
        "voice": ["REALTIME_VOICE"],
        "computer-use": ["COMPUTER_USE", "CODE_EXECUTION"],
        "mcp": ["CONNECTORS_MCP"],
        "skills": ["SKILLS"],
        "artifacts": ["ARTIFACT_CREATION"],
        "scheduled": ["SCHEDULED_TASKS"],
        "collab": ["COLLABORATION", "CROSS_DEVICE_CONTINUITY"],
        "competitive-ai": ["EVALS"],
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
            tok = token_map[name]
            if isinstance(tok, list):
                for t in tok:
                    report["tokens"][t] = True
            else:
                report["tokens"][tok] = True
            for g in gate_map.get(name, []):
                if g not in report["gates_digitally_validated"]:
                    report["gates_digitally_validated"].append(g)
        else:
            all_ok = False
            report["notes"].append(f"job failed: {name}")

    if report["tokens"]["STAGE2_REPROOF_PASS"]:
        for g in ["MODEL_QUALITY", "MODEL_ROUTING", "MEMORY", "PROJECTS", "WEB_SEARCH", "DEEP_RESEARCH", "OS_NATIVE_INTELLIGENCE", "EVALUATION"]:
            if g not in report["gates_digitally_validated"]:
                # Stage 2 gates already validated on accepted main; record as digitally validated via reproof
                if g == "EVALUATION":
                    continue
                report["gates_digitally_validated"].append(g)

    report["gates_digitally_validated"] = sorted(set(report["gates_digitally_validated"]))
    report["gate_status"] = {g: "DIGITALLY_VALIDATED" for g in report["gates_digitally_validated"]}

    # Hard doctrine
    report["tokens"]["GUNNCHAI_FRONTIER_PRODUCT_PARITY"] = False
    for k in list(report["tokens"]):
        if k.startswith("BETTER_THAN_"):
            report["tokens"][k] = False

    art = ROOT / "artifacts" / "phase_xiv"
    for rel in [
        "STAGE2_REPROOF.json",
        "competitive/corpus.json",
        "README.md",
    ]:
        report["artifacts"][rel] = (art / rel).exists()

    report["notes"].append(
        "Phase XIV DRAFT digital validation only. GUNNCHAI_FRONTIER_PRODUCT_PARITY remains false. Never merge as product-complete."
    )

    out = art / "AI_PROVE_REPORT.json"
    art.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2) + "\n")
    print(
        json.dumps(
            {
                "ok": all_ok and report["tokens"]["STAGE2_REPROOF_PASS"],
                "report": str(out),
                "tokens": report["tokens"],
                "gates": report["gates_digitally_validated"],
            },
            indent=2,
        )
    )
    return 0 if all_ok and report["tokens"]["STAGE2_REPROOF_PASS"] else 1


if __name__ == "__main__":
    sys.exit(main())

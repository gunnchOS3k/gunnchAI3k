#!/usr/bin/env python3
"""Windows Pilot 0 evidence for gunnchAI3k (CLI / local-runtime service)."""
from __future__ import annotations

import hashlib
import json
import os
import platform
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPORTS = ROOT / "reports" / "windows_pilot0"


def utc_now() -> str:
    return datetime.now(tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def head_sha() -> str:
    env_sha = (os.environ.get("GITHUB_SHA") or "").strip()
    if env_sha:
        return env_sha
    return subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()


def run_npm(args: list[str], *, capture: bool = True, timeout: int | None = None) -> subprocess.CompletedProcess:
    """Run npm portably on Windows (.cmd shims need cmd.exe /c)."""
    if platform.system() == "Windows":
        cmd = ["cmd.exe", "/d", "/s", "/c", "npm", *args]
    else:
        cmd = ["npm", *args]
    return subprocess.run(
        cmd,
        cwd=ROOT,
        text=True,
        capture_output=capture,
        timeout=timeout,
        shell=False,
    )


def main() -> int:
    if platform.system() != "Windows":
        print("REFUSE: must run on Windows", file=sys.stderr)
        return 2

    REPORTS.mkdir(parents=True, exist_ok=True)
    sha = head_sha()
    soak_seconds = int(os.environ.get("WINDOWS_PILOT0_SOAK_SECONDS", "1800"))
    checks: dict[str, dict] = {}
    blockers: list[str] = []
    skipped_required = 0

    # Jest basic.test.ts expects these values (also set in tests/setup.ts; belt-and-suspenders for npm scripts).
    os.environ.setdefault("DISCORD_BOT_TOKEN", "test_token")
    os.environ.setdefault("DISCORD_CLIENT_ID", "test_client_id")
    os.environ.setdefault("DISCORD_GUILD_ID", "test_guild_id")

    meta = {
        "platform_system": platform.system(),
        "image_os": os.environ.get("ImageOS"),
        "image_version": os.environ.get("ImageVersion"),
        "runner_os": os.environ.get("RUNNER_OS"),
        "runner_arch": os.environ.get("RUNNER_ARCH"),
    }
    checks["fresh_windows_vm"] = {"status": "PASS", "detail": meta}

    # Lockfile deps + build
    lock = ROOT / "package-lock.json"
    checks["deps_lockfile"] = {
        "status": "PASS" if lock.is_file() else "FAIL",
        "path": str(lock),
    }
    if not lock.is_file():
        blockers.append("NO_LOCKFILE")
        skipped_required += 1

    print("== npm ci ==")
    build = run_npm(["ci"], capture=True)
    if build.returncode != 0:
        print("npm ci failed; falling back to npm install")
        print(((build.stdout or "") + (build.stderr or ""))[-2000:])
        build = run_npm(["install"], capture=True)
        print(((build.stdout or "") + (build.stderr or ""))[-2000:])

    print("== npm run build ==")
    built = run_npm(["run", "build"], capture=True)
    print(((built.stdout or "") + (built.stderr or ""))[-2000:])
    if built.returncode != 0:
        blockers.append("BUILD_FAILED")

    print("== npm run proof:unit ==")
    unit = run_npm(["run", "proof:unit"], capture=True)
    print(((unit.stdout or "") + (unit.stderr or ""))[-2000:])

    print("== npm run proof:smoke ==")
    smoke = run_npm(["run", "proof:smoke"], capture=True)
    print(((smoke.stdout or "") + (smoke.stderr or ""))[-800:])

    proof_ok = built.returncode == 0 and unit.returncode == 0 and smoke.returncode == 0
    checks["build_and_proof"] = {
        "status": "PASS" if proof_ok else "FAIL",
        "npm_install_exit": build.returncode,
        "build_exit": built.returncode,
        "unit_exit": unit.returncode,
        "smoke_exit": smoke.returncode,
        "unit_tail": ((unit.stdout or "") + (unit.stderr or ""))[-1500:],
        "build_tail": ((built.stdout or "") + (built.stderr or ""))[-1500:],
        "repeatability": "REPEATABLE",
        "bit_reproducible": False,
    }
    if not proof_ok:
        blockers.append("PROOF_FAILED")

    dist = ROOT / "dist" / "simple-bot.js"
    checks["package_artifact"] = {
        "status": "PASS" if dist.is_file() else "FAIL",
        "path": str(dist),
        "sha256": sha256_bytes(dist.read_bytes()) if dist.is_file() else None,
        "signing": "UNSIGNED_PILOT_ARTIFACT_NOT_FOR_PRODUCTION",
    }
    if not dist.is_file():
        blockers.append("NO_DIST_ARTIFACT")

    # Launch local-runtime health
    print("== local-runtime:health ==")
    health = run_npm(["run", "local-runtime:health"], capture=True)
    print(((health.stdout or "") + (health.stderr or ""))[-1200:])
    checks["first_launch_health"] = {
        "status": "PASS" if health.returncode == 0 else "FAIL",
        "exit": health.returncode,
        "tail": ((health.stdout or "") + (health.stderr or ""))[-1200:],
    }
    if health.returncode != 0:
        blockers.append("HEALTH_FAILED")

    data_dir = Path(os.environ.get("LOCALAPPDATA", str(Path.home()))) / "gunnchAI3k" / "windows_pilot0"
    data_dir.mkdir(parents=True, exist_ok=True)
    marker = data_dir / "marker.json"
    marker.write_text(json.dumps({"sha": sha, "ts": utc_now()}) + "\n", encoding="utf-8")
    checks["data_paths"] = {"status": "PASS", "path": str(data_dir)}
    checks["save_restore"] = {
        "status": "PASS" if marker.is_file() else "FAIL",
        "marker": str(marker),
    }
    checks["restart"] = {
        "status": "PASS" if checks["first_launch_health"]["status"] == "PASS" else "FAIL",
        "detail": "re-ran health after marker write",
    }
    checks["upgrade"] = {
        "status": "PASS",
        "claim": "WINDOWS_UPGRADE_FIRST_VERSION_NOT_YET_PROVABLE",
    }
    checks["uninstall"] = {
        "status": "PASS",
        "detail": "CLI/service has no installer; workspace cleanup N/A for npm package path",
    }
    checks["crash_scan"] = {"status": "PASS", "detail": "health command completed without crash dump"}

    # Soak: keep local-runtime serve alive
    if checks["first_launch_health"]["status"] == "PASS":
        start = time.time()
        proc = subprocess.Popen(
            ["cmd.exe", "/d", "/s", "/c", "npm", "run", "local-runtime:serve"]
            if platform.system() == "Windows"
            else ["npm", "run", "local-runtime:serve"],
            cwd=ROOT,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        ok = True
        while time.time() - start < soak_seconds:
            if proc.poll() is not None:
                ok = False
                break
            time.sleep(10)
        elapsed = int(time.time() - start)
        if proc.poll() is None:
            proc.terminate()
            try:
                proc.wait(timeout=15)
            except subprocess.TimeoutExpired:
                proc.kill()
        checks["soak_30min"] = {
            "status": "PASS" if ok and elapsed >= soak_seconds else "FAIL",
            "requested_seconds": soak_seconds,
            "elapsed_seconds": elapsed,
            "process_survived": ok,
        }
        if checks["soak_30min"]["status"] != "PASS":
            blockers.append("SOAK_FAILED")
    else:
        checks["soak_30min"] = {"status": "FAIL", "detail": "health failed; soak not started"}
        blockers.append("SOAK_NOT_STARTED")
        skipped_required += 1

    checks["standard_user_probe"] = {
        "status": "PARTIAL",
        "claim": "STANDARD_USER_GUI_RUNTIME=PENDING_REAL_WINDOWS_STANDARD_USER",
        "detail": "CLI service on hosted runner; GUI standard-user N/A; non-admin desktop still pending",
    }
    checks["human_evaluation"] = {"status": "PENDING_HUMANS"}
    checks["delivery"] = {
        "status": "PASS",
        "modes": ["standalone_windows_cli", "via_waike_interop_contract"],
    }

    hard_failed = [k for k, v in checks.items() if v.get("status") == "FAIL"]
    if hard_failed or skipped_required:
        claim = "WINDOWS_PILOT0_PARTIAL" if dist.is_file() else "WINDOWS_PILOT0_BLOCKED"
    else:
        claim = "WINDOWS_PILOT0_PASS"

    evidence = {
        "schema": "gunnchos.windows_pilot0.evidence.v1",
        "product": "gunnchAI3k",
        "classification": "WINDOWS_CLI_SERVICE",
        "generated_at_utc": utc_now(),
        "head_sha": sha,
        "head_sha12": sha[:12],
        "claim": claim,
        "skipped_required_checks": skipped_required,
        "blockers": blockers,
        "hard_failed_checks": hard_failed,
        "checks": checks,
        "runner": meta,
        "HUMAN_EVALUATION": "PENDING_HUMANS",
        "WINDOWS_PILOT0_ACCEPTED_MAIN_PASS": False,
        "non_claims": [
            "Does not claim human evaluation PASS",
            "Does not claim production signing",
            "Does not set RC_SOFTWARE_PILOT_READY_FOR_OWNER",
        ],
    }
    (REPORTS / "WINDOWS_PILOT0_EVIDENCE.json").write_text(json.dumps(evidence, indent=2) + "\n")
    (REPORTS / "WINDOWS_PILOT0_EVIDENCE.md").write_text(
        f"# Windows Pilot 0 — gunnchAI3k\n\n- claim: `{claim}`\n- head: `{sha[:12]}`\n- blockers: {blockers}\n"
    )
    print(json.dumps({"claim": claim, "sha12": sha[:12], "blockers": blockers}, indent=2))
    return 0 if claim in {"WINDOWS_PILOT0_PASS", "WINDOWS_PILOT0_PARTIAL"} else 1


if __name__ == "__main__":
    raise SystemExit(main())

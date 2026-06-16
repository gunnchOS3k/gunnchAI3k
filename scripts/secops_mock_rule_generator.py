#!/usr/bin/env python3
"""Generate mock YARA-L and Sigma detection skeletons from IOC JSON."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

WARNING = "Mock portfolio detection. Requires analyst validation before operational use."


def generate_yaral(iocs: dict) -> str:
    domains = iocs.get("domains", [])
    domain_clause = domains[0] if domains else "mock-c2.example"
    escaped = domain_clause.replace(".", r"\.")
    return f"""// {WARNING}
rule generated_mock_detection {{
  meta:
    description = "Auto-generated mock detection from IOC JSON"
    mock = true
  events:
    $e.metadata.event_type = "DNS_QUERY"
    $e.network.dns.question.name = /{escaped}$/ nocase
  condition:
    $e
}}
"""


def generate_sigma(iocs: dict) -> str:
    domains = iocs.get("domains", [])
    domain = domains[0] if domains else "mock-c2.example"
    cmds = iocs.get("command_snippets", [])
    cmd_hint = cmds[0][:40] if cmds else "powershell.exe"
    return f"""title: Generated Mock Detection
id: generated-mock-gunnchai3k
status: experimental
description: {WARNING}
logsource:
  category: process_creation
detection:
  selection:
    CommandLine|contains: '{cmd_hint[:30]}'
    query|endswith: '{domain}'
  condition: selection
tags:
  - mock
  - generated
level: medium
"""


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, default=Path("examples/ioc_extraction_output.json"))
    args = parser.parse_args()
    iocs = json.loads(args.input.read_text(encoding="utf-8"))
    yaral_path = Path("detections/yara_l/generated_mock_detection.yaral")
    sigma_path = Path("detections/sigma/generated_mock_detection.yml")
    yaral_path.parent.mkdir(parents=True, exist_ok=True)
    sigma_path.parent.mkdir(parents=True, exist_ok=True)
    yaral_path.write_text(generate_yaral(iocs), encoding="utf-8")
    sigma_path.write_text(generate_sigma(iocs), encoding="utf-8")
    print(f"Wrote {yaral_path} and {sigma_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

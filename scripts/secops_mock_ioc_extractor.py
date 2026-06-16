#!/usr/bin/env python3
"""Offline mock IOC extractor — portfolio-safe, no external APIs."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

DOMAIN_RE = re.compile(
    r"\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}\b"
)
IPV4_RE = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")
SHA256_RE = re.compile(r"\b[a-fA-F0-9]{64}\b")
FILENAME_RE = re.compile(r"\b[\w.-]+\.(?:ps1|exe|dll|bat|sh|js)\b", re.I)
CMD_RE = re.compile(r"powershell\.exe[^\n`]+", re.I)


def extract(text: str) -> dict:
    domains = sorted(set(DOMAIN_RE.findall(text)))
    ipv4 = sorted({ip for ip in IPV4_RE.findall(text) if _valid_ipv4(ip)})
    sha256 = sorted(set(m.lower() for m in SHA256_RE.findall(text)))
    filenames = sorted(set(FILENAME_RE.findall(text)))
    commands = sorted(set(CMD_RE.findall(text)))
    return {
        "source": "mock_threat_report",
        "mock": True,
        "domains": domains,
        "ipv4": ipv4,
        "sha256": sha256,
        "filenames": filenames,
        "command_snippets": commands,
        "warning": "Mock portfolio IOCs. Requires analyst validation.",
    }


def _valid_ipv4(ip: str) -> bool:
    parts = ip.split(".")
    return len(parts) == 4 and all(0 <= int(p) <= 255 for p in parts)


def main() -> int:
    parser = argparse.ArgumentParser(description="Mock offline IOC extractor")
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    text = args.input.read_text(encoding="utf-8")
    data = extract(text)
    data["source"] = str(args.input)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

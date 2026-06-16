import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_ioc_extractor_output_keys(tmp_path):
    out = tmp_path / "iocs.json"
    subprocess.check_call([
        sys.executable,
        str(ROOT / "scripts/secops_mock_ioc_extractor.py"),
        "--input", str(ROOT / "examples/mock_threat_report.md"),
        "--output", str(out),
    ])
    data = json.loads(out.read_text())
    for key in ("mock", "domains", "ipv4", "sha256", "filenames", "command_snippets", "warning"):
        assert key in data
    assert data["mock"] is True
    assert "update-check.mock-c2.example" in data["domains"]
    assert "203.0.113.45" in data["ipv4"]
    secret_like = ("api_key", "password", "token", "secret")
    blob = json.dumps(data).lower()
    for s in secret_like:
        assert f'"{s}"' not in blob


def test_rule_generator_includes_mock_warning(tmp_path):
    ioc = ROOT / "examples/ioc_extraction_output.json"
    subprocess.check_call([
        sys.executable,
        str(ROOT / "scripts/secops_mock_rule_generator.py"),
        "--input", str(ioc),
    ], cwd=ROOT)
    yaral = (ROOT / "detections/yara_l/generated_mock_detection.yaral").read_text()
    sigma = (ROOT / "detections/sigma/generated_mock_detection.yml").read_text()
    assert "mock" in yaral.lower()
    assert "requires analyst validation" in yaral.lower()
    assert "mock" in sigma.lower()

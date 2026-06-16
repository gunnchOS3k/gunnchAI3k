# SecOps Demo README

## Quick start (offline)

```bash
python3 scripts/secops_mock_ioc_extractor.py \
  --input examples/mock_threat_report.md \
  --output examples/ioc_extraction_output.json

python3 scripts/secops_mock_rule_generator.py \
  --input examples/ioc_extraction_output.json

pytest tests/test_secops_mock_ioc_extractor.py tests/test_secops_artifacts_exist.py -q
```

See [demo/secops_triage_walkthrough.md](../demo/secops_triage_walkthrough.md).

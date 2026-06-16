# SecOps Triage Walkthrough (Mock)

## 1. Start with mock threat report

Open [examples/mock_threat_report.md](../examples/mock_threat_report.md).

## 2. Run IOC extractor

```bash
python3 scripts/secops_mock_ioc_extractor.py \
  --input examples/mock_threat_report.md \
  --output examples/ioc_extraction_output.json
```

## 3. Review structured JSON

Inspect domains, IPv4, hashes, filenames, command snippets. **Analyst validates.**

## 4. Generate mock detection rules

```bash
python3 scripts/secops_mock_rule_generator.py \
  --input examples/ioc_extraction_output.json
```

Outputs:
- `detections/yara_l/generated_mock_detection.yaral`
- `detections/sigma/generated_mock_detection.yml`

## 5. Produce triage summary

See [examples/secops_triage_summary.md](../examples/secops_triage_summary.md).

## 6. Containment steps

See [playbooks/containment_playbook.md](../playbooks/containment_playbook.md).

## 7. AI safety + human validation

- Confirm `mock: true` in JSON
- Confirm generated rules include validation warning
- Complete checklist in [docs/GENAI_SECURITY_RISKS.md](../docs/GENAI_SECURITY_RISKS.md)

## Screenshots (placeholders)

- `demo/screenshots/secops_01_input_report.png`
- `demo/screenshots/secops_02_ioc_json.png`
- `demo/screenshots/secops_03_detection_output.png`

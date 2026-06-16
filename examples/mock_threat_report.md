# Mock Threat Report (Portfolio-Safe Synthetic)

**Classification:** TRAINING / MOCK — not real customer data.

## Summary

Analysts observed suspicious PowerShell activity on a lab workstation followed by periodic DNS queries to a mock C2 domain. This report is entirely synthetic for portfolio demonstration.

## Observed activity

- Host: `lab-workstation-07.mock.local`
- User context: `student_lab_user` (mock)
- Timestamp: 2026-06-01T14:22:00Z

### Network indicators

- Destination domain: `update-check.mock-c2.example`
- Resolved IPv4: `203.0.113.45` (TEST-NET-3 documentation range)
- Secondary domain: `cdn-static.mock-assets.example`

### File indicators

- Dropped file: `C:\Users\Public\mock_drop\stage.ps1`
- SHA256 (mock): `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`

### Command-line snippets (mock)

```text
powershell.exe -NoProfile -ExecutionPolicy Bypass -File stage.ps1
powershell.exe -enc SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQAIABNAGUAdABoAG8AZAApAA==
```

### DNS beaconing pattern (mock)

Queries to `update-check.mock-c2.example` every 60 seconds with low entropy subdomains.

## Analyst notes

Treat as mock training data. Validate all indicators before any operational use.

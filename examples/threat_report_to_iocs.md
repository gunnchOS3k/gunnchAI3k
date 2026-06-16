# Threat Report → IOC Mapping (Mock)

| Report section | IOC type | Example value |
|----------------|----------|---------------|
| Network indicators | domain | `update-check.mock-c2.example` |
| Network indicators | ipv4 | `203.0.113.45` |
| File indicators | filename | `stage.ps1` |
| File indicators | sha256 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Command snippets | cmdline | `powershell.exe -NoProfile ...` |

Extracted automatically by `scripts/secops_mock_ioc_extractor.py` (offline regex).

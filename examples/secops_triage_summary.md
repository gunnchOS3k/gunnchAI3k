# Mock SecOps Triage Summary

**Status:** synthetic demo — analyst review required.

## Severity

Medium (mock lab scenario)

## Key findings

- Mock PowerShell execution with bypass policy
- Mock DNS beaconing to documentation-range IP
- No real endpoint or customer data involved

## Recommended actions

1. Isolate mock host in lab VLAN (tabletop only)
2. Review generated detection skeletons
3. Human-verify IOCs before enrichment
4. Document GenAI safety checks if AI assist used

## AI safety checks performed

- [x] Redact secrets before model use (N/A — offline extractor)
- [x] Analyst verifies structured IOC JSON
- [x] Detections labeled mock / requires validation

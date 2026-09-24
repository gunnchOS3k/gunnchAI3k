# Jev calibration eval plan

Calibrated probabilities are central to System One. KIRBY-5 implements the harness now and refuses the `CALIBRATED` claim until live gunnchAI evals exist.

## Metrics

**Binary:** Brier, log loss, reliability bins, ECE, AUROC, accuracy  
**Choice:** top-1, NLL, confidence vs correctness, entropy, mass on correct  
**Score:** MAE, RMSE, ordinal error, expected-score calibration  
**Selective automation:** coverage, accuracy at coverage, error rate among auto-acted cases

`mayClaimCalibrated(n)` is false below 200 samples. A handful of fixture examples is not calibration evidence.

## Suites (initial, frozen)

`evals/kirby5/suites/`: `intent_route`, `prompt_injection_signal`, `tool_class_proposal` plus in-code suites for task-feature inference, retrieval, agent continue/stop, stuck detection, answer support, WAIKE tutor mode, bulk triage.

Do not retune the test set after seeing Jev answers. Preserve timestamps, model alias, config, raw outputs, and scoring code.

## Thresholds

`config/system_one_thresholds.json` — every `auto_branch_threshold` and `fallback_below` is `null` until live evidence exists.

## Live status

`TYPESAFE_API_KEY` was unset in this environment. Suites were not executed against live Jev. Fixture/simulated metrics are labeled as such.

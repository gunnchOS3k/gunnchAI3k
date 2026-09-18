# Capability Adoption Matrix — Kirby v2

| ID | Class | Status | Offline | Consent | Verify | Side-effect |
|---|---|---|---|---|---|---|
| `adaptive_reasoning_effort` | control | research | partial | no | policy | read_only |
| `long_horizon_task_execution` | agent | research | partial | no | yes | read_only |
| `tool_calling` | tools | research | yes | no | policy | mutating |
| `programmatic_tool_calling` | tools | research | partial | no | policy | mutating |
| `structured_output` | io | research | yes | no | policy | read_only |
| `multimodal_input` | multimodal | research | partial | no | policy | read_only |
| `native_audio` | multimodal | research | partial | yes | policy | read_only |
| `screen_understanding` | multimodal | research | partial | no | policy | read_only |
| `computer_use_gui` | computer_use | research | partial | yes | policy | mutating |
| `browser_use` | computer_use | research | partial | yes | policy | mutating |
| `terminal_code_execution` | tools | research | partial | no | yes | mutating |
| `multi_agent_decomposition` | agent | research | partial | no | yes | read_only |
| `persistent_resumable_task_state` | memory | research | yes | yes | policy | read_only |
| `long_context` | context | research | partial | no | policy | read_only |
| `retrieval_project_memory` | memory | research | partial | yes | policy | read_only |
| `verifier_critic` | verification | research | yes | no | yes | read_only |
| `code_generation` | coding | research | partial | no | yes | read_only |
| `code_repair` | coding | research | partial | no | yes | read_only |
| `document_understanding` | multimodal | research | partial | no | policy | read_only |
| `image_understanding` | multimodal | research | partial | no | policy | read_only |
| `local_offline_inference` | runtime | research | yes | no | policy | read_only |
| `speculative_multi_token_hints` | efficiency | research | partial | no | policy | read_only |
| `model_provider_health` | runtime | research | partial | no | policy | read_only |
| `safety_policy_evaluation` | security | research | yes | no | policy | read_only |
| `streaming` | io | research | partial | no | policy | read_only |
| `background_proactive_execution` | agent | research | partial | yes | yes | read_only |

See `config/frontier_capabilities.yaml` for full schema fields.

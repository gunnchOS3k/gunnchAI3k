# Local inference architecture choice — CONTINUATION III

## Selected: **llama.cpp** (GGUF)

| Option | Verdict | Why |
|--------|---------|-----|
| **llama.cpp** | **Selected** | Apple Silicon Metal path, GGUF ecosystem, already probed in Wave C (#21), works from Node via `spawn` without a heavy native addon, suitable for tutoring/code/translation generation on 3B-class or smaller models that fit student/DS-XL profiles. |
| ONNX Runtime | Not selected as primary | Strong for classical / encoder models; weaker ergonomics for instruction-tuned generative LLMs in this Node product path. Kept as non-primary probe only. |
| ExecuTorch | Not selected | Mobile/edge export focus; immature desktop Node integration vs llama.cpp CLI/server for this repo. |

## Runtime contract

1. **If** `llama-cli`/`llama-server` **and** a usable GGUF (`GUNNCHAI3K_LOCAL_GGUF_PATH` or `models/local/*.gguf`) are present **and** the host has enough free RAM → run **real** local inference; record measured latency and process RSS.
2. **Else** → honest probe + install path (`scripts/install-llamacpp-path.sh`); offline capability pack uses structured deterministic essentials; metrics use **placeholders only when no model is available** (never invent LLM scores).
3. Never claim `FULL_GUNNCHAI3K_PLATFORM_DIGITAL_COMPLETE` unless every required capability is truly integrated with a live local (or consented cloud) path — Continuance III does **not** claim this token.

## Hardware note (this workspace)

- Apple M2, 8 GB unified memory, ~23 GB free disk at authoring time.
- llama.cpp binary and GGUF were **not** preinstalled; free RAM was tight → probe reports unavailable and install path is recorded.

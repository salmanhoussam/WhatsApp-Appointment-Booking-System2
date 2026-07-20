# LLM Integration (Ollama)

## What it is

`ai/llm.py` is a thin wrapper around a fully local Ollama model, spoken to via its OpenAI-compatible endpoint (`{OLLAMA_HOST}/v1`, default `http://localhost:11434/v1`) using the official `openai` Python client. No network call ever leaves the machine.

Requires a tool-calling-capable model already pulled via `ollama pull <model>`, matching `config.settings.OLLAMA_MODEL` (default `qwen2.5:7b` — **must match what's actually installed**, or every request fails; this bit a real dogfooding session once, see [decisions](../decisions/) history / `releases/dogfooding-checklist.md`'s Decision Log).

## Contract

`ai.llm.ask(user_message: str) -> dict` returns exactly one of:

```python
{"type": "tool_call", "name": str, "arguments": dict}
{"type": "text", "content": str}          # LLM asked a clarifying question
{"type": "error", "message": str}          # Ollama unreachable, or malformed tool-call JSON
```

The LLM is sent the system prompt (`ai/prompts/system.md`) + the user message + the full tool schema list (`ai/tools/TOOLS`, from `ai/tools/schemas.py`) via `tools=...`. It **never** touches `services/`, `plugins/`, or the database — it only ever picks a tool name and arguments; `agents/database_agent.py` is what actually executes the tool.

## Failure handling

- **Ollama unreachable / any Ollama-side error response** — caught via `except openai.APIError` (this covers `APIConnectionError` — confirmed `APIConnectionError` is a subclass of `APIError` via `issubclass()`). Returns `{"type": "error", ...}` with a clear message naming the expected model + host. Logged as `status="llm_error"`.
- **Malformed tool-call JSON** — `json.loads(call.function.arguments)` wrapped in `except json.JSONDecodeError`. Returns `{"type": "error", ...}` instead of raising. Also logged as `status="llm_error"`.

Both failure modes are operational, not programming errors — they're expected possibilities of talking to a local model, not bugs.

## System prompt

`ai/prompts/system.md` — kept short, currently 5 rules: always respond with a tool call for read/write requests (never fabricate data), pass names through as-given rather than guessing IDs, ask a clarifying question when ambiguous, keep confirmations factual, never claim data was saved unless a tool call actually succeeded.

## Verified so far

- Failure paths (Ollama unreachable, malformed JSON) — verified for real.
- Real end-to-end tool-selection — verified 2026-07-16 with `qwen2.5:3b` for `create_customer`, `list_customers`, `create_product`. See `releases/dogfooding-checklist.md`'s Running Log for Job #s and timings. Most tools (invoices, catalog import/search) and higher request volumes are still unproven — see `STATUS.md`.
- **Performance note:** the first request after Ollama loads a model into memory can take minutes on modest hardware (observed: 224s cold vs. 9-14s warm on an NVIDIA MX110 GPU with `qwen2.5:3b`). Not a hang — the model has to load once. `logging.md`'s `llm_call` stage timing makes this visible per-request.

See [verification/phase2-llm-integration.md](../verification/phase2-llm-integration.md) for the full original verification pass (mostly mocked, before real Ollama was available).

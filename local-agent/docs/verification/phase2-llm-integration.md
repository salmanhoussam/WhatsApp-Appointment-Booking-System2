# Phase 2 — Local LLM Integration

**Scope:** Wire the existing architecture (frozen per `phase1-architecture-review.md`) up to a real local LLM (Ollama), with zero layering changes — the LLM only ever selects a tool name + arguments; it never touches `services/`, `plugins/`, or the database.
**Status:** Failure-handling/logging complete and verified (including one real, unmocked scenario). Success-path tool-selection is implemented but requires the user to install Ollama locally to exercise for real — not runnable in this environment.

---

## Architecture (unchanged from Phase 1)

```
User → agents.database_agent.handle_message()
         → ai.llm.ask()                    -- LLM decides: tool_call | text | error
         → ai.tools.registry.call_tool()   -- only if tool_call
         → services.*_service              -- business logic (validation, name lookups, totals)
         → plugins.plugin_manager.execute()
         → plugins.sqlite.plugin (active)
         → SQLite
         → result formatted + logged (telemetry.log_event, Job #)
```

No file outside `ai/llm.py` and `agents/database_agent.py` was touched for this phase — `ai/tools/`, `services/`, `plugins/`, `database/` are exactly as frozen.

## Deliverables

1. **Ollama integration** — `ai/llm.py` talks to Ollama's OpenAI-compatible endpoint (`{OLLAMA_HOST}/v1`) via the official `openai` client. Unchanged from Phase 1's initial build; this phase only hardened its failure path.
2. **Prompt template** — `ai/prompts/system.md`, reviewed and left as-is (already correctly scopes the model to tool-calls-only, clarifying questions on ambiguity, no fabricated confirmations). No changes needed.
3. **Tool calling workflow** — `ai/tools/schemas.py` (6 tool schemas) passed to `chat.completions.create(tools=...)`; unchanged.
4. **Response parsing** — `ai/llm.py:ask()` now wraps `json.loads()` on the model's tool-call arguments; malformed JSON returns `{"type": "error", ...}` instead of raising.
5. **Failure handling** (new this phase) — `ai/llm.py`'s Ollama call is wrapped in `except openai.APIError` (covers `APIConnectionError`, i.e. Ollama not running, and any Ollama-side error response). `agents/database_agent.py` gained one new branch for `decision["type"] == "error"`.
6. **Logging integration** (new this phase) — both new failure modes log to the event log with `status="llm_error"`, same Job #/duration/detail shape as every other outcome.
7. **Documentation updates** — this file, plus `local-agent-phase1-plan.md`'s status log.

## Verified Scenarios

| # | Scenario | Method | Result |
|---|---|---|---|
| 1 | Ollama unreachable (real — Ollama isn't installed in this dev environment) | Live call, no mocking | `ai.llm.ask()` returned `{"type": "error", ...}`; `database_agent.handle_message()` returned the clear user-facing message; event log recorded Job #1, `status="llm_error"`, full detail, correct duration |
| 2 | Model selects a tool correctly | Mocked `llm.ask()` return value (simulates what a real Ollama tool-call response looks like once parsed) | `create_customer` executed through the full stack (registry → service → plugin_manager → sqlite plugin → DB), row created, event log `status="success"` |
| 3 | Model asks a clarifying question (no tool call) | Mocked | Returned directly as text, event log `status="clarification"`, no tool/plugin involved |
| 4 | Model returns malformed tool-call JSON | Mocked (`MagicMock` simulating a broken `tool_calls` response) | Caught by the new `json.JSONDecodeError` handler, returned `{"type": "error", ...}` instead of an unhandled exception |
| 5 | Full invoice chain (name lookup + total computation) unaffected by this phase's changes | Direct `call_tool()` calls | `create_product` → `create_invoice` (by name) → correct total computed, unchanged from Phase 1 verification |

**Not verified (requires the user's machine):** a real Ollama instance actually selecting the correct tool from a natural-language sentence. Everything downstream of "the LLM successfully returns a tool_call" is verified (scenario 2, via a realistic mocked return value); only the LLM's own reasoning quality is untested here.

## Explicitly Out of Scope (per this phase's instructions)

Vision, WhatsApp, OCR, and external (non-sqlite/postgres) plugins were not touched.

## Next Step

Install Ollama on the user's machine (`ollama pull qwen2.5:7b`, `ollama serve`) and run scenario 2 for real against `POST /agent/command` to close the one remaining unverified link.

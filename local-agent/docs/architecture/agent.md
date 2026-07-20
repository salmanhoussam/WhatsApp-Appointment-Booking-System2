# Agent Layer

## Files

- `agents/command_agent.py` — the single entrypoint `main.py`/`app/routes.py` calls. Today it always routes to `database_agent` (only one capable sub-agent exists yet).
- `agents/database_agent.py` — turns one natural-language message into a database action.
- `agents/vision_agent.py` — Phase 3+ stub (`handle_image(image_bytes) -> str`, raises `NotImplementedError`). Not wired into `command_agent` yet.

## Request lifecycle (`database_agent.handle_message(text)`)

1. Allocate a Job # (`telemetry.next_job_id()`), log `request_received`.
2. Call `ai.llm.ask(text)` — the LLM either returns a tool call, a clarifying text question, or an error. Log the `llm_call` stage with its own duration.
3. **If error** (Ollama unreachable / malformed tool-call JSON) — log final event with `status="llm_error"`, return the message.
4. **If text** (clarifying question) — log final event with `status="clarification"`, return the text.
5. **If tool_call** — log `tool_selected`, then call `ai.tools.registry.call_tool(name, arguments)` (this is what actually reaches `services/` → `plugins/`). Log `plugin_execute` with its own duration.
6. Log the final summary event (`status="success"|"error"`), format and return a human-readable confirmation.

See [logging.md](logging.md) for the exact event shapes.

## A known, deliberate rough edge

`command_agent.handle(text: str) -> str` has a **text-only signature**. `vision_agent.handle_image()` has a different signature and is never called. When Phase 3 vision work starts, `command_agent.handle()` will need a real signature/routing change (text vs. image dispatch) — a breaking change to the one function every entrypoint currently depends on. Flagged now so it isn't a surprise later; not something to fix before Phase 3 actually needs it.

## What this layer must never do

Import `plugins` or `database.repositories` directly. If you find yourself importing either from anywhere under `agents/`, stop — that's a layering violation. Go through `ai.tools.call_tool()` instead.

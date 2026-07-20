# AGENTS.md — Salman Local AI Agent

Operational instructions for any AI coding agent (Claude Code, Codex, Cursor, Windsurf, ...) working inside `local-agent/`. This file only — the root `.claude/CLAUDE.md` documents the whole SalmanSaaS platform (booking/restaurant/store tenants) and is mostly irrelevant here; `local-agent/` is a separate standalone product in the same repo.

For everything not covered here, start at [`docs/llms.txt`](docs/llms.txt).

## What this project is

A local AI agent that runs entirely on one machine and talks to a local database (SQLite by default, Postgres also supported) through a plugin system, driven by a fully local LLM via Ollama. No data or prompts leave the machine. Status: **RC1** (`0.1.0-rc1`), feature frozen, in dogfooding — see [`docs/STATUS.md`](docs/STATUS.md) before proposing any new feature.

## Repository structure

```
local-agent/
├── main.py              # entrypoint, uvicorn on port 8010
├── app/                 # FastAPI routes — HTTP transport only, zero business logic
├── agents/               # command_agent (entrypoint) -> database_agent (LLM + tool dispatch)
├── ai/                   # llm.py (Ollama client), tools/ (schemas.py + registry.py), prompts/system.md
├── services/             # business logic — validation, name lookups, totals
├── plugins/               # plugin_interface.py (contract) + plugin_manager.py + sqlite/, postgres/
├── database/             # models/ (Pydantic), repositories/ (internal, used only by plugins/), migrations/
├── telemetry.py           # event log -> logs/events.log
├── config/settings.py     # the ONLY file that reads os.environ
└── docs/                  # see docs/llms.txt
```

## Hard layering rule (do not violate)

`Agent → Tools → Services → Plugin Manager → Plugin`. Concretely:
- `agents/` may import `ai.llm`, `ai.tools`, `telemetry`, `config.settings` — **never** `plugins` or `database.repositories` directly.
- `services/` may import `plugins.plugin_manager`, `database.models`, and sibling services — **never** `plugins.sqlite`/`plugins.postgres` directly, **never** `database.repositories`.
- Only `plugins/sqlite/` and `plugins/postgres/` may import `database.repositories`.

Verify this by import inspection, not by re-reading docstrings, before claiming a change respects the layering. See [`docs/architecture/overview.md`](docs/architecture/overview.md).

## Commands

```bash
cd local-agent
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python main.py                              # serves http://127.0.0.1:8010
curl -X POST localhost:8010/agent/setup -d '{}'
curl -X POST localhost:8010/agent/command -d '{"text": "add customer Ahmad, phone 03123456"}'
tail -f logs/events.log
```

Requires Ollama running (`ollama serve`) with a model actually pulled, matching `OLLAMA_MODEL` (default `qwen2.5:7b` — **set the env var if you pulled a different one**, or every request fails with `status="llm_error"`; see [`docs/decisions/`](docs/decisions/) history for why this matters).

Switch database plugin: `LOCAL_AGENT_PLUGIN=postgres LOCAL_AGENT_POSTGRES_DSN=... python main.py`.

## Conventions

- Adding a **tool** (new agent capability) = one schema in `ai/tools/schemas.py` + one function in `ai/tools/registry.py` calling one `services/` function. No other layer changes.
- Adding a **plugin** (new backend) = implement `plugins.plugin_interface.Plugin.execute(action, payload) -> dict`, register in `plugins/plugin_manager.py`. See [`docs/guides/adding-a-plugin.md`](docs/guides/adding-a-plugin.md).
- Extract a shared abstraction only after ≥2 independently-built production use cases prove the same stable shape — do not abstract for predicted future need. See [`docs/decisions/0002-shared-vs-concrete-abstraction-rule.md`](docs/decisions/0002-shared-vs-concrete-abstraction-rule.md).
- Every event-log write goes through `telemetry.py` (`log_event()` for the final per-request summary, `log_stage()` for intermediate trace points) — never write to `logs/events.log` directly.

## RC1 boundary (currently active — see docs/STATUS.md)

No new features, no architecture changes. Only prompt wording tweaks, isolated bug fixes, and documentation updates are in scope until RC1 exit criteria are met. Anything bigger goes on the post-RC1 backlog. Every real change made during RC1 gets a Decision Log entry in [`docs/releases/dogfooding-checklist.md`](docs/releases/dogfooding-checklist.md).

## Testing

No automated test suite exists yet (known limitation — see `docs/STATUS.md`). Verification is manual: run `main.py`, hit the endpoints above, read `logs/events.log` to confirm the expected tool/plugin/status.

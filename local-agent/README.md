# Salman Local AI Agent

**Status: RC1 (`0.1.0-rc1`)** — feature frozen, dogfooding in progress. See
`.claudelocaldocs/rc1-release-notes.md` (definition, exit criteria, known
limitations) and `.claudelocaldocs/dogfooding-checklist.md` (daily usage +
Decision Log). No new features until RC1 exit criteria are met.

A standalone product: a local AI agent that runs entirely on your own machine
and talks to your *local* database (SQLite by default, Postgres also
supported) through a **plugin system**. No data or prompts leave the
machine — the LLM itself runs locally via [Ollama](https://ollama.com).

This is **not** part of the main SalmanSaaS backend and doesn't touch
`app/`, `frontend/`, or `prisma/` in the parent repo. See
`.claudelocaldocs/local-agent-phase1-plan.md` for the full design doc and
the Phase 2 (WhatsApp) / Phase 3 (more plugins) roadmap.

## Architecture

```
Agent  →  Tools (ai/tools)  →  Services  →  Plugin Manager  →  Plugin (sqlite / postgres / ...)
```

The agent only ever knows tool names (`create_customer`, `list_products`, ...)
— it never imports a database driver or even knows what "SQLite" is.
`services/` holds the actual business logic (validation, name-to-id lookups,
computing invoice totals) and calls `plugins.plugin_manager.execute(action,
payload)`. Each plugin (`plugins/sqlite/plugin.py`, `plugins/postgres/plugin.py`)
implements one method — `Plugin.execute(action, payload) -> dict` — so a
future plugin doesn't have to be a database at all; a POS/ERP integration
(Odoo, Square, a local POS API) can implement the exact same interface.
Swapping `config.settings.ACTIVE_PLUGIN` from `sqlite` to `postgres` changes
zero lines above the plugin layer — that's the whole point of the split.

Every command is recorded in an **event log** (`logs/events.log`, JSON-lines)
with a sequential Job # tracing Input → Tool → Plugin → Result → Duration —
see `telemetry.py`.

## Prerequisites

1. Python 3.11+
2. [Ollama](https://ollama.com) installed and running (`ollama serve`), with a
   tool-calling-capable model pulled:
   ```bash
   ollama pull qwen2.5:7b
   ```
   (or `llama3.1:8b` — set `OLLAMA_MODEL` env var if you use a different one)

## Setup

```bash
cd local-agent
python -m venv .venv
source .venv/bin/activate   # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
```

Postgres support (`psycopg`) is included in `requirements.txt`, but you only
need a running Postgres server if you set `LOCAL_AGENT_PLUGIN=postgres` — the
default (`sqlite`) needs nothing extra installed.

## Run

```bash
python main.py
```

Starts a server on `http://127.0.0.1:8010` — a distinct port from the main
SalmanSaaS backend, so both can run at the same time without conflicting.

## Try it

```bash
# 1. Create the local database (customers/products/invoices tables)
curl -X POST localhost:8010/agent/setup \
  -H "Content-Type: application/json" \
  -d '{"context": "small furniture shop, track customers, products, invoices"}'

# 2. Talk to the agent in plain language
curl -X POST localhost:8010/agent/command \
  -H "Content-Type: application/json" \
  -d '{"text": "add customer Ahmad, phone 03123456"}'

curl -X POST localhost:8010/agent/command \
  -H "Content-Type: application/json" \
  -d '{"text": "add product Chair, price 45"}'

curl -X POST localhost:8010/agent/command \
  -H "Content-Type: application/json" \
  -d '{"text": "Ahmad bought 2 chairs"}'

curl -X POST localhost:8010/agent/command \
  -H "Content-Type: application/json" \
  -d '{"text": "list all customers"}'

# Product catalog import (Phase 2.5) — reference data, decoupled from the
# operational products table above. See .claudelocaldocs/phase2.5-data-validation-report.md
curl -X POST localhost:8010/agent/command \
  -H "Content-Type: application/json" \
  -d '{"text": "preview importing the catalog file at /path/to/file.xls"}'

curl -X POST localhost:8010/agent/command \
  -H "Content-Type: application/json" \
  -d '{"text": "import the product catalog from /path/to/file.xls"}'

curl -X POST localhost:8010/agent/command \
  -H "Content-Type: application/json" \
  -d '{"text": "search the catalog for kit kat"}'

# See which plugin is active
curl localhost:8010/plugins

# See every command traced (Job #, tool, plugin, duration, result)
tail -f logs/events.log
```

## Switching plugin

```bash
LOCAL_AGENT_PLUGIN=postgres LOCAL_AGENT_POSTGRES_DSN=postgresql://user:pass@localhost:5432/local_agent python main.py
```

The exact same `agents/`, `services/`, and `ai/` code runs unchanged — only
`plugins/plugin_manager.py` loads a different concrete `Plugin`.

## Adding a new plugin (Phase 3+)

1. Create `plugins/<name>/plugin.py` implementing `plugins.plugin_interface.Plugin`
   — one `execute(action, payload) -> dict` method, dispatching whatever
   actions it supports (see `plugins/sqlite/plugin.py` as the reference).
2. Register it in `plugins/plugin_manager.py`'s `_load_builtin_plugins()`.
3. Set `LOCAL_AGENT_PLUGIN=<name>`.

Nothing in `agents/`, `services/`, or `ai/` needs to change.

## LLM failure handling (Phase 2)

`ai/llm.py` catches Ollama being unreachable and malformed tool-call
responses — both return a clear message and log to `logs/events.log` with
`status="llm_error"` instead of crashing the request. See
`.claudelocaldocs/phase2-llm-integration.md` for verified scenarios.

## Product catalog import (Phase 2.5)

Imported business data (starting with a POS product price-list export) is
stored as a **decoupled reference** — `import_batches` + `product_catalog` —
completely separate from the operational `customers`/`products`/`invoices`
tables. Importing a catalog never modifies `products`. See
`.claudelocaldocs/phase2.5-data-validation-report.md` for the full design
and decisions, and `.claude/rules/team-roles.md` for the standing
abstraction rule this follows: `import_batches` is shared across future
import types (an `entity_type` column, since batch metadata provably
doesn't vary); `catalog_import_service.py` is deliberately concrete and
product-catalog-specific — not a generic Import Engine. That's only
justified once a second real import type (e.g. customers) is actually built.

Duplicate SKUs are never auto-removed — only reported. `rollback_import_batch`
exists at the service/plugin level but is intentionally not exposed as an
LLM tool yet (destructive action).

## What's NOT built yet (by design)

- No WhatsApp integration, no vision/OCR (`agents/vision_agent.py` is a stub,
  `NotImplementedError`) — Phase 3+.
- No MySQL/SQL Server/POS/Odoo/Square plugins — only empty placeholder
  folders with a README each under `plugins/` — Phase 3+.
- No customer/invoice/inventory import yet — only product catalog import exists.
- `/agent/setup`'s schema is fixed (customers/products/invoices); the
  `context` you send is logged for reference but doesn't yet drive a
  dynamically generated schema.
- No plugin enable/disable/hot-reload management — `plugin_manager.py` loads
  exactly one active plugin at startup, per `ACTIVE_PLUGIN`.
- The actual LLM tool-selection step is only verified via a realistic mock
  in this environment (Ollama isn't installed here) — real end-to-end
  verification needs the user's machine.

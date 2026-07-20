# Architecture Overview

## Layering

```
Agent (agents/)
  -> Tools (ai/tools/schemas.py + registry.py)
    -> Services (services/*.py)
      -> Plugin Manager (plugins/plugin_manager.py)
        -> Plugin (plugins/sqlite/ or plugins/postgres/, whichever is ACTIVE_PLUGIN)
          -> the actual database
```

Verified by import inspection, not just docstring claims: `agents/` never imports `plugins` or `database.repositories`; `services/` never imports `plugins.sqlite`/`plugins.postgres` or `database.repositories` directly, only `plugins.plugin_manager`. Only `plugins/sqlite/` and `plugins/postgres/` are allowed to import `database.repositories` — that folder is an internal implementation detail of the two SQL-based plugins, not a peer layer.

## Design principles

- **The LLM only ever selects a tool name + arguments.** It never touches `services/`, `plugins/`, or the database directly — see [llm.md](llm.md).
- **`Plugin.execute(action, payload) -> dict`** is deliberately generic, not a set of typed CRUD methods — a future POS/ERP integration (Odoo, Square) can implement the exact same interface without being a database at all. See [plugins.md](plugins.md).
- **Imported business data (e.g. a product price-catalog) is a decoupled external reference**, never merged into the operational `customers`/`products`/`invoices` tables — see [database.md](database.md) and [decisions/0003](../decisions/0003-catalog-import-decoupled-from-operational-schema.md).
- **Shared abstractions wait for ≥2 real implementations** before being extracted — see [decisions/0002](../decisions/0002-shared-vs-concrete-abstraction-rule.md).
- **Every command is traced end-to-end** with a sequential Job # through the event log — see [logging.md](logging.md).

## Request lifecycle (one line)

`main.py` → `app/routes.py:/agent/command` → `agents/command_agent.handle()` → `agents/database_agent.handle_message()` → ... see [agent.md](agent.md) for the full breakdown.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | liveness + active plugin name |
| GET | `/plugins` | active plugin + which plugins have been loaded |
| POST | `/agent/setup` | creates the local schema if missing (schema is fixed — `customers`/`products`/`invoices`/`import_batches`/`product_catalog`; the `context` field you send is logged for reference only, it doesn't yet drive a dynamic schema) |
| POST | `/agent/command` | the natural-language entrypoint |

Routes (`app/routes.py`) are HTTP transport only — no business logic, per the same convention the main SalmanSaaS backend uses.

## Why this shape

The whole point of the plugin split is that swapping `config.settings.ACTIVE_PLUGIN` from `sqlite` to `postgres` changes zero lines above the plugin layer. That property is verified, not aspirational — see [verification/phase1-architecture-review.md](../verification/phase1-architecture-review.md) §2-3.

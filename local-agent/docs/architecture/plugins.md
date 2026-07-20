# Plugin System

## The contract

`plugins/plugin_interface.py`:

```python
class Plugin(ABC):
    name: str

    @abstractmethod
    def execute(self, action: str, payload: dict) -> dict:
        ...
```

Deliberately **not** a set of typed CRUD methods (`create_customer()`, `get_product()`, ...). A generic `execute(action, payload)` is what lets a plugin be something that isn't a database at all — a REST-based POS/ERP integration (Odoo, Square, a local POS) can implement the exact same interface a SQL plugin does. The services layer decides which `action` string to send; the plugin decides how to fulfill it.

Convention: on success return `{"created": {...}}` / `{"customer": {...}}` / `{"customers": [...]}` etc.; on failure return `{"error": "..."}`. Never raise for expected failures (not-found, bad payload) — only for genuine bugs/connection failures.

## Plugin Manager

`plugins/plugin_manager.py` is the single place that knows which concrete plugin is active. `register()`/`get_active_plugin()`/`execute(action, payload)` — everything above this layer only ever calls `plugin_manager.execute()`. Plugins are lazy-imported (`_load_builtin_plugins()`) so e.g. `psycopg` is never imported/required unless `postgres` is actually the active plugin.

Set via `config.settings.ACTIVE_PLUGIN` (env var `LOCAL_AGENT_PLUGIN`, falls back to the older `LOCAL_AGENT_DB` name). Unknown plugin name raises `ValueError` — but only on first use (first API call), not at process startup, so a typo'd env var produces a confusing runtime error on the first real command rather than an immediate startup failure. Known, not yet fixed.

## Built-in plugins

- `plugins/sqlite/` — default, fully implemented. Internally uses `database/repositories/` (customer/product/invoice) plus direct SQL for the catalog-import actions (`db.py:get_connection()`).
- `plugins/postgres/` — same action set, full parity, implemented but **never run against a live Postgres server** (known limitation — see `STATUS.md`).
- `plugins/mysql/`, `plugins/sqlserver/`, `plugins/pos/` — empty placeholder folders with a README each, Phase 3+, not implemented.

Both SQL plugins currently duplicate their `_ACTIONS` dispatch dict and per-action method shape. Tolerated at 2 plugins; **explicitly not being extracted into a shared base class yet** — see [decisions/0002](../decisions/0002-shared-vs-concrete-abstraction-rule.md). Revisit once a 3rd SQL-based plugin exists.

## Action set (both SQL plugins, at parity)

`create_customer`, `get_customer`, `find_customer`, `list_customers`, `create_product`, `get_product`, `find_product`, `list_products`, `create_invoice`, `get_invoice`, `list_invoices`, `commit_product_catalog_import`, `list_import_batches`, `search_product_catalog`, `rollback_import_batch`.

## Adding a new plugin

See [../guides/adding-a-plugin.md](../guides/adding-a-plugin.md) for the step-by-step.

## Missing production considerations (known, not urgent at current scale)

- No connection pooling — each call opens a fresh connection via a context manager. Correct for a single local user; would need pooling before concurrent load.
- No plugin enable/disable/hot-reload — exactly one plugin loads for the process lifetime.

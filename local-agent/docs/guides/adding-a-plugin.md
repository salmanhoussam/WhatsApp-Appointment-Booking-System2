# Adding a New Plugin (Phase 3+)

For a new backend (MySQL, SQL Server, a POS API, Odoo, Square, ...):

1. Create `plugins/<name>/plugin.py` implementing `plugins.plugin_interface.Plugin` — one `execute(action, payload) -> dict` method, dispatching whatever actions it supports. Use `plugins/sqlite/plugin.py` as the reference shape (an `_ACTIONS` dict mapping action name → bound method).
2. Register it in `plugins/plugin_manager.py`'s `_load_builtin_plugins()` — lazy-import it there (don't import your new plugin's dependencies at module load time, so they're never required unless the plugin is actually active).
3. Set `LOCAL_AGENT_PLUGIN=<name>` to activate it.

Nothing in `agents/`, `services/`, or `ai/` needs to change — that's the entire point of the plugin split, see [../architecture/overview.md](../architecture/overview.md).

## If it's not a SQL database

A REST-based integration (Odoo, Square) doesn't need to implement every action in the current set — implement whichever actions make sense for that system (e.g. `create_customer` might map to a real API call, `create_invoice` might not apply at all — return `{"error": "not supported"}` for actions that don't translate).

## Before extracting shared code

Two SQL-based plugins (`sqlite`, `postgres`) currently duplicate their dispatch logic — this is a known, accepted piece of debt, not an oversight. Do not introduce a shared base class for a 3rd plugin without checking [../decisions/0002-shared-vs-concrete-abstraction-rule.md](../decisions/0002-shared-vs-concrete-abstraction-rule.md) first — the rule requires the shared shape to be proven by real, independent implementations, not guessed at.

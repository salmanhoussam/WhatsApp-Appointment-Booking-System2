"""
Loads and dispatches to whichever plugin is active — the single place that
knows which concrete system (SQLite, Postgres, and later Odoo/Square/a local
POS...) is actually in use. Everything above this layer (services/, agents/)
only ever calls `plugin_manager.execute(action, payload)`.

Adding a new plugin = add a `plugins/<name>/plugin.py` implementing
`Plugin.execute()`, register it in `_load_builtin_plugins()` (or later,
a real dynamic-discovery loader), and point `config.settings.ACTIVE_PLUGIN`
at it. Nothing else in the codebase changes.
"""

from config import settings
from plugins.plugin_interface import Plugin

_REGISTRY: dict[str, Plugin] = {}


def register(plugin: Plugin) -> None:
    _REGISTRY[plugin.name] = plugin


def list_plugins() -> list[str]:
    _ensure_loaded()
    return list(_REGISTRY.keys())


def get_active_plugin() -> Plugin:
    _ensure_loaded()
    name = settings.ACTIVE_PLUGIN
    if name not in _REGISTRY:
        raise ValueError(f"Unknown plugin '{name}'. Available: {list(_REGISTRY.keys())}")
    return _REGISTRY[name]


def execute(action: str, payload: dict) -> dict:
    return get_active_plugin().execute(action, payload)


def _ensure_loaded() -> None:
    if _REGISTRY:
        return
    _load_builtin_plugins()


def _load_builtin_plugins() -> None:
    # Lazy imports so, e.g., psycopg is never imported (or required to be
    # installed) unless the postgres plugin is actually the active one.
    if settings.ACTIVE_PLUGIN == "sqlite":
        from plugins.sqlite.plugin import SqlitePlugin

        register(SqlitePlugin())
    elif settings.ACTIVE_PLUGIN == "postgres":
        from plugins.postgres.plugin import PostgresPlugin

        register(PostgresPlugin())
    else:
        raise ValueError(
            f"Unknown plugin '{settings.ACTIVE_PLUGIN}' — only 'sqlite' and 'postgres' "
            "are implemented in Phase 1 (see plugins/{mysql,sqlserver,pos}/README.md)."
        )

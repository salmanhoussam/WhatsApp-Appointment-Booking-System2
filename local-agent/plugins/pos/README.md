# pos plugin — Phase 3, not implemented yet

Reserved location for a pos implementation of `plugins.plugin_interface.Plugin`
(a single `execute(action, payload)` method — see `plugins/sqlite/plugin.py`
for the reference implementation and `plugins/plugin_manager.py` for how a
plugin gets registered/activated).

Phase 1 only implements `sqlite` (default) and `postgres`.

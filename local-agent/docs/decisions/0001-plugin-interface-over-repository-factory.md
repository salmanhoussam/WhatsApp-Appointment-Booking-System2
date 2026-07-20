# 0001 — Plugin Interface over Typed Repository Factory

**Date:** 2026-07-14

## Decision

Renamed the original `connectors/` folder to `plugins/`, replacing a typed-repository factory pattern with a real `plugins/plugin_interface.py` (`Plugin.execute(action, payload) -> dict`) and `plugins/plugin_manager.py`.

## Why

Future integrations (Odoo, SAP, Square, a local POS) aren't databases with CRUD repositories — a generic action-dispatch interface is what actually generalizes across them. "Connector" implied "database" too narrowly for where this product is headed.

## What changed as a result

Layering tightened to `Agent → Tools → Services → Plugin Manager → Plugin`. Confirmed the agent already never imported repositories directly; `services/` was updated so it doesn't either — it only calls `plugin_manager.execute()`. `database/repositories/` (the old typed ABCs) remain as an internal implementation detail used only inside `plugins/sqlite/` and `plugins/postgres/` — no longer the public contract.

## Related

[../architecture/plugins.md](../architecture/plugins.md), [../architecture/overview.md](../architecture/overview.md)

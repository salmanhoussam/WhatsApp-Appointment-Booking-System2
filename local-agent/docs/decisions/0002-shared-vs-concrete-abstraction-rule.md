# 0002 — Shared vs. Concrete: The Abstraction Rule

**Date:** 2026-07-15 (Phase 2.5)

## The rule

Extract a shared abstraction only after at least two independently implemented production use cases demonstrate the same stable behavior. Do not abstract based on predicted future requirements.

This is a standing project rule, also recorded in the root `.claude/rules/team-roles.md` (Architecture Guardian section) since it applies beyond `local-agent/`.

## Applied precedents in this codebase

- **`plugins/sqlite/plugin.py` and `plugins/postgres/plugin.py`** duplicate their action-dispatch logic (identical `_ACTIONS` dict shape, identical method names). Flagged during the Phase 1 architecture review, **not extracted** — 2 database plugins isn't enough evidence of the right shared shape, and Phase 3's REST-API-based plugins (Odoo/Square) haven't yet shown what actually needs to vary. Revisit at a 3rd SQL-based plugin.
- **`services/catalog_import_service.py`** is deliberately concrete and product-catalog-specific, not a generic Import Engine — it is import type #1. A shared import base class waits for a second real import type (e.g. customers, per the roadmap) to prove what actually varies.
- **The one piece that *was* shared immediately: `import_batches`** (with an `entity_type` column, instead of one batches-table per import type). Judged genuinely zero-risk — batch metadata (source file, timing, row count, status) provably doesn't vary by entity type. This is the distinction the rule protects: share what's *proven* identical, keep separate what's merely *predicted* to end up similar.

## Related

[../architecture/plugins.md](../architecture/plugins.md), [../architecture/database.md](../architecture/database.md), [0003-catalog-import-decoupled-from-operational-schema.md](0003-catalog-import-decoupled-from-operational-schema.md)

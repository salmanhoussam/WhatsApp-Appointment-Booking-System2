# 0003 — Catalog Import Stays Decoupled From Operational Schema

**Date:** 2026-07-15 (Phase 2.5)

## Context

A real 93-row POS product price-list export (`.xls`) was analyzed before any import code was written (see [../verification/phase2.5-data-validation-report.md](../verification/phase2.5-data-validation-report.md) for the full dataset/schema/mapping analysis). The initial proposal was to normalize the data into `categories`/`tax_classes`/`products`/`product_prices` tables, potentially touching the frozen `products` table.

## Directive (verbatim)

> Imported business data is an external reference source, not the operational database. It must stay decoupled from runtime entities (`products`, `customers`, `invoices`, ...) until the business's full workflows and future file types are understood. No operational schema changes based on a single import file — the first Excel a client sends must never dictate the shape of the live database.

## Decisions this produced

| # | Question | Decision |
|---|---|---|
| 1 | Partial catalog? | Assume yes — design must support importing more catalogs later without schema changes |
| 2 | More entities coming? | Yes eventually (customers, invoices, inventory) — do not build those now |
| 3 | Duplicates | Never auto-deduplicate — report only, human decides |
| 4 | Touch `products`? | No — import goes into a new, separate reference table |
| 5 | Min price | Store if present, don't enforce |
| 6 | Split `unit`? | No — keep as one raw string until varied formats actually appear |
| 7 | Activation date | Metadata only — no price-history logic yet |

## Resulting schema

A flat, generic reference table — deliberately *not* normalized into lookup tables, and *not* split into products/prices. `import_batches` (shared, `entity_type` column) + `product_catalog` (concrete). See [../architecture/database.md](../architecture/database.md) for the exact columns.

## Related

[0002-shared-vs-concrete-abstraction-rule.md](0002-shared-vs-concrete-abstraction-rule.md), [../architecture/database.md](../architecture/database.md), [../guides/importing-a-catalog.md](../guides/importing-a-catalog.md)

# Database & Schema

## Operational tables (fixed since Phase 1)

```sql
customers(id PK, name NOT NULL, phone, email, notes)
products(id PK, name NOT NULL, price NOT NULL, quantity DEFAULT 0, notes)
invoices(id PK, customer_id FK, product_id FK, quantity, total, notes)
```

Defined in `database/migrations/schema.sql` (SQLite — `AUTOINCREMENT`) and `database/migrations/schema_postgres.sql` (Postgres — `SERIAL`), created by `database/migrations/runner.py` on `POST /agent/setup`. Pydantic models in `database/models/` (`Customer`, `Product`, `Invoice`).

`database/repositories/` (customer/product/invoice) are the internal implementation detail **only** `plugins/sqlite/` and `plugins/postgres/` are allowed to import — not a public layer, not something `services/` or `agents/` should ever touch directly.

## Reference tables (Phase 2.5 — the catalog-import capability)

```sql
import_batches(id PK, entity_type, source_file, imported_at, row_count, status)
product_catalog(id PK, import_batch_id FK, category, name NOT NULL, sku_code, tax_class,
                 unit, currency, price, price_incl_tax, min_price, min_price_incl_tax,
                 activation_date, source_created_by, source_created_at)
```

**Architectural rule these implement:** imported business data is an external reference source, never merged into the operational tables above. `product_catalog` has no foreign key into `products`/`customers`/`invoices` — it's intentionally an island. See [decisions/0003](../decisions/0003-catalog-import-decoupled-from-operational-schema.md) for the full rationale and the 7 explicit decisions behind this shape (why `unit` stays one raw string, why `price_incl_tax` is stored rather than derived, why duplicates are reported but never auto-removed, etc).

`import_batches` is **shared** across every future import type (`entity_type` distinguishes them — today only `"product_catalog"` exists). `product_catalog` itself is **concrete** and product-specific, not a generic import table — see [decisions/0002](../decisions/0002-shared-vs-concrete-abstraction-rule.md) for why that split is intentional, not an oversight.

`database/models/import_batch.py`, `catalog_item.py` — the corresponding Pydantic models.

## The importer

`services/catalog_import_service.py` — concrete, not a generic "import any file" engine. Knows the exact 13-column shape verified against a real POS price-list export (`.xls` via `xlrd`, handling `XL_CELL_DATE`; `.xlsx` via `openpyxl`, native datetimes). Normalizes whitespace only — does not split `unit`, does not derive/drop the `*_incl_tax` columns, does not build price history (all deliberate, per the Phase 2.5 decisions).

- `preview_catalog_import(file_path)` — dry run, parses and reports (row count, possible duplicates, sample), writes nothing.
- `import_product_catalog(file_path)` — parses and commits one `import_batches` row + all `product_catalog` rows atomically via `plugin_manager.execute("commit_product_catalog_import", ...)`.
- `list_catalog_imports()` / `search_catalog(query)` — read paths.
- `rollback_catalog_import(batch_id)` — deletes the batch's rows, marks it `rolled_back`. Guards against re-rolling-back or an unknown batch id.

**Duplicate handling:** report-only, keyed on `(name, price, unit)` after whitespace normalization. Never auto-removed — a real business decision, not a bug (see decisions/0003).

See [../guides/importing-a-catalog.md](../guides/importing-a-catalog.md) for the how-to, [../verification/phase2.5-data-validation-report.md](../verification/phase2.5-data-validation-report.md) for the original dataset analysis this was designed against.

## Switching database engine

`config.settings.ACTIVE_PLUGIN` (env var `LOCAL_AGENT_PLUGIN`) picks `sqlite` (default) or `postgres`. Same schema, same repository/plugin contract on both — see [../guides/switching-database.md](../guides/switching-database.md).

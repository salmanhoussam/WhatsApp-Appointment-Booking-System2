# Importing a Product Catalog

Reference data only — never touches the operational `products` table. See [../architecture/database.md](../architecture/database.md) for why.

Supported formats: `.xls` (legacy binary, via `xlrd`) and `.xlsx` (via `openpyxl`). The importer expects the specific 13-column shape verified against a real POS price-list export (category, name, code, tax class, unit, currency, price, price+tax, activation date, min price, min price+tax, created by, created at), with 3 header rows skipped.

```bash
# 1. Dry run — see what would happen, write nothing
curl -X POST localhost:8010/agent/command \
  -H "Content-Type: application/json" \
  -d '{"text": "preview importing the catalog file at /path/to/file.xls"}'

# 2. Commit the import
curl -X POST localhost:8010/agent/command \
  -H "Content-Type: application/json" \
  -d '{"text": "import the product catalog from /path/to/file.xls"}'

# 3. Search it
curl -X POST localhost:8010/agent/command \
  -H "Content-Type: application/json" \
  -d '{"text": "search the catalog for kit kat"}'

# 4. List past imports
curl -X POST localhost:8010/agent/command \
  -H "Content-Type: application/json" \
  -d '{"text": "list all catalog imports"}'
```

## Duplicates

Possible duplicates (same name + price + unit, different SKU) are reported in the preview/import response — **never auto-removed**. That's a deliberate business decision, not a missing feature — see [../decisions/0003-catalog-import-decoupled-from-operational-schema.md](../decisions/0003-catalog-import-decoupled-from-operational-schema.md).

## Rollback

`rollback_import_batch` exists at the service/plugin level (`services/catalog_import_service.py:rollback_catalog_import(batch_id)`) but is **intentionally not exposed as an LLM tool** — it's a destructive action. Call it directly if you need to undo an import during testing/dogfooding.

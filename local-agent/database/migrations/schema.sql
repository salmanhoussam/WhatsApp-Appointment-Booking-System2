-- SQLite schema for the Salman Local AI Agent Phase 1 proof of concept.
-- The Postgres connector uses its own variant (schema_postgres.sql) since
-- Postgres doesn't support SQLite's AUTOINCREMENT syntax.

CREATE TABLE IF NOT EXISTS customers (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    name    TEXT NOT NULL,
    phone   TEXT,
    email   TEXT,
    notes   TEXT
);

CREATE TABLE IF NOT EXISTS products (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    name     TEXT NOT NULL,
    price    REAL NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    notes    TEXT
);

CREATE TABLE IF NOT EXISTS invoices (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    product_id  INTEGER NOT NULL REFERENCES products(id),
    quantity    INTEGER NOT NULL,
    total       REAL NOT NULL,
    notes       TEXT
);

-- Import capability (Phase 2.5) — imported business data is a decoupled
-- external reference, never merged into the operational tables above.
-- import_batches is intentionally SHARED across every future import type
-- (entity_type distinguishes them); product_catalog is intentionally
-- CONCRETE and product-specific — no generic "Import Engine" exists yet.
-- See .claudelocaldocs/phase2.5-data-validation-report.md and
-- .claude/rules/team-roles.md's Architecture Guardian rule on abstraction.

CREATE TABLE IF NOT EXISTS import_batches (
    id           TEXT PRIMARY KEY,
    entity_type  TEXT NOT NULL,
    source_file  TEXT NOT NULL,
    imported_at  TEXT NOT NULL,
    row_count    INTEGER NOT NULL,
    status       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS product_catalog (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    import_batch_id     TEXT NOT NULL REFERENCES import_batches(id),
    category            TEXT,
    name                TEXT NOT NULL,
    sku_code            TEXT,
    tax_class           TEXT,
    unit                TEXT,
    currency            TEXT,
    price               REAL,
    price_incl_tax      REAL,
    min_price           REAL,
    min_price_incl_tax  REAL,
    activation_date     TEXT,
    source_created_by   TEXT,
    source_created_at   TEXT
);

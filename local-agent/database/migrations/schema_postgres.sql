-- Postgres schema variant for the Salman Local AI Agent Phase 1 proof of
-- concept. Same tables/columns as schema.sql (the SQLite version), using
-- SERIAL instead of AUTOINCREMENT.

CREATE TABLE IF NOT EXISTS customers (
    id      SERIAL PRIMARY KEY,
    name    TEXT NOT NULL,
    phone   TEXT,
    email   TEXT,
    notes   TEXT
);

CREATE TABLE IF NOT EXISTS products (
    id       SERIAL PRIMARY KEY,
    name     TEXT NOT NULL,
    price    REAL NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    notes    TEXT
);

CREATE TABLE IF NOT EXISTS invoices (
    id          SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    product_id  INTEGER NOT NULL REFERENCES products(id),
    quantity    INTEGER NOT NULL,
    total       REAL NOT NULL,
    notes       TEXT
);

-- Import capability (Phase 2.5) — see schema.sql for the full rationale.
-- import_batches is shared across future import types; product_catalog
-- is concrete and product-specific.

CREATE TABLE IF NOT EXISTS import_batches (
    id           TEXT PRIMARY KEY,
    entity_type  TEXT NOT NULL,
    source_file  TEXT NOT NULL,
    imported_at  TEXT NOT NULL,
    row_count    INTEGER NOT NULL,
    status       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS product_catalog (
    id                  SERIAL PRIMARY KEY,
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

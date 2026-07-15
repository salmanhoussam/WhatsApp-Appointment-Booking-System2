"""
SQLite plugin — implements Plugin.execute() by dispatching to the three
repository classes in this package (kept as internal implementation detail;
nothing outside plugins/sqlite/ imports them directly anymore).
"""

from database.models import Customer, Invoice, Product
from plugins.plugin_interface import Plugin

from .customer_repository import SqliteCustomerRepository
from .db import get_connection
from .invoice_repository import SqliteInvoiceRepository
from .product_repository import SqliteProductRepository


class SqlitePlugin(Plugin):
    name = "sqlite"

    def __init__(self):
        self._customers = SqliteCustomerRepository()
        self._products = SqliteProductRepository()
        self._invoices = SqliteInvoiceRepository()

    def execute(self, action: str, payload: dict) -> dict:
        handler = self._ACTIONS.get(action)
        if handler is None:
            return {"error": f"Unknown action '{action}' for plugin '{self.name}'"}
        try:
            return handler(self, **payload)
        except TypeError as exc:
            return {"error": f"Bad payload for action '{action}': {exc}"}

    # -- customers -----------------------------------------------------------
    def _create_customer(self, name, phone=None, email=None, notes=None):
        c = self._customers.create(Customer(name=name, phone=phone, email=email, notes=notes))
        return {"created": c.model_dump()}

    def _get_customer(self, customer_id):
        c = self._customers.get(customer_id)
        return {"customer": c.model_dump() if c else None}

    def _find_customer(self, name):
        c = self._customers.find_by_name(name)
        return {"customer": c.model_dump() if c else None}

    def _list_customers(self):
        return {"customers": [c.model_dump() for c in self._customers.list()]}

    # -- products --------------------------------------------------------------
    def _create_product(self, name, price, quantity=0, notes=None):
        p = self._products.create(Product(name=name, price=price, quantity=quantity, notes=notes))
        return {"created": p.model_dump()}

    def _get_product(self, product_id):
        p = self._products.get(product_id)
        return {"product": p.model_dump() if p else None}

    def _find_product(self, name):
        p = self._products.find_by_name(name)
        return {"product": p.model_dump() if p else None}

    def _list_products(self, max_price=None):
        return {"products": [p.model_dump() for p in self._products.list(max_price=max_price)]}

    # -- invoices --------------------------------------------------------------
    def _create_invoice(self, customer_id, product_id, quantity, total, notes=None):
        inv = self._invoices.create(
            Invoice(customer_id=customer_id, product_id=product_id, quantity=quantity,
                    total=total, notes=notes)
        )
        return {"created": inv.model_dump()}

    def _get_invoice(self, invoice_id):
        inv = self._invoices.get(invoice_id)
        return {"invoice": inv.model_dump() if inv else None}

    def _list_invoices(self, customer_id=None):
        return {"invoices": [i.model_dump() for i in self._invoices.list(customer_id=customer_id)]}

    # -- import capability (Phase 2.5) ------------------------------------------
    # import_batches is shared (entity_type distinguishes future import types);
    # product_catalog is concrete/product-specific. No generic import machinery —
    # see .claude/rules/team-roles.md's Architecture Guardian abstraction rule.

    def _commit_product_catalog_import(self, batch_id, source_file, imported_at, items):
        with get_connection() as conn:
            conn.execute(
                "INSERT INTO import_batches (id, entity_type, source_file, imported_at, row_count, status) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (batch_id, "product_catalog", source_file, imported_at, len(items), "committed"),
            )
            conn.executemany(
                "INSERT INTO product_catalog (import_batch_id, category, name, sku_code, tax_class, "
                "unit, currency, price, price_incl_tax, min_price, min_price_incl_tax, "
                "activation_date, source_created_by, source_created_at) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [
                    (
                        batch_id, item.get("category"), item["name"], item.get("sku_code"),
                        item.get("tax_class"), item.get("unit"), item.get("currency"),
                        item.get("price"), item.get("price_incl_tax"), item.get("min_price"),
                        item.get("min_price_incl_tax"), item.get("activation_date"),
                        item.get("source_created_by"), item.get("source_created_at"),
                    )
                    for item in items
                ],
            )
        return {"batch_id": batch_id, "items_inserted": len(items)}

    def _list_import_batches(self, entity_type=None):
        with get_connection() as conn:
            if entity_type:
                rows = conn.execute(
                    "SELECT * FROM import_batches WHERE entity_type = ? ORDER BY imported_at",
                    (entity_type,),
                ).fetchall()
            else:
                rows = conn.execute("SELECT * FROM import_batches ORDER BY imported_at").fetchall()
        return {"batches": [dict(r) for r in rows]}

    def _search_product_catalog(self, query):
        with get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM product_catalog WHERE name LIKE ? ORDER BY name LIMIT 50",
                (f"%{query}%",),
            ).fetchall()
        return {"items": [dict(r) for r in rows]}

    def _rollback_import_batch(self, batch_id):
        with get_connection() as conn:
            row = conn.execute(
                "SELECT entity_type, status FROM import_batches WHERE id = ?", (batch_id,)
            ).fetchone()
            if row is None:
                return {"error": f"No import batch with id '{batch_id}'"}
            if row["status"] == "rolled_back":
                return {"error": f"Batch '{batch_id}' was already rolled back"}
            if row["entity_type"] != "product_catalog":
                # Only product_catalog exists so far — a future entity_type would
                # need its own delete branch here, added when that import type is built.
                return {"error": f"Rollback for entity_type '{row['entity_type']}' not implemented yet"}
            conn.execute("DELETE FROM product_catalog WHERE import_batch_id = ?", (batch_id,))
            conn.execute("UPDATE import_batches SET status = 'rolled_back' WHERE id = ?", (batch_id,))
        return {"batch_id": batch_id, "status": "rolled_back"}

    _ACTIONS = {
        "create_customer": _create_customer,
        "get_customer": _get_customer,
        "find_customer": _find_customer,
        "list_customers": _list_customers,
        "create_product": _create_product,
        "get_product": _get_product,
        "find_product": _find_product,
        "list_products": _list_products,
        "create_invoice": _create_invoice,
        "get_invoice": _get_invoice,
        "list_invoices": _list_invoices,
        "commit_product_catalog_import": _commit_product_catalog_import,
        "list_import_batches": _list_import_batches,
        "search_product_catalog": _search_product_catalog,
        "rollback_import_batch": _rollback_import_batch,
    }

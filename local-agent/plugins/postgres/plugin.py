"""
Postgres plugin — same action-dispatch shape as plugins/sqlite/plugin.py,
implemented via psycopg. See that file's docstring for the pattern.
"""

from database.models import Customer, Invoice, Product
from plugins.plugin_interface import Plugin

from .customer_repository import PostgresCustomerRepository
from .db import get_connection
from .invoice_repository import PostgresInvoiceRepository
from .product_repository import PostgresProductRepository


class PostgresPlugin(Plugin):
    name = "postgres"

    def __init__(self):
        self._customers = PostgresCustomerRepository()
        self._products = PostgresProductRepository()
        self._invoices = PostgresInvoiceRepository()

    def execute(self, action: str, payload: dict) -> dict:
        handler = self._ACTIONS.get(action)
        if handler is None:
            return {"error": f"Unknown action '{action}' for plugin '{self.name}'"}
        try:
            return handler(self, **payload)
        except TypeError as exc:
            return {"error": f"Bad payload for action '{action}': {exc}"}

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

    # -- import capability (Phase 2.5) — see plugins/sqlite/plugin.py's docstring ---

    def _commit_product_catalog_import(self, batch_id, source_file, imported_at, items):
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO import_batches (id, entity_type, source_file, imported_at, row_count, status) "
                    "VALUES (%s, %s, %s, %s, %s, %s)",
                    (batch_id, "product_catalog", source_file, imported_at, len(items), "committed"),
                )
                cur.executemany(
                    "INSERT INTO product_catalog (import_batch_id, category, name, sku_code, tax_class, "
                    "unit, currency, price, price_incl_tax, min_price, min_price_incl_tax, "
                    "activation_date, source_created_by, source_created_at) "
                    "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
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
            with conn.cursor() as cur:
                if entity_type:
                    cur.execute(
                        "SELECT * FROM import_batches WHERE entity_type = %s ORDER BY imported_at",
                        (entity_type,),
                    )
                else:
                    cur.execute("SELECT * FROM import_batches ORDER BY imported_at")
                rows = cur.fetchall()
        return {"batches": list(rows)}

    def _search_product_catalog(self, query):
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT * FROM product_catalog WHERE name ILIKE %s ORDER BY name LIMIT 50",
                    (f"%{query}%",),
                )
                rows = cur.fetchall()
        return {"items": list(rows)}

    def _rollback_import_batch(self, batch_id):
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT entity_type, status FROM import_batches WHERE id = %s", (batch_id,)
                )
                row = cur.fetchone()
                if row is None:
                    return {"error": f"No import batch with id '{batch_id}'"}
                if row["status"] == "rolled_back":
                    return {"error": f"Batch '{batch_id}' was already rolled back"}
                if row["entity_type"] != "product_catalog":
                    return {"error": f"Rollback for entity_type '{row['entity_type']}' not implemented yet"}
                cur.execute("DELETE FROM product_catalog WHERE import_batch_id = %s", (batch_id,))
                cur.execute("UPDATE import_batches SET status = 'rolled_back' WHERE id = %s", (batch_id,))
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

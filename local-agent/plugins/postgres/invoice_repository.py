from typing import List, Optional

from database.models import Invoice
from database.repositories import InvoiceRepository

from .db import get_connection


class PostgresInvoiceRepository(InvoiceRepository):
    def create(self, invoice: Invoice) -> Invoice:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO invoices (customer_id, product_id, quantity, total, notes) "
                    "VALUES (%s, %s, %s, %s, %s) RETURNING id",
                    (invoice.customer_id, invoice.product_id, invoice.quantity, invoice.total, invoice.notes),
                )
                invoice.id = cur.fetchone()["id"]
        return invoice

    def get(self, invoice_id: int) -> Optional[Invoice]:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM invoices WHERE id = %s", (invoice_id,))
                row = cur.fetchone()
        return Invoice(**row) if row else None

    def list(self, customer_id: Optional[int] = None) -> List[Invoice]:
        with get_connection() as conn:
            with conn.cursor() as cur:
                if customer_id is not None:
                    cur.execute(
                        "SELECT * FROM invoices WHERE customer_id = %s ORDER BY id", (customer_id,)
                    )
                else:
                    cur.execute("SELECT * FROM invoices ORDER BY id")
                rows = cur.fetchall()
        return [Invoice(**row) for row in rows]

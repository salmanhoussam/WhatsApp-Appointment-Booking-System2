from typing import List, Optional

from database.models import Invoice
from database.repositories import InvoiceRepository

from .db import get_connection


class SqliteInvoiceRepository(InvoiceRepository):
    def create(self, invoice: Invoice) -> Invoice:
        with get_connection() as conn:
            cur = conn.execute(
                "INSERT INTO invoices (customer_id, product_id, quantity, total, notes) "
                "VALUES (?, ?, ?, ?, ?)",
                (invoice.customer_id, invoice.product_id, invoice.quantity, invoice.total, invoice.notes),
            )
            invoice.id = cur.lastrowid
        return invoice

    def get(self, invoice_id: int) -> Optional[Invoice]:
        with get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM invoices WHERE id = ?", (invoice_id,)
            ).fetchone()
        return Invoice(**dict(row)) if row else None

    def list(self, customer_id: Optional[int] = None) -> List[Invoice]:
        with get_connection() as conn:
            if customer_id is not None:
                rows = conn.execute(
                    "SELECT * FROM invoices WHERE customer_id = ? ORDER BY id", (customer_id,)
                ).fetchall()
            else:
                rows = conn.execute("SELECT * FROM invoices ORDER BY id").fetchall()
        return [Invoice(**dict(row)) for row in rows]

from typing import List, Optional

from database.models import Customer
from database.repositories import CustomerRepository

from .db import get_connection


class SqliteCustomerRepository(CustomerRepository):
    def create(self, customer: Customer) -> Customer:
        with get_connection() as conn:
            cur = conn.execute(
                "INSERT INTO customers (name, phone, email, notes) VALUES (?, ?, ?, ?)",
                (customer.name, customer.phone, customer.email, customer.notes),
            )
            customer.id = cur.lastrowid
        return customer

    def get(self, customer_id: int) -> Optional[Customer]:
        with get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM customers WHERE id = ?", (customer_id,)
            ).fetchone()
        return Customer(**dict(row)) if row else None

    def find_by_name(self, name: str) -> Optional[Customer]:
        with get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM customers WHERE name = ? COLLATE NOCASE", (name,)
            ).fetchone()
        return Customer(**dict(row)) if row else None

    def list(self) -> List[Customer]:
        with get_connection() as conn:
            rows = conn.execute("SELECT * FROM customers ORDER BY id").fetchall()
        return [Customer(**dict(row)) for row in rows]

    def update(self, customer: Customer) -> Customer:
        with get_connection() as conn:
            conn.execute(
                "UPDATE customers SET name = ?, phone = ?, email = ?, notes = ? WHERE id = ?",
                (customer.name, customer.phone, customer.email, customer.notes, customer.id),
            )
        return customer

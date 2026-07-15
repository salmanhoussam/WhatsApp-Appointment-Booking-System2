from typing import List, Optional

from database.models import Customer
from database.repositories import CustomerRepository

from .db import get_connection


class PostgresCustomerRepository(CustomerRepository):
    def create(self, customer: Customer) -> Customer:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO customers (name, phone, email, notes) "
                    "VALUES (%s, %s, %s, %s) RETURNING id",
                    (customer.name, customer.phone, customer.email, customer.notes),
                )
                customer.id = cur.fetchone()["id"]
        return customer

    def get(self, customer_id: int) -> Optional[Customer]:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM customers WHERE id = %s", (customer_id,))
                row = cur.fetchone()
        return Customer(**row) if row else None

    def find_by_name(self, name: str) -> Optional[Customer]:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM customers WHERE name ILIKE %s", (name,))
                row = cur.fetchone()
        return Customer(**row) if row else None

    def list(self) -> List[Customer]:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM customers ORDER BY id")
                rows = cur.fetchall()
        return [Customer(**row) for row in rows]

    def update(self, customer: Customer) -> Customer:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE customers SET name = %s, phone = %s, email = %s, notes = %s "
                    "WHERE id = %s",
                    (customer.name, customer.phone, customer.email, customer.notes, customer.id),
                )
        return customer

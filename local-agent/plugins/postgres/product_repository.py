from typing import List, Optional

from database.models import Product
from database.repositories import ProductRepository

from .db import get_connection


class PostgresProductRepository(ProductRepository):
    def create(self, product: Product) -> Product:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO products (name, price, quantity, notes) "
                    "VALUES (%s, %s, %s, %s) RETURNING id",
                    (product.name, product.price, product.quantity, product.notes),
                )
                product.id = cur.fetchone()["id"]
        return product

    def get(self, product_id: int) -> Optional[Product]:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM products WHERE id = %s", (product_id,))
                row = cur.fetchone()
        return Product(**row) if row else None

    def find_by_name(self, name: str) -> Optional[Product]:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM products WHERE name ILIKE %s", (name,))
                row = cur.fetchone()
        return Product(**row) if row else None

    def list(self, max_price: Optional[float] = None) -> List[Product]:
        with get_connection() as conn:
            with conn.cursor() as cur:
                if max_price is not None:
                    cur.execute(
                        "SELECT * FROM products WHERE price <= %s ORDER BY id", (max_price,)
                    )
                else:
                    cur.execute("SELECT * FROM products ORDER BY id")
                rows = cur.fetchall()
        return [Product(**row) for row in rows]

    def update(self, product: Product) -> Product:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE products SET name = %s, price = %s, quantity = %s, notes = %s "
                    "WHERE id = %s",
                    (product.name, product.price, product.quantity, product.notes, product.id),
                )
        return product

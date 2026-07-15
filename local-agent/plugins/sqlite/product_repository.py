from typing import List, Optional

from database.models import Product
from database.repositories import ProductRepository

from .db import get_connection


class SqliteProductRepository(ProductRepository):
    def create(self, product: Product) -> Product:
        with get_connection() as conn:
            cur = conn.execute(
                "INSERT INTO products (name, price, quantity, notes) VALUES (?, ?, ?, ?)",
                (product.name, product.price, product.quantity, product.notes),
            )
            product.id = cur.lastrowid
        return product

    def get(self, product_id: int) -> Optional[Product]:
        with get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM products WHERE id = ?", (product_id,)
            ).fetchone()
        return Product(**dict(row)) if row else None

    def find_by_name(self, name: str) -> Optional[Product]:
        with get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM products WHERE name = ? COLLATE NOCASE", (name,)
            ).fetchone()
        return Product(**dict(row)) if row else None

    def list(self, max_price: Optional[float] = None) -> List[Product]:
        with get_connection() as conn:
            if max_price is not None:
                rows = conn.execute(
                    "SELECT * FROM products WHERE price <= ? ORDER BY id", (max_price,)
                ).fetchall()
            else:
                rows = conn.execute("SELECT * FROM products ORDER BY id").fetchall()
        return [Product(**dict(row)) for row in rows]

    def update(self, product: Product) -> Product:
        with get_connection() as conn:
            conn.execute(
                "UPDATE products SET name = ?, price = ?, quantity = ?, notes = ? WHERE id = ?",
                (product.name, product.price, product.quantity, product.notes, product.id),
            )
        return product

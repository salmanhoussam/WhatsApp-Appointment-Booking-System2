from typing import List, Optional

from database.models import Product
from plugins import plugin_manager


def create_product(name: str, price: float, quantity: int = 0,
                    notes: Optional[str] = None) -> Product:
    if not name or not name.strip():
        raise ValueError("Product name is required")
    if price < 0:
        raise ValueError("Product price cannot be negative")
    result = plugin_manager.execute(
        "create_product", {"name": name.strip(), "price": price, "quantity": quantity, "notes": notes}
    )
    if "error" in result:
        raise ValueError(result["error"])
    return Product(**result["created"])


def get_product(product_id: int) -> Optional[Product]:
    result = plugin_manager.execute("get_product", {"product_id": product_id})
    data = result.get("product")
    return Product(**data) if data else None


def find_product_by_name(name: str) -> Optional[Product]:
    result = plugin_manager.execute("find_product", {"name": name})
    data = result.get("product")
    return Product(**data) if data else None


def list_products(max_price: Optional[float] = None) -> List[Product]:
    result = plugin_manager.execute("list_products", {"max_price": max_price})
    return [Product(**p) for p in result.get("products", [])]

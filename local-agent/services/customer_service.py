from typing import List, Optional

from database.models import Customer
from plugins import plugin_manager


def create_customer(name: str, phone: Optional[str] = None, email: Optional[str] = None,
                     notes: Optional[str] = None) -> Customer:
    if not name or not name.strip():
        raise ValueError("Customer name is required")
    result = plugin_manager.execute(
        "create_customer", {"name": name.strip(), "phone": phone, "email": email, "notes": notes}
    )
    if "error" in result:
        raise ValueError(result["error"])
    return Customer(**result["created"])


def get_customer(customer_id: int) -> Optional[Customer]:
    result = plugin_manager.execute("get_customer", {"customer_id": customer_id})
    data = result.get("customer")
    return Customer(**data) if data else None


def find_customer_by_name(name: str) -> Optional[Customer]:
    result = plugin_manager.execute("find_customer", {"name": name})
    data = result.get("customer")
    return Customer(**data) if data else None


def list_customers() -> List[Customer]:
    result = plugin_manager.execute("list_customers", {})
    return [Customer(**c) for c in result.get("customers", [])]

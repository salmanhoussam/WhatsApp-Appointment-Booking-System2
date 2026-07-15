from typing import List, Optional

from database.models import Invoice
from plugins import plugin_manager
from services import customer_service, product_service


def create_invoice_by_name(customer_name: str, product_name: str, quantity: int) -> Invoice:
    """
    The natural-language path: resolve customer/product by name (this is
    genuine business logic, so it lives here, not in the tools layer), then
    create the invoice. Computing the total from the product's current price
    is also business logic — not something a plugin should decide.
    """
    if quantity <= 0:
        raise ValueError("Invoice quantity must be positive")

    customer = customer_service.find_customer_by_name(customer_name)
    if customer is None:
        raise ValueError(f"No customer named '{customer_name}' found. Add them first.")

    product = product_service.find_product_by_name(product_name)
    if product is None:
        raise ValueError(f"No product named '{product_name}' found. Add it first.")

    total = round(product.price * quantity, 2)
    result = plugin_manager.execute(
        "create_invoice",
        {
            "customer_id": customer.id,
            "product_id": product.id,
            "quantity": quantity,
            "total": total,
            "notes": None,
        },
    )
    if "error" in result:
        raise ValueError(result["error"])
    return Invoice(**result["created"])


def get_invoice(invoice_id: int) -> Optional[Invoice]:
    result = plugin_manager.execute("get_invoice", {"invoice_id": invoice_id})
    data = result.get("invoice")
    return Invoice(**data) if data else None


def list_invoices(customer_id: Optional[int] = None) -> List[Invoice]:
    result = plugin_manager.execute("list_invoices", {"customer_id": customer_id})
    return [Invoice(**i) for i in result.get("invoices", [])]

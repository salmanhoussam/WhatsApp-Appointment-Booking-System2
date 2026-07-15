"""
Maps each tool name in schemas.py to the actual Python callable that
performs it. Each function here does exactly one thing: translate the
LLM's tool-call arguments into one services/ call and shape the response —
no business logic lives here (name-lookup, total computation, etc. all
live in services/, see services/invoice_service.py).
"""

from services import catalog_import_service, customer_service, invoice_service, product_service


def _create_customer(name: str, phone: str = None, email: str = None, notes: str = None):
    customer = customer_service.create_customer(name=name, phone=phone, email=email, notes=notes)
    return {"created": customer.model_dump()}


def _list_customers():
    return {"customers": [c.model_dump() for c in customer_service.list_customers()]}


def _create_product(name: str, price: float, quantity: int = 0, notes: str = None):
    product = product_service.create_product(name=name, price=price, quantity=quantity, notes=notes)
    return {"created": product.model_dump()}


def _list_products(max_price: float = None):
    return {"products": [p.model_dump() for p in product_service.list_products(max_price=max_price)]}


def _create_invoice(customer_name: str, product_name: str, quantity: int):
    invoice = invoice_service.create_invoice_by_name(customer_name, product_name, quantity)
    return {"created": invoice.model_dump()}


def _list_invoices():
    return {"invoices": [i.model_dump() for i in invoice_service.list_invoices()]}


def _preview_catalog_import(file_path: str):
    return catalog_import_service.preview_catalog_import(file_path)


def _import_product_catalog(file_path: str):
    return catalog_import_service.import_product_catalog(file_path)


def _search_product_catalog(query: str):
    return {"items": catalog_import_service.search_catalog(query)}


def _list_catalog_imports():
    return {"batches": catalog_import_service.list_catalog_imports()}


REGISTRY = {
    "create_customer": _create_customer,
    "list_customers": _list_customers,
    "create_product": _create_product,
    "list_products": _list_products,
    "create_invoice": _create_invoice,
    "list_invoices": _list_invoices,
    "preview_catalog_import": _preview_catalog_import,
    "import_product_catalog": _import_product_catalog,
    "search_product_catalog": _search_product_catalog,
    "list_catalog_imports": _list_catalog_imports,
    # rollback_import_batch is intentionally NOT exposed as an LLM tool —
    # a destructive action, only called directly via catalog_import_service
    # for now (see phase2.5-data-validation-report.md).
}


def call_tool(name: str, arguments: dict):
    if name not in REGISTRY:
        return {"error": f"Unknown tool '{name}'"}
    try:
        return REGISTRY[name](**arguments)
    except Exception as exc:  # noqa: BLE001 — surface any failure as text instead of a 500;
        # the event log (agents/database_agent.py) still records the full detail for debugging.
        return {"error": str(exc)}

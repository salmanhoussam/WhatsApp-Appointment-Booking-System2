"""
OpenAI-style tool/function schemas — one per repository operation the agent
is allowed to perform. `ai/llm.py` sends these to the model; `agents/
database_agent.py` executes whichever one the model picks via the registry
in `ai/tools/registry.py`.

Adding a new capability = add a schema here + a matching function in
registry.py. Nothing about the LLM prompt or the agent loop needs to change.
"""

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "create_customer",
            "description": "Add a new customer record to the local database.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Customer's full name"},
                    "phone": {"type": "string", "description": "Phone number, optional"},
                    "email": {"type": "string", "description": "Email address, optional"},
                    "notes": {"type": "string", "description": "Free-text notes, optional"},
                },
                "required": ["name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_customers",
            "description": "List every customer in the local database.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_product",
            "description": "Add a new product record to the local database.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Product name"},
                    "price": {"type": "number", "description": "Unit price"},
                    "quantity": {"type": "integer", "description": "Stock quantity, defaults to 0"},
                    "notes": {"type": "string", "description": "Free-text notes, optional"},
                },
                "required": ["name", "price"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_products",
            "description": "List products in the local database, optionally filtered by a maximum price.",
            "parameters": {
                "type": "object",
                "properties": {
                    "max_price": {"type": "number", "description": "Only return products at or below this price"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_invoice",
            "description": (
                "Create an invoice for a customer buying a quantity of a product. "
                "Look up the customer_name and product_name to resolve them to ids first "
                "if the user referred to them by name rather than id."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "customer_name": {"type": "string", "description": "Name of an existing customer"},
                    "product_name": {"type": "string", "description": "Name of an existing product"},
                    "quantity": {"type": "integer", "description": "How many units of the product"},
                },
                "required": ["customer_name", "product_name", "quantity"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_invoices",
            "description": "List invoices in the local database.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    # -- Product catalog import (Phase 2.5) — reference data, separate from
    # the operational customer/product/invoice tools above.
    {
        "type": "function",
        "function": {
            "name": "preview_catalog_import",
            "description": (
                "Dry-run preview of a product price-catalog Excel file (.xls/.xlsx) — "
                "reports row count and any possible duplicate products, without importing anything."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": {"type": "string", "description": "Path to the .xls/.xlsx catalog file"},
                },
                "required": ["file_path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "import_product_catalog",
            "description": (
                "Import a product price-catalog Excel file (.xls/.xlsx) into the reference "
                "catalog. This does NOT modify the operational products table — imported data "
                "stays a separate, decoupled reference."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": {"type": "string", "description": "Path to the .xls/.xlsx catalog file"},
                },
                "required": ["file_path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_product_catalog",
            "description": "Search the imported reference product catalog by name.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Text to search for in product names"},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_catalog_imports",
            "description": "List every product-catalog import batch (file, when, how many rows, status).",
            "parameters": {"type": "object", "properties": {}},
        },
    },
]

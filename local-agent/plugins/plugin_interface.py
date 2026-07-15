"""
The one contract every plugin must implement — a database driver, a POS
API, an ERP connector (Odoo, SAP, Square...), anything.

Deliberately NOT a set of typed CRUD methods (create_customer(), get_product(),
...). A generic `execute(action, payload)` is what lets a plugin be something
that isn't a database at all — a REST-based POS/ERP plugin can implement the
exact same interface as a SQL one. The services layer decides which `action`
string to send; the plugin decides how to fulfill it.
"""

from abc import ABC, abstractmethod


class Plugin(ABC):
    name: str

    @abstractmethod
    def execute(self, action: str, payload: dict) -> dict:
        """
        Perform `action` (e.g. "create_customer") with `payload` (its
        arguments as a dict) and return a result dict.

        Convention: on success return {"created": {...}} / {"customer": {...}}
        / {"customers": [...]} etc.; on failure return {"error": "..."}.
        Never raise for expected failures (e.g. "not found") — only for
        genuine bugs/connection failures, which callers should still guard.
        """
        ...

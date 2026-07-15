from typing import Optional

from pydantic import BaseModel


class ImportBatch(BaseModel):
    """Shared across every future import type (customers, invoices, ...) via entity_type."""

    id: str
    entity_type: str
    source_file: str
    imported_at: str
    row_count: int
    status: str  # "committed" | "rolled_back"

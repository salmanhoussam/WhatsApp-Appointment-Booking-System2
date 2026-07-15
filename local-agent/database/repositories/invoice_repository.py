from abc import ABC, abstractmethod
from typing import List, Optional

from database.models import Invoice


class InvoiceRepository(ABC):
    """Contract every database connector must implement for Invoice records."""

    @abstractmethod
    def create(self, invoice: Invoice) -> Invoice:
        ...

    @abstractmethod
    def get(self, invoice_id: int) -> Optional[Invoice]:
        ...

    @abstractmethod
    def list(self, customer_id: Optional[int] = None) -> List[Invoice]:
        ...

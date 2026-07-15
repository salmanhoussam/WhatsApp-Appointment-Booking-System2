from abc import ABC, abstractmethod
from typing import List, Optional

from database.models import Product


class ProductRepository(ABC):
    """Contract every database connector must implement for Product records."""

    @abstractmethod
    def create(self, product: Product) -> Product:
        ...

    @abstractmethod
    def get(self, product_id: int) -> Optional[Product]:
        ...

    @abstractmethod
    def find_by_name(self, name: str) -> Optional[Product]:
        ...

    @abstractmethod
    def list(self, max_price: Optional[float] = None) -> List[Product]:
        ...

    @abstractmethod
    def update(self, product: Product) -> Product:
        ...

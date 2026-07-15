from abc import ABC, abstractmethod
from typing import List, Optional

from database.models import Customer


class CustomerRepository(ABC):
    """
    Contract every database connector must implement for Customer records.

    The agent layer only ever talks to this interface — it never knows
    whether the concrete implementation underneath is SQLite, Postgres,
    MySQL, SQL Server, or a POS API.
    """

    @abstractmethod
    def create(self, customer: Customer) -> Customer:
        ...

    @abstractmethod
    def get(self, customer_id: int) -> Optional[Customer]:
        ...

    @abstractmethod
    def find_by_name(self, name: str) -> Optional[Customer]:
        ...

    @abstractmethod
    def list(self) -> List[Customer]:
        ...

    @abstractmethod
    def update(self, customer: Customer) -> Customer:
        ...

from typing import Optional

from pydantic import BaseModel


class CatalogItem(BaseModel):
    """
    One row of imported reference product data. Deliberately mirrors the
    source file closely (see phase2.5-data-validation-report.md) rather than
    deriving/dropping fields — this is a neutral reference, not operational
    data, and is unrelated to database.models.Product.
    """

    id: Optional[int] = None
    import_batch_id: str
    category: Optional[str] = None
    name: str
    sku_code: Optional[str] = None
    tax_class: Optional[str] = None
    unit: Optional[str] = None
    currency: Optional[str] = None
    price: Optional[float] = None
    price_incl_tax: Optional[float] = None
    min_price: Optional[float] = None
    min_price_incl_tax: Optional[float] = None
    activation_date: Optional[str] = None
    source_created_by: Optional[str] = None
    source_created_at: Optional[str] = None

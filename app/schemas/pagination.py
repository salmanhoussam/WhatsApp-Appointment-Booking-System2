"""
app/schemas/pagination.py
Generic paginated response envelope used by all list endpoints.

Usage:
    @router.get("/", response_model=PaginatedResponse[BookingResponse])
    async def list_bookings(page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100), ...):
        result = await service.get_client_bookings(client_id, page, limit)
        return result
"""

from __future__ import annotations
from typing import Generic, List, TypeVar
from pydantic import BaseModel

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    data: List[T]
    total: int       # total matching records
    page: int        # current page (1-indexed)
    limit: int       # page size
    pages: int       # total number of pages

    @classmethod
    def build(cls, data: List[T], total: int, page: int, limit: int) -> "PaginatedResponse[T]":
        pages = max(1, (total + limit - 1) // limit)
        return cls(data=data, total=total, page=page, limit=limit, pages=pages)

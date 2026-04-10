from fastapi import APIRouter, HTTPException, Query
from app.db.client import prisma_client
from app.services import price_service
from app.schemas.price import Price, PriceCreate, PriceUpdate
from typing import List, Optional
from datetime import date

router = APIRouter(prefix="/prices", tags=["Prices"])

@router.get("/", response_model=List[Price])
async def list_prices(
    client_id: str = Query(..., description="Client ID"),
    unit_id: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None)
):
    return await price_service.get_prices(prisma_client, client_id, unit_id, date_from, date_to)

@router.post("/", response_model=Price, status_code=201)
async def create_price(
    data: PriceCreate
):
    return await price_service.create_price(prisma_client, data)

@router.get("/{price_id}", response_model=Price)
async def get_price(
    price_id: str,
    client_id: str = Query(..., description="Client ID")
):
    price = await price_service.get_price(prisma_client, price_id, client_id)
    if not price:
        raise HTTPException(status_code=404, detail="Price not found")
    return price

@router.put("/{price_id}", response_model=Price)
async def update_price(
    price_id: str,
    data: PriceUpdate,
    client_id: str = Query(..., description="Client ID")
):
    updated = await price_service.update_price(prisma_client, price_id, data, client_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Price not found")
    return updated

@router.delete("/{price_id}", status_code=204)
async def delete_price(
    price_id: str,
    client_id: str = Query(..., description="Client ID")
):
    deleted = await price_service.delete_price(prisma_client, price_id, client_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Price not found")
    return
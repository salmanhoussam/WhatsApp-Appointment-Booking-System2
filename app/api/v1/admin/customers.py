from fastapi import APIRouter, HTTPException, Query
from app.db.client import prisma_client
from app.services import customer_service
from app.schemas.customer import Customer, CustomerCreate, CustomerUpdate
from typing import List

router = APIRouter(prefix="/customers", tags=["Customers"])

@router.get("/", response_model=List[Customer])
async def list_customers(
    client_id: str = Query(..., description="Client ID")
):
    return await customer_service.get_customers(prisma_client, client_id)

@router.post("/", response_model=Customer, status_code=201)
async def create_customer(
    data: CustomerCreate
):
    return await customer_service.create_customer(prisma_client, data)

@router.get("/{customer_id}", response_model=Customer)
async def get_customer(
    customer_id: str,
    client_id: str = Query(..., description="Client ID")
):
    customer = await customer_service.get_customer(prisma_client, customer_id, client_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

@router.put("/{customer_id}", response_model=Customer)
async def update_customer(
    customer_id: str,
    data: CustomerUpdate,
    client_id: str = Query(..., description="Client ID")
):
    updated = await customer_service.update_customer(prisma_client, customer_id, data, client_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Customer not found")
    return updated

@router.delete("/{customer_id}", status_code=204)
async def delete_customer(
    customer_id: str,
    client_id: str = Query(..., description="Client ID")
):
    deleted = await customer_service.delete_customer(prisma_client, customer_id, client_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Customer not found")
    return
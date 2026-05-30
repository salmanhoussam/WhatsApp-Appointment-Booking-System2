"""
app/api/v1/public/demo.py
Route — POST /api/v1/public/demo/create

Creates an instant trial tenant (7-day trial) for the SalmanSaaS platform.
Rate-limited to 3 requests/hour per IP to prevent spam.

Request body:
    business_type : "restaurant" | "store" | "booking"
    name_ar       : Business name in Arabic
    name_en       : Business name in English

Response:
    slug          : Generated slug  (e.g. "demo-my-cafe-a3f9")
    admin_url     : Admin dashboard URL
    temp_password : One-time 8-character password
    expires_at    : ISO-8601 trial expiry (7 days from now)
"""
from fastapi import APIRouter, Request
from pydantic import BaseModel, field_validator

from app.db.client import prisma_client
from app.core.limiter import limiter
from app.services.demo_service import create_demo_tenant

router = APIRouter()

# ── Schema ────────────────────────────────────────────────────────────────────

VALID_BUSINESS_TYPES = {"restaurant", "store", "booking"}


class DemoCreateRequest(BaseModel):
    business_type: str
    name_ar: str
    name_en: str

    @field_validator("business_type")
    @classmethod
    def validate_business_type(cls, v: str) -> str:
        v = v.strip().lower()
        if v not in VALID_BUSINESS_TYPES:
            raise ValueError(
                f"business_type must be one of: {', '.join(sorted(VALID_BUSINESS_TYPES))}"
            )
        return v

    @field_validator("name_ar", "name_en")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Name must be at least 2 characters.")
        if len(v) > 100:
            raise ValueError("Name must be at most 100 characters.")
        return v


# ── Route ─────────────────────────────────────────────────────────────────────

@router.post("/demo/create", tags=["Public — Demo"])
@limiter.limit("3/hour")
async def create_demo(request: Request, payload: DemoCreateRequest):
    """
    Provision a 7-day trial tenant instantly.

    Returns the generated slug, admin dashboard URL, a temporary password,
    and the trial expiry timestamp. No email or phone required.
    """
    result = await create_demo_tenant(
        db=prisma_client,
        business_type=payload.business_type,
        name_ar=payload.name_ar,
        name_en=payload.name_en,
    )
    return {"success": True, "data": result}

import re

from fastapi import APIRouter, Request
from pydantic import BaseModel, EmailStr, field_validator

from app.db.client import prisma_client
from app.services import registration_service
from app.core.limiter import limiter

router = APIRouter()

_SLUG_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$")
_PHONE_STRIP  = re.compile(r"[\s\-\(\)]")


class TenantRegistrationRequest(BaseModel):
    business_name:   str
    slug:            str
    email:           EmailStr
    password:        str
    whatsapp_number: str
    owner_name:      str | None = None

    @field_validator("slug")
    @classmethod
    def slug_format(cls, v: str) -> str:
        v = v.strip().lower()
        if not _SLUG_PATTERN.match(v):
            raise ValueError(
                "Slug must be 3–50 characters: lowercase letters, digits, and hyphens only "
                "(must start and end with a letter or digit)."
            )
        return v

    @field_validator("password")
    @classmethod
    def password_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters.")
        return v

    @field_validator("whatsapp_number")
    @classmethod
    def phone_format(cls, v: str) -> str:
        normalized = _PHONE_STRIP.sub("", v)
        if not re.match(r"^\+?[0-9]{7,15}$", normalized):
            raise ValueError("Enter a valid phone number (7–15 digits, optional + prefix).")
        return normalized

    @field_validator("business_name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Business name must be at least 2 characters.")
        return v


@router.post("/register", tags=["Public — Registration"])
@limiter.limit("3/minute")
async def register_tenant(request: Request, payload: TenantRegistrationRequest):
    """
    Self-onboarding: creates a new tenant (Client) + TENANT_ADMIN user in one call.
    Returns the new slug and a direct dashboard URL for immediate redirect.
    """
    return await registration_service.register_new_tenant(
        prisma_client, payload.model_dump()
    )

"""
app/api/v1/admin/auth.py
Authentication endpoints — mounted at /api/v1/auth in main.py.

Two login flows:
  POST /api/v1/auth/login         → Client (tenant root) login  → JWT {type: "client", ...}
  POST /api/v1/auth/users/login   → Staff / Manager login       → JWT {type: "admin",  ...}
"""

import logging
import re
from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, EmailStr, field_validator

from app.db.client import prisma_client
from app.core.security import verify_password, create_access_token
from app.core.config import settings
from app.services import registration_service as _reg_service

# Cookie lives on the root domain so all subdomains receive it automatically.
# On localhost the domain kwarg is omitted (browsers reject .salmansaas.com there).
_COOKIE_DOMAIN = ".salmansaas.com" if settings.is_production() else None


def _set_auth_cookie(response: Response, token: str) -> None:
    """Attach an HttpOnly JWT cookie valid across all *.salmansaas.com subdomains."""
    kwargs = dict(
        key="admin_access_token",
        value=token,
        httponly=True,
        samesite="lax",
        secure=settings.is_production(),
        max_age=86400,
    )
    if _COOKIE_DOMAIN:
        kwargs["domain"] = _COOKIE_DOMAIN
    response.set_cookie(**kwargs)

logger = logging.getLogger(__name__)

# No prefix here — main.py mounts this router at /api/v1/auth
router = APIRouter(tags=["Authentication"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class ClientLoginRequest(BaseModel):
    identifier: str  # slug, email, or phone
    password: str

class ClientLoginResponse(BaseModel):
    token: str
    client_id: str
    client_name: str
    slug: str
    phone: str
    token_type: str = "bearer"


class UserLoginRequest(BaseModel):
    email: str
    password: str

class UserLoginResponse(BaseModel):
    token: str
    user_id: str
    client_id: str
    full_name: str
    role: str
    slug: str
    token_type: str = "bearer"


# ── Client (tenant root) login ─────────────────────────────────────────────────

@router.post("/login", response_model=ClientLoginResponse)
async def client_login(request: ClientLoginRequest, response: Response):
    """
    Authenticates the tenant root account (Client model).
    Accepts slug, email, or phone as the identifier.
    Returns a JWT with type='client'.
    """
    logger.info("🔐 Client login attempt: '%s'", request.identifier)

    try:
        client = await prisma_client.client.find_first(
            where={
                "OR": [
                    {"slug": request.identifier},
                    {"email": request.identifier},
                    {"phone": request.identifier},
                ]
            }
        )

        if not client:
            logger.warning("❌ Client not found: '%s'", request.identifier)
            raise HTTPException(status_code=401, detail="بيانات الدخول غير صحيحة")

        if not verify_password(request.password, client.password_hash):
            logger.warning("❌ Password mismatch for client: %s", client.slug)
            raise HTTPException(status_code=401, detail="بيانات الدخول غير صحيحة")

        if not client.isActive:
            logger.warning("⚠️  Inactive client: %s", client.slug)
            raise HTTPException(status_code=403, detail="هذا الحساب غير نشط حالياً")

        token = create_access_token(data={
            "type": "client",
            "client_id": client.id,
            "slug": client.slug,
            "phone": client.phone,
        })

        _set_auth_cookie(response, token)
        logger.info("✅ Client login success: %s", client.slug)
        return ClientLoginResponse(
            token=token,
            client_id=client.id,
            client_name=client.name,
            slug=client.slug,
            phone=client.phone,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("🔥 Unexpected client login error: %s", e, exc_info=True)
        raise  # Let the global catch-all handler return the standard envelope


# ── User (staff / manager) login ───────────────────────────────────────────────

@router.post("/users/login", response_model=UserLoginResponse)
async def user_login(request: UserLoginRequest, response: Response):
    """
    Authenticates a staff member or manager (User model).
    Returns a JWT with type='admin', user_id, client_id, and role.

    Use this token on all admin routes that call get_current_admin_user().
    The 'slug' field in the payload also satisfies get_current_tenant().
    """
    logger.info("🔐 User login attempt: '%s'", request.email)

    try:
        user = await prisma_client.user.find_unique(
            where={"email": request.email},
            include={"client": True},
        )

        if not user:
            logger.warning("❌ User not found: '%s'", request.email)
            raise HTTPException(status_code=401, detail="بيانات الدخول غير صحيحة")

        if not verify_password(request.password, user.password_hash):
            logger.warning("❌ Password mismatch for user: %s", user.email)
            raise HTTPException(status_code=401, detail="بيانات الدخول غير صحيحة")

        if not user.isActive:
            logger.warning("⚠️  Inactive user: %s", user.email)
            raise HTTPException(status_code=403, detail="هذا الحساب غير نشط حالياً")

        token = create_access_token(data={
            "type": "admin",
            "user_id": user.id,
            "client_id": user.clientId,
            "slug": user.client.slug,
            "role": user.role,
        })

        _set_auth_cookie(response, token)
        logger.info("✅ User login success: %s (role=%s)", user.email, user.role)
        return UserLoginResponse(
            token=token,
            user_id=user.id,
            client_id=user.clientId,
            full_name=user.fullName,
            role=user.role,
            slug=user.client.slug,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("🔥 Unexpected user login error: %s", e, exc_info=True)
        raise  # Let the global catch-all handler return the standard envelope


# ── Tenant self-registration ───────────────────────────────────────────────────

_SLUG_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$")
_PHONE_STRIP  = re.compile(r"[\s\-\(\)]")


def _auto_slug(text: str) -> str:
    s = text.lower().strip()
    s = re.sub(r"[^a-z0-9\s-]", "", s)
    s = re.sub(r"\s+", "-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    return s or "tenant"


class TenantRegistrationRequest(BaseModel):
    owner_name:       str
    email:            EmailStr
    password:         str
    business_name_ar: str
    business_name_en: str | None = None
    whatsapp_number:  str
    slug:             str | None = None
    venue_type:       str = "real_estate"
    currency:         str = "USD"
    payment_methods:  list[str] = ["cash", "card"]
    primary_color:    str = "#6d28d9"

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


@router.post("/register", tags=["Authentication"])
async def register_tenant(request: TenantRegistrationRequest, response: Response):
    """
    New-tenant self-onboarding via auth.salmansaas.com/register.
    Creates Client (trial) + TENANT_ADMIN User, issues JWT, sets HttpOnly cookie.
    Returns { token, slug, trial_ends_at, dashboard_url }.
    """
    logger.info("📝 Tenant registration attempt: email=%s venue=%s", request.email, request.venue_type)

    # Derive or validate slug
    slug_source = request.business_name_en or request.owner_name
    slug = request.slug or _auto_slug(slug_source)
    if len(slug) < 3:
        slug = _auto_slug(request.owner_name)

    if not _SLUG_PATTERN.match(slug):
        raise HTTPException(
            status_code=422,
            detail="Slug must be 3–50 characters: lowercase letters, digits, and hyphens only."
        )

    payload = {
        **request.model_dump(exclude={"slug"}),
        "slug": slug,
    }

    try:
        result = await _reg_service.register_new_tenant(prisma_client, payload)
    except Exception:
        raise  # ConflictError is handled by the global exception handler

    # Issue JWT identical to client_login
    client = await prisma_client.client.find_unique(where={"slug": slug})
    token = create_access_token(data={
        "type":      "client",
        "client_id": client.id,
        "slug":      client.slug,
        "phone":     client.phone,
    })

    _set_auth_cookie(response, token)
    logger.info("✅ New tenant registered: %s", slug)

    return {
        "success": True,
        "data": {
            "token":         token,
            "slug":          slug,
            "trial_ends_at": result["data"]["trial_ends_at"],
            "dashboard_url": result["data"]["dashboard_url"],
        },
    }

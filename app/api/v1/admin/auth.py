"""
app/api/v1/admin/auth.py
Authentication endpoints — mounted at /api/v1/auth in main.py.

Two login flows:
  POST /api/v1/auth/login         → Client (tenant root) login  → JWT {type: "client", ...}
  POST /api/v1/auth/users/login   → Staff / Manager login       → JWT {type: "admin",  ...}
"""

import logging
import re
from fastapi import APIRouter, Header, HTTPException, Response
from pydantic import BaseModel, EmailStr, field_validator

from app.db.client import prisma_client
from app.core.security import verify_password, create_access_token, get_password_hash
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
    status: str | None = None
    trial_ends_at: str | None = None
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
    status: str | None = None
    trial_ends_at: str | None = None
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
            status=getattr(client, "status", None),
            trial_ends_at=(
                client.trial_ends_at.isoformat()
                if getattr(client, "trial_ends_at", None) else None
            ),
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
            status=getattr(user.client, "status", None),
            trial_ends_at=(
                user.client.trial_ends_at.isoformat()
                if getattr(user.client, "trial_ends_at", None) else None
            ),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("🔥 Unexpected user login error: %s", e, exc_info=True)
        raise  # Let the global catch-all handler return the standard envelope


# ── Magic link — one-time setup login ─────────────────────────────────────────

@router.get("/setup", tags=["Authentication"])
async def magic_link_login(token: str, response: Response):
    """
    One-time setup link sent to new tenants after pipeline onboarding.
    Validates the token, issues a TENANT_ADMIN JWT, and invalidates the token.
    Frontend: /setup?token=xxx → stores JWT → redirects to /{slug}/dashboard
    """
    from datetime import datetime, timezone as tz

    user = await prisma_client.user.find_first(
        where={"setupToken": token},
        include={"client": True},
    )

    if not user:
        raise HTTPException(status_code=404, detail="رابط غير صالح أو منتهي الصلاحية")

    if user.setupTokenExp and user.setupTokenExp < datetime.now(tz.utc):
        raise HTTPException(status_code=410, detail="انتهت صلاحية الرابط — يُستخدم لمرة واحدة خلال 7 أيام")

    if not user.isActive:
        raise HTTPException(status_code=403, detail="هذا الحساب غير نشط")

    # Invalidate token immediately (one-time use)
    await prisma_client.user.update(
        where={"id": user.id},
        data={"setupToken": None, "setupTokenExp": None},
    )

    jwt = create_access_token(data={
        "type":      "admin",
        "user_id":   user.id,
        "client_id": user.clientId,
        "slug":      user.client.slug,
        "role":      user.role,
    })
    _set_auth_cookie(response, jwt)

    return {
        "success": True,
        "data": {
            "token":         jwt,
            "slug":          user.client.slug,
            "role":          user.role,
            "dashboard_url": f"/{user.client.slug}/dashboard",
        },
    }


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
    services:         list[str] | None = None  # from Validator-corrected pipeline payload

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


@router.post("/create-user", tags=["Authentication"])
async def create_platform_user(
    payload: dict,
    x_setup_key: str | None = Header(default=None),
):
    """
    One-time route to seed admin User accounts in production without SSH.
    Protected by SECRET_KEY — only the platform owner can call it.

    POST /api/v1/auth/create-user
    Headers: X-Setup-Key: <SECRET_KEY value from Railway env>
    Body: { "email": "...", "password": "...", "role": "SUPER_ADMIN|TENANT_ADMIN", "full_name": "..." }
    """
    if x_setup_key != settings.SECRET_KEY:
        raise HTTPException(status_code=403, detail="Invalid setup key.")

    email     = payload.get("email", "").strip()
    password  = payload.get("password", "")
    role      = payload.get("role", "TENANT_ADMIN")
    full_name = payload.get("full_name") or email.split("@")[0].title()

    valid_roles = {"SUPER_ADMIN", "TENANT_ADMIN", "MANAGER_RESERVATIONS", "MANAGER_UNITS"}
    if role not in valid_roles:
        raise HTTPException(status_code=422, detail=f"Invalid role. Choose: {sorted(valid_roles)}")
    if not email or len(password) < 8:
        raise HTTPException(status_code=422, detail="email required, password >= 8 chars.")

    owner_slug = getattr(settings, "SUPER_ADMIN_SLUG", "smar")
    owner = await prisma_client.client.find_unique(where={"slug": owner_slug})
    if not owner:
        raise HTTPException(status_code=500, detail=f"Platform owner client '{owner_slug}' not found.")

    existing = await prisma_client.user.find_unique(where={"email": email})
    if existing:
        await prisma_client.user.update(
            where={"email": email},
            data={
                "password_hash": get_password_hash(password),
                "role": role,
                "isActive": True,
                "fullName": full_name,
            },
        )
        return {"action": "updated", "email": email, "role": role}

    await prisma_client.user.create(data={
        "clientId":      owner.id,
        "email":         email,
        "password_hash": get_password_hash(password),
        "fullName":      full_name,
        "role":          role,
        "isActive":      True,
    })
    return {"action": "created", "email": email, "role": role}


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

    # Fetch the created client + user in one go
    client = await prisma_client.client.find_unique(where={"slug": slug})
    user   = await prisma_client.user.find_first(
        where={"clientId": client.id, "role": "TENANT_ADMIN"}
    )

    # Issue USER JWT (type="admin") — works directly with GenericAdminDashboard
    # and all /admin/* routes without a separate login step.
    token = create_access_token(data={
        "type":      "admin",
        "user_id":   user.id,
        "client_id": client.id,
        "slug":      client.slug,
        "role":      user.role,
    })

    _set_auth_cookie(response, token)
    logger.info("✅ New tenant registered: %s (role=%s)", slug, user.role)

    return {
        "success": True,
        "data": {
            "token":         token,
            "slug":          slug,
            "role":          user.role,
            "status":        "trial",
            "venue_type":    request.venue_type,
            "trial_ends_at": result["data"]["trial_ends_at"],
            "dashboard_url": result["data"]["dashboard_url"],
        },
    }

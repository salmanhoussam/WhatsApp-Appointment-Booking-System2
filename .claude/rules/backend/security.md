paths: "app/**,prisma/**"

# Security Rules — Backend

## 1. Route Protection Matrix

| Route Prefix | Tenant Resolution | Service Gate | Auth Guard |
|---|---|---|---|
| `/api/v1/public/*` | `get_current_tenant` ✅ | `require_service()` ✅ | ❌ None |
| `/api/v1/admin/*` | via JWT (inside guard) | `require_service()` ✅ | `get_current_admin_user` |
| `/api/v1/super/*` | ❌ N/A | ❌ N/A | `require_super_admin` |
| `/api/v1/auth/*` | ❌ N/A | ❌ N/A | ❌ None |

---

## 2. JWT Token Types

**Client token** — issued by `POST /api/v1/auth/login`:
```json
{
  "type":      "client",
  "client_id": "<uuid>",
  "slug":      "<tenant-slug>",
  "phone":     "<phone>",
  "exp":       "<unix-timestamp>"
}
```

**Admin/Staff token** — issued by `POST /api/v1/auth/users/login`:
```json
{
  "type":      "admin",
  "user_id":   "<uuid>",
  "client_id": "<uuid>",
  "slug":      "<tenant-slug>",
  "role":      "SUPER_ADMIN | TENANT_ADMIN | MANAGER_RESERVATIONS | MANAGER_UNITS",
  "exp":       "<unix-timestamp>"
}
```

Both expire in **24 hours**. Also issued as `HttpOnly` cookie:
- `SameSite=Lax`, `Secure` in production
- Domain: `.salmansaas.com` in production
- `max_age=86400`

---

## 3. Multi-Tenancy Isolation (CRITICAL)

```
🔴 Zero Cross-Tenant Data — No Exceptions
```

```python
# ✅ CORRECT — clientId scopes every query at DB level
await prisma.order.find_many(where={
    "clientId": tenant["id"],
    "status": "pending",
})

# ❌ WRONG — fetches all tenants, filters in Python
orders = await prisma.order.find_many()
return [o for o in orders if o.clientId == tenant_id]

# ❌ WRONG — query with no clientId at all
await prisma.unit.find_first(where={"id": unit_id})
# Must be:
await prisma.unit.find_first(where={"id": unit_id, "clientId": tenant["id"]})
```

---

## 4. User Roles

| Role | Scope |
|------|-------|
| `SUPER_ADMIN` | All tenants — Salman only |
| `TENANT_ADMIN` | Full control over own tenant |
| `MANAGER_RESERVATIONS` | Booking/reservation management only |
| `MANAGER_UNITS` | Unit management only |

**Role check pattern:**
```python
from app.core.tenant import require_roles

@router.patch("/units/{id}")
async def update_unit(
    user = Depends(require_roles("TENANT_ADMIN", "MANAGER_UNITS")),
    _svc = Depends(require_service("booking")),
): ...
```

---

## 5. Super Admin Access

Two valid authentication paths for `/api/v1/super/*`:

1. Admin JWT with `role = "SUPER_ADMIN"`
2. Client JWT where `slug == settings.SUPER_ADMIN_SLUG` (env: `SUPER_ADMIN_SLUG`, default: `"smar"`)

```python
from app.core.tenant import require_super_admin

@router.get("/clients")
async def list_all_clients(_ = Depends(require_super_admin)): ...
```

**Never hardcode the super admin slug** — always read from `settings.SUPER_ADMIN_SLUG`.

---

## 6. Rate Limiting

Library: `slowapi`. Applied to auth endpoints only (IP-based):

| Endpoint | Limit |
|----------|-------|
| `POST /api/v1/auth/login` | 5/minute |
| `POST /api/v1/auth/users/login` | 5/minute |
| `POST /api/v1/auth/register` | 3/minute |

Public/admin/super routes: no rate limit currently.

---

## 7. Secret Management

| Secret | Env Var | Startup Guard |
|--------|---------|---------------|
| JWT signing key | `SECRET_KEY` | `ValueError` if default `"my-super-secret-key..."` used |
| WhatsApp verify token | `WHATSAPP_VERIFY_TOKEN` | `ValueError` if default used |
| Supabase URL | `SUPABASE_URL` | Required — no default |
| Supabase service key | `SUPABASE_SERVICE_ROLE_KEY` | Required — no default |
| Resend API key | `RESEND_API_KEY` | Optional |
| Anthropic key | `ANTHROPIC_API_KEY` | Optional |

Swagger UI (`/docs`, `/redoc`, `/openapi.json`) → **disabled in production** via `docs_url=None`.

---

## 8. CORS

```python
# Development
allow_origins = ["*"]

# Production — only these origins + FRONTEND_URL env var (comma-separated)
allow_origins = settings.CORS_ORIGINS  # list in config.py
```

**Never** add `"*"` to production CORS. Add new tenant subdomains to `CORS_ORIGINS` in `config.py`.

---

## 9. Input Security

```python
# ✅ Pydantic validates and sanitizes all inputs
class ItemCreate(BaseModel):
    name_ar:     str     = Field(min_length=1, max_length=200)
    price:       Decimal = Field(gt=0)
    category_id: UUID    # type-safe UUID — no injection risk

# ✅ Prisma parameterizes all queries — no SQL injection via ORM
# ❌ NEVER pass raw user input to prisma.execute_raw() or execute_raw_unsafe()
```

---

## 10. Client Status Guard (Planned)

Clients with `status = "suspended"` or `status = "expired"` should be blocked.
**Currently not enforced** — planned upgrade to `get_current_tenant()`:

```python
# Planned — add to app/core/tenant.py → get_current_tenant()
if client["status"] in ("suspended", "expired"):
    raise HTTPException(403, "Tenant account is inactive")
```

---

## 11. HttpOnly Cookie vs Bearer Token

Frontend can authenticate via either:
- `Authorization: Bearer <token>` header (API clients, mobile)
- `admin_access_token` HttpOnly cookie (browser — set automatically on login)

Both are checked in `get_current_admin_user()`. Cookie takes precedence if both present.

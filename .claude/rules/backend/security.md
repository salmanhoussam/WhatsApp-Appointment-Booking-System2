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

### The words we use for people — fixed 2026-09-12, Salman's standing instruction

*"أنا بالـadmin قصدي الـowner، وبالـmanager قصدي الـadmin. خلينا نعتمد هالتسميات من اليوم ورايح."*

The confusion was real and it was ours: the enum value above is spelled `TENANT_ADMIN`, so "admin"
got used in conversation for the shop's OWNER, while Salman used "admin" for the person who RUNS
the shop. Three tiers, named once:

| The word, from today | What it means | How it is stored | Real rows, 2026-09-12 |
|---|---|---|---|
| **owner** | owns the shop | `role=TENANT_ADMIN`, `permissions=NULL` — the `tenant_admin` preset, deliberately legacy | حسين رقا (`rk`), Ali (`mr-h`) |
| **admin** | RUNS the shop, is not the owner | the `tenant_manager` preset: a real permission array, `scope="all"`, with `legacy_role=TENANT_ADMIN` as an **inert placeholder** | جعفر صالح (`rk`) — his array matches that preset exactly |
| **barber** | holds a chair | a `Barber` row; with a login account, the `staff` preset (`scope="self"`, `requires_barber=True`) | all three of the above also hold Barber rows |

**The enum is NOT renamed, and this is the point.** `TENANT_ADMIN` is a Postgres enum value carried
by real rows and read across the codebase; renaming it would be a migration with no behavioural
gain. What is fixed is the *vocabulary* — what we call these people in conversation, in plans, in
commit messages, and in any NEW label we invent. `app/services/whatsapp_merchant_actions.py` is the
first module to use it: its audit `actor` is one of `owner` / `admin` / `staff` / `barber`, and the
tier is **derived from scope** rather than stored a second time.

**A person is often more than one tier.** جعفر is an admin AND a barber; حسين is an owner AND a
barber. So anything resolving a person must decide precedence explicitly — the WhatsApp channel
takes the highest authority first, so an owner is never narrowed to self-scope for also cutting
hair.

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
| Supabase URL | `SUPABASE_URL` | ❌ None — see below |
| Supabase service key | `SUPABASE_SERVICE_KEY` | ❌ None — see below |
| Resend API key | `RESEND_API_KEY` | Optional |
| Anthropic key | `ANTHROPIC_API_KEY` | Optional |

Swagger UI (`/docs`, `/redoc`, `/openapi.json`) → **disabled in production** via `docs_url=None`.

### Correction, 2026-09-08 — the two Supabase rows above were wrong on both columns

Found during the two-week documentation review (`.claudedocs/sessions/2026-09-08.md`) and corrected
here. Both errors are recorded rather than silently overwritten, because a rules file that misstates
a secret's name is the failure mode this correction exists to prevent.

**Error 1 — the variable name did not exist.** This table documented
`SUPABASE_SERVICE_ROLE_KEY`. That string appears **nowhere** in `app/` or `scripts/`. The names the
code actually reads (verified 2026-09-08 by counting real references):

| Variable | References in `app/` + `scripts/` |
|---|---|
| `SUPABASE_URL` | 51 |
| `SUPABASE_KEY` | 32 |
| `SUPABASE_SERVICE_KEY` | 20 |

`.env` and `.env.example` define exactly two: `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`.

**Error 2 — there is no startup guard.** The "Required — no default" claim was false. Neither
variable is declared in `app/core/config.py` at all (that file has **zero** Supabase references);
both are read with raw `os.getenv()` inside services. The only real startup `ValueError` guards are
`SECRET_KEY` (`config.py:120`) and `WHATSAPP_VERIFY_TOKEN` (`config.py:122`).

**Real behaviour when the key is missing** — degrade at import, fail at request time, never at
startup:

```python
# app/services/storage_service.py:15-20
_SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")
_supabase = _create_supabase(...) if (_SUPABASE_URL and _SUPABASE_KEY) else None
# -> later, per request: HTTPException(500, "Storage not configured — check
#    SUPABASE_URL and SUPABASE_SERVICE_KEY")   (storage_service.py:141, :192)
```

**One real inconsistency between call sites, noted not fixed** (this is a documentation task; a code
change needs its own decision): `registration_service.py:64` and `storage_service.py:16` both fall
back `SUPABASE_SERVICE_KEY or SUPABASE_KEY`, while `public_service.py:14` reads **only**
`SUPABASE_SERVICE_KEY` with no fallback. A deployment carrying just `SUPABASE_KEY` would therefore
give working storage/registration and a silently `None` Supabase client in `public_service.py`.

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

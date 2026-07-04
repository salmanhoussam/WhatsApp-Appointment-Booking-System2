paths: "app/**,prisma/**,scripts/**"

# Client Services System — `client_services` Pattern

## 1. The Bridge Table

Every feature a tenant has activated = one row in `client_services`.
This is the **only** gate between a tenant and a module.

```prisma
model ClientService {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  clientId   String   @db.Uuid
  serviceKey String   // see valid keys below
  isActive   Boolean  @default(true)
  activatedAt DateTime @default(now())
  config     Json?    // per-service config overrides

  client Client @relation(fields: [clientId], references: [id])

  @@unique([clientId, serviceKey])
  @@map("client_services")
}
```

## 2. Valid Service Keys

| serviceKey            | Module     | Status  |
|-----------------------|------------|---------|
| `booking`             | Booking    | ✅ Live |
| `gallery`             | Booking    | ✅ Live |
| `whatsapp_ordering`   | Booking    | ✅ Live |
| `restaurant`          | Restaurant | 🔄 Pending migration |
| `store`               | Store      | 🔄 Pending migration |
| `delivery_zones`      | Store      | 📋 Planned |
| `loyalty`             | Shared     | 📋 Planned |
| `analytics`           | Shared     | 📋 Planned |
| `immersive_3d`        | Showcase   | 🔒 Ultra tier only ($35/mo) — 3D scroll-driven camera page |
| `whatsapp_blast`      | Shared     | 📋 Planned |
| `ai_bot`              | Shared     | 📋 Planned |

## 3. `require_service()` Dependency (MANDATORY)

Every module endpoint **MUST** call `require_service()` as the first dependency.
No exceptions. No conditional checks. No skipping.

```python
# app/core/services.py
from app.db.client import prisma_client
from fastapi import Depends, HTTPException
from app.core.tenant import get_current_client

async def require_service(service_key: str):
    """Dependency factory — verify tenant has active service."""
    async def _check(client=Depends(get_current_client)):
        svc = await prisma_client.clientservice.find_first(where={
            "clientId": client.id,
            "serviceKey": service_key,
            "isActive": True,
        })
        if not svc:
            raise HTTPException(
                status_code=403,
                detail=f"Service '{service_key}' is not activated for this tenant."
            )
        return svc
    return _check
```

## 4. Usage Pattern in Routes

```python
# ✅ CORRECT — service check is the first dependency
@router.get("/menu")
async def get_menu(
    client=Depends(get_current_client),
    _svc=Depends(require_service("restaurant")),   # ← first gate
):
    return await menu_service.get_menu(client.id)

# ❌ WRONG — no service check
@router.get("/menu")
async def get_menu(client=Depends(get_current_client)):
    return await menu_service.get_menu(client.id)  # any tenant can hit this

# ❌ WRONG — service check in service layer (too late, wrong layer)
async def get_menu(client_id: str):
    await _verify_service(client_id, "restaurant")  # business logic in service is ok,
    ...                                              # but the ROUTE must also check
```

## 5. Super Admin Service Toggle

Only `SUPER_ADMIN` can activate/deactivate services.
Tenant admins cannot change their own service list.

```
PATCH /api/v1/super/clients/{id}/services
Body: { "serviceKey": "restaurant", "isActive": true }
```

## 6. Seeding Services on New Tenant

When a new tenant is created via `POST /api/v1/super/clients`, seed their default services:

```python
# Always seed for every new tenant:
DEFAULT_SERVICES = ["booking", "gallery", "whatsapp_ordering"]

# Per-type extras (set isActive=False initially):
BOOKING_EXTRAS    = []
RESTAURANT_EXTRAS = ["restaurant"]
STORE_EXTRAS      = ["store"]
```

## 7. Critical Rule

```
Every module endpoint MUST check client_services before serving.
A tenant that doesn't have the service activated → 403.
This applies even if the tenant has data in that module's tables.
```

---

## 8. New Client — Route Setup Checklist

عند بناء routes لعميل/module جديد، اتبع هذا الترتيب بالضبط:

### الخطوة 1 — أضف serviceKey لقائمة Valid Service Keys (Section 2 أعلاه)

```
| `your_module` | YourModule | 🔄 In development |
```

### الخطوة 2 — أضف serviceKey لـ SERVICE_TYPE_MAP في `app/core/services.py`

```python
SERVICE_TYPE_MAP = {
    "restaurant": ["restaurant"],
    "store":      ["store"],
    "your_type":  ["your_module"],  # ← أضف هنا
}
```

### الخطوة 3 — أنشئ Router بالـ dependencies الصحيحة

```python
# app/api/v1/public/your_module.py
from fastapi import APIRouter, Depends
from app.db.dependencies import get_current_tenant
from app.core.services   import require_service
from app.services.your_service import your_service

router = APIRouter(prefix="/your-module", tags=["Your Module"])

@router.get("/items")
async def list_items(
    tenant = Depends(get_current_tenant),
    _svc   = Depends(require_service("your_module")),  # ← MANDATORY — أول dependency
):
    return {"success": True, "data": await your_service.list(tenant["id"])}
```

### الخطوة 4 — سجّل الـ Router في `app/api/v1/public/__init__.py`

```python
from app.api.v1.public.your_module import router as your_module_router
router.include_router(your_module_router)
```

### الخطوة 5 — Seed الـ ClientService row في DB

```bash
# عبر super admin API:
PATCH /api/v1/super/clients/{client_id}/services
Body: { "serviceKey": "your_module", "isActive": true }

# أو عبر seed script:
python scripts/seed_unified_clients.py  # يجب أن يشمل your_module
```

### الخطوة 6 — تحقق قبل Deploy

```
□ كل route فيها require_service() كأول dependency بعد get_current_tenant
□ كل DB query فيها clientId في الـ where clause
□ لا Prisma calls في routes أو services
□ Pydantic schema لكل input body
□ ClientService row موجود في DB للعميل المستهدف
□ Router مسجّل في __init__.py
```

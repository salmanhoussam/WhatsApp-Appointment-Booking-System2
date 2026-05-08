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

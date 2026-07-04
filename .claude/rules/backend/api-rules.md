paths: "app/api/**/*.py"

# API Route Rules — Strict

## 1. Zero Business Logic

Routes = HTTP transport only.

- Logic → `app/services/`
- DB queries → `app/repositories/`

---

## 2. Mandatory Dependency Chain (in order)

Every module route MUST declare dependencies in this exact order:

```python
@router.get("/menu")
async def get_menu(
    tenant = Depends(get_current_tenant),             # 1. Resolve tenant
    _svc   = Depends(require_service("restaurant")),  # 2. Service gate → 403 if inactive
    # Admin routes ONLY — add after step 2:
    # user = Depends(get_current_admin_user),         # 3. JWT auth → 401/403 if invalid
):
    return {"success": True, "data": await menu_service.get_menu(tenant["id"])}
```

**Canonical import sources:**
```python
from app.db.dependencies import get_current_tenant, get_current_admin_user
from app.core.services   import require_service
from app.core.tenant     import require_super_admin, require_roles
```

---

## 3. Route Type Matrix

| Route Type | Tenant | Service Gate | Auth |
|-----------|--------|-------------|------|
| Public `/api/v1/public/*` | `get_current_tenant` | `require_service()` ✅ | ❌ None |
| Admin `/api/v1/admin/*` | via JWT (in `get_current_admin_user`) | `require_service()` ✅ | `get_current_admin_user` |
| Super `/api/v1/super/*` | ❌ N/A | ❌ N/A | `require_super_admin` |
| Auth `/api/v1/auth/*` | ❌ N/A | ❌ N/A | ❌ None |

---

## 4. Input Validation — Pydantic Required

All inputs via Pydantic schemas. No raw dicts or untyped body params.

```python
from pydantic import BaseModel, Field
from uuid import UUID

class OrderCreate(BaseModel):
    items:          list[OrderItemSchema]
    customer_name:  str = Field(min_length=2, max_length=100)
    customer_phone: str
    notes:          str | None = None
    unit_id:        UUID
```

FastAPI returns `422 Unprocessable Entity` automatically on validation failure.

---

## 5. Standard Response Envelope

```python
# ✅ Success
return {"success": True, "data": result}

# ✅ Error — raise HTTPException, never return manually
raise HTTPException(status_code=404, detail="Item not found")
# Centralized handler wraps it → {"success": false, "error": "Item not found"}

# ✅ List response
return {"success": True, "data": items, "total": len(items)}
```

---

## 6. DB Access Forbidden in Routes

```python
# ❌ NEVER in a route file
from app.db.client import prisma_client
data = await prisma_client.unit.find_many(...)

# ✅ ALWAYS through a service
from app.services.booking_service import booking_service
data = await booking_service.list_available(tenant["id"], filters)
```

---

## 7. Full Route Example (Public)

```python
# app/api/v1/public/restaurant.py
from fastapi import APIRouter, Depends
from app.db.dependencies import get_current_tenant
from app.core.services   import require_service
from app.services.restaurant_service import restaurant_service
from app.schemas.restaurant import OrderCreate

router = APIRouter(prefix="/restaurant", tags=["Restaurant"])

@router.get("/menu")
async def get_menu(
    tenant = Depends(get_current_tenant),
    _svc   = Depends(require_service("restaurant")),
):
    return {"success": True, "data": await restaurant_service.get_menu(tenant["id"])}

@router.post("/orders")
async def create_order(
    body:   OrderCreate,
    tenant = Depends(get_current_tenant),
    _svc   = Depends(require_service("restaurant")),
):
    order = await restaurant_service.create_order(tenant["id"], body)
    return {"success": True, "data": order}
```

---

## 8. Full Route Example (Admin)

```python
# app/api/v1/admin/restaurant.py
from app.db.dependencies import get_current_admin_user
from app.core.tenant     import require_roles

@router.patch("/orders/{order_id}/status")
async def update_order_status(
    order_id: UUID,
    body:     OrderStatusUpdate,
    user    = Depends(require_roles("TENANT_ADMIN", "MANAGER_RESERVATIONS")),
    _svc    = Depends(require_service("restaurant")),
):
    result = await restaurant_service.update_status(user["client_id"], order_id, body.status)
    return {"success": True, "data": result}
```

# Backend Rules v2 — Rewrite Plan & Reference
# Created: 2026-07-03

## ما تم

أعيدت كتابة كل ملفات `.claude/rules/backend/` لتكون:
- قابلة للقراءة (markdown صحيح، ليس سطراً واحداً)
- مبنية من الكود الفعلي (function names، import paths، JWT structure)
- مرجعاً كاملاً لأي Agent عند بناء routes لعميل جديد

---

## الملفات المعدّلة

| الملف | التغيير |
|-------|---------|
| `architecture.md` | أعيد كتابته كاملاً — 4-layer، tenant resolution، JWT roles |
| `api-rules.md` | أعيد كتابته — dependency chain، route matrix، أمثلة كاملة |
| `service-system.md` | أضيف Section 8: New Client Route Checklist |
| `security.md` | **ملف جديد** — protection matrix، JWT tokens، roles، rate limiting، CORS |

---

## Quick Reference — Dependency Chain

### Public Route
```python
@router.get("/endpoint")
async def endpoint(
    tenant = Depends(get_current_tenant),            # 1. أولاً دائماً
    _svc   = Depends(require_service("module_key")), # 2. ثانياً دائماً
):
    return {"success": True, "data": await service.method(tenant["id"])}
```

### Admin Route
```python
@router.patch("/endpoint")
async def endpoint(
    user = Depends(require_roles("TENANT_ADMIN")),   # 1. Auth + role
    _svc = Depends(require_service("module_key")),   # 2. Service gate
):
    return {"success": True, "data": await service.method(user["client_id"])}
```

### Super Route
```python
@router.get("/endpoint")
async def endpoint(_ = Depends(require_super_admin)):  # 1. فقط
    return {"success": True, "data": await service.method()}
```

---

## Canonical Imports

```python
from app.db.dependencies import get_current_tenant, get_current_admin_user
from app.core.services   import require_service
from app.core.tenant     import require_super_admin, require_roles
```

---

## New Client — 6-Step Checklist

```
□ 1. أضف serviceKey في service-system.md Section 2
□ 2. أضف لـ SERVICE_TYPE_MAP في app/core/services.py
□ 3. أنشئ Router مع get_current_tenant + require_service
□ 4. سجّل Router في app/api/v1/public/__init__.py
□ 5. Seed ClientService row في DB
□ 6. تحقق: clientId في كل query، Pydantic على كل input
```

---

## JWT Payload Reference

```json
// Client token (POST /auth/login)
{ "type": "client", "client_id": "uuid", "slug": "tenant-slug", "phone": "...", "exp": 0 }

// Admin token (POST /auth/users/login)
{ "type": "admin", "user_id": "uuid", "client_id": "uuid", "slug": "slug", "role": "TENANT_ADMIN", "exp": 0 }
```

---

## Security Checklist قبل كل Deploy

```
□ كل public route: get_current_tenant + require_service
□ كل admin route: get_current_admin_user + require_service
□ كل query: clientId في where clause
□ لا prisma calls خارج repositories/
□ لا business logic في routes/
□ Pydantic schema لكل input body
□ SECRET_KEY ليس الـ default value
□ /docs مغلق في production (docs_url=None)
```

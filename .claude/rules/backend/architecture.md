paths: "app/**,prisma/**,scripts/**"

# Backend Architecture Rules

## 1. Stack

- FastAPI (Python)
- PostgreSQL via Supabase
- Prisma ORM
- Pattern: 4-Layer Clean Architecture

---

## 2. The 4-Layer System (STRICT)

Dependency direction: **Routes → Services → Repositories → DB**

| Layer | Location | Role | Forbidden |
|-------|----------|------|-----------|
| Routes | `app/api/v1/` | HTTP only — parse inputs, format outputs | Business logic, Prisma calls |
| Services | `app/services/` | Business logic, orchestration | Prisma calls |
| Repositories | `app/repositories/` | Prisma queries ONLY | Business logic |
| DB | Supabase/Postgres | Managed via Prisma | — |

---

## 3. Multi-Tenancy (CRITICAL)

Every query MUST include `clientId` in the `where` clause **at the DB level**.
Never filter by tenant in Python after fetching.

```python
# ✅ CORRECT — filtered at DB
await prisma.unit.find_many(where={"clientId": client_id, "isActive": True})

# ❌ WRONG — fetches ALL tenants then filters in Python
all_units = await prisma.unit.find_many()
return [u for u in all_units if u.clientId == client_id]
```

---

## 4. Supabase Connectivity

| Env Var | Port | Use |
|---------|------|-----|
| `DATABASE_URL` | 6543 | Runtime queries (Pgbouncer pooled) |
| `DIRECT_URL`   | 5432 | Prisma migrations only (`prisma db push`) |

---

## 5. Tenant Resolution (Priority Order)

`get_current_tenant()` → `app/db/dependencies.py` resolves slug in this order:

1. JWT Bearer token → `payload["slug"]`
2. `X-Tenant-Slug` header
3. `?client_slug=` query param
4. Subdomain (`<slug>.salmansaas.com` or `<slug>.localhost`)

Resolved tenant is **cached 5 minutes** in-process (`_tenant_cache`).
Returns `{"id": str, "slug": str, "currency": str}`.
Raises `401` if no context found, `404` if slug not in DB.

---

## 6. JWT Roles

| Role | Token Type | Description |
|------|-----------|-------------|
| `SUPER_ADMIN` | admin | Salman only — full access all tenants |
| `TENANT_ADMIN` | admin | Full control over own tenant |
| `MANAGER_RESERVATIONS` | admin | Booking management only |
| `MANAGER_UNITS` | admin | Unit management only |

---

## 7. Exception Handling

All exceptions → centralized handlers in `app/core/handlers.py` → `{"success": false, "error": "..."}`.
Use typed exceptions from `app/core/exceptions.py` inside services.

---

## 8. Background Tasks

Use `FastAPI BackgroundTasks` for async ops — never block the HTTP response:

```python
background_tasks.add_task(whatsapp_service.send_confirmation, booking_id)
background_tasks.add_task(email_service.send_welcome, customer_email)
```

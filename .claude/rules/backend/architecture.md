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

---

## 9. One Capability, One Service, Many Interfaces

Platform-wide principle, elevated here (not scoped to any one module) at Salman's explicit
direction — it is exactly what Section 2's 4-Layer rule already requires, restated as a single
governing line because the failure mode it prevents is easy to back into gradually, one route at a
time:

> **One Capability. One Contract. One Service. One Source of Truth. Many Interfaces.**

Every domain capability — Booking, Restaurant, Store/Catalog, a future AI interface, any future
Plugin (Coupons, Inventory, CRM, ...) — has exactly one model that owns its data and exactly one
`app/services/*.py` module that may write to it. Every caller of that capability — an admin
Dashboard route, a public route, an AI action, an import script, a future Mobile/API client — goes
through that same Service, never straight to a Repository, never a second parallel write path.
This is Section 2's Routes → Services → Repositories → DB direction, taken seriously as a rule
about *data ownership*, not just *file placement*: a second route file writing to the same table
through a different path is exactly as much a violation as a route skipping the Service layer
entirely, even when each individual file "looks correct" in isolation.

`.claudedocs/architecture/TENANT_OS_PLAN.md` is where this principle is being actively audited and
enforced today (its Single Source of Truth Matrix and classified Architecture Integrity Findings)
— that document does not own this rule, it demonstrates applying it. Any future domain plan should
link back here rather than restate the principle itself.

## 10. Every Capability Exposes Two Contracts — Admin (Write) and Public (Read)

Platform-wide principle, raised by Salman while reviewing the Tenant OS Editing Engine's real
write path (Sprint 1/2, Content and Media Capabilities) — already true in the current codebase
(`app/api/v1/public/`, `app/api/v1/admin/` have been separate directories since Section 1's Folder
Structure), made explicit here as its own rule so it stays true *on purpose* rather than by
accident once more Capabilities and Interfaces (AI, Mobile) are added:

> **Admin Contract** — mutable, authenticated, operation-based: validation, permissions, audit,
> draft/workflow. Consumed only by trusted write-capable Interfaces (the Dashboard today; a future
> AI action or Mobile write path tomorrow).
> **Public Contract** — read-only, rendering-optimized: published content only, never drafts, a
> stable shape any tenant-facing renderer can depend on, future caching. Consumed by every
> tenant-facing Interface, including a Dashboard's own live preview.

Concretely, in the Tenant OS Editing Engine (`TENANT_OS_PLAN.md` §14) as already built: the
Dashboard's write path is `Dashboard → PATCH /api/v1/admin/{capability}/... → Service →
Repository → DB`; the live preview `<iframe>` (and every real visitor) reads that same DB state
back through a completely separate route, `GET /api/v1/public/{slug}/config` — never the Admin
one. Confirmed real, not aspirational: `DynamicPage.jsx` (the component both the live preview and
every real visitor render) imports only `publicApi`, never `adminApi`. This is what makes the live
preview a genuine end-to-end proof rather than a mock — the editor and a real future visitor read
through the identical Public Contract, so what the editor sees during editing is what a visitor
will actually get.

No Interface — Dashboard, a future AI action, a future Mobile client — may read from or write to a
Repository directly, or cross the boundary (writing through the Public Contract, or reading
Draft/unpublished state through it). Every write goes through an Admin route; every render goes
through a Public route. A violation found anywhere is a **Broken Architecture** finding under
`TENANT_OS_PLAN.md` §19's existing taxonomy — not a new category; the same one already defined
there for a Route bypassing its Service, applied to this specific boundary.

When Draft/Publish (`TENANT_OS_PLAN.md` §8) is built, this split is exactly what makes it a clean
addition rather than a rearchitecture: Admin Contract writes go to Draft Storage, a Publish step
promotes Draft → Published, and the Public Contract only ever reads Published state — the Editing
Engine itself does not change.

`.claudedocs/architecture/TENANT_OS_PLAN.md` §14 is where this split is being actively exercised
today (Content and Media Capabilities' real Admin routes vs. the Public config endpoint the live
preview reads) — that document does not own this rule, it demonstrates applying it.

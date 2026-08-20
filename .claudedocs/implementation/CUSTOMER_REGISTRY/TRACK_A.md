# Unified Customer Registry — Track A (Additive) — Evidence (2026-08-20)

Follows the architecture plan (`~/.claude/plans/we-moved-on-new-hazy-barto.md`, Track A) and
Salman's explicit execute instruction. Purely additive — no public-facing pages touched, no
Track B (homepage Products/Services separation) work done.

## Code changes

**Backend (Routes → Services → Repositories, per `rules/backend/architecture.md`)**:
- `app/repositories/reservation_repo.py` — new `list_all_for_client_with_service(client_id)`:
  tenant-wide (not barber-scoped), `service` relation included, no take limit.
- `app/repositories/store_admin_repo.py` — new `list_all_orders_with_items(client_id)`:
  tenant-wide, `items.catalogItem` included, no take limit.
- New `app/services/customer_registry_service.py` — `list_customer_registry(client_id)`: fetches
  both lists, merges by normalized phone. Every `StoreOrder` with no phone lands in one explicit
  `no_phone: true` bucket. Per phone: `badge` (`services_only`/`store_only`/`both`),
  `reservation_count`, `order_count`, `last_interaction_at`, full `reservations[]`/`orders[]` for a
  single-request detail view. Name conflicts resolve first-seen-wins (documented, not silent).
- New `app/api/v1/admin/customers.py` — `GET /` (real path `/api/v1/admin/customers/`),
  `require_roles("SUPER_ADMIN", "TENANT_ADMIN")`, no `require_service` gate (meaningful for
  reservations-only, store-only, or both).
- `app/api/v1/admin/__init__.py` — router registered, `prefix="/customers"`.

**Frontend**:
- New `frontend/src/pages/generic-admin/tabs/CustomersTab.jsx` — real table (name/phone or "بدون
  رقم"/badge pill/reservation+order counts/last interaction), click a row → local-state detail
  modal (no second network call — the list response already carries full history).
- `GenericAdminDashboard.jsx` — `case 'customers':` now renders `CustomersTab`, replacing
  `ComingSoonTab`. `buildNav()` untouched (its existing `customers` entry already pointed here).

## Real verification

**Backend restarted** (runs without `--reload`) to pick up the new router — confirmed via
`/docs` returning 200 after restart.

**API, both tenants, real JWTs from real `POST /auth/users/login`**:
- `mr-h`: `GET /admin/customers/` → 2 real customers, both `services_only`, real service names
  resolved ("دقن", "شعر") via the `service` relation join, correctly sorted by
  `last_interaction_at` descending.
- `rk`: `GET /admin/customers/` → 7 real customers, all `services_only` (matches the earlier
  Capability-to-Section Audit finding that RK's real Store category has zero real products/orders
  yet — the `both`/`store_only` paths are implemented but have no live data to exercise on this
  tenant today), 0 `no_phone` entries, real names and service names resolved correctly.
- **STAFF role real 403 test**: logged in as a real STAFF account (`jaafar@rk.dev.invalid`), hit
  `GET /admin/customers/` directly → real `403 FORBIDDEN`, `"Role 'STAFF' is not authorized.
  Required: ['SUPER_ADMIN', 'TENANT_ADMIN']"` — confirms the tenant-wide endpoint is genuinely
  inaccessible to STAFF, not just hidden client-side (`MyClientsTab`/`my-clients` stays their real,
  separate, working path, untouched).

**Browser, both tenants, real login tokens**:
- `mr-h`: navigated to `/mr-h/dashboard/customers` → 0 console errors → real table rendered
  (زبون واتساب / Ali Isolation Test, matching the API response) → clicked a row → detail modal
  opened showing the real reservation history (service name "شعر", date, status "قيد الانتظار")
  → closed cleanly.
- `rk`: navigated to `/rk/dashboard/customers` → 0 console errors → real table rendered, all 7
  real customers matching the API response exactly (حسام/amiga/amigo/ashraf kokha/ali aloka/...).

## Acceptance, checked explicitly

- ✅ No public-facing page touched — confirmed, diff is backend + one Dashboard tab only.
- ✅ No Track B work done — `FeaturedItemsSection.jsx`, `section_schemas.py`, `SECTION_MAP`
  untouched this pass.
- ✅ `no_phone` bucket implemented and named explicitly (not yet exercised by real data on either
  tenant — no store orders exist yet on either — but the code path is real, not hypothetical, and
  will be it exercised once Track B/real store orders land).
- ✅ Badge logic correct given real data available (`services_only` confirmed on both tenants;
  `store_only`/`both` logic present, unexercised pending real store order data).
- ✅ Single network call for detail view — confirmed via code (modal renders from the already-
  fetched row object, no `adminApi` call inside `CustomerDetailModal`).
- ✅ `buildNav()` unchanged — confirmed via diff.
- ✅ 0 console errors, both tenants, both list view and detail-modal interaction.
- ✅ STAFF gated out with a real, verified 403 — not assumed from the role check alone.

## Result

Track A done and verified on both real tenants. Ready for your review. Track B (homepage
Products/Services separation) not started — separate, independent track per the plan.

# Phase 3 — Implementation Evidence

**Scope executed**: exactly the Final Contract's own steps, in the strict order given, nothing
beyond. P0.1, Section System, Vertical Registry architecture, Demo Builder redesign, and
Clinic/Beauty were not touched.

## What was built

1. `Client.provisioningStatus` write wired into `registration_service.py` — `'pending'` only when
   a real `vertical` resolves; `None` (untracked, not "pending forever") for retail/restaurant.
2. `provisioning_service.provision_vertical_domain_objects()` — the retry-safe orchestration:
   dispatches by `staff_backing_model` (never a vertical-name string comparison), no-ops if already
   `'complete'`, otherwise deletes any of this client's existing barber-vertical rows before
   recreating from the current request's data, sets `'complete'`/`'failed'` accordingly.
3. `barber_repo.delete_barbers_by_client()` — new, scoped explicitly to provisioning-retry cleanup,
   documented as distinct from the admin API's own deliberate "no delete" policy (different rows,
   different moment: only ever called on a just-failed attempt's own rows, before any real
   Reservation could exist against them).
4. `app/api/v1/admin/provisioning.py` (new file, new router) — `POST /provisioning/domain-objects`,
   `require_service("reservations")` + `require_roles("SUPER_ADMIN","TENANT_ADMIN")`, matching every
   existing admin route's own pattern exactly.
5. `template-registry.js`'s `beauty-barber` entry gains `staff_label: {ar, en}` — frontend-only,
   per Decision 3.
6. `TenantRegisterPage.jsx`: conditional staff-name + repeatable services form section (shown only
   for a resolved vertical), Step 1.5 call, Step 3 skipped for resolved-vertical tenants, redirect
   gated on `provisioning_status === 'complete'`, a real "incomplete, please retry" state instead of
   a fake success on failure.

**One real bug found and fixed during implementation, not left for a stop**: the first live test
failed with `prisma.errors.FieldNotFoundError` — `registration_service.py` wrote the dict key
`"provisioning_status"` (the DB column name) where Prisma Python's `.create()` needs the model's own
field name, `"provisioningStatus"` (declared before the `@map` in schema.prisma, same rule
`vertical`/`service_type` already followed correctly). A field-name typo, not an architecture or
contract conflict — fixed directly, re-verified live immediately after.

## Live evidence, real browser + real HTTP, this round

**First registration, full flow** (`/register?template=beauty-barber`, real Playwright browser,
two services entered): register → 201 on `/provisioning/domain-objects` → settings → **seed-from-
template correctly not called at all** (confirmed via network request list) → redirect to
`/phase3test-full/dashboard?welcome=1`.

Real resulting data, checked via the same public, reservations-native endpoints a customer's
booking flow uses — **not Demo Builder's placeholder content**:
```
Barber: "أحمد"                                  (exactly what was entered)
Services: "قص شعر" $10/25min, "حلاقة لحية" $7/15min   (exactly what was entered)
```
DB: `vertical='barber'`, `provisioningStatus='complete'`, exactly 1 `CatalogCategory` ("الخدمات" —
confirms Step 3 was genuinely skipped, no redundant second category), exactly 2 `BarberService`
links (1 barber × 2 services, fully cross-assigned).

**Retry after a simulated partial failure** — `provisioning_status` set to `'failed'` directly
(simulating a real failed first attempt, leaving the real Barber+Services from that attempt in
place), then the same endpoint called again with **completely different** data
(`staff_name="محمد (محاولة ثانية)"`, one different service):
```
Before retry: barbers=['أحمد']              services=['قص شعر', 'حلاقة لحية']
After retry:  barbers=['محمد (محاولة ثانية)'] services=['خدمة جديدة']
```
Confirmed via direct DB count: **exactly 1 Barber, exactly 1 CatalogService, exactly 1 Category,
exactly 1 BarberService link** — the stale rows from the simulated failed attempt were deleted, not
accumulated; no duplicates anywhere.

**Idempotent no-op**: the same endpoint called a third time, with yet more different (junk) data,
while `provisioning_status` was already `'complete'` — returned the **same** `barber_id`/
`service_ids` as the retry above, confirming the junk data was correctly never applied.

**Validation**: empty `services` array → `422`; `price: 0` → `422`. Both confirmed live.

**Demo Builder unaffected**: a real `POST /demo/create` call (business_type=barbershop) produced
the exact same 6 placeholder services, same prices, as every prior round this session
(`شعر $8, لحية $6, شعر ولحية $12, كرياتين $25, تصفيف $5, صبغة $15`) — Demo Builder's own code path
was never touched this round.

**WhatsApp/n8n path unaffected**: `register_new_tenant()` called directly with the exact payload
shape `onboarding.py` produces (no `vertical` key) → `vertical=None`, **`provisioning_status=None`**
(correctly untracked, not left "pending" forever), `active_services=['catalog','restaurant']` —
byte-identical to every prior round's confirmation of this path.

**RK / Ali / alzabt-demo confirmed untouched**, final check this round:
```
rk:          vertical='barber'  provisioningStatus=None  barbers=2  catalogServices=6
ali:         vertical='barber'  provisioningStatus=None  barbers=1  catalogServices=6
alzabt-demo: vertical='barber'  provisioningStatus=None  barbers=2  catalogServices=6
```
Identical to every earlier round's baseline — `provisioningStatus` correctly stays `NULL` for these
three (they predate this mechanism; Phase 3 never touches an existing tenant's rows).

All test tenants created this round were cleaned up immediately after verification.

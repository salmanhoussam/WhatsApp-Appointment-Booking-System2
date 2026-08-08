# Ali Customer-Readiness — Real State vs. RK (Reference Tenant)

Follows: `investigation-protocol.md`, `tenant-onboarding.md`'s Completion Gate. Origin: Salman
named `rk` (RK Barber Shop) the reference/proven implementation and `ali` (Ali Barber Shop) as the
next real rollout, using the same capability architecture — not copying RK's data, copying the
pattern. This is a comparison pass, read-only, no execution yet.

## Confirmed: Ali's real origin (changes the framing)

`scripts/seed_ali_tenant.py`'s own docstring (2026-08-05, Phase 3.2): `ali` was deliberately built
as a **backend-only tenant-isolation test fixture** — proving the Reservation/Barber capability
against a second independent tenant, explicitly **not** the full customer onboarding flow: "no
page_content.json, no frontend route registration, no public page ... This is a partial onboarding
by design, not the full 'Onboarding Completed' chain ... stated explicitly, not silently claimed as
done." So "Ali is customer-ready except for the dashboard bug" was never true — the dashboard fix
closes one specific, real bug, but Ali was never taken through onboarding as a real customer.

## Comparison — `rk` (reference) vs `ali` (real state today)

| Area | `rk` | `ali` |
|---|---|---|
| `Client` row | `status: active`, `primary_color: #2F4F4F`, `whatsapp_number: 96176985477` | `status: active`, `primary_color: null`, `whatsapp_number: null` |
| `client_services` | `booking`, `catalog`, `reservations`, `store`, `whatsapp_ordering` — all active | `booking`, `reservations`, `whatsapp_ordering` — active. **`catalog` and `store` missing.** |
| `clients.config` | Real: `font`, `hero`, `story`, `content` (10 sections), `working_hours`, `catalog_layout` | **Empty (`{}`)** — confirmed live via `GET /api/v1/public/ali/config` |
| `Barber` (staff) | 4 rows (2 active real staff + 2 inactive test rows) | 1 row: "Ali", active, working hours `09:00–18:00`, no closed days |
| `CatalogService` | 6 real rows | 6 rows — **same names as RK's**, but different IDs (see note below) |
| `BarberService` (assignments) | 1 real assignment (`حسين` → `شعر`) | **0 rows** — no staff↔service assignment ever configured |
| `CatalogCategory` / `CatalogItem` | 2 categories / 10 items | 1 category / 6 items (from the isolation-test seed script) |
| Dashboard routing (today's fix) | ✅ Confirmed | ✅ Confirmed — same fix, same verification pass |

**Note on Ali's `CatalogService` rows**: these are not evidence of a deliberately-configured
Services capability for Ali. Per this session's earlier Phase 3.7C migration record, the migration
that created `catalog_services` copied every `CatalogItem` with `metadata.requires_booking = true`
**platform-wide** (12 rows total = 6 for `rk` + 6 for `ali`), not scoped to one tenant. Ali's 6
`CatalogService` rows exist only because the isolation-test script had already seeded matching
`CatalogItem` test data — an incidental side effect, not a real setup pass through Ali's own admin
UI. Worth naming so "the data exists" isn't mistaken for "someone configured it."

## Confirmed root cause of the earlier `ali` catalog 403

The 403s observed during dashboard verification (`GET /api/v1/admin/catalog/items?client_slug=ali`,
`.../catalog/categories?client_slug=ali`) are explained directly: `client_services` has no
`catalog` (or `store`) row for `ali` at all — the `require_service("catalog"|"store")` gate
(`service-system.md`) rejects every request before it reaches the Catalog service/repository layer.
This is not a code bug — it's a real config gap. Whether it *should* be activated depends on whether
Ali's business also sells retail products (like RK's `store` service) or is service-only — a product
decision, not a technical one.

## Confirmed public-page impact

`GET /api/v1/public/ali/config` (5 consecutive clean reads, after ruling out one transient
Supabase-pooler 500 — same recurring flakiness this session hit repeatedly with direct DB queries,
confirmed unrelated to Ali's data) returns real tenant identity fields but `"config":{}`,
`"features":null`, `"unit_types":[]`, `"payment_methods":[]`. Matches `tenant-onboarding.md`'s own
documented warning verbatim: "لا تنشئ tenant بدون page_content.json — الصفحة ستظهر فارغة." Ali's
public page has no seeded content to render — not a crash, an empty/under-setup state. Not yet
confirmed via a real browser (per `browser-verification-protocol.md`'s own discipline, this is a
Runtime Before Assumption gap — the API evidence strongly predicts it, but hasn't been watched
render).

## Tenant-Onboarding Completion Gate — `ali`'s real status

Per `tenant-onboarding.md`'s own checklist (`Client → User → Services → Settings → Page Content →
Media → Public Page renders → Dashboard renders`):

| Step | Status |
|---|---|
| Client + User in DB | ✅ Confirmed |
| `client_services` for correct module | 🟡 Partial — booking/reservations/whatsapp_ordering yes; catalog/store pending a product decision |
| `settings.json` | ❌ Does not exist (`scripts/data/ali/` was never created — this tenant used a custom one-off script, not the documented pipeline) |
| `page_content.json` / `config.content.sections` | ❌ Missing — `config` is empty |
| Public page renders (non-empty) | ❌ Not expected to, given the above — not yet browser-confirmed |
| Dashboard renders | ✅ Confirmed (today's fix) |
| Staff↔Service assignments | ❌ 0 rows — booking would fall back to "any staff for any service" (the documented soft-fallback default), not a deliberate setup |

**Overall: Partially Completed, per this project's own definition — not silently called "done."**

## Recommendation (not yet decided/executed)

1. Run the real, documented onboarding pipeline for `ali` (`tenant-onboarding.md` §1-§4): a real
   `settings.json`, a `page_content.json` built from the `booking`/`services` template (not copied
   from `rk`'s actual content — Salman's explicit instruction is pattern, not data), seeded via
   `scripts/seed_page_content.py`. This needs real inputs only Salman/the actual customer can supply
   (branding color, WhatsApp number, page copy) — not something to invent.
2. Decide, as a real product question, whether `ali` needs `catalog`/`store` activated (does this
   barbershop also sell retail products?) — then activate via the existing Super Admin service
   toggle if yes.
3. Go through the Staff & Services admin UI once for `ali` to assign the real "Ali" barber to the
   real services he performs — even one assignment moves this from "accidental fallback-to-all" to
   "deliberately configured," matching how `rk` is set up today.
4. Once 1-3 land, run a real Browser Verification pass on `ali`'s public page and dashboard
   end-to-end (same discipline as `rk`'s own verification), closing the Completion Gate for real
   rather than assuming it from API evidence alone.

None of this executed yet — this is the comparison pass Salman asked for, reported back before any
onboarding work starts.

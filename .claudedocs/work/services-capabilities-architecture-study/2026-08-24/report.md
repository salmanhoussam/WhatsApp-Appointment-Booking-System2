# Services / Capabilities Architecture Study — read-only, no code/DB changes

Requested by Salman 2026-08-24. Study only — no migrations, no cleanup, no commits, no
implementation. Every claim below is anchored to a real file:line or a prior dated Evolution Log
entry; where schema comments and prior investigations already answered a question with real
evidence, that evidence is cited and re-verified against current code rather than re-derived from
scratch or blindly trusted.

## 0. Executive Verdict

**KEEP CURRENT ARCHITECTURE** — with two named P1 items worth a deliberate look (not urgent, not
free) and one real P0-adjacent robustness gap (safe today, fragile by convention). This is not
"nothing to improve" — it's "the layers are not duplicating each other; the few places that do
duplicate are already known, already being watched on purpose, and none of the four candidate
axes in the brief (`platform_services` vs `client_services`, `client_services` vs JSON, `services`
vs `catalog_services`, `clients.features/selected_services/config`) actually turned out to be the
same problem twice."

The one thing this study found that wasn't already on record: `barber_repo.py`'s `update_barber()`
doesn't filter by `clientId` in its own query — every real caller happens to pre-check ownership,
but the repository function itself doesn't independently enforce this project's own stated rule
("Every DB query MUST filter by clientId or slug. No exceptions," `rules/global.md`). Not
exploitable today; a real, named risk for tomorrow. See §7.

## 1. Current Architecture Map

Four genuinely distinct layers exist, each answering a different question, confirmed by tracing
real reads/writes, not assumed from names:

```
PlatformService     "what SalmanSaaS could sell"        — global catalog, no clientId, super-admin CRUD only
ClientService        "what THIS tenant has activated"    — the real gate every module endpoint checks
Client.selected_services  a READ CACHE of ClientService  — denormalized, synced, never independently written
Client.features       feature flags WITHIN an already-active module (spatial/listings/booking/payment — smar-origin)
Client.config          unrelated JSON bucket             — page content (Tenant OS) + tenant-wide working_hours fallback
CatalogCategory/Item   "what a tenant sells" (order-bearing goods)
CatalogService          "what a tenant can be booked for" (Reservation-bearing) — split from CatalogItem, Phase 3.7C
Service (booking add-ons)  smar-specific real-estate/property add-ons — unrelated vertical, unrelated table
Barber / Resource       "who/what has a calendar" — two live, parallel, deliberately-unmerged models
```

None of these four layers is a stray duplicate of another *by contract*. The two real, evidenced
duplications in this codebase are narrower and already tracked: **Barber vs Resource** (§4) and a
handful of confirmed **write-path bypasses within one Capability** (Catalog's
`admin/restaurant.py`/`admin/store.py` skipping `catalog_service.py` — already a 3x-confirmed
pattern, see §9).

## 2. Source-of-Truth Map

| Concept | Current Source of Truth | Consumers | Writers | Duplication Risk | Recommendation |
|---|---|---|---|---|---|
| "Does tenant X have capability Y active?" | `client_services` table | `require_service()` (every gated backend route), `hasCapability()`/`hasOrderCapability()` (frontend, via `GET /{slug}/config`'s `active_services`) | `app/api/v1/admin/client_services.py`, `app/api/v1/super/platform_services.py`'s `toggle_client_service` | Low — one real write surface (two routes, same table, same sync call) | Keep |
| "What could SalmanSaaS sell, in general?" | `platform_services` table (intended) | **Nobody** — zero frontend refs, zero backend logic reads it for a decision | `app/api/v1/super/platform_services.py` (CRUD only) | Real, but not from duplication — from **disuse**. Confirmed inert 2026-07-27 (`evolution/platform-services-catalog.md`), still inert today (re-verified this pass) | Wire it up or accept it's decorative — see §5 |
| Cached "what's active" for cheap reads | `Client.selected_services` (JSON) | Nothing found reading it for a real gating decision in this pass (CRM-sheet/config-endpoint convenience per its own schema comment) | `sync_selected_services()`, called from exactly 2 routes | Low today (single sync helper, 2 callers) — but no DB-level guarantee stops a *future* 3rd writer to `ClientService` from forgetting the sync call | Keep as a cache; consider a safeguard (see §6) |
| Feature flags *within* an active module | `Client.features` (JSON) | `public_service.py` (smar's public config), `admin/settings.py` (display), `SettingsTab.jsx` (smar admin) | `registration_service.py`, `demo_service.py` (seeded at tenant creation), `site_configuration_service.py` (generic PATCH) | None found — real, live, but a *different question* than `client_services` (see §6) | Keep, distinct from ClientService |
| Tenant-wide config (page content, working-hours fallback) | `Client.config` (JSON) | `reservation_service.py` (working_hours fallback), `page_content.py` (Tenant OS content) | Tenant OS write paths, reservation admin | None found relevant to *service activation* — unrelated concern entirely | Keep, unrelated axis |
| "Is this a bookable service or a sellable good?" | `CatalogService` vs `CatalogItem` (separate tables, Phase 3.7C) | Reservation flows (rk, mr-h) vs Store/Restaurant order flows | `catalog_service_service.py` / `catalog_service.py`(ish — see §5 naming note) | None — deliberately split to *end* a real conflation (`metadata.requires_booking`) | Keep the split; **one legacy consumer still exists** (§9) |
| "Who has a calendar?" | `Barber` (reservations-scoped tenants) *and* `Resource` (clinic-scoped, module_key="clinic") | Two parallel pipelines in `reservation_service.py` | `barber_repo.py` / `resource_repo.py` (separate files) | **Real, confirmed, deliberately deferred** — see §4 | Do not merge yet — no trigger has fired |

## 3. Services/Capabilities Duplication Analysis

**Is there duplication?** Yes, in exactly one place, and it is not the axis the brief's item list
named. `Barber` and `Resource` are, per a prior real comparison (`evolution/reservation-capability.md`,
2026-07-31 and 2026-08-05), structurally near-identical: `_resolve_resource()`/`_resolve_barber()`
are the same 5-step shape; `find_overlapping_by_resource()`/`find_overlapping_by_barber()` are
byte-for-byte the same logic against two different tables; both reuse the same
`_check_working_hours()` utility. This was built *deliberately* independent (Salman's own
instruction, "build as if Clinic didn't exist," to get an honest second data point rather than a
premature abstraction) — and the resulting evidence says: **not costly enough yet to unify.**

Two concrete triggers were named at the time and **neither has fired as of this study**:
1. A third real case (Coworking, Spa, Gym) needing the same resolve/conflict-check shape.
2. Repeated maintenance pain — a bug fix needing to be applied to both branches more than once.

Confirmed still-true this pass: `Clinic`/`Resource` still has **zero real frontend** anywhere in
`frontend/src` (no file references `resource_id` or renders a resource-picker flow) — it's a
complete, live-verified backend with no consumer. This is *why* the third-case trigger hasn't
fired, not evidence the fork itself has grown worse.

**Recommendation: do not touch.** Not because the duplication isn't real — it is, and it's the
single clearest duplication in this whole study — but because merging two structurally-similar
models before a third real case proves what the shared shape should actually be risks locking in
the wrong abstraction. This exact reasoning is already Salman's own recorded decision
(`reservation-capability.md`, 2026-07-31 "Decision" section) — this study finds no new evidence to
revisit it.

## 4. `services` vs `catalog_services` Analysis

**Not the same concept — genuinely separate, correctly named to avoid collision.** Traced DB →
backend → API → frontend for both:

- **`Service`** (table `services`, Prisma model `Service`) — smar's real-estate/property booking
  add-ons (pool access, extra cleaning). `clientId` + `propertyId`, consumed via the `BookingService`
  join table against `Booking` (smar's own booking flow, unrelated to the Reservation Engine).
  Zero relation to `Reservation` anywhere in the schema.
- **`CatalogService`** (table `catalog_services`) — something a customer books a *time slot* for
  (a haircut, a consultation), used by the generic Reservation Engine (rk, mr-h). Real FK from
  `Reservation.serviceId`, real FK from `BarberService.serviceId`. Shares `CatalogCategory` with
  `CatalogItem` (orderable goods) via the same `moduleKey` convention, deliberately does **not**
  share a table with `CatalogItem` — split out in Phase 3.7C specifically *because* the two were
  being conflated via a single `metadata.requires_booking` boolean flag on `CatalogItem`, which the
  schema's own comment (line 508-521) documents as the exact naming/conflation lesson that produced
  this split.

**Is this legacy vs newer architecture?** Partially — `CatalogService` is structurally newer
(2026-08-08) and is the *correct*, current model for anything Reservation-shaped. `Service` is not
legacy in the sense of "about to be removed" — it's still the live, correct model for smar's
distinct real-estate booking vertical, which has its own `Booking`/`BookingService` pipeline that
never touches `Reservation` at all. These are two different verticals (property rental vs
appointment booking) that happen to share the English word "service." **Migration between them was
never started because they were never the same thing** — no incomplete migration exists here, just
a real naming collision the codebase already caught and resolved (confirmed via the schema
comment's own account of `prisma validate` catching the table-name collision before it shipped).

**One real, live legacy consumer still exists** (not previously flagged as still-open): the old
`metadata.requires_booking` flag `CatalogItem` used before the split is still read by
`FeaturedItemsSection.jsx` (the public homepage section component) to decide "احجز الآن" vs "أضف
للسلة" per item, in its multi-category pooling branch. `staff-capability.md`'s own 2026-08-08 entry
already names this as a legacy convention going forward ("`metadata.service_id` is legacy-only
going forward" — the `requires_booking` flag is the same generation of convention). This is real,
currently live on `rk`'s homepage, and was independently re-confirmed this session in a separate
plan (Products/Services Homepage Separation) as a genuine gap: a brand-new tenant onboarded today
would get this wrong, since nothing seeds `requires_booking` for a `CatalogService`-model tenant.
**Not fixed here** — flagged as P1, already known to a pending, unexecuted plan.

## 5. `client_services` vs JSON Analysis

Comparison requested across integrity/querying/indexing/auditing/activation/timestamps/isolation/
migrations/compat/frontend+backend simplicity/future billing/per-service config:

| Dimension | `client_services` (table) | JSON (`features`/`selected_services`) |
|---|---|---|
| Referential integrity | Real FK to `Client`, cascade delete | None — just a blob |
| Uniqueness | `@@unique([clientId, serviceKey])` enforced at DB level | None — a JS array can silently duplicate |
| Querying/indexing | `@@index([clientId])`, real `WHERE` clause in every `require_service()` call | Requires loading + parsing the whole JSON, no partial index |
| Auditing | `activatedAt` timestamp **per service** | No per-key history at all |
| Activation/deactivation | `isActive` boolean, toggle one row without touching others | Would require array mutation, harder to make atomic/racy-safe |
| Per-service config | Real `config Json?` column **per row**, already exists, currently unused but structurally ready | A flat array cannot hold per-key config without becoming a nested object (i.e., reinventing the relational shape inside JSON) |
| Future billing/plans | Can support a real `Plan` ↔ `PlatformService` join later without touching `ClientService`'s own shape | Cannot represent a join to anything |
| Frontend simplicity | One array (`active_services`) already flattened for the frontend by `public_service.py:226` — frontend never sees the relational shape at all | N/A — this is already what the frontend gets, *derived from* the table |
| Backend simplicity | One `find_first` per gate check, already wrapped in `with_db_resilience` | Would avoid a query, at the cost of every dimension above |

**Verdict: HYBRID — and this is already what's built, correctly.** `client_services` is the real
source of truth; `Client.selected_services` is a legitimate, explicitly-documented denormalized
read cache (`sync_selected_services()`'s own docstring: "Rebuild Client.selected_services from
active client_services rows... Call this after any ClientService create/update/delete"), not a
second competing source of truth. This is the textbook-correct pattern, not something to
"restructure."

**The one real gap**: nothing *enforces* that every future write path to `ClientService` remembers
to call `sync_selected_services()`. Today there are exactly two write paths
(`admin/client_services.py`, `super/platform_services.py`'s `toggle_client_service`) and both
correctly call it — confirmed by direct grep, not assumed. But this is a **convention**, not a
guarantee. A future third route that upserts `ClientService` directly and forgets the sync call
would silently drift `selected_services` out of sync with reality, and nothing would catch it
(no DB trigger, no test asserting the two agree). P2 — worth a lightweight safeguard (a comment at
the model definition, a shared write-helper that always syncs, or eventually a Postgres trigger)
the next time this table is touched for an unrelated reason, not urgent enough to justify its own
task today.

## 6. `clients.features` / `selected_services` / `config` — per-field

- **`selected_services`**: covered fully in §5 — a synced cache of `client_services`, not
  independent, not legacy, actively correct.
- **`features`**: a real, live JSON field — but answers a **different question** than
  `client_services`. `client_services` gates whole modules ("does this tenant have `restaurant` at
  all → 403 if not"); `features` toggles sub-behaviors *within* an already-active module
  (confirmed shape: `{"spatial": true, "listings": true, "booking": true, "payment": true}`,
  `public_service.py:196`, smar's own default). Written at tenant creation
  (`registration_service.py`, `demo_service.py`), read by smar's public config and admin settings
  display. **Not legacy** — actively seeded on every new tenant today. Not duplicating
  `client_services` — a finer-grained axis underneath it, for the booking/smar vertical specifically.
  Genuinely narrow in scope (smar-origin field name, not yet proven generic across verticals) — a
  real open question for *future* tenant types, not a current problem.
- **`config`**: unrelated to service/capability activation entirely. Two real, load-bearing uses
  confirmed by direct read: (a) `reservation_service.py`'s tenant-wide `working_hours` fallback
  (used whenever a `Barber`/`Resource` has no hours of its own set), (b) the Tenant OS Editing
  Engine's real page-content storage (`page_content.py`'s `client.config.content.sections[]`) — the
  actual source of every tenant's public homepage content. Neither use touches capability gating.
  **Do not conflate this field with the services/capabilities question at all** — it's a genuinely
  different concern living in the same JSON column for storage convenience, not architectural
  overlap.

## 7. Multi-Tenant Integrity Analysis

Spot-checked the tables this study named plus the ones most likely to carry a real cross-tenant
risk (`barber_repo.py`, `reservation_repo.py`, `require_service()`, `toggle_client_service`):

- `require_service()` (`app/core/services.py`) — `clientId` in the `WHERE` clause, confirmed.
- `barber_repo.list_barbers()`/`find_barber()` — both `clientId`-scoped, confirmed. `find_barber()`
  is explicitly the tenant-ownership check every barber-mutating route calls first.
- **`barber_repo.update_barber(barber_id, patch)`** — **no `clientId` in its own `WHERE` clause**
  (`where={"id": barber_id}` only). Every real caller (`PATCH /admin/barbers/{id}`,
  `.../deactivate`) does call `find_barber(tenant["id"], barber_id)` first and 404s if it's not
  this tenant's row — so **no exploitable cross-tenant path exists today**, confirmed by reading
  both call sites in full. But the repository function itself is not independently safe: it relies
  entirely on every future caller remembering the same two-step pattern. This is a real, if
  currently-harmless, violation of the letter of `rules/global.md`'s own stated rule ("Every DB
  query MUST filter by clientId or slug. No exceptions") at the repository layer specifically —
  the *route* layer compensates, the *repository* layer doesn't defend itself. Flagged as **P1**
  (architectural risk / correctness discipline), not P0 (nothing exploitable exists right now).
- `toggle_client_service` (`super/platform_services.py`) — real `client_id` path param + upsert
  scoped to it; `require_super_admin` gates the route itself. No cross-tenant path found.
- `Reservation`, `CatalogItem`, `CatalogService`, `CatalogCategory` — all carry non-nullable
  `clientId` at the schema level (Section 1's models), and every route/service function read this
  pass includes it in the `WHERE` clause. No violation found in this pass beyond the one above.

## 8. Auth / `public` Schema Explanation

Classified per the brief's request, verified against real code (not assumed from the snapshot
alone):

| Schema | Classification | Real role here |
|---|---|---|
| `public` | **Application-owned** | Every table this study covers. The only schema this app's own Prisma models touch (`schemas = ["public"]` in `schema.prisma`). |
| `auth` | Supabase-managed infrastructure, **explicitly not used** by this app | Confirmed via grep: zero `supabase.auth`/GoTrue calls anywhere in `app/`. This application does its own JWT auth entirely inside `public.users` (`password_hash` + `jwt.encode(..., SECRET_KEY)` in `app/core/security.py`). The Supabase `auth` schema visible in the snapshot exists because Supabase always provisions it — it is not this domain's concern and should not be touched. |
| `storage` | Supabase-managed infrastructure, **used, but only for file objects** | The only real Supabase SDK usage in this codebase (`storage_service.py`, `public_service.py`, `registration_service.py`) is `supabase.storage`, not `supabase.auth` — confirms the separation cleanly: Supabase is this app's file host, not its identity provider. |
| `extensions`, `graphql`, `graphql_public`, `pgbouncer`, `realtime` | Supabase-managed infrastructure, **not used, should not be touched** | No code in `app/` or `frontend/` references PostgREST's GraphQL surface, Realtime channels, or pgbouncer internals directly — this app talks to Postgres via Prisma over the pooled `DATABASE_URL`/`DIRECT_URL`, not via these Supabase-native surfaces. |

**Consequence for `public.users`/auth architecture**: since Supabase Auth is unused, there is no
"identity table" vs "profile table" split to explain — `public.users` *is* both, by design, not by
gap. `role` (enum `UserRole`) and `barberId` (nullable, unique — Staff Scoped Access, Phase A,
2026-08-09) both live directly on this one row. `STAFF` isolation is enforced server-side at the
route layer (`_require_staff_barber_id`, confirmed present and called in `admin/barbers.py`'s list
route this pass, matching the earlier-session finding this same barbershop production track already
verified live for reservations). **No auth redesign is justified by this study** — the current
model is simple because the problem is simple (one app, one JWT, no third-party identity
federation), not because something is missing.

## 9. Legacy vs Active Architecture

Cross-checked the Evolution Log's own dated claims against real migration files
(`prisma/migrations/*.sql`) rather than trusting the narrative alone — every date-ordered claim
below is now independently confirmed by a real migration filename, not just prior session prose:

- `add_resources_table.sql` (Clinic, 2026-07-30) precedes `add_barbers_table.sql` (Barber,
  2026-07-31) — confirmed order matches the Evolution Log's own account.
- `add_catalog_service_model.sql` + `add_barber_service.sql` — both Phase 3.7C (2026-08-08),
  confirmed together, matching the log's account of `CatalogService`/`BarberService` shipping in
  the same phase.
- `add_user_barber_link.sql` — Staff Scoped Access Phase A (2026-08-09), confirmed.

**What's genuinely legacy today** (real, narrow, named):
- `CatalogItem.metadata.requires_booking` — superseded by `CatalogService` as a real model, but
  still the live decision-driver in `FeaturedItemsSection.jsx` (§4). A real live legacy dependency,
  not a dead one.
- `Reservation.metadata.service_id` — superseded by the real `Reservation.serviceId` FK
  (Phase 3.7C), kept only "for backward-compatible reads of pre-3.7C rows" per the schema's own
  comment. Genuinely inert for anything written since 2026-08-08.
- `PlatformService` — not legacy in the sense of superseded-by-something-newer; it's a *correctly
  designed, never-connected* table. Different failure mode than the two above (dead code vs.
  disconnected code) — worth keeping that distinction precise rather than lumping all three
  together as "legacy."

**What's genuinely active, two-or-more-live-implementations, by design** (not accidental):
`Barber`/`Resource` (§3), `Service`/`CatalogService` (§4, correctly separate, not duplicate).

## 10. Risks of Changing Anything Now

- **Merging `Barber`/`Resource`**: real risk of locking in the wrong shared abstraction before a
  third real case (still absent) proves what actually varies. Salman's own 2026-07-31 decision
  already named this risk explicitly and chose to wait.
- **Wiring `PlatformService` into `SERVICE_TYPE_MAP`/`template-registry.js`**: touches onboarding
  (a P0-sensitive path — a broken seed here is exactly the class of bug that already shipped once
  for real, RK Barber's missing `reservations` key, per `platform-services-catalog.md`). Any change
  here needs its own careful, scoped Implementation Contract — not a byproduct of this study.
- **Deleting the legacy `metadata.requires_booking`/`metadata.service_id` reads**: safe in
  isolation (both are additive fallbacks, not load-bearing for `CatalogService`-model tenants), but
  `requires_booking` specifically is still the *only* mechanism deciding book-vs-buy on `rk`'s real
  public homepage today — removing the read without first fixing `FeaturedItemsSection.jsx`'s own
  logic (already a separately known, unexecuted plan) would break real production UI, not clean up
  dead code.
- **Adding a `clientId` filter to `barber_repo.update_barber()`**: genuinely low-risk (every real
  caller already passes a tenant-scoped, pre-verified `barber_id` — adding the filter changes
  nothing observable, it only closes a latent gap) — but still a real code change, out of scope for
  a read-only study per Salman's own explicit instruction this round.

## 11. Recommended Target Architecture

No redesign is recommended. The target *is* substantially the current architecture, with three
small, already-scoped, not-yet-executed pieces of unfinished work — none of them a new direction:

1. Either connect `PlatformService` to the three hardcoded copies it should be replacing
   (`SERVICE_TYPE_MAP`, `service-system.md`'s table, `template-registry.js`'s arrays), or
   consciously decide it stays a Super-Admin-only reference table and stop treating "wire it up" as
   implicitly pending. Both are legitimate end states; what isn't legitimate is the current
   in-between (built, correct, silently unused).
2. Fix `FeaturedItemsSection.jsx`'s `requires_booking` dependency at its real source, per the
   already-drafted (not yet approved) Products/Services Homepage Separation plan — this closes the
   one live legacy dependency found in §4/§9.
3. Add the missing `clientId` filter to `barber_repo.update_barber()` (§7) the next time that file
   is touched for any reason — a one-line defense-in-depth fix, not worth its own dedicated task.

## 12. Migration Strategy (only if a redesign were justified — it isn't)

Not applicable — no redesign is being recommended. If Salman later decides to activate
`PlatformService` as the real SSOT (item 1 above), the shape that work would take, for the record:
`SERVICE_TYPE_MAP` becomes a query against `PlatformService` rows (already global, no clientId
issue), `template-registry.js`'s `services[]` arrays get validated against the same table at
build/lint time (cheaper, safer than a runtime fetch dependency for the frontend), and
`service-system.md`'s markdown table gets a header noting it's generated/derived rather than
hand-maintained. This is scoping notes for a future task, not a plan being greenlit here.

## 13. What NOT to Touch

- `client_services` / `selected_services` — already correct, already a hybrid pattern done right.
- `Barber`/`Resource` split — deliberately deferred, no new evidence to revisit.
- `Service`/`CatalogService`/`CatalogItem` split — correctly separated, not the same concept.
- `Client.config` — unrelated axis, two real live consumers, no overlap with this study's actual
  question.
- Auth model (`public.users`, JWT) — no gap found; simple because the problem is simple.
- Any Supabase-managed schema (`auth`, `storage`, `realtime`, `graphql*`, `pgbouncer`,
  `extensions`) — infrastructure, not domain architecture.

## 14. Confidence Level per Recommendation

| Recommendation | Confidence | Basis |
|---|---|---|
| Keep `client_services` as SoT, `selected_services` as cache | **High** | Directly read the sync function, both call sites, and the frontend's single consumer of the derived array |
| `Barber`/`Resource` duplication is real but correctly deferred | **High** | Re-confirmed against a prior, detailed, dated comparison plus a fresh check that neither trigger has fired |
| `Service` vs `CatalogService` are not duplicates | **High** | Traced both through schema, real routes, and real relation FKs; the schema's own comment documents the exact collision that was avoided |
| `PlatformService` is real but unconsumed | **High** | Re-verified this pass (fresh greps), matches a prior dated investigation exactly |
| `barber_repo.update_barber()` missing `clientId` filter | **High** (the fact) / **Medium** (the severity judgment) | Read the function and every real caller directly; severity call (P1 not P0) rests on "no caller today misuses it," which could change if a new caller is added carelessly later |
| `requires_booking` is a live, real legacy dependency | **High** | Directly grepped `FeaturedItemsSection.jsx`; independently corroborated by this session's own separate plan-mode investigation of the same file |
| No redesign is warranted platform-wide | **Medium-High** | Strong evidence across every axis the brief named; the one open uncertainty is whether a *future* tenant vertical (Clinic/Gym/Spa) would stress `Barber`/`Resource` in a way this study — reading code, not building a new vertical — cannot fully predict |

---

**Stop condition honored**: no code, schema, or data changed in the course of this study.
Awaiting Salman's decision on the three §11 items (each independently approvable/rejectable, none
depends on the others).

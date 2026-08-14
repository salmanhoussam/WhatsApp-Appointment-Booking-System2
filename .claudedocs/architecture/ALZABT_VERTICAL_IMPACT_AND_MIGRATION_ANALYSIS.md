# Vertical Registry — Impact Map, No-Breakage Verification, Migration Plan, and SaaS Integration

**Status:** Final planning round before the Approve/Implement/Migrate decision gate. **No code, no
schema migration, no data change, no tenant touched.** Builds on
`ALZABT_VERTICAL_CONCEPT_PROPOSAL.md` and `ALZABT_VERTICAL_REGISTRY_ARCHITECTURE.md`. Every claim
below is grounded in a real grep or a real, live, read-only database query executed this round —
not carried forward from memory. **Every finding is stated at the Alzabt-SaaS-platform level, never
as "fixing Ali" or "fixing Barber"** — per Salman's explicit instruction, each item below is
checked against what it means for a multi-vertical platform, not one tenant.

---

## Real Impact Map — every current consumer of `service_type`, `templateKey`, `client_services`,
and staff-model decisions

### `service_type` — real consumers found (backend)

| File | What it does today | Effect of introducing `Client.vertical` |
|---|---|---|
| `registration_service.py:126,168` | Writes `service_type` = the self-registration/onboarding `venue_type` at tenant creation | **Additive, not breaking** — this write stays exactly as-is until Migration Step 6 (retirement); `vertical` is written alongside it, not instead of it, until then |
| `demo_service.py:328,351` | Writes `service_type` from `_VENUE_TYPE_MAP[business_type]` at Demo Builder creation | Same — additive until Step 6 |
| `public_service.py:225` | Reads `record.service_type` to include in the public `/config` payload | **Unaffected** — this field can keep being returned publicly for as long as the column exists, migration or not |
| `super_service.py:31` | Reads `c.service_type` for the Super Admin tenant list | **Unaffected initially**; only relevant once Step 6 retires the *write* — the column and its display keep working regardless |
| `sheets_service.py` (4 lines) | Logs `service_type` into an external Google Sheets export | **Unaffected** — a reporting side-effect, not a functional dependency |
| `app/core/services.py`'s `SERVICE_TYPE_MAP` / `seed_services_for_client()` | **Confirmed dead code** — defined, never called anywhere in the codebase (only its own definition line matches a full-repo grep) | **Zero impact either way** — safe to ignore for this migration; a real, separate hygiene item, out of scope here |
| `onboarding.py` (WhatsApp/n8n webhook) | A **third, previously-uncounted onboarding door** — accepts `service_type` from Claude-extracted conversation JSON, then calls `register_new_tenant()` (the same function Self-Registration uses) | **Not a separate seeding path** — funnels into `registration_service.py`'s own `_SERVICE_SEED_MAP`, so it inherits whatever this migration does there automatically. Named explicitly here since neither prior document counted it as a real, distinct provisioning door — it is one, but it shares its backend logic with Self-Registration entirely. |

### `service_type` — real consumers found (frontend)

| File | What it does today | Effect |
|---|---|---|
| `ClientsManager.jsx:436` | Displays `SERVICE_LABELS[c.service_type] \|\| c.service_type \|\| '—'` in the Super Admin tenant list | **Already degrades gracefully** — a tenant with `service_type = null` already renders `'—'`, no crash. No forced frontend change required by this migration, though a future pass could show `vertical` alongside/instead once real. |
| `useTenantConfig.js:53` | `service_type: null` as one key of a default config shape | **Unaffected** — a default placeholder, not logic |
| `ConfigurableHero.jsx:57,258,330` | Uses `config?.service_type?.replace(/_/g, ' ')` as a **fallback Hero subtitle** when no real subtitle is authored | **Real, live behavior tied to this field** — the one place `service_type` is more than cosmetic. If its write is retired (Step 6) for new tenants, this fallback silently stops firing for them (falls through to whatever the next fallback is) — not a crash, but a real, visible behavior change worth naming explicitly rather than discovering later. Legacy tenants keep their already-stored `service_type` value and keep seeing this fallback exactly as today. |
| `_template.routes.jsx` | A **scaffolding reference file** — its own comment documents `service_type` as the signal a new tenant's hand-written routes file should branch on | Developer-facing only, not live per-request code — no runtime impact, but worth a note for whoever scaffolds a future tenant's routes file after this migration, so they don't keep hand-copying a retired convention |

### `templateKey` — real consumers found

| File | What it does today | Effect |
|---|---|---|
| `TenantRegisterPage.jsx` | Writes `templateKey` from the chosen `template-registry.js` entry at self-registration | Only affected for the 14 Reservations-tagged entries this migration's Option A actually touches (per the Registry Architecture doc) — the other 6 keep working unchanged |
| `frontend/src/pages/generic/normal/CatalogPage.jsx` | Reads `templateKey`-driven layout choice for catalog display | Unaffected — this is Catalog module presentation, orthogonal to Reservations verticals |
| `app/api/v1/super/clients.py:85-129` | **Real, live Super Admin PATCH endpoint** — lets Salman manually set a tenant's `template_key`/`page_type`/`primary_color` directly | **Stays fully functional, unaffected** — this endpoint edits the column directly; nothing about adding `vertical` removes or blocks it |
| `app/api/v1/admin/catalog.py:72,155`, `super/clients.py:258-318`, `catalog_service.py:215-237` | **A different, unrelated meaning of "template_key"** — here it names a *category-seeding* template (which starter categories to create), not the tenant's page/site template | **Real naming collision worth flagging, not a functional risk** — this is a separate parameter in a separate endpoint family, already coexists safely with `Client.templateKey` today (different scope, same word) — this migration doesn't touch it, but a future reader should not confuse the two |
| `app/schemas/page_content.py:109` | A per-page-content schema field also called `template_key`, `default = "normal"` | Separate schema layer, worth a quick confirmation during actual implementation that this isn't secretly the same value as `Client.templateKey` — flagged as an Unknown for implementation time, not resolved by this analysis |
| **Real DB values (RK/Ali/`alzabt-demo`)** | `templateKey = None` for **all three** (confirmed by live query, below) | **Zero impact on any of the three real Reservations tenants** — none of them has ever used `templateKey` at all; this whole axis of the migration is a non-event for RK/Ali/`alzabt-demo` specifically |

### `client_services` — confirmed, unaffected on purpose

Already governed by `TOS-004`'s `CAPABILITY_RESOLUTION_PLAN.md`, fully executed and closed
(2026-07-29). `hasCapability`/`hasOrderCapability` remain the sole, correct, plural way anything
reads "is X active" — `vertical` only ever **seeds** the initial `client_services` rows at
creation (via the Registry's default list), exactly as `demo_service.py`/`registration_service.py`
already do today with their own separate dicts. No consumer of `client_services` anywhere in the
frontend or backend needs to change — this migration collapses *which dict* seeds the rows, never
*how* anything reads them afterward.

### Staff-model dispatch — every real decision point found

| File | What it does today |
|---|---|
| `reservation_service.py:55` | `RESOURCE_BACKED_MODULE_KEYS = {"clinic"}` — the one real switch deciding Resource-path vs. Barber-path, keyed by `Reservation.moduleKey`, **per booking**, not per tenant |
| `reservation_service.py:110-138` | `_resolve_resource()` / `_resolve_barber()` — two independent, deliberately-unmerged functions |
| `reservation_repo.py:79-121` | `find_overlapping_by_resource()` / `find_overlapping_by_barber()` — same independent-pair shape |
| `ReservePage.jsx` | Hardcodes "الحلاق" (the Barber label) as literal UI copy — confirmed, unchanged since the 2026-08-05 evolution-log finding |
| `StaffTab.jsx` | Confirmed, re-checked this round: **zero references to `Resource`/`resource_id` anywhere** — the admin Staff tab is Barber-only in the frontend today, full stop |
| Frontend-wide | Confirmed, re-checked this round via full-repo grep: **zero files anywhere in `frontend/src` reference `resource_id`/`resourceId`** — Clinic has no frontend, still true |

**What this means for the migration**: introducing `Client.vertical` + the Registry's
`staff_backing_model` pointer does **not** touch any of the code above — it only gives a *future*
`staff` section (not yet built) a way to know which of these two already-existing, already-
independent code paths to query. Nothing here changes until that future section is actually built.

---

## Real database evidence — RK, Ali, `alzabt-demo` (live, read-only query, this round)

```
rk:          service_type='barbershop'  templateKey=None  pageType='normal'
             active_services=[catalog, booking, whatsapp_ordering, reservations, store]
             barbers=2  resources=2

ali:         service_type='services'    templateKey=None  pageType='normal'
             active_services=[reservations, booking, whatsapp_ordering]
             barbers=1  resources=0

alzabt-demo: service_type='barbershop'  templateKey=None  pageType='normal'
             active_services=[reservations, booking, whatsapp_ordering, catalog]
             barbers=2  resources=0
```

**This closes the loop on the P0.1 root cause with direct, exact evidence, not inference**: Ali's
real `service_type` is `'services'`, **not** `'barbershop'` — it was never seeded through
`demo_service.py`'s barbershop branch at all, and its real `active_services` list confirms
**`catalog` is genuinely absent**. This is the precise, concrete reason `featured_items`' 403 is
real for Ali and not for RK/`alzabt-demo` (both of which do have `catalog` active) — not a
theoretical coupling risk, a directly confirmed one. It also independently confirms this whole
proposal's central complaint: `service_type` already has three real, live values in production data
(`'barbershop'`, `'services'`, plus the `real_estate` default for every untouched row) for what
should be one canonical Reservations-vertical concept.

**Real, honest Unknown, named rather than silently ignored**: RK has 2 real `Resource` rows despite
RK being a Barber (not Clinic) tenant. Since zero frontend code anywhere references
`resource_id`/`resourceId`, these rows are provably unreachable from any real user-facing flow
today — but their origin (test data left over from Clinic's original build-and-verify pass, or
something else) was not traced further in this round; worth a one-line check before any future
Clinic work, not a blocker for anything in this document.

**Every one of the three real Reservations tenants has `templateKey = None`** — direct, live
confirmation that the `templateKey`-related part of this migration (Option A, the 14
self-registration templates) has **zero effect on RK, Ali, or `alzabt-demo`**, since none of them
has ever used it.

---

## No-breakage verification — the six named surfaces

| Surface | Verified how | Result |
|---|---|---|
| **RK** | Live DB query (above) + full code-path trace of every `service_type`/`templateKey`/`client_services` consumer | `templateKey` is already `None` (no exposure). `service_type='barbershop'` keeps working exactly as today for as long as the column exists — nothing reads it in a way this migration removes before Step 6, and Step 6 is a deliberate, separate, later decision, not automatic. **No breakage.** |
| **Ali** | Same, plus this round's exact root-cause confirmation | Unaffected by the Vertical migration itself (which only *adds* `Client.vertical`, doesn't remove anything yet) — Ali's real 403 is P0.1's subject, entirely independent of whether `vertical` exists. **No breakage, and no fix either — P0.1 remains its own, separate, already-approved item.** |
| **`alzabt-demo`** | Same live query + trace | Same shape as RK — `catalog` already active, `templateKey` already `None`. **No breakage.** |
| **Demo Builder** | Full read of `demo_service.py`'s real seeding call sites this round | The proposed change (write `vertical` via the Registry instead of `service_type` via `_VENUE_TYPE_MAP`) is additive during the transition (both fields can be written simultaneously) and only removes the old write at the deliberate, separate Step 6. **No breakage during the window this document scopes.** |
| **Self-Registration** | Full read of `TenantRegisterPage.jsx`'s real template resolution + `registration_service.py`'s real seeding call | Adding a `vertical` field to 14 of `template-registry.js`'s 20 entries is additive (new key on an existing object); the other 6 entries are untouched by definition. **No breakage.** |
| **Reservations** | Full trace of `reservation_service.py`'s real dispatch logic, `RESOURCE_BACKED_MODULE_KEYS`, both resolve/conflict-check function pairs | Confirmed **zero references** to `vertical`, `service_type`, or `templateKey` anywhere in `reservation_service.py`, `reservation_repo.py`, `barber_repo.py`, or `resource_repo.py` — the booking engine has never depended on any of these three fields and this migration doesn't introduce a dependency either. **Fully isolated, no breakage possible by construction.** |
| **Tenant Dashboard** (`GenericAdminDashboard.jsx` and its tabs) | Grep across `frontend/src/pages/generic-admin/` for the same three fields | `StaffTab.jsx`, `ReservationsTab.jsx`, `OrdersTab.jsx` reference none of `service_type`/`templateKey`/`vertical` — the Dashboard is driven entirely by `client_services`/`hasCapability`, already confirmed unaffected above. **No breakage.** |

**Net result: every one of the six named surfaces is verifiably unaffected by adding
`Client.vertical` and the Registry, because every real change proposed is additive-only until a
separate, later, explicitly-approved retirement step (Migration Step 6) — which this document does
not authorize executing.**

---

## Backward compatibility — explicit statement

**Stays exactly as-is, unconditionally, for the scope of this document:**
- `service_type` column and every one of its 5 real read-sites (`public_service.py`,
  `super_service.py`, `sheets_service.py`, `ClientsManager.jsx`, `ConfigurableHero.jsx`'s fallback).
- `templateKey` column, its Super Admin PATCH endpoint, and the 6 non-Reservations
  `template-registry.js` entries.
- `client_services`/`hasCapability` — completely untouched, per TOS-004's own already-closed
  migration.
- `reservation_service.py`, `reservation_repo.py`, every Barber/Resource code path.
- Every real tenant's current data (RK, Ali, `alzabt-demo`, and any other live tenant) — this
  document proposes an additive schema column, nothing else.

**Becomes additive (new, nothing removed):**
- A new, nullable `Client.vertical` column — every existing row defaults to `null`, exactly the
  same semantic `templateKey` already uses for "not yet assigned."
- A new `VERTICAL_REGISTRY` module (`app/core/verticals.py`) — new code, no existing code deleted.
- One new field (`vertical`) added to 14 of `template-registry.js`'s 20 template objects.

**Only changes behavior, and only for new tenants, and only after a separate, explicit go-ahead**
(Migration Step 6, not included in "Implement Vertical Registry" below):
- `service_type`'s write stops for newly-created tenants going forward.
- `templateKey`'s meaning narrows for the 14 Reservations-tagged self-registration entries.

---

## Migration plan — named, sequenced, not executed

Unchanged in substance from `ALZABT_VERTICAL_CONCEPT_PROPOSAL.md`'s own 6 steps, re-confirmed
against this round's real evidence and re-stated here as the authoritative version:

1. **Add `Client.vertical` column** — additive schema migration, every existing row → `null`.
   Verified safe: no existing code reads a column that doesn't exist yet, so this step alone changes
   nothing observable.
2. **Write `VERTICAL_REGISTRY`** (`app/core/verticals.py`), seeded with `barber` only — the one
   real, proven vertical. Pure new code, imported by nothing yet.
3. **Point `demo_service.py` at the Registry**; write `vertical` **alongside** `service_type` (not
   instead of it yet) — confirmed additive per the Demo Builder row in the No-Breakage table above.
4. **Add `vertical: 'barber'`** to the `template-registry.js` entries confirmed to be genuinely
   Barber-shaped (reviewed one by one, not assumed from the entry name — per the Registry
   Architecture doc's own caution); wire `TenantRegisterPage.jsx` to send it; `registration_service.py`
   writes it alongside `service_type`, same additive posture as Step 3.
5. **One-time, reviewed backfill** for RK/Ali/`alzabt-demo` specifically — now made concrete by this
   round's real data: all three get `vertical = "barber"` directly (not inferred from
   `service_type`, since Ali's real value already proves that inference would be wrong for at least
   one of the three) plus any other live Reservations-type tenant found at execution time.
6. **Retire `service_type`'s write** (not the column) in both onboarding doors — explicitly a
   **separate, later, additionally-approved step**, not bundled into "Implement Vertical Registry."

---

## How Alzabt integrates as the SaaS product layer — vertical/tenant as configuration, not product

Restated plainly, because this is the check every decision above was measured against, not an
afterthought:

```
Alzabt (the SaaS product)
   │
   ├── Capabilities (real, shared, engine-level — Reservations, Catalog/CatalogService, Content,
   │    Media, Site Configuration, Theme, Orders, Customers, and whichever future ones)
   │
   ├── Vertical Registry (Alzabt-owned, platform-level, never vertical-owned) — a configuration
   │    table naming, per vertical, which Capabilities + which Section Repertoire + which staff
   │    model a tenant of that vertical starts with
   │
   ├── Provisioning Doors (Alzabt-owned) — Demo Builder, Self-Registration, the WhatsApp/n8n
   │    webhook (confirmed this round to be a real third door, sharing Self-Registration's own
   │    backend path) — each a different *entry surface* into the same Registry, never a
   │    separate seeding system of its own
   │
   └── Tenants — each one a configured *instance*: one Vertical selection (a Registry lookup,
        resolved once) + its own real, independent Layer-3 content, staff rows, and live
        `client_services` state from that point forward
```

**The concrete answer to the anxiety stated across this whole arc**: nothing in the Vertical
Registry work makes Alzabt "a Barber platform with one extra field." The Registry is precisely the
mechanism that keeps it the reverse — one small, developer-owned lookup table is the *only* place
that would need a new entry for Clinic, Beauty, or any future vertical; the Capabilities
(Reservations, Catalog, Content...) never fork per vertical, and neither do the three provisioning
doors. A vertical is a **configuration profile over real, shared capabilities** — never a product
of its own, never a code fork. This is the same test every decision in this document was checked
against: does this stay true for an Alzabt with 10 verticals and 500 tenants, or does it quietly
assume there's only ever Barber? Every "no breakage" finding above holds regardless of how many
verticals eventually exist, because every real change is additive, keyed by a plain lookup, never a
conditional written for one vertical's shape.

---

## The decision gate

Per Salman's own framing, the sequence from here is exactly:

```
Approve Architecture  →  Implement Vertical Registry  →  Migrate  →  P0.1 + rest of Section System
```

This document's own scope ends at "Approve Architecture" — it verifies the architecture is safe to
implement, names the real migration steps, and confirms no breakage, but **executes none of it**.
"Implement Vertical Registry" (Steps 1-4 above) and "Migrate" (Step 5, the RK/Ali/`alzabt-demo`
backfill, and — as its own later, separately-approved step — Step 6's retirement) remain gated
behind Salman's explicit go-ahead, one at a time, same discipline as every prior round in this arc.
P0.1 and the rest of the already-approved Section System sequence stay exactly where they were —
independent, ready, unaffected by any of this — and do not start until this gate clears, per
Salman's own explicit sequencing instruction.

---

Stopping here, per instruction. No code, no schema migration, no data, no tenant touched. Waiting
for the single decision: Approve Architecture (or not) — nothing below this line executes without
that, and nothing here is scoped to one tenant or one vertical.

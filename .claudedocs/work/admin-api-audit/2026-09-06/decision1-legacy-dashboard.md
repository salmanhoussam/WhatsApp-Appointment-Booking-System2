# Decision 1 — Fate of the Legacy Dashboards (Smar)

**Date:** 2026-09-06 · **Mode:** investigation only. Nothing modified, committed or deployed.
Follows `summary.md` (Phase 2 Admin API audit) in the same folder.

> **Framing correction adopted (Salman's):** the authorization boundary is verified **statically and
> anonymously at runtime**. The **authenticated behavioural contract is still unmeasured.** Nothing
> here claims the Admin API is "complete."

---

## The answer

> ## 🔴 The legacy Smar dashboard **cannot be retired today.**
> Not for sentimental reasons — **`GenericAdminDashboard` has no Booking vertical at all.**
> Retiring it would leave `smar`, a live tenant with 16 units, with **no admin surface**.

---

## Evidence

### 1. Generic literally cannot render a Booking tenant

`buildNav()` (`GenericAdminDashboard.jsx:172-215`) has exactly two branches. For a tenant **without**
`reservations` it returns:

```
overview · orders · catalog · [team] · settings
```

`smar`'s real capabilities, read live from production:

```
smar → ['booking', 'gallery', 'whatsapp_ordering']
```

No `reservations`, no `store`, no `restaurant`, **no `catalog`**. So pointing `smar` at Generic gives:

| tab | what smar would actually get |
|---|---|
| `overview` | `orderEndpoint` is falsy (no restaurant/store) → **empty**; `/reservations/stats` → no capability |
| `orders` | `orderEndpoint` falsy → **empty by construction** (`OrdersTab.jsx:382`) |
| `catalog` | smar has **no `catalog` service** → **403 on every request underneath** |
| `settings` · `team` | work |

That 403ing-nav-entry is **the exact defect class this codebase already fixed twice** — the `store`
entry was made conditional on `activeServices` for precisely this reason (Store B1, 2026-08-21,
comment at `GenericAdminDashboard.jsx:200-203`).

### 2. The code already says so itself

`GenericAdminDashboard.jsx:217-219`:

> *"…wired ONLY into the legacy SmarAdminDashboard.jsx (**different tab-id vocabulary entirely --
> 'inbox'/'units'/'gallery'/'housekeeping'/etc.**) -- this dashboard (GenericAdminDashboard, what rk
> actually uses) has never used ROLE_TABS at all"*

Two dashboards, two different tab vocabularies, by design and on the record.

### 3. Feature gap — Smar's 12 tabs vs Generic's 10

| Smar tab | real? | Generic equivalent |
|---|---|---|
| `inbox` (Action Inbox) | ✅ real | **none** |
| `bookings` (unit bookings) | ✅ real | **none** — Generic has `reservations`, a different capability |
| `units` | ✅ real | **none** |
| `gallery` (**per-unit**) | ✅ real | **partial** — Generic's `/media/gallery-images` is *tenant-level* page media, not per-unit |
| `services` (booking add-ons) | ✅ real | **none** — `catalog-services` is reservations-scoped, different model |
| `dashboard` (Overview + revenue/source stats) | ✅ real | `overview` exists but reads different endpoints |
| `pagebuilder` (VisualBuilder) | ✅ real | `settings` content sections — overlapping, not equivalent |
| `settings` · `team` | ✅ real | ✅ equivalent |
| `housekeeping` · `maintenance` · `gardens` | ❌ **`ComingSoonTab` placeholders — zero functionality** | n/a |

**Finding:** 3 of Smar's 12 tabs are marketing placeholders (`SmarAdminDashboard.jsx:164,184,204`),
not features. The real gap is **5 tabs**: inbox, bookings, units, per-unit gallery, add-on services.

### 4. The population is exactly one tenant

Live capability scan of all 9 REAL tenants:

| capability | tenants |
|---|---|
| **`booking`** | **`smar`**, `mr-h` |
| `reservations` | `rk`, `mr-h` |
| `catalog` | caracas, footlab, roz, olivello, beit-al-fakhar |
| `store` | footlab, olivello, beit-al-fakhar, rk |
| `restaurant` | caracas, arizona |

`mr-h` carries `booking` **spuriously** — it is a barbershop with **0 units**, and Phase C already
identified the cause: the provisioning code grants `booking` to every barbershop in two duplicated
lines (`registration_service.py:54`, `demo_service.py:49`).

> **So `smar` is the only genuine consumer of the entire Booking vertical** — and the legacy
> dashboard is a **one-tenant dashboard**.

### 5. Endpoints whose fate is decided by this one question — **25**

| module | endpoints | consumer |
|---|---|---|
| `units` | 8 | SmarAdminDashboard, smar GalleryTab |
| `gallery` | 5 | smar UnitFormModal, smar GalleryTab |
| `bookings` | 4 | SmarAdminDashboard, ActionInbox |
| `services` | 4 | smar ServicesTab |
| `dashboard` | 2 | SmarAdminDashboard |
| `properties` | 2 | **nobody** (booking-vertical, never called) |

**22 % of the entire admin API** exists for this one decision. This is why Decision 1 had to come
before any endpoint cleanup — and before the permission migration.

### 6. Route reachability

`App.jsx:170` — `/:slug/admin/*` → `SmarAdminDashboard`, wrapped in `<ProtectedRoute>`,
**unconditional for any slug**. **No inbound link exists anywhere** in the frontend (only the
dashboard's own internal self-reference at `SmarAdminDashboard.jsx:2081`). Reachable only by typing
the URL. Not a security hole (backend is tenant-scoped, so an `rk` admin visiting `/rk/admin` sees
`rk`'s empty unit list) — but it is a **confusing surface**: every tenant has a second, wrong-shaped
admin URL.

---

## Admin API inventory — the taxonomy

| status | modules (endpoint count) |
|---|---|
| 🟢 **Active** — used and needed by the canonical dashboard | `reservations` (8) · `store` (11) · `content` (11) · `catalog` (9) · `barbers` (6) · `media` (6) · `team` (4) · `catalog-services` (3) · `settings` (3) · `customers` (1) · `upload` (1) · `me` (1) · `provisioning` (1) |
| 🟡 **Legacy** — real consumers, but only legacy dashboards | `units` (8) · `gallery` (5) · `bookings` (4) · `services` (4) · `dashboard` (2) → **Smar**; `restaurant` orders (3) → **Caracas**; `store` orders (3) → **Footlab** |
| 🟠 **Dual-path** — same capability, second write path | `restaurant` menu CRUD (7, incl. `GET /menu/items`) — orphaned because `CatalogTab` writes via `/catalog/*`. **A Capability decision, not cleanup** (`rules/backend/architecture.md` §9) |
| 🔵 **Unverified** — needs an authenticated runtime pass | response envelopes (3 defensive `res?.data?.data ?? res?.data` sites), per-role tab behaviour, cross-tenant read probe |
| 🔴 **Candidate** — no consumer, no known reason | `resources` (4, whole module) · `client-services` (3, whole module) · `properties` (2, whole module) · `units` images/block-dates (3) · `store` DELETEs (2) · `content` `POST /sections` · `bookings` `PATCH /{id}` · `reservations` `GET /{id}` |
| ⚫ **Product-out-of-scope** | `fleet` (6) — pending its own provenance investigation |

---

## Recommendation (not a decision)

**Retain the legacy Smar dashboard for now**, and treat the question as *"when does the Booking
vertical get built into Generic?"* rather than *"when do we delete Smar's dashboard?"* Three viable
paths, in ascending cost:

1. **Retain as-is, freeze.** Mark it `Booking-vertical admin, smar only`, stop adding to it, and
   scope `/:slug/admin/*` to `smar` alone so no other tenant lands on the wrong dashboard.
   *Frees nothing; costs almost nothing; removes the confusing surface.*
2. **Retain, and delete only the 3 `ComingSoonTab` placeholders** — they promise features that do not
   exist, to a live tenant.
3. **Build the Booking vertical into Generic** (units + bookings + per-unit gallery + add-on services
   + inbox = 5 tabs), then retire. *This is the only path that frees the 25 endpoints — and it is a
   real project, not a cleanup.*

**Decision required from Salman.** Nothing was changed.

---

## Confirmed / Side / Unknowns

**Confirmed**
1. Generic has zero Booking-vertical support; `buildNav`'s non-reservations branch would give smar an
   empty dashboard plus a 403ing `catalog` tab.
2. `smar` is the only genuine `booking` tenant; `mr-h`'s `booking` is the known provisioning defect.
3. 25 admin endpoints hang on this single decision.
4. 3 of 12 Smar tabs are `ComingSoonTab` placeholders.
5. `/:slug/admin/*` is authenticated, unconditional for any slug, and linked from nowhere.

**Side findings**
- Caracas and Footlab are *also* one-tenant legacy dashboards (221 and 231 lines) consuming
  `restaurant`/`store` orders — the same question in miniature, and they are **not** blocked by a
  missing vertical the way Smar is: Generic already has `orders`. They are the cheaper retirement.
- `OlivelloAdminDashboard.jsx` is a 17-line stub.

**Unknowns**
1. Whether `smar`'s owner actually uses the dashboard (no analytics; no authenticated session).
2. Whether the 🔴 Candidates are used outside this repo (scripts, n8n, external clients).
3. Everything in 🔵 — still needs a `rk` TENANT_ADMIN account, same tenant, never a cross-tenant token.

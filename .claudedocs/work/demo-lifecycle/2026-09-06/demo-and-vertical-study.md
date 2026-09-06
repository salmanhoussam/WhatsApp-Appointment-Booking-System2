# Demo, Lifecycle & Vertical Readiness — a study for decisions

**Date:** 2026-09-06 · Investigation only. Nothing changed. Read-only against live Frankfurt + code.
Written because Salman asked for one place that holds the whole demo topic — surfaces, lifecycle,
`alzabt-demo`, and what it would take to add the next verticals (clinic).

---

# PART 1 — There is no single "what kind of business are you?" page

**Three demo-creation surfaces exist, each offering a different subset of business types, and none
offers all of them.**

| surface | URL | types it offers |
|---|---|---|
| `DemoLandingPage.jsx` | `demo.salmansaas.com/home` | `restaurant`, `store` (default `restaurant`) |
| `DemoLauncher.jsx` (floating "جرّب مجاناً") | overlay on every showcase page | `restaurant`, `store`, **`booking`** |
| `DemoBuilderPage.jsx` | `/home/demo-builder` | **`barbershop` only — hardcoded** (`:90`) |
| **backend accepts** | `POST /api/v1/public/demo/create` | **`{restaurant, store, booking, barbershop}`** (`demo.py:30`) |

All three POST the **same** endpoint. The backend is the only place that knows the full list.

> **This is exactly the gap Salman named.** The type picker is scattered across three components
> instead of being the first question. His stated target — *first page asks the business type, then
> routes into a vertical-scoped builder (e.g. `/barber/demo-builder`)* — replaces all three.

**Note the vocabulary clash, already known from the verticals work:** the demo endpoint's type axis
is `business_type` (`barbershop`), while the Registry's axis is `vertical` (`barber`), and
`Client.service_type` is a third (`barbershop` on rk, `services` on mr-h). Three names for one idea.
Any new picker should pick **one** axis rather than adding a fourth.

---

# PART 2 — The demo lifecycle: created with an expiry date, never expires

```
POST /demo/create
  → Client row: lifecycle_state = "trial", trial_ends_at = now + TRIAL_DAYS
  → response: slug + temp_password + admin_url + expires_at
  → …and then nothing, ever
```

**Verified live on Frankfurt:**

| `lifecycle_state` | rows | of which `trial_ends_at` is already in the past |
|---|---|---|
| `trial` | **19** | **11** |
| `evergreen` | 1 | 0 |
| `expired` | **0** | — |

- **Enforcement exists** — `_LIFECYCLE_SOFT_BLOCKED = {"expired"}` (`tenant.py:62`), ADR-0002 §9.1
  Soft Block, wired into `assert_client_lifecycle_allowed()`.
- **Nothing ever sets it.** The only writer of `lifecycle_state = 'expired'` is the manual
  SUPER_ADMIN endpoint `PATCH /super/clients/{id}/lifecycle`. No job, no gate, no check reads
  `trial_ends_at` and acts on it.
- **The only scheduled job in the whole platform** is `POST /super/maintenance/cleanup-date-pages`
  (Railway cron `0 3 * * *`) — and it cleans **DatePages for the dating module**, nothing to do with
  tenants.

> ### So: 11 tenants are past their trial end date and not one is blocked.
> A demo tenant, once created, lives forever. That is the lifecycle — there isn't a second half.

**The pieces to build a real lifecycle already exist** (`lifecycle_state`, `trial_ends_at`, the Soft
Block gate, a proven Railway-cron + super-endpoint pattern). What's missing is the one job that
connects them.

---

# PART 3 — `alzabt-demo`: what it is, what breaks, and how to handle it

**What it is:** *not* a Demo Builder product. It is a **hand-seeded reference tenant** created by
`scripts/seed_alzabt_demo_tenant.py` (2026-08-12) — 2 barbers, 6 services, full 2×6 cross-assignment.
The builder's own tenants are shaped `demo-{name}-{4 chars}` (`demo_service.py:_unique_slug`), and
**every one of those was already deleted** in today's 17-row cleanup. Nothing of the builder's own
output remains in the database.

### The full dependency check — 23 references, only ONE is live

| kind | count | detail |
|---|---|---|
| 🔴 **live runtime** | **1** | `App.jsx:237` — `/alzabt` → `/alzabt-demo/reserve` (demo subdomain only) |
| ⚪ dead runtime | 1 | `AlzabtLandingPage.jsx:49` `DEMO_SLUG` — but that page is **not routed** (`App.jsx:262` sends `/alzabt` → `/` on the bare domain; the page is documented as "left on disk untouched") |
| 🟠 re-creation | 5 | `scripts/seed_alzabt_demo_tenant.py` — the script that **creates** it |
| ⚪ comments | 16 | prose in `demo_service.py`, `provisioning_service.py`, `DemoBuilderPage.jsx`, etc. |

> ### The answer to "إذا في شي حيتغير أو ينكسر لازم نلاقي طريقة"
> **Exactly one thing breaks: `demo.salmansaas.com/alzabt` stops resolving.**
> **And it is fully reversible — `scripts/seed_alzabt_demo_tenant.py` re-creates the tenant.**
> This is a decision that can be undone, not a one-way door.

Three ways to handle the one breakage, in order of least work:

1. **Delete, and point `/alzabt` at `/home` (the demo landing page)** — one line, the visitor still
   lands somewhere real, and it stops advertising a booking flow as "the demo".
2. **Delete, and remove the `/alzabt` route entirely** — cleanest if `/alzabt` shouldn't exist on the
   demo subdomain until the business-type-first flow does.
3. **Delete, and leave `/alzabt` pointing at nothing** — not recommended; it becomes a broken link.

*(A 4th option — keep it — is what the current code assumes; recorded only for completeness.)*

---

# PART 4 — Vertical readiness: **clinic is already mostly built**

This is the most useful finding for "قريباً بدي بلش أدي vertical … متل clinic".

`app/services/reservation_service.py` was built to be multi-strategy from the start:

| evidence | line |
|---|---|
| `"Works across: restaurant, services, real_estate, hotel, clinic, barber."` | `:3` |
| `_DEFAULTS["clinic"] = {"duration_min": 30}` | `:68` |
| `RESOURCE_BACKED_MODULE_KEYS = {"clinic"}` | `:78` |
| `_resolve_resource()` pipeline stage — *"Only runs for RESOURCE_BACKED_MODULE_KEYS (clinic today)"* | `:202` |
| Full pipeline: Validate → Resolve Resource → Working Hours → Conflict Check → Create → Post Actions | `:6` |

**Two backing models, deliberately separate:** Barber has its own `Barber` table and its own
resolve/conflict path, *"built AS IF clinic/Resource didn't exist"* (`:12`) — the project's own
build-twice-before-abstracting rule, applied.

**And the admin surface for it already exists**: `app/api/v1/admin/resources.py` — 4 endpoints
(GET/POST/PATCH/PATCH-deactivate), all gated on `require_service("reservations")`.

> ### 🔗 This resolves a finding from the Phase 2 Admin API audit
> `resources` (4 endpoints) was classified there as **"never called by any frontend — candidate for
> deletion."** It is not dead. **It is unreleased clinic capability**, built ahead of its UI.
> That classification is hereby corrected.

### What is actually missing to ship a clinic vertical

| piece | state |
|---|---|
| Reservation engine (Resource-backed) | ✅ built |
| `Resource` model + admin CRUD | ✅ built |
| `clinic` in `VERTICAL_REGISTRY` | ❌ **missing** — only `barber` is registered |
| `clinic` in `VALID_BUSINESS_TYPES` | ❌ missing (`{restaurant, store, booking, barbershop}`) |
| A clinic template in `template-registry.js` | ❌ missing |
| Frontend for `Resource` (a "Doctors/Rooms" tab) | ❌ missing — `StaffTab` is Barber-specific |
| `page_template` for the vertical | ❌ `None` even for `barber` |

**So adding a vertical is currently a 5-place change**, and the Registry's own docstring already
names the fix: the duplicate maps (`_SERVICE_SEED_MAP`, `demo_service._SERVICE_MAP`,
`VENUE_TYPE_MAP`) *"should eventually read from"* the Registry. **Consolidating them BEFORE adding
clinic is the difference between adding a vertical in one place and adding it in five.**

---

# Decisions this study is asking for

| # | decision | notes |
|---|---|---|
| **1** | Delete `alzabt-demo`? | Reversible via its seed script. Breaks exactly one route. |
| **2** | If yes — where does `/alzabt` point? | `/home` · remove the route · leave broken (not recommended) |
| **3** | Remove the current `DemoBuilderPage` + its route + root CTA? | It is barber-only and superseded by the business-type-first design |
| **4** | Build the trial-expiry job? | All pieces exist; 11 tenants are past due today |
| **5** | Consolidate the 4 type-maps into `VERTICAL_REGISTRY` **before** adding clinic? | Turns a 5-place change into a 1-place change |
| **6** | Which axis wins — `vertical` / `business_type` / `service_type`? | Three names for one idea; the new picker must pick one |

## Confirmed / Side / Unknowns

**Confirmed**
1. Three demo surfaces, three different type lists; only the backend knows all four types.
2. `trial_ends_at` is written and reported but **never enforced**; 11 of 20 tenants are past due and
   none is blocked; no cleanup job exists for tenants.
3. `alzabt-demo` has exactly **one** live runtime dependency and **is re-creatable from a script**.
4. Every Demo-Builder-created tenant is already gone from the database.
5. The clinic reservation engine, `Resource` model and admin CRUD are **built**; the vertical is not
   registered and has no UI.
6. `admin/resources.py` is **not** dead code — correcting the Phase 2 audit.

**Side findings**
- `AlzabtLandingPage.jsx` still holds `DEMO_SLUG = 'alzabt-demo'` but is unrouted — dead.
- `demo_service.py`'s docstring says trial = 7 days; `registration_service.py` uses 14 (ADR-0002 §9.2
  unified it to 14). The demo path's own `TRIAL_DAYS` should be checked against that.

**Unknowns**
1. Whether any real prospect has ever been sent the `demo.salmansaas.com/alzabt` link (no analytics).
2. Whether the 11 past-due trials include anyone still actively using the platform — deliberately not
   assumed either way.
3. What `page_template` should contain for a vertical — `None` for `barber` today, so the pattern is
   unproven.

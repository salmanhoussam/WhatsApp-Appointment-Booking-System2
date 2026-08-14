# Unified Provisioning Contract — Architecture Discovery Round

**Status:** Discovery/proposal only. **No code.** Answers Salman's 7 named questions, grounded in a
fresh, real impact map of the current code (`demo_service.py`, `registration_service.py`,
`app/core/verticals.py`, page seeding, Reservations provisioning) — re-verified this round, not
carried forward from memory. Ends with a proposed contract shape and named trade-offs; the actual
decision, and any implementation, is a separate, later step.

---

## A. Real Impact Map — what each of the 3 doors actually creates today

Traced directly, function by function, this round.

### Demo Builder (`demo_service.py:create_demo_tenant()`)

```
1. Create Client   (generic _DEFAULT_CONFIG hero/story placeholder text -- same for every
                     business_type, not vertical-specific)
2. Create User     (TENANT_ADMIN)
3. Seed client_services  (_SERVICE_MAP[business_type])
4. _seed_demo_catalog()
     └─ business_type == "barbershop" → _seed_demo_barbershop():
          - 1 real Barber row
          - 1 CatalogCategory ("الخدمات")
          - 6 real CatalogService rows
          - BarberService: every service assigned to the one barber (real bookable link)
5. Return {slug, admin_url, temp_password, expires_at}
```

**Real gap, not previously stated this precisely**: Demo Builder does **not** apply any page/
content repertoire either. `_DEFAULT_CONFIG` is the same generic two-field placeholder
(`hero.title_ar="مرحباً بكم"`, `story.body_ar="قصتنا تبدأ من هنا..."`) regardless of
`business_type`. Every real tenant's actual page sections (RK's 10, Ali's 4) were populated by a
human running `scripts/seed_page_content.py` by hand, afterward, with a manually-authored
`scripts/data/{slug}/page_content.json` — confirmed this round: **`seed_page_content.py` is
CLI-only, zero references anywhere in `app/`, never called by any live route.**

### Self-Registration (3 separate calls, only the first two verified working live this session)

```
1. POST /auth/register           → registration_service.register_new_tenant()
     - Create Client (same generic _DEFAULT_CONFIG)
     - Create User (TENANT_ADMIN)
     - Seed client_services (Vertical Registry if `vertical` present, else venue_type/_SERVICE_SEED_MAP)
     - Write Client.vertical (fixed this session, e5e031c)
2. PATCH /admin/settings         → template_key + primary_color only
3. POST /catalog/seed-from-template → admin_seed_from_template()
     - CatalogCategory rows ONLY (generic category names from the template's seedCategories)
     - No CatalogItem, no CatalogService, no Barber, no BarberService, no page sections
```

**Confirmed, precisely**: self-registration never creates a `Barber`, a `CatalogService`, or a
`BarberService` row, for any template, Reservations-tagged or not. A self-registered `beauty-barber`
tenant today gets `reservations` correctly active (this session's fix) and one generic
`CatalogCategory` named "قص شعر" — no actual bookable barber, no actual bookable service.

### WhatsApp/n8n webhook (`onboarding.py`)

Funnels into the exact same `register_new_tenant()` as Self-Registration (confirmed prior round) —
inherits the identical gap. **A separate, smaller, real finding**: its own `ClientExtract` schema
(the shape Claude extracts from conversation text) has no `vertical` field at all yet — even after
this session's fix, this door cannot currently produce a classified Barber tenant, only the older
`service_type` value.

### `VERTICAL_REGISTRY` (`app/core/verticals.py`) — current real shape

```python
"barber": {
    "default_services": [...],
    "page_template": None,       # honestly still unbuilt -- Section System P3
    "staff_backing_model": "Barber",
}
```

Only `default_services` is actually consumed anywhere right now (by `registration_service.py`'s
service-seeding branch). `page_template` and `staff_backing_model` are **declared but not yet read
by any code** — they were named in the architecture (`ALZABT_VERTICAL_REGISTRY_ARCHITECTURE.md`) as
the Registry's intended full shape, but nothing consumes them yet. This is directly relevant to
today's discussion: the Registry's contract was already designed wider than what's implemented.

### One real table, the whole gap in one place

| Created automatically? | Demo Builder | Self-Registration | WhatsApp/n8n |
|---|---|---|---|
| `Client` + `User` | ✅ | ✅ | ✅ |
| `client_services` | ✅ | ✅ (fixed this session) | ✅ (old logic only — no `vertical`) |
| `Client.vertical` | ✅ (this session) | ✅ (this session) | ❌ (schema gap) |
| `CatalogCategory` | ✅ | ✅ | ❌ (not exercised by webhook path) |
| Real `Barber` | ✅ | ❌ | ❌ |
| Real `CatalogService` | ✅ | ❌ | ❌ |
| `BarberService` (bookable link) | ✅ | ❌ | ❌ |
| Page/content repertoire (`config.content.sections[]`) | ❌ | ❌ | ❌ |

**The honest headline finding of this round**: it is not "Demo Builder is complete, Self-
Registration is half-done." **All three doors are incomplete against a real "ready tenant" bar** —
Demo Builder is furthest along (real domain objects), but even it has never once auto-applied a
real page repertoire. Every real tenant's actual public page in this codebase, without exception,
was finished by a human running a script.

---

## B. What is the minimum definition of a "ready" Tenant?

Five real components, each independently checkable against what was just traced:

1. **`Client`** — the row itself, identity/branding fields. Already real, both doors.
2. **`Vertical`** — `Client.vertical`, resolved and written. Real for 2 of 3 doors as of this
   session; the webhook needs its own schema fix (small, separate, not proposed here).
3. **Capabilities** (`client_services`) — real, both fixed doors; governed by `VERTICAL_REGISTRY`
   when a vertical is present, unchanged fallback otherwise. Already correctly unified.
4. **Page/Template Repertoire** (`config.content.sections[]`) — confirmed **real for zero doors**.
   The actual, current biggest gap, bigger than either door's own domain-object gap.
5. **Vertical-specific domain data** (`Barber`+`CatalogService`+`BarberService` for `barber`) — real
   for Demo Builder only.

A tenant is "ready" only when all five are true. Today, **no door produces a fully ready tenant
unattended** — Demo Builder gets 4 of 5 (missing #4), Self-Registration gets 3 of 5 (missing #4
and #5), the webhook gets 2 of 5 today (also missing the `vertical` write itself, #2).

---

## C. Who is the source of truth — and where coupling already exists to protect against

| Concept | Source of truth | What must never happen |
|---|---|---|
| **Vertical Registry** | The *definition* of what a vertical requires — a static, code-owned lookup (already ratified: platform-layer, `app/core/`, never a Capability, never tenant data) | Must never be read at runtime by anything except a provisioning-time call. Already true today — confirmed this round, zero runtime reader exists yet, which is correct, not a gap. |
| **`Client.vertical`** | The *fact* of which vertical a specific tenant is — real tenant data, written once at provisioning | Must never be re-derived from `client_services` or from domain-object shape after the fact — this is the exact anti-pattern TOS-004 already spent real effort removing (collapsing a plural fact back into one derived guess). |
| **`client_services`** | The *live, current* capability state — already correctly governed by TOS-004's `hasCapability`, plural, real-time | Must never be seeded a second, different way outside the one seeding step at provisioning — already true; the risk is a *future* door reinventing its own seed logic instead of calling the one shared step. |
| **Domain objects** (`Barber`, `CatalogService`, `BarberService`, `Resource`, ...) | Real, tenant-owned, independently editable via the Dashboard forever after — the Registry only ever describes their *shape/defaults at creation*, never owns them ongoing | Must never be re-generated or overwritten by re-running provisioning later — provisioning creates once; the Dashboard owns everything after. |
| **Page/content repertoire** | Intended to be `page_templates/{vertical}.json`, applied once at provisioning, then owned by the tenant's own `config.content` forever after (same pattern as domain objects) | Currently violated by omission, not by wrong coupling — nothing applies it at all yet, so there's no live coupling bug here, just a real gap to close. |

**The coupling risk this section exists to name explicitly**: today's `VERTICAL_REGISTRY` entry
declares `staff_backing_model: "Barber"` but nothing reads it — the moment a future `staff` section
or provisioning step *does* start reading it, that's the exact place a Clinic entry's
`staff_backing_model: "Resource"` must resolve to genuinely different code (a different repository
call), not a hardcoded `if vertical == "barber"` branch reading the same field. Naming this now,
before it's built, is cheaper than finding it after.

---

## D. Provisioning vs. Configuration — the boundary, stated precisely

- **Provisioning** = the one-time moment a tenant is created. Reads the Vertical Registry to decide
  *defaults*: which capabilities, which domain objects, which page repertoire to create. Runs
  exactly once per tenant, through exactly one shared step regardless of which door triggered it.
- **Configuration** = everything after. The Dashboard, forever after, edits the tenant's own real
  rows — never re-consults the Registry, never re-runs a "what should this vertical have" check.
- **The rule this section states explicitly, matching Salman's own framing**: **runtime code reads
  tenant state, never the Registry.** This is already true by omission today (nothing reads the
  Registry at runtime) — the discipline this section adds is to keep it true *on purpose* once
  `staff_backing_model`/`page_template` do get real readers, not by accident of them being unused
  so far.

---

## E. Unifying the 3 onboarding doors

**Real, confirmed shared ground**: both Demo Builder and Self-Registration already end up calling
into backend logic that could, in principle, be the same shared step — `_seed_demo_barbershop()`'s
own shape (Barber → CatalogCategory → CatalogService×N → BarberService assignment) is not
demo-specific in any way; it's exactly "what a `barber`-vertical tenant needs," coincidentally only
ever called from `demo_service.py` today.

**Proposed shape** (not implemented): a single, shared **Provisioning Step** —
`provision_vertical_domain_objects(client_id, vertical)` — that all three doors call, right after
`Client`+`User`+`client_services` exist, whenever `vertical` resolves to a real Registry entry:

```
Door-specific input handling           (differs per door — this is the ONLY thing that should differ)
        │
        ▼
Shared: create Client + User            (already effectively shared logic, minor duplication today)
        │
        ▼
Shared: resolve vertical → registry entry
        │
        ▼
Shared: seed client_services            (already correctly shared via VERTICAL_REGISTRY)
        │
        ▼
Shared: provision_vertical_domain_objects(client_id, vertical)   ← THE NEW SHARED STEP
        │        (barber → Barber+CatalogService+BarberService; clinic → its own future
        │         equivalent; extracted from demo_service.py, not reinvented)
        ▼
Shared: apply page repertoire from VERTICAL_REGISTRY["page_template"]   ← ALSO NEW, closes
        │        the gap common to all three doors today
        ▼
Return  (door-specific response shape — Demo Builder's temp_password+admin_url vs.
         Self-Registration's JWT+cookie are legitimately different, not part of the contract)
```

**What stays legitimately different per door, not a violation of "same contract"**: input
validation shape (Pydantic schema per door), auth/response mechanics (JWT vs. temp password), rate
limiting, and *which* vertical/template a human or Claude-extraction chose. The contract is the
*sequence and guarantees*, not the *entry form*.

---

## F. Barber's own minimum auto-create set (already real, being named as the pattern)

Exactly what `_seed_demo_barbershop()` already proves, extracted as the reusable definition:

```
vertical = "barber" →
  1 Barber (real, active, real workingHours — not a placeholder)
  1 CatalogCategory ("الخدمات" or tenant-appropriate name)
  N CatalogService rows (real names/prices/durations — today's demo path uses a fixed 6;
      a real business's own choices are a Configuration-time edit afterward, not part of
      the minimum auto-create set itself)
  BarberService: every created service assigned to the one barber (real bookable link —
      the RK finding from the backfill round, only 2 of 12 possible links, is a live
      warning that this step matters and is easy to under-do by hand)
  Page repertoire from page_template (not yet built — the one real, net-new piece)
```

This is already a real, working, proven shape — the work is extracting it into the shared step
above, not designing it from scratch.

---

## G. Adding Clinic / Beauty without scattering `if clinic` / `if beauty`

The Registry's own existing shape already prevents this, *if* the extraction in §E is done
correctly: `provision_vertical_domain_objects()` should be written as a **dispatch keyed by
`staff_backing_model`**, not by vertical name directly:

```
provision_vertical_domain_objects(client_id, vertical):
    entry = VERTICAL_REGISTRY[vertical]
    dispatch on entry["staff_backing_model"]:
        "Barber"   → _provision_barber_domain(client_id, entry)
        "Resource" → _provision_resource_domain(client_id, entry)   # not built yet
        ...
```

Adding Clinic = one new `VERTICAL_REGISTRY` entry (`staff_backing_model: "Resource"`) + (only if no
existing `staff_backing_model` fits) one new `_provision_X_domain()` function — never a new `if
vertical == "clinic"` scattered into the shared step itself. This mirrors exactly the discipline
already proven for `RESOURCE_BACKED_MODULE_KEYS`/`Barber` vs. `Resource` at the Reservations-engine
layer (deliberately kept independent, per `.claudedocs/evolution/reservation-capability.md`) —
provisioning should key off the same real distinction, not invent a second one.

**Trade-off, named honestly**: this only works cleanly if Clinic's real domain-object shape turns
out to be genuinely `Resource`-shaped and nothing more exotic. If a future vertical needs a shape
neither `Barber` nor `Resource` covers, `provision_vertical_domain_objects()` gains a third
dispatch branch — additive, not a redesign, consistent with the Registry's own "prove before
generalizing" posture already established.

---

## H. Failure semantics — preventing a half-provisioned tenant

**Real, current risk, confirmed by reading the code, not assumed**: `create_demo_tenant()` and
`register_new_tenant()` both run their steps sequentially with **no transaction wrapper and no
compensating cleanup**. If `_seed_demo_barbershop()`'s `barber_service_repo.set_services_for_barber`
call fails after the Barber and 6 CatalogService rows already committed, those rows are orphaned —
a real, silent, half-provisioned tenant, exactly the failure mode already ratified as unacceptable
(`ALZABT_VERTICAL_REGISTRY_ARCHITECTURE.md`'s hard-gate decision, so far only applied to the
`vertical` string lookup itself, not to the domain-object creation sequence that follows it).

**Three real options, trade-offs, no decision made here:**

- **Option A — DB transaction wrapping the whole provisioning step.** Cleanest guarantee (all-or-
  nothing at the database level). Real cost: Prisma Python's transaction support and this
  codebase's existing `with_db_resilience` retry-wrapper pattern would need to compose correctly —
  not yet confirmed compatible, a real implementation risk to check before choosing this.
- **Option B — Compensating cleanup on failure** (catch, delete whatever was created, re-raise).
  Matches this codebase's own existing "no transaction infra proven yet" reality more safely, but
  is real, extra code per step, and has its own failure mode (the cleanup itself can fail).
- **Option C — Idempotent re-run, not rollback.** Provisioning steps become safe to call again
  (upsert-shaped, like `client_services`'s own seeding already is via `upsert`) — a failed
  half-provisioned tenant gets a real, visible "provisioning incomplete" flag and a retry path,
  never silently presented as done. Lowest implementation risk, but requires a real status field
  (`Client.provisioning_status` or similar) that doesn't exist today.

**Recommendation, not a decision**: Option C is the best fit for this codebase's current shape (no
proven transaction pattern yet, already comfortable with `upsert`-based idempotent seeding for
`client_services`) — but this is exactly the kind of call that deserves Salman's own weighing, not
a default.

---

## I. Should Demo Builder and Self-Registration produce the same tenant shape?

**Agrees with Salman's own lean, with the real evidence to back it, not just intuition**: yes, same
*contract and minimum guarantees*, not same *content* — and this round's impact map makes the case
concretely. Both doors already converge on identical `client_services` logic (via the shared
`VERTICAL_REGISTRY` lookup, since this session). The only reason they still diverge on domain
objects is that `_seed_demo_barbershop()` was written once, inside `demo_service.py`, and never
extracted — not because the two doors have a real, principled reason to produce different-shaped
tenants. A Barber tenant is a Barber tenant regardless of which door created it; a real business
self-registering deserves the exact same real, bookable staff+services a demo visitor gets, not a
lesser version. The content (a demo's placeholder "الحلاق الرئيسي" vs. a real owner's real staff
names) is legitimately different — the *shape* (1+ real Barber, real Services, real bookable links,
a real page) should not be.

---

## J. Proposed Provisioning Contract — summary shape

```
ProvisioningInput (door-specific)
        │
        ▼
1. Resolve/validate identity (slug, email, phone uniqueness -- already shared logic, minor
   duplication between the two real repos today, worth collapsing but not load-bearing)
2. Create Client + User
3. Resolve vertical → VERTICAL_REGISTRY entry (or None -- legitimate, unassigned)
4. Seed client_services from the Registry entry (or existing venue_type fallback if no vertical)
5. IF vertical resolved:
     a. provision_vertical_domain_objects(client_id, vertical)  -- dispatched by staff_backing_model
     b. apply page repertoire from entry["page_template"]        -- NEW, closes the shared gap
   ELSE:
     (today's existing retail/restaurant path, unchanged -- seed-from-template, manual page authoring)
6. Steps 2-5 wrapped in a real failure-safety mechanism (Option A/B/C, §H -- not decided)
7. Return door-specific response
```

---

## Trade-offs summary (no decision made)

| Decision point | Options named | This document's lean, not a decision |
|---|---|---|
| Failure semantics (§H) | Transaction / Compensating cleanup / Idempotent re-run + status flag | Option C fits this codebase's current shape best |
| Domain-object dispatch (§G) | Key by vertical name / Key by `staff_backing_model` | `staff_backing_model` — matches the Registry's own already-declared intent |
| Page repertoire timing | Apply at provisioning (needs real `page_template` files to exist first) / Keep manual for now, unify only capabilities+domain-objects first | Real open question — Barber's own `page_template` is still `None`; this may force Section System P3 earlier than planned, worth flagging explicitly |
| Identity-check duplication | Collapse into one shared function / Leave as two independent, minor duplications | Low-stakes either way, not central to this round |

---

## What this document does not decide

- Does not implement anything — no `provision_vertical_domain_objects()` function is written.
- Does not decide the failure-semantics option (§H).
- Does not decide whether page-repertoire application becomes part of this contract now or waits
  for Section System P3 to build a real `barber` `page_template` file first — flagged as a real
  sequencing question this discovery surfaced, not resolved here.
- Does not touch the WhatsApp webhook's own missing `vertical` field in its extraction schema —
  named as a small, separate, real gap, not folded into this contract's design.

---

Stopping here, per instruction. Waiting for Salman's read before any implementation planning.

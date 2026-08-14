# The Vertical Concept — Decision Proposal

**Status:** Proposal for decision — options and trade-offs only, nothing below is decided. **No
code, no DB, no tenant data, no migration executed.** Answers Salman's direct instruction after
`ALZABT_TENANT_OS_INTEGRATION_GAP_ANALYSIS.md`: before any further work (including the already-
confirmed-correct P0.1), settle a single canonical concept for *"what kind of business is this
tenant"* — currently answered inconsistently by three disconnected, real signals. P0.1 stays
approved and unblocked; it is independent of this decision and can execute whenever separately
authorized.

**Reads after**: `ALZABT_TENANT_OS_INTEGRATION_GAP_ANALYSIS.md` (Gap #2/#3/#5) — this document
turns that finding into a real decision proposal, the same Recommendation-not-Decision discipline
every prior round in this arc has used.

---

## Current State — grounded in real code, re-verified for this document

Four independent vocabularies exist today, at three different levels, none of them "Vertical" in
the Barber/Clinic/Beauty sense the Matrix documents need:

| Signal | Real field | Level | Real values today | Who writes it |
|---|---|---|---|---|
| `service_type` | `Client.service_type` — **a real column** (`prisma/schema.prisma:54`, `String? @default("real_estate")`) | Tenant | `restaurant`, `ecommerce`, `real_estate`, `barbershop` (`demo_service.py`'s `_VENUE_TYPE_MAP`) | Demo Builder only |
| `templateKey` | `Client.templateKey` — a real column (`String?`, null = unassigned) | Tenant | 20 values, from `template-registry.js` (`fashion-grid`, `health-clinic`, `beauty-barber`, ...) | Self-Registration only |
| `Reservation.moduleKey` | Per-reservation, not tenant-level | Reservation row | `restaurant`, `services`, `real_estate`, `hotel`, `clinic`, `barber` | Reservation creation, per booking |
| `CatalogCategory.moduleKey` | Per-category, not tenant-level | Category row | `catalog`, `booking`, `restaurant`, `store` | Category creation |

**A telling, previously-unremarked detail**: `service_type` defaults to `"real_estate"` for
**every** `Client` row that doesn't go through the Demo Builder — meaning most tenants in this
database have an accidental, meaningless `service_type` value, not a real classification. This is
strong, concrete evidence that `service_type` was never designed to be *the* answer to "what kind
of business is this" — it is a Demo-Builder-local convenience field that happened to look like one.

`client_services` (`ClientService` rows, resolved via `hasCapability`) is real, correct, and
**deliberately not a vertical signal** — it answers "which capabilities are active right now,"
already fixed by TOS-004 to be plural and never collapsed to one value. It should not become a
fifth vocabulary; see "Relationship to `client_services`" below.

---

## 1. What is the canonical source of truth for the Vertical?

**Recommendation: a new, single, first-class `Client` column**, not a reinterpretation of any
existing field and not a JSON key inside `config`. Reasoning, grounded in this project's own
precedent: `CatalogService.durationMin` was deliberately "promoted to a real column, not buried in
metadata... needs a hard value, not a JSON dig" the moment it became load-bearing for real logic
(slot-generation math). The Vertical concept is exactly as load-bearing — it will be read by every
onboarding door, the Section Repertoire seeding step, and (once resolved) the Staff/Team data
source — so it earns the same treatment: a real, indexable, queryable column, not a fourth JSON
convention layered on top of `config`, `selected_services`, and `service_type`'s own already-JSON-
adjacent looseness.

**Decision needed from Salman**: confirm a real column, or state a reason to prefer a `config` key
instead (e.g. if Salman wants it changeable without a migration — a real, legitimate trade-off,
just not the one this proposal defaults to).

---

## 2. What should it be named — `vertical`, `business_type`, or something else?

**Recommendation: `vertical`.** Not `business_type` (already an in-flight parameter name in
`demo_service.py`/`registration_service.py`'s function signatures — reusing it as a stored column
name would collide with an existing, narrower, provisioning-time-only meaning) and not
`service_type` (already exists, already means something narrower and Demo-Builder-specific, and
already carries the misleading `"real_estate"` default documented above — redefining it in place
would silently change behavior for every existing row rather than adding something new). `vertical`
is also already the exact word every one of the 6 `ALZABT_*.md` documents uses consistently
(Barber/Clinic/Beauty "verticals") — naming the field the same word the architecture already calls
the concept avoids a translation step between documentation and code.

**Decision needed from Salman**: confirm `vertical`, or state a preferred name.

---

## 3. Where is it stored?

Per #1: `Client.vertical` (`String?`, nullable — matching `templateKey`'s own existing "null = not
yet assigned" convention, not a forced default the way `service_type`'s `"real_estate"` default
turned out to be misleading). Free-form string, not a rigid enum — matching this schema's own
stated, deliberate convention (`Resource.type`'s comment: *"freeform string... no rigid enum
anywhere else in this file either"*). Paired with a small, explicit **Vertical Registry**
(a Python dict, e.g. `VERTICAL_REGISTRY`, mirroring the shape `_SERVICE_MAP`/`_VENUE_TYPE_MAP`
already use) naming, per real registered vertical: its default `client_services` seed set, its
`page_templates/{vertical}.json` path, and (once Staff/Team is resolved, see #10) which
staff-backing model/endpoint it uses. A tenant can have `vertical = null` (not yet classified) or
`vertical = "coworking"` (a value with no registry entry yet) without breaking anything — the
registry is what turns a `vertical` value into real provisioning behavior, the column itself stays
permissive.

---

## 4. How does it relate to the existing `templateKey`?

**Real fork, presented as two options — not resolved here:**

### Option A — `vertical` replaces `templateKey` for Reservations-shaped templates
`template-registry.js`'s Reservations-tagged entries (`health-clinic`, `beauty-barber`, etc. — 14
of 20 templates already carry `services: ['reservations']`) get retired or merged into the new
`vertical` + `page_templates/{vertical}.json` mechanism; `templateKey` stays meaningful only for
the remaining, non-Reservations retail/restaurant templates (`fashion-grid`, `health-pharmacy`,
etc.) where it already works today via `seed_page_content.py`.
**Cost**: real migration work across `template-registry.js` and `TenantRegisterPage.jsx`.
**Benefit**: closes Gap #3 from the prior analysis for good — one door, one mechanism, for every
Reservations-type tenant regardless of how it was created.

### Option B — `vertical` and `templateKey` coexist, `templateKey` becomes "which specific look
within a vertical"
`vertical = "barber"` picks the section repertoire and default services; `templateKey` (optional,
narrower) picks a specific curated visual variant within that vertical (e.g. today's
`barbershop_demo` becomes one `templateKey` value available when `vertical = "barber"`), the way a
theme picks a variant within a fixed structure (`theme.md`'s own Content/Template boundary,
already documented).
**Cost**: two fields to keep in sync conceptually, real risk of drifting apart again the way
`service_type`/`templateKey` already have.
**Benefit**: no migration of `template-registry.js`'s existing 20 entries; smaller first step.

**Recommendation: Option A for the 14 Reservations-tagged templates specifically, Option B's shape
implicitly preserved for the other 6** (retail/restaurant templates keep `templateKey` working
exactly as today, since `vertical` is scoped to Reservations-shaped businesses per #7 below) — this
is the smaller, more honest version of Option A, not a third option: it only touches the templates
that are already the actual subject of this whole gap.

**Decision needed from Salman**: confirm this scoped version of Option A, or prefer full Option B
(coexistence) for a smaller first step.

---

## 5. How does it relate to `service_type`?

**Recommendation: `service_type` is retired for any tenant that has a real `vertical` value.**
`_VENUE_TYPE_MAP`'s real values (`restaurant`, `ecommerce`, `real_estate`, `barbershop`) are a
narrower, Demo-Builder-only attempt at the same concept `vertical` now owns properly — once
`vertical` exists, `demo_service.py` writes `vertical` instead of (or in addition to, during a
transition window) `service_type`. The misleading `"real_estate"` default (documented above) is
real evidence `service_type` was never a safe thing to read as "the tenant's business type" for any
tenant it wasn't explicitly set for — `vertical`'s `null`-by-default convention is deliberately
safer: "unknown" reads as `null`, never as a specific wrong guess.

**Decision needed from Salman**: confirm retirement (with or without a transition window), or state
a reason `service_type` must keep being written independently (e.g. an existing consumer this
proposal hasn't found).

---

## 6. How does it relate to `client_services`?

**Stay fully independent, on purpose — this is the one relationship that should NOT change.**
`vertical` answers *"what kind of business is this"* (drives the default capability set and the
section repertoire at provisioning); `client_services` answers *"which capabilities are actually
active right now"* (drives real-time access/gating, per-tenant, and can diverge from the vertical's
defaults after provisioning — e.g. a Barber tenant later adding `store`). `vertical` should **seed**
a tenant's initial `client_services` (via the Vertical Registry's default-seed-set, replacing
today's `_SERVICE_MAP`/`_SERVICE_SEED_MAP` duplication with one shared table), but must **never be
derived from** `client_services` membership after the fact — that direction of inference already
failed once, and TOS-004's whole `CAPABILITY_RESOLUTION_PLAN.md` migration exists specifically to
stop the codebase collapsing a plural, real-time fact (active services) back into a single derived
label. `vertical` is a different kind of fact — a provisioning-time classification, not a real-time
capability state — and keeping the two conceptually separate is what prevents this proposal from
quietly reintroducing the exact bug TOS-004 just finished removing.

---

## 7. How does it unify Demo Builder + Self-Registration + existing tenants?

- **Demo Builder** (`demo_service.py`): `business_type` (the existing function parameter, kept as
  the one-time provisioning input, per #2) maps through the new `VERTICAL_REGISTRY` to set
  `Client.vertical` directly, replacing `service_type`'s write per #5. Smallest change of the three
  — this door already has the right shape, just the wrong destination field.
- **Self-Registration** (`TenantRegisterPage.jsx` / `template-registry.js`): each of the 14
  Reservations-tagged template entries gains one new field, `vertical: 'barber' | 'clinic' |
  'beauty' | ...`; the remaining 6 retail/restaurant templates get `vertical: null` (they are not
  Reservations-shaped businesses in this sense — see #7's scoping note below). `TenantRegisterPage.
  jsx`'s existing `getTemplate()` call already resolves the full template object; it would read
  `vertical` off that same object and write it to `Client.vertical` at creation, alongside
  whatever it already writes for `templateKey`/`service_type` today — additive, not a rewrite of
  the registration flow's own logic.
- **Existing tenants** (RK, Ali, `alzabt-demo`, and any other real or demo Reservations-type tenant
  already live): a one-time, small backfill — real but bounded, since the number of live
  Reservations-type tenants today is small and known (RK, Ali, `alzabt-demo`, plus whatever the
  Demo Builder has created since 2026-08-12) — setting `vertical = "barber"` directly for each,
  inferred from their already-known real identity, not guessed from ambiguous signals. **Explicitly
  not automated on a rule** (e.g. "infer from `service_type == 'barbershop'`") — a real backfill
  script should be reviewed against the actual tenant list before running, since `service_type`'s
  own default-value problem (documented above) means blind inference risks mislabeling a tenant
  that was never really classified in the first place.

**Scoping note carried from the Gap Analysis, restated as a real open question here**: should
`vertical` eventually cover retail/restaurant tenants too (`footlab` → `vertical: "store"`,
`caracas` → `vertical: "restaurant"`), making it a truly universal concept across the whole
platform, or should it stay scoped to Reservations-shaped businesses only (Barber/Clinic/Beauty/
future service verticals), leaving retail/restaurant tenants on their existing `templateKey`-only
model? **Recommendation: scope to Reservations-shaped businesses only, for now** — this is the
actual subject of the whole `ALZABT_*` arc, and retail/restaurant tenants already have a working,
if imperfect, mechanism (`templateKey` + `page_templates/{restaurant,store}.json`) that this
proposal has found no real evidence is broken the same way. Widening `vertical` to cover retail too
is a legitimate future step, not a needed one now — the same "prove it before generalizing"
discipline this whole arc has already applied repeatedly.

**Decision needed from Salman**: confirm the Reservations-only scope, or state that `vertical`
should be universal from day one.

---

## 8. How is it extensible to Barber / Clinic / Beauty / future sectors?

By construction, per #3: adding a new vertical is **one `VERTICAL_REGISTRY` entry** (default
services, `page_templates/{vertical}.json` path, staff-backing model reference) **plus one
`page_templates/{vertical}.json` file** — no new code branch scattered across `demo_service.py`,
`registration_service.py`, and `template-registry.js` independently (today's real shape: adding
"barbershop" already required touching `_SERVICE_MAP`, `_VENUE_TYPE_MAP`, and
`_SERVICE_SEED_MAP` — three separate dicts in two separate files, kept in sync by hand). The
registry is the one place a future Coworking, Spa, or Consultant vertical gets named, matching this
project's own Abstraction Rule: each new vertical is added when it's real and needed, never
speculatively pre-listed.

---

## 9. How does it prevent a "half-existing, half-empty" tenant like the Clinic finding?

**Recommendation: adopt the same Completion Gate discipline `tenant-onboarding.md` already
established for a different case** (`.claude/rules/tenant-onboarding.md`'s *"Completion Gate —
إلزامي، وليس خطوة تحقق لاحقة"*, written after RK's own real onboarding gap). Concretely: assigning
a `vertical` to a tenant and actually seeding that vertical's requirements (page content sections
via `page_templates/{vertical}.json`, and — for verticals with a staff-backing model — at least a
placeholder bookable staff row) become **one atomic step in the provisioning flow**, not two
independent writes that can silently diverge. If a vertical's registry entry is incomplete (e.g. no
matching `page_templates` file exists yet for a newly-added vertical), provisioning should fail
loudly at creation time rather than succeed with a `vertical` value that has nothing real behind
it — exactly the gap that let a self-registered `health-clinic` tenant get `reservations` activated
with zero `Resource` rows and zero page content, silently, with no error anywhere.

**Decision needed from Salman**: confirm this should be a hard gate (creation fails loudly) versus
a soft warning (creation succeeds, flagged for follow-up) — a real product trade-off between
onboarding friction and data integrity that this proposal defaults to the stricter option but does
not unilaterally lock in.

---

## 10. How does the decision affect each downstream area?

| Area | Effect |
|---|---|
| **Section Repertoire** | `vertical` becomes the real trigger the Matrix documents already assumed existed — `page_templates/{vertical}.json` is looked up directly by `Client.vertical`, closing Gap #2/#3 from the prior analysis. |
| **Staff/Team** | `VERTICAL_REGISTRY`'s per-vertical "staff-backing model" entry is what finally lets a future `staff` section branch correctly (`Barber` for `vertical: "barber"`, `Resource` for `vertical: "clinic"`) instead of the Section System Contract's current, silently Barber-only assumption (Gap #4). This proposal does not resolve the deeper, separate Barber-vs-Resource merge question (`.claudedocs/evolution/reservation-capability.md`'s own still-open extraction triggers) — it only gives the `staff` section a real, named way to pick the right one per tenant without waiting for that merge. |
| **Reservations** | No change to the engine itself — `vertical` only ever supplies the *default* `client_services`/registry data at provisioning; the 6-stage pipeline, `Reservation.moduleKey`, and the Barber/Resource split remain exactly as built. This is the same boundary Round 2's Mechanism document already drew (Layer 0 untouched) — this proposal doesn't move it. |
| **Demo provisioning** | `demo_service.py` writes `Client.vertical` instead of `service_type`; `_SERVICE_MAP`/`_VENUE_TYPE_MAP` collapse into reading the same `VERTICAL_REGISTRY` `registration_service.py` also reads — removing one real, existing duplication (two independently-maintained dicts for the same barbershop defaults) as a side effect, not a new goal. |
| **Onboarding (self-registration)** | `template-registry.js`'s Reservations-tagged entries gain a `vertical` field; `TenantRegisterPage.jsx` writes it. Closes the confirmed real gap (Gap #3) where a self-registered Clinic-type tenant gets no bookable staff and no page content today. |
| **Future capabilities** | Any future Capability whose behavior should vary by business type (a future Loyalty program's default rules, a future AI assistant's tone, anything else) reads `Client.vertical` directly, instead of re-deriving its own third mapping the way `service_type` and `templateKey` each independently did — this is the actual, durable payoff of doing this now rather than letting a 5th vocabulary appear the next time a new capability needs to know "what kind of business is this." |

---

## Current → Target → Migration → Risks → Recommendation

### Current
Four disconnected vocabularies (`service_type`, `templateKey`, `Reservation.moduleKey`,
`CatalogCategory.moduleKey`), at three different levels, none of them a real "Vertical" concept.
Two independent onboarding doors write two of these signals inconsistently. A confirmed real gap:
a self-registered Clinic-type tenant today gets neither bookable staff nor page content.

### Target
```
Tenant.vertical (real column, nullable, free-form string)
        │
        ▼
VERTICAL_REGISTRY[vertical] = {
   default_client_services: [...],
   page_template: "scripts/data/page_templates/{vertical}.json",
   staff_backing_model: "Barber" | "Resource" | ...,   ← feeds Staff/Team (Gap #4)
}
        │
        ├──► Demo Builder            (business_type → vertical, atomic with seeding — #9)
        ├──► Self-Registration       (template-registry.js's vertical field → vertical, same gate)
        └──► Existing tenants        (one-time, reviewed backfill, not rule-inferred)
```
`service_type` retired for any tenant with a real `vertical`. `templateKey` retired for the 14
Reservations-tagged templates specifically (Option A, scoped), unchanged for the other 6.
`client_services` stays fully independent, seeded-by but never derived-from `vertical`.

### Migration (named, not executed)
1. Add `Client.vertical` column (schema migration, additive, nullable — no existing row breaks).
2. Write `VERTICAL_REGISTRY` (one Python dict), seeded initially with `barber` only (the one real,
   proven vertical) — Clinic/Beauty entries added only once each has its own `page_templates` file
   and staff-backing-model decision, matching this project's own Abstraction Rule.
3. Point `demo_service.py`'s barbershop branch at the registry; write `vertical` instead of
   `service_type`.
4. Add `vertical: 'barber'` to `template-registry.js`'s Barber-shaped entries (`beauty-barber` and
   any other Reservations-tagged entry that's really Barber-shaped, reviewed one by one, not
   assumed from the entry's name alone); wire `TenantRegisterPage.jsx` to write it.
5. One-time, reviewed backfill for RK/Ali/`alzabt-demo`/any other live Reservations tenant.
6. Only after 1-5 are real and verified: retire `service_type`'s write in both onboarding doors
   (keep the column itself, per this project's own precedent of never dropping a live schema
   column without a separate, explicit migration decision — `site-configuration.md`'s Hero Video
   column note is the exact precedent).

### Risks
- **Backfill mislabeling** — inferring `vertical` for existing tenants from an already-unreliable
  signal (`service_type`'s misleading default) could silently mislabel a tenant if done by rule
  instead of by review. Mitigated by #9's explicit "reviewed, not automated" recommendation.
- **`template-registry.js` scope creep** — deciding which of the 14 Reservations-tagged templates
  are genuinely "Barber" vs. something else not yet modeled (a few entries may not map cleanly)
  could stall on edge cases. Mitigated by only migrating entries with a clear, confirmed real
  match, leaving ambiguous ones `vertical: null` rather than guessing.
- **A hard Completion Gate (per #9) could block a legitimate fast-path provisioning flow** if the
  registry is incomplete for a vertical someone tries to use before it's ready — this is by design
  (fail loudly, don't half-provision), but it does mean the registry must be genuinely complete
  before a vertical is offered anywhere, which is real, if small, discipline overhead going forward.
- **None of this touches Reservations, Demo Builder's core seeding logic, or any live tenant's
  current behavior** if executed carefully — the real risk surface is documentation/registry
  correctness, not runtime breakage, since every write above is additive until step 6's retirement.

### Recommendation
Adopt the scoped shape above: a new `Client.vertical` column, a small `VERTICAL_REGISTRY`, Option A
(scoped to the 14 Reservations-tagged templates) for `templateKey`'s relationship, `service_type`
retired once migrated, `client_services` left untouched, a hard Completion Gate for new vertical
provisioning, and a reviewed (not rule-based) one-time backfill for existing tenants. Every numbered
decision above (#1 storage form, #4 templateKey option, #5 retirement, #7 scope, #9 gate strictness)
is still Salman's to confirm individually — this recommendation is the proposal's own best-reasoned
default, not a claim that all five are equally settled.

---

Stopping here, per instruction. No code, no migration, no template file, no tenant data touched.
P0.1 remains approved and independent — ready whenever separately authorized.

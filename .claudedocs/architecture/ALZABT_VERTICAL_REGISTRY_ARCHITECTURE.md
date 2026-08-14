# The Vertical Registry — Ownership, Lifecycle, and Final Decisions

**Status:** Architecture resolution round, not implementation. **No code, no schema migration, no
data change, no tenant touched.** Builds directly on `ALZABT_VERTICAL_CONCEPT_PROPOSAL.md` (which
proposed `Client.vertical` + a `VERTICAL_REGISTRY` but left the Registry's own architecture and 5
sub-decisions open). This document resolves both: where the Registry lives, who owns it, its exact
boundaries, and a final recommendation — not another set of options — for each of the 5 pending
decisions. P0.1 remains untouched, approved, independent of everything here.

---

## Where `VERTICAL_REGISTRY` belongs architecturally

**It is Platform layer (`P-002-content-vs-structure.md`'s Layer 1), and it sits outside the
Capability/Interface/Governance tree — a third "outside the tree" mechanism, the same way `TOS-001`
already places the Capability Proposal Gate and the Editing Engine outside that tree rather than as
a fourth branch.**

Why it fails the Capability Proposal Gate on purpose, not by oversight — checked directly against
`TOS-003` §4.1's five questions:

| Gate question | Registry's answer |
|---|---|
| Problem, for whom? | Not a tenant-facing capability at all — a developer-facing lookup table |
| New or extension? | N/A — it has no Contract, because it owns no tenant data |
| More than one Interface? | N/A — Interfaces (Dashboard, AI, Mobile) never read it; only backend provisioning code does |
| Source of Truth? | **The codebase itself** — a static, versioned Python dict, not a database row |
| Client's own success measure? | N/A — no tenant ever interacts with it, directly or indirectly |

A thing with no tenant data, no Interface, and no client-facing success measure is not a Capability
by this project's own admission test — it is infrastructure *several* Capabilities' provisioning
paths consult, the same category `SERVICE_TYPE_MAP` in `app/core/services.py` already occupies for
a narrower question ("which service keys does this module type need"). **Recommendation: the
Registry lives in `app/core/`, e.g. `app/core/verticals.py`, alongside `services.py` — not inside
any single Capability's `app/services/*.py` file**, because it is read by more than one Capability's
provisioning logic (Reservations' default services, the Section System's template path, a future
Staff Capability's model choice) and belongs to none of them exclusively.

---

## Who owns it

**The codebase itself — no tenant, no admin, no Dashboard, no AI Interface, ever writes to it.**
Concretely: a developer adds or edits a `VERTICAL_REGISTRY` entry via a normal code change,
reviewed and committed like any other platform code — never a runtime write, never exposed through
any Admin or Public Contract. This is the same ownership tier `SECTION_MAP` itself already has
(`DynamicPage.jsx`'s own comment: *"a type without one is silently dropped"* — a hard, developer-
only boundary already accepted for the Section Library; the Registry inherits the identical
posture). Per `repository-hygiene.md`'s Persona & Prompt Drift convention (a different artifact
type, but the same underlying principle): a change to the Registry is a real, product-shaping
decision — adding a vertical, changing its default services — so it deserves a stated reason in its
own commit, the same discipline already required for `.claude/agent/*.md`/`.claude/rules/*.md`
changes, extended here because the Registry is just as behavior-defining even though it's ordinary
Python, not a prompt file.

---

## What it is allowed to define

Exactly three things per vertical entry — kept deliberately narrow:

1. **Default `client_services` seed set** — which capabilities a new tenant of this vertical starts
   with active (replacing today's duplicated `_SERVICE_MAP`/`_SERVICE_SEED_MAP`/`_VENUE_TYPE_MAP`
   across `demo_service.py`/`registration_service.py` with one shared source).
2. **A pointer to its `page_templates/{vertical}.json` file** — which Section Repertoire to seed at
   provisioning. The Registry names the file; it never contains section content itself — that stays
   inside the JSON file, the same already-proven mechanism `restaurant.json`/`store.json`/
   `booking.json` already use.
3. **Which staff-backing model/endpoint this vertical's bookable people use** (`Barber` vs.
   `Resource`, today's only two real options) — a single named reference, not logic, so a future
   `staff` section (or any future consumer) can resolve the right data source per tenant without
   guessing (closes Gap #4 from the prior Gap Analysis).

Nothing else. A vertical entry is a **pure data record** — service keys, a file path, a model name —
never a function, never a conditional, never anything that executes.

---

## What it must never define

- **Reservations engine internals.** The 6-stage pipeline, `Reservation.moduleKey` dispatch,
  working-hours math, conflict-check logic (`reservation_service.py`) stay exactly as built —
  the Registry supplies which staff model a vertical uses, never how booking itself works.
- **Section component code or layout.** It names *which* template file to apply, never section
  markup, styling, or behavior — that remains Layer 1 (`SECTION_MAP`) and Layer 2 (the template
  JSON itself).
- **Per-tenant content or overrides.** Nothing in the Registry is tenant-specific — the moment a
  value needs to vary per business (a headline, a photo, which optional sections a specific tenant
  keeps), it has left the Registry's scope and belongs to `Client.config.content` (Layer 3, tenant-
  owned), never a per-tenant branch bolted onto the Registry.
- **Procedural logic of any kind.** No `if vertical == "clinic": do_x()`. If vertical-specific
  behavior is ever needed beyond a plain lookup, that logic lives in the *consuming* service (e.g.
  a future Staff Capability's own code), keyed off a value the Registry supplied — the Registry
  itself stays a flat data table, so adding a new vertical is always "add an entry," never "add a
  new code path."
- **Vertical-facing copy/labels** (e.g. "Barbers" vs. "Doctors" vs. "Artists" — already named in
  `ALZABT_SECTION_SYSTEM_CONTRACT.md`'s `staff` entry). These stay inside the vertical's own
  `page_templates/{vertical}.json`, alongside the rest of that vertical's section configuration —
  duplicating them into the Registry too would recreate exactly the "one concept, two storage
  locations" failure `site-configuration.md`'s Hero findings already document as a real, costly
  mistake once.

---

## How it relates to Capabilities, Tenant OS, Section Repertoires, and provisioning

- **Capabilities**: the Registry does not replace, own, or duplicate any Capability's Contract. It
  is a cross-Capability lookup several Capabilities' provisioning-time code consults once, at
  creation — Reservations' service-seeding, the Section System's template-seeding, a future Staff
  Capability's model-resolution. It routes *which* Capabilities and *which* Layer-2 template apply
  to a tenant; it is never itself a fourth thing a Capability's Service writes through.
- **Tenant OS**: sits outside the Capability/Interface/Governance tree, at the Platform layer —
  structurally the same position `TOS-002`'s Editing Engine and `TOS-003`'s Capability Proposal
  Gate already occupy (connective/gating mechanisms, not Capabilities themselves). Worth naming
  explicitly, not decided here: if this Registry proves durable across a second and third real
  vertical the way the Editing Engine and Capability Proposal Gate each did, it is a plausible
  future `TOS-00X` ADR candidate later — not proposed now, per this project's own Abstraction Rule
  (one real vertical, Barber, is not evidence enough yet).
- **Section Repertoires**: the Registry's `page_templates/{vertical}.json` pointer **is** the exact
  mechanical link between "this tenant is a Barber" and "this tenant gets the Barber repertoire" —
  the missing piece the prior Gap Analysis found absent. This link exists and resolves exactly
  once, at provisioning; the Section System itself (`DynamicPage.jsx`) never consults the Registry
  at render time — it only ever reads the already-materialized `Client.config.content.sections[]`
  the Registry helped seed once.
- **Provisioning**: the Registry is a **provisioning-time-only dependency.** Demo Builder and
  Self-Registration each consult it exactly once, at tenant creation. Nothing at runtime — not
  `DynamicPage.jsx`, not the booking engine, not the Dashboard — ever reads `VERTICAL_REGISTRY`
  directly. This single fact is what makes the next question answerable cleanly.

---

## How adding a future vertical works without modifying unrelated Reservations logic

Because the Registry only supplies **data** (a service list, a file path, a model name) to
provisioning code that is already vertical-agnostic in shape — `_SERVICE_MAP`'s existing dict-
lookup pattern already proves adding "barbershop" required zero new conditionals in
`reservation_service.py`, only a new dict entry — a new vertical entry is, by construction, additive
only:

```
Add a vertical  =  one VERTICAL_REGISTRY entry
                 + one page_templates/{vertical}.json file
                 + (if it reuses an existing staff model) zero backend changes
```

Reservations' own pipeline is keyed off `Reservation.moduleKey`/`Barber` vs. `Resource` at
**booking** time, decided per-reservation, completely independent of `Client.vertical` at
**provisioning** time — the two never intersect in code. A new vertical (say, a future "Spa") only
becomes a trigger for real Reservations-engine work if its actual booking shape doesn't fit either
existing staff model (e.g. it needs multi-person capacity, which neither `Barber` nor `Resource`
supports today) — and that would be discovered and decided explicitly at that moment, the same
"prove it before generalizing" discipline `.claudedocs/evolution/reservation-capability.md` already
applies to the Barber/Resource question itself. Adding a Registry entry can never silently cause
Reservations-engine changes — it can, at most, *reveal* that a genuinely new booking shape is
needed, which is a separate, visible, explicit decision, not a side effect.

---

## How Demo Builder and Self-Registration consume the same registry

Both are, today, two **frontend** entry surfaces feeding the same kind of **backend** provisioning
work — neither should hold its own copy of vertical logic:

- **Demo Builder** (`demo_service.py`): already backend-only. Its `business_type` parameter
  resolves directly against `VERTICAL_REGISTRY` — no frontend registry involved at all.
- **Self-Registration** (`TenantRegisterPage.jsx` / `template-registry.js`): `template-
  registry.js` stays a **frontend-only, presentation concern** — which templates to show, their
  names/icons/marketing copy in the picker UI. It is never the source of truth for what a vertical
  *requires*; it only needs one new field per relevant entry (`vertical: 'barber' | null`) so the
  picker can tell the backend which vertical was chosen. The actual seeding logic runs backend-side,
  in `registration_service.py`, which resolves that `vertical` value against the same
  `VERTICAL_REGISTRY` Demo Builder reads — one backend source of truth, two frontend pickers handing
  it a value.

This closes the real duplication the Gap Analysis found: today, `demo_service.py` and
`registration_service.py` each independently maintain their own `_SERVICE_MAP`/`_SERVICE_SEED_MAP`
dicts for the same barbershop defaults. `VERTICAL_REGISTRY` becomes the one place both import from.

---

## How an unassigned or unsupported vertical behaves

- **`Client.vertical = null` (unassigned)** — a legitimate, permanent state, not an error. Behaves
  exactly as today's non-Reservations tenants already do: no Section Repertoire auto-applied, no
  forced service seeding, content authored manually or via `templateKey`'s existing mechanism.
  Matches `templateKey`'s own precedent (`null` = "not yet assigned," already accepted).
- **`vertical` set to a value with no matching Registry entry (unsupported)** — must **fail loudly
  at provisioning time**, never silently succeed with a half-seeded tenant. This is the final
  recommendation for pending decision #5 below, and it is what directly prevents a repeat of the
  confirmed real gap (a self-registered Clinic-type tenant getting `reservations` activated with
  zero staff and zero page content, silently). Both Demo Builder and Self-Registration should only
  ever *offer* verticals that already have a real Registry entry — so in normal operation this
  failure path should almost never trigger; it exists as a hard backstop, not a UX a real user
  should ever see.
- **At runtime, post-provisioning** — since the Registry is provisioning-time-only (see above), no
  runtime code should ever encounter an "unsupported vertical" state at all. If a tenant's stored
  `vertical` somehow has no live Registry entry later (e.g. an entry was removed after the tenant
  was created), any code that still happens to check it should degrade to treating the tenant as
  unassigned, never crash — a defensive rule for a case that a correct provisioning-time gate
  should make unreachable in practice.

---

## The 5 pending decisions — final recommendations

Each was left as an option set in `ALZABT_VERTICAL_CONCEPT_PROPOSAL.md`. Final call for each,
reasoned, not re-opened as options:

1. **Storage form** → **Real column, `Client.vertical` (`String?`, nullable).** No counter-evidence
   surfaced against the `CatalogService.durationMin` precedent (promote to a real column the moment
   something becomes load-bearing for real logic) — a Registry lookup key is exactly that.
2. **Relationship to `templateKey`** → **Scoped Option A**: `vertical` supersedes `templateKey` for
   the 14 Reservations-tagged self-registration templates specifically; the other 6 retail/
   restaurant templates keep `templateKey` working exactly as today, untouched. Smaller, honest,
   and only touches the templates that are actually the subject of this whole gap.
3. **`service_type` retirement** → **Retire the write, keep the column.** Once migration steps land,
   both onboarding doors stop writing `service_type`; the column itself stays in the schema
   (matching this project's own standing rule against dropping a live column without a separate,
   explicit migration decision — `site-configuration.md`'s Hero Video column precedent).
4. **Universal vs. Reservations-only scope** → **Reservations-only, for now.** Retail/restaurant
   tenants already have a working mechanism (`templateKey` + their own `page_templates` files) with
   no evidence in this whole investigation that it's broken the same way. Widening `vertical` to
   cover them too is a legitimate future step once a second real cross-vertical need actually
   appears — not before, per this project's own Abstraction Rule.
5. **Gate strictness (hard fail vs. soft warning)** → **Hard gate.** The concrete cost of a soft
   warning already happened once, silently, for weeks (the Clinic self-registration gap this whole
   analysis surfaced) — a soft warning is exactly the failure mode that let it go unnoticed. The
   cost of a hard gate is provisioning friction that, in practice, is never hit by a real user,
   since both onboarding doors would only ever offer verticals the Registry already fully supports —
   the gate only fires during a developer's own testing while adding a new vertical, which is
   precisely when it should.

---

## The canonical model

```
Tenant  →  Vertical  →  Registry  →  Capabilities + Repertoire + Staff Model  →  Tenant Configuration
```

### Authoritative vs. derived — the distinction that makes this model coherent

The arrow chain above is **a one-time, provisioning-time resolution, not a live runtime
dependency chain.** Reading it left to right without that distinction would wrongly suggest every
downstream fact stays permanently tied to (and re-derivable from) the Registry — it does not, by
design:

| Element | Authoritative or Derived | Why |
|---|---|---|
| **Tenant** (`Client` row) | **Authoritative** | The real entity — nothing about it is computed from anything else. |
| **Vertical** (`Client.vertical`) | **Authoritative** | A real, stored fact about this specific tenant, set once (deliberately, not casually re-assigned — changing a tenant's vertical after the fact is a real re-provisioning event, out of scope for this document). |
| **Registry** (`VERTICAL_REGISTRY`) | **Authoritative for definitions, not for any tenant's data** | The single source of truth for *"what does the Barber vertical require,"* platform-wide and tenant-agnostic — but it holds no tenant data itself, so it's a different kind of "authoritative" than the tenant's own rows are. |
| **Capabilities** (`client_services` rows) | **Derived at creation, authoritative thereafter** | Seeded once from the Registry's default list — but per the Vertical Concept Proposal's own §6, a tenant's active services can diverge afterward (a Barber tenant later adding `store`) and that live state is never re-derived from the Registry again. TOS-004's plural `hasCapability` model governs it from that point on, independent of `vertical`. |
| **Repertoire** (`Client.config.content.sections[]`) | **Derived at creation, authoritative thereafter** | Seeded once from the vertical's `page_templates/{vertical}.json` — then becomes real, tenant-owned Layer-3 Content (`P-002`), editable going forward with zero further reference to the Registry. |
| **Staff Model choice** (which endpoint/model a `staff` section queries) | **Derived, and stays derived** | Not a one-time seed — every render, the Registry (or a cached resolution of it) tells the `staff` section whether to query `Barber` or `Resource` for this tenant's vertical. This is the one element in the chain that stays a live, ongoing derivation rather than crystallizing into independent tenant state, because *which model to query* is a structural fact about the vertical, not tenant-owned content. |
| **The actual staff rows** (`Barber`/`Resource` records) | **Authoritative** | Real, independently-managed tenant data — an admin adds/edits barbers directly; the Registry only ever named which table to look in, never generated or owns the rows themselves. |
| **Tenant Configuration** (`Client.config`, `primary_color`, etc.) | **Authoritative** | Fully tenant-owned Layer-3 content, edited going forward with no relationship to the Registry at all. |

**The one governing rule this table exists to make explicit**: the Registry is authoritative only
for *"what should a new tenant of this vertical start with"* — never for *"what is true about this
tenant right now."* Once a tenant is provisioned, its own real rows (`client_services`, `config.
content.sections[]`, `Barber`/`Resource` records) are the only source of truth for that tenant,
full stop — except for the single structural exception named above (which staff model a vertical
uses), which stays a live lookup because it describes the *shape* of the vertical, not anything a
tenant could have or should be able to edit. A later change to the Registry's Barber definition
(e.g. a new default service added) affects only tenants provisioned after that change — it never
retroactively alters an already-provisioned tenant's own, already-independent state.

---

Stopping here, per instruction. No code, no schema migration, no data, no tenant touched. Waiting
for approval before any implementation — including P0.1, which remains separately approved and
ready whenever authorized, unaffected by any decision in this document.

# User Roles / Permissions — Evolution Log

## 2026-08-09

### Context

Salman requested a real 3-tier authorization model for RK (Super Admin / Tenant Owner / Staff
scoped-to-self), explicitly distinct from the already-built Staff↔Service capability
(`staff-capability.md` — "which services can a barber perform" is a different question from "what
can a logged-in user do in the dashboard"). Full investigation, no code:
`.claudedocs/work/user-roles-permissions-investigation/2026-08-09/summary.md`.

### Discovery

- `SUPER_ADMIN` is fully real and enforced (`require_super_admin`). `TENANT_ADMIN` already *is*
  "Tenant Owner" in spirit — `team.py`'s own comment says so explicitly, and it's structurally
  excluded from every Super-Admin-only route. Giving someone Tenant Owner access is zero code —
  just creating a `User` row with that role.
- The real gap is entirely on the "Staff scoped to self" side: `User` and `Barber` are completely
  unlinked (no field either direction), the admin reservations list has no server-side per-barber
  filter at all (the dashboard's existing per-barber pill filter is confirmed client-side only —
  the backend already returns the whole tenant's reservations to any authenticated admin), and there
  is no real Customer entity for the barber/reservation module (`Reservation` stores customer
  identity as free-text only) — so "a staff member's own clients" isn't even a well-defined query
  yet.
- `require_roles()` itself is a reusable, working mechanism (variadic OR-of-roles) — a new `STAFF`
  role, once added to the enum, is automatically blocked from every route that doesn't explicitly
  list it. Most of "Jaafar can't touch Services/Prices/Catalog/Settings/Staff" is free once the role
  exists; the hard part is exclusively the self-scoping of calendar/reservations/clients.
- Unrelated, severe side finding: `customers.py`, `prices.py`, `booking_services.py` have **zero**
  auth dependency chain — not tenant resolution, not role check, nothing. Any caller who knows a
  `client_id` can read/write them today. Flagged as urgent and independent of this feature, not
  bundled into it.

### Current Understanding

The 3-tier model splits cleanly into "free" (Super Admin, Tenant Owner — existing infrastructure,
zero new code) and "real build" (Staff scoped-to-self — needs a new enum value, a new `User↔Barber`
link via additive migration, new per-role gating on two currently-ungated route files
(`reservations.py`, `catalog.py`), and genuinely new server-side resource-filtering logic with no
existing precedent in the codebase to extend). This is a real, scoped Capability build, not a
config change — unlike Hussein's case.

### Open Questions

- Should "own clients" be a derived query (group by name/phone on the staff member's own
  reservations) or a real Customer entity for this module — a design decision, not resolved.
- Should the missing `require_roles()` gating on `reservations.py`/`catalog.py` be fixed immediately
  as its own hardening step (it's a real gap for every non-privileged role today, not just Jaafar),
  independent of when/whether the Staff role itself ships?
- Sequencing/scope decision for the actual build — not yet made; this entry records the
  investigation only.

### Promoted?

No — investigation only, same Mechanical Gate as every other Capability Investigation in this
project (`architecture-review-loop.md`): no Implementation Contract or build exists yet for this
topic. Revisit once Salman decides scope and a real Implementation Contract is written.

## 2026-08-09 (implementation — Staff Scoped Access, Phases A-D)

### Context

Same day, later: Salman approved the build. Full Implementation Contract written
(`.claudedocs/implementation/STAFF_SCOPED_ACCESS_CONTRACT.md`) and executed as four phases, each
independently real-API/browser-verified before the next started, matching this project's Git
Discipline.

### Discovery

- Every Open Question from the investigation above got resolved with evidence, not assumption:
  "own clients" was built as a derived query (Salman's explicit choice — simplest option, no new
  Customer entity); the missing `require_roles()` gating on `reservations.py`/`catalog.py` was
  closed as part of Phase B (not deferred), independent of Jaafar specifically.
- A real, unplanned Phase D finding: the literal instruction "add STAFF to ROLE_TABS" turned out to
  target dead code — `useAdminRole.js`'s `ROLE_TABS`/`canAccessTab` mechanism is wired only into the
  legacy `SmarAdminDashboard.jsx`, never `GenericAdminDashboard.jsx` (what `rk` actually uses).
  Built an equivalent, parallel nav filter for the real dashboard instead of silently adding to an
  unused object.
- Required Browser Verification caught a real bug Phase D's own code review missed: `barbers.py`/
  `catalog_services.py` had no `STAFF` in their read allow-lists, so Jaafar's Calendar couldn't even
  resolve its own rendering data ("لا يوجد موظفون نشطون" despite 3 real reservations existing).
  Fixed with a narrow read-only grant (write routes untouched), re-verified 11/11.
- The `customers.py`/`prices.py`/`booking_services.py` unauthenticated-routes finding from the
  investigation was flagged again here as explicitly out of scope, never touched — stays open,
  independent of this capability.

### Current Understanding

The 3-tier authorization model (Super Admin / Tenant Owner / Staff-scoped-to-self) is now real,
shipped, and browser-verified end-to-end — not a proposal. `STAFF` is a real `UserRole`, `User.
barberId` is a real link, every reservation/calendar/client-list route enforces ownership
server-side (never trusting a client-supplied `barber_id`), and the dashboard correctly reflects
it. This closes the "real build" half of the investigation's Current Understanding above.

### Open Questions

- `customers.py`/`prices.py`/`booking_services.py`'s missing auth — still open, still not this
  capability's scope.
- Whether "own clients" should ever become a real Customer entity (vs. the derived-query approach
  shipped) — not reopened, no new evidence pushing toward it.

### Promoted?

Yes, in effect — same as Phase 3.7C's own precedent: a real, shipped, browser-verified Capability,
not a proposal. No formal ADR (per this project's Abstraction Rule, correcting/building a real gap
from an investigation isn't automatically ADR-worthy on a first instance). Revisit if a second
independent tenant's real use of `STAFF` roles stresses this model in a way this entry didn't
anticipate.

## 2026-08-09 (correction — the `customers.py`/`prices.py`/`booking_services.py` finding was wrong)

### Context

While planning the Security Closure phase of the 2026-08-31 production roadmap, re-verified the
"zero auth, reachable" claim above (Discovery bullet, and both Open Questions references) before
acting on it, per this project's own Evidence Interrogation standard.

### Discovery

The claim does not hold up. `app/api/v1/admin/__init__.py`'s import line never includes
`customers`, `prices`, `booking_services`, or `listings` — none of the four are ever
`include_router()`-ed, and `app/main.py` only mounts that one `admin_v1_router`. Zero frontend
reference anywhere (`GenericAdminDashboard.jsx`'s "العملاء" nav tab renders `<ComingSoonTab>`,
never calls `/admin/customers`). All four files are confirmed **unreachable** — the original
2026-07-31 `todo_list.md` finding ("none registered... finish wiring or delete") was correct; this
capability's own 2026-08-09 investigation entry re-described the same dead code as a live,
exploitable hole without re-checking router registration first.

### Current Understanding

This was dead/orphaned admin CRUD scaffolding (the "Forgotten" drift category,
`repository-hygiene.md`), not a live vulnerability. Deleted 2026-08-09 as Repository Hygiene, not
a security fix — the distinction matters for the audit trail. Their underlying models (`Customer`,
`Price`) remain live via other, already-secured paths (`customer_repo.py`/`price_repo.py`, used by
`public_service.py`/`admin/units.py`); `BookingService`/admin-side `ListingService` had no other
live consumer at all. Full evidence: `.claudedocs/work/orphaned-admin-routers-cleanup/2026-08-09/`.

### Open Questions

None — this closes the item both prior entries left open.

### Promoted?

N/A — this is a correction to a prior entry's Discovery, not a new capability finding.

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

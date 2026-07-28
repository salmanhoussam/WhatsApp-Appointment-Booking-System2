# Capability Transport Layer — Evolution Log

Accumulating understanding of whether a Capability-specific "shared fetch layer" (today:
`frontend/src/services/catalogApi.js`) is just an ordinary `services/` utility, or an implicit part
of the Capability Contract model (`TOS-003`) that deserves to be named explicitly. See
`.claude/rules/documentation-policy.md`'s "Architecture Evolution Log" section for what this file
is and isn't.

## 2026-07-28

### Current Status
`catalogApi.js` is a small, Catalog-specific module (`fetchCategories`, `fetchItems`, `fetchItem`,
and — as of today's Phase 2 fix, `fetchAllCategories`) sitting between every Catalog-consuming
component and the real public API. It was fixed today (`CAPABILITY_RESOLUTION_PLAN.md` Phase 2)
precisely because it was the one shared place three independent broken consumers all funneled
through — fixing it once fixed all three. It lives in `frontend/src/services/`, per
`feature-structure.md`'s existing convention (a plain `services/` file, no special status).

### Observation
Salman raised this immediately after seeing Phase 2's fix land: the fact that fixing one shared
file corrected three consumers at once wasn't luck — it's because Catalog already has a real,
if informally-named, "transport layer" of its own. `TOS-003`'s Capability Contract model
(Ownership/Contract/Operations/Schema/Admin projection/Public projection/Maturity/Open Findings)
doesn't currently name this as its own required part — it's implicit inside "Public projection,"
described as a route/service pairing, not as a distinct frontend-side transport module a Capability
owns.

### Watch Point
If another Capability — Booking, Media, or a future one — independently grows its own
similarly-shaped file (a small module of `fetchX`/`fetchY` functions between components and the
public API, specific to that one Capability, not a generic cross-cutting utility), that is the
signal worth revisiting: does `TOS-003`'s Contract model need an explicit "Transport Layer" section,
the way it already names Admin/Public projections? Only one real case exists today (Catalog); this
project's own Abstraction Rule (`rules/team-roles.md`) says that's not yet enough to generalize —
recording the question now so it isn't rediscovered from scratch if a second case appears.

### Decision
No action. `catalogApi.js` stays exactly where and what it is — an ordinary `services/` file, not
renamed or reclassified as a new Tenant OS concept.

### Promoted?
No — explicitly a "not now" watch-point, not a proposed change.

## Related

- `.claudedocs/adr/TOS-003-capability-contract-model.md` — the Contract model this watch-point
  would extend, if a second case ever confirms it.
- `.claudedocs/evolution/capability-contracts.md` — the accumulating pattern of Capability write/
  read paths silently diverging; this entry is about the *shape of the fix* (one shared layer,
  fixed once) rather than the divergence itself.
- `.claudedocs/reviews/rk-barber-phase2-catalog-fix-verification.md` — the real fix this
  observation was made while reviewing.

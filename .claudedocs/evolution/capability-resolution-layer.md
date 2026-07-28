# Capability Resolution Layer — Evolution Log

Accumulating understanding of whether `frontend/src/utils/capabilities.js` (the Capability
Resolution Layer named in `.claudedocs/adr/TOS-004-plural-capability-resolution.md` §4.1) stays a
small pair of functions, or eventually needs to become a real registry/resolver object. See
`.claude/rules/documentation-policy.md`'s "Architecture Evolution Log" section for what this file
is and isn't.

## 2026-07-28

### Current Status
`capabilities.js` exports exactly two functions today: `hasCapability(activeServices, key)` and
`hasOrderCapability(activeServices)` — introduced in Phase 1 of `CAPABILITY_RESOLUTION_PLAN.md`,
zero consumers wired yet.

### Observation
Two functions is not a registry, and doesn't need to be treated like one. Salman flagged this
explicitly while reviewing Phase 1: if this file grows into a long list of narrow, capability-named
functions (`hasBooking()`, `hasCatalog()`, `hasMedia()`, `hasOrders()`, `hasProducts()`,
`hasPayments()`, ...) as more consumers migrate in Phases 2-4, that shape — many single-purpose
named checks instead of one general primitive — is the signal worth watching for.

### Watch Point
If the function count keeps growing with each migrated consumer, evaluate collapsing back to the
general `hasCapability(activeServices, key)` primitive (already sufficient for every named-function
case above) versus promoting the file to a real `CapabilityResolver`/`CapabilityRegistry` object —
not adding narrow one-off functions indefinitely. No concrete second case exists yet; this is a
watch-point to revisit once Phases 2-4 have actually added real consumers, not a proposal to build
a registry now.

### Decision
No action. Keep `capabilities.js` exactly as small as its two current functions until real
migration usage says otherwise.

### Promoted?
No — explicitly a "not now" watch-point, not a proposed change.

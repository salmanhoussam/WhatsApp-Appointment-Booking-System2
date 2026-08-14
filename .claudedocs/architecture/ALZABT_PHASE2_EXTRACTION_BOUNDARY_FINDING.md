# Phase 2 — Stopped Before Extraction: a Real Hidden Assumption Found

**Status:** Impact map done, extraction NOT started. Per Salman's explicit instruction — if Phase 2
finds a hidden assumption or non-reusable content inside `_seed_demo_barbershop()`, stop and present
the correct boundary rather than patch it silently. This is that stop.

---

## Impact map — who calls this today

Confirmed, exhaustive: `_seed_demo_barbershop()` is called from exactly one place,
`_seed_demo_catalog()`'s `business_type == "barbershop"` branch, which is itself called from
exactly one place, `create_demo_tenant()` — Demo Builder's own single entrypoint. **No other
caller exists anywhere in the codebase.** Extraction carries zero risk of breaking an unexpected
consumer, unlike Phase 1's repo-function finding.

## What's actually inside `_seed_demo_barbershop()`, read line by line

```
1. barber_name = f"الحلاق الرئيسي — {name_ar}" if name_ar else "الحلاق الرئيسي"
   → create 1 Barber (fixed working hours 09:00-20:00, no closed days)
2. create 1 CatalogCategory ("الخدمات" / "Services")
3. for each of _BARBERSHOP_SEED_SERVICES (a FIXED, hardcoded list of exactly 6 tuples:
   شعر/Haircut, لحية/Beard Trim, شعر ولحية/Haircut&Beard, كرياتين/Keratin, تصفيف/Styling,
   صبغة/Hair Color -- each with a fixed price and duration):
   → create 1 CatalogService
4. → assign every created service to the one barber (BarberService, full cross-assignment)
```

## The real boundary this exposes — structural shape vs. demo-only content

**Genuinely reusable, vertical-general, no Demo-Builder coupling**: the *sequence* — create
Barber(s) → create Category → create Services → cross-assign via BarberService. This shape is real
and correctly belongs in a shared step. Nothing about *this part* is demo-specific.

**NOT reusable — real, hidden Demo-Builder-only content, baked directly into the function body**:

1. **`_BARBERSHOP_SEED_SERVICES`** — a fixed, hardcoded list of exactly 6 placeholder services
   with placeholder prices. This is fine, even correct, for an anonymous demo visitor who hasn't
   told Alzabt anything about their real business yet. It is **not** something a real,
   self-registering business should silently receive verbatim once Phase 3 wires Self-Registration
   to the same step — a real barbershop's actual services (count, names, prices) are exactly the
   kind of thing that belongs to *that business*, not to a shared provisioning capability.
2. **The barber-naming template** (`"الحلاق الرئيسي — {name_ar}"`) — a demo-flavored placeholder
   name ("Chief Barber — {business name}"), not a real staff member's name. Same problem: fine as a
   demo placeholder, wrong as something a shared capability silently produces for a real tenant.
3. **The fixed cardinality itself** ("exactly 1 barber, exactly 6 services") — an implicit
   assumption, not stated anywhere as a deliberate design choice. Whether a shared capability should
   default to "1 barber, N generic placeholder services" for *any* caller that doesn't supply its
   own content, or require every caller to supply real content, is a real decision, not something
   to infer silently.

## Why this can't be extracted "as-is" without creating exactly the coupling this whole arc has been trying to remove

If `_seed_demo_barbershop()` is lifted into a shared `provision_vertical_domain_objects()` unchanged,
the function becomes reusable in name only — its actual behavior stays hardwired to Demo Builder's
own placeholder content. The moment Phase 3 wires Self-Registration to it, every self-registered
Barber tenant would silently get the identical 6 demo services and the identical "الحلاق الرئيسي"
placeholder name as every anonymous demo visitor — not a shared *capability*, a shared *demo
script* wearing a new name. This is the same failure shape this whole session has repeatedly found
and corrected (Ali's real `service_type` bug, the self-registration schema mismatch) — content and
mechanism silently fused together, discovered only once a second real caller exists.

## The correct boundary — proposed, not implemented

The shared step should take the **service list** and the **staff naming** as **parameters**, with
sensible defaults a caller may supply or override — never own fixed content itself:

```
provision_barber_domain(
    client_id: str,
    barber_name: str,                              # caller supplies -- no hardcoded template
    services: list[tuple[name_ar, name_en, duration_min, price]],   # caller supplies
) -> None
```

- **Demo Builder** (Phase 2's own caller, unchanged behavior) passes exactly what
  `_BARBERSHOP_SEED_SERVICES` and the existing naming template already produce today — this is
  what keeps Phase 2's own explicit requirement ("must not change Demo Builder's current
  behavior") true, verifiably, since the caller-side code that used to be *inside* the seeder now
  just supplies the same values as arguments.
- **Self-Registration** (Phase 3, not this round) can pass either the same placeholder defaults
  (if a real business hasn't specified its own services yet — a legitimate, honest "start
  from example content" experience) or real, business-specific content, once that input exists —
  a decision Phase 3 gets to make deliberately, not one Phase 2 forces on it by hardcoding the demo
  content into the shared layer.

This is a real design decision, not a mechanical extraction — which is exactly why it's being
presented here rather than assumed and coded silently.

---

## What is needed to proceed

A confirmation, not a code review: does this parameterized shape match what Salman wants
`provision_barber_domain()`'s own contract to look like, or should the default demo content live
inside the shared function itself (with an optional override), rather than being required as an
argument every caller must supply? Both are real, defensible choices with different trade-offs
(explicit-always vs. sensible-default-with-override) — not decided here, per instruction.

Nothing has been extracted or moved. `demo_service.py` is byte-identical to its Phase-1 state.

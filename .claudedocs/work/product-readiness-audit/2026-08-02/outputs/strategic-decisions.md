# Strategic Decisions — a log, not new content

Every item here already has a real home with full reasoning — this file just collects the pointers so
they're findable in one place after the Product Readiness Audit closes out.

## Multi-Staff Scheduling

`hr` has two chairs, two people working simultaneously — a real, confirmed tenant requirement, not
hypothetical. Resolved product question: book the **Staff Member**, not the chair — maps directly
onto the existing `Barber` model. Full reasoning + Salman's verbatim quote:
`.claudedocs/work/capability-reference-extraction/2026-08-02/reservation.md`'s "Product Note" section.

## Owner-First Framing

Standing design principle: before designing any screen, ask how the business owner thinks the moment
they open it — not how to lay it out. Four worked examples (Overview/Calendar/Products/Orders). Full
detail: `feedback_owner_first_framing` in memory.

## Reservation ↔ Catalog Bridge

The real missing link behind every 🔴 verdict on `hr`'s Services/Reservations pages: no shared
identifier exists between `CatalogItem` and `Reservation` today, so a catalog "service" item has no
way to point at the booking system. Named as Missing Capability, not yet built. Full detail:
`.claudedocs/work/capability-reference-extraction/2026-08-02/reservation.md`.

## "Resource / Staff Scheduling" as the general Capability name

Naming insight, not yet executed: the real underlying Capability isn't "Barber," it's "Resource /
Staff Scheduling" — Clinic uses `Resource`, Barber uses `Barber`, both already real and deliberately
not merged (per `feedback_build_twice_before_abstracting`). Recorded so the vocabulary is ready if a
real third case (Spa, Gym) ever shows up — not a trigger to merge anything now. Same file as above.

## Not a strategic decision, kept separate

The Pilot scope question (Retail vs. Reservation Pilot for `hr`) is a live, unresolved business
decision, not a settled log entry — see `pilot-decision.md`.

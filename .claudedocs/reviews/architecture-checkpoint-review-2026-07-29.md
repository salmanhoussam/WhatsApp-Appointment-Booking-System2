# Architecture Checkpoint Review — Post-Sprint 3 — 2026-07-29

Strategic review only — no implementation. Re-grounded against real current repo state (git log,
Evolution Log file list, ADR list, Maturity ledgers, reviews/ — all re-checked directly, not
recalled) before answering. Six questions, answered in order, each citing real evidence from this
session's own work: ADR-0003/ADR-0004, `SCHEMA_ARCHITECTURE_REVIEW.md`, the Evolution Log, and RK
Barber's full arc.

---

## 1. What is the current architectural bottleneck?

**Not a single Capability — a missing enforcement mechanism.** Every real violation of "One
Capability, One Service" found this session was caught by *manual investigation after the fact*,
never prevented up front. The count is no longer anecdotal:

- `client_service.py` built, never wired, `settings.py` used its own path instead (Sprint 3).
- `admin/units.py` and `admin/services.py` each define their own local schema instead of the
  shared one in `app/schemas/` (`SCHEMA_ARCHITECTURE_REVIEW.md`, Appendix F6) — a **third**
  confirmed instance of the identical shape.
- `admin/restaurant.py`/`admin/store.py` bypass `catalog_service.py` entirely (`catalog.md`'s Open
  Findings, re-confirmed twice this session).
- Two parallel `GalleryImage` write paths with different payload shapes (Appendix B4).
- The Service-type taxonomy: **4 independent lists that actively disagree today** (Appendix F1) —
  the single most fragmented finding in the whole Schema Review.

Five distinct manifestations of the same root cause, found across two unrelated investigations in
one week. The bottleneck isn't Catalog, or Booking, or any one Capability — it's that this project
has no way to *notice* a second write path or a shadow schema before a real investigation happens
to go looking. ADR-0004 gives future concepts a place to land; it doesn't yet stop a route file
from quietly building its own parallel path today.

## 2. Which capability or subsystem should become the next priority?

**Catalog's Admin bypass** — not a new investigation, an already-named, already-evidenced
Implementation Contract waiting to be scheduled (`catalog.md`'s Open Findings: "left for a future
Implementation Contract to close, one canonical write path for all three routes"). Reasons, in
order of weight:
- It's the concrete, bounded instance of bottleneck #1 above — closing it is a real test of whether
  the enforcement gap can be closed for one Capability, before trying to close it everywhere at
  once.
- It's currently the platform's lowest-rated real Capability alongside Booking (★★☆☆☆, Schema
  Review) — and unlike Booking's issues (mostly dead/unreachable code, lower urgency), Catalog's
  bypass affects two *live* tenants (`caracas`, `arizona`) serving real traffic today.
- It directly unblocks the Restaurant Capability Investigation's own stated Decision 1
  (`.claudedocs/work/restaurant-capability-investigation/2026-07-29/investigation.md`) — Restaurant
  cannot cleanly join the Capability Architecture while its own routes still bypass the canonical
  Service.
- It has a proven template to follow: Site Configuration Sprint 3 Phase 2 (this same session) is
  the exact shape of fix needed (delete/redirect the bypass, consolidate into the one Service, verify
  end-to-end) — this isn't a new kind of work, it's a repeat of a just-proven pattern.

## 3. Which patterns have repeated enough to deserve promotion — and which should stay in the Evolution Log?

**Ready for promotion — Service-type taxonomy → a real ADR (canonical Service-Key Registry).**
`evolution/platform-services-catalog.md` logged this 2026-07-27 as "sitting disconnected... not yet
promoted to an ADR." This session's Schema Review re-measured it independently and found it *worse*
than first logged — not 2-3 lists loosely disagreeing, but 4 lists with concrete, enumerated
disagreements (`SERVICE_TYPE_MAP` vs. `service-system.md` vs. `ACTIVATABLE_KEYS` vs.
`registration_service.py`'s own mapping). Two independent measurements, both real, both confirming
drift rather than agreement — this clears the Abstraction Rule's own bar. **Recommendation, not a
decision**: this is ready to become ADR-0005 whenever Salman wants to schedule it — small in scope,
high leverage, blocks nothing else.

**Ready for promotion — the schema-shadowing pattern → a stated Principle**, not necessarily a
full ADR. Three confirmed instances now (`client_service.py`, Units, Services) is the same
threshold TOS-004 was ratified on. Unlike Service-types, this doesn't need new infrastructure — it
needs one sentence added to `rules/backend/architecture.md` or `rules/team-roles.md`: an admin
route may never define its own local schema for a field a Capability's shared schema already owns.
**Recommendation**: cheaper than an ADR, same evidentiary bar already met.

**Correctly still in the Evolution Log, not ready**: ADR-0004's own Owner → Capability →
Persistence vocabulary (`capability-contract-template.md`) — zero real adoption cases yet, explicitly
a watch-point per Salman's own words. `Unit.content_blocks` — one real instance only, no second
case found anywhere else yet; naming it (done, in ADR-0004) is correct, promoting a fix-pattern for
it is not yet warranted.

## 4. Over-engineered vs. under-engineered?

**Under-engineered, concretely**: Payments (no Capability at all, cash-only by a 2026-07-20
decision) — the dead admin CRUD scaffolding for Customer/Price/BookingService/Listing, which reads
as abandoned mid-build rather than deliberately deferred (no decision document says "not building
this yet," they're just unregistered and unfinished) — `Unit`'s content model, bolted onto Booking
rather than integrated with Content's real model — Booking's schema surface overall, which has
more dead/unreachable code than any other Capability's (`SCHEMA_ARCHITECTURE_REVIEW.md`, Booking
section).

**Over-engineered — a real, self-aware observation, not a criticism of any single file**: the
documentation/process apparatus itself has grown substantially in one week — Investigation
Protocol, Service Execution Constitution, Repository Hygiene, Architecture Review Loop (plus its
own 3-gap self-correction), Evidence Interrogation, a `maturity/` ledger system, Capability
Isolation checks, now 4 platform ADRs and 4 TOS ADRs. Each piece was justified in the moment it was
built and each has already caught something real (the Architecture Review Loop's own self-review
found 3 real gaps in itself). But the sheer count is worth naming: for a single-owner project, this
is a lot of standing process to keep coherent, and the honest test is whether it's still all
getting *used* (the Maturity ledgers, for instance, have 4 of 6 files still template-only,
untouched since creation) rather than just accumulating.

## 5. Recommended sequence for the next 2-3 weeks, and why

1. **Close Catalog's Admin bypass** (Q2's answer) — bounded, proven template, affects live
   tenants, unblocks Restaurant.
2. **Consolidate the Service-type taxonomy** (Q3) — small, high-leverage, already flagged twice
   independently; doing it right after #1 means Catalog's own consolidation work can use the
   now-canonical list instead of picking one of the 4 disagreeing ones by accident.
3. **Decide (not necessarily execute) the fate of the dead admin scaffolding** — Customer, Price,
   BookingService, Listing, `public.py`. This is cheap: for each, one real decision — finish wiring
   it, or delete it — removes real landmines (`listings.py` would `ImportError` if anyone ever
   registered it as-is) before more work gets built near them.
4. **Only then, Restaurant's real Capability Rollout** — per the Restaurant Investigation's own
   named Decisions Required, now genuinely unblocked by #1.
5. **Payments Investigation** (ADR-0004's named gap) — can run in parallel with #4 rather than
   after it, since it has no dependency on Catalog's cleanup — a real Integration Capability,
   independent of the Booking/Catalog work above.

Ordering logic: fix the two things everything else depends on first (#1, #2), clear cheap real
risk before it compounds (#3), then start the two genuinely new pieces of work (#4, #5) on a clean
foundation instead of a fractured one.

## 6. Which known debts should intentionally remain unpaid for now?

- **Hero Copy legacy duplicate** (`config.hero.*` vs. `content.sections[hero]`) — already
  explicitly deferred by Salman's own Decision 2 this session; no new evidence changes that.
- **`ConfigurableHero.jsx`'s phantom `hero_image_url`/`cover_url` reference** — same, still
  Content's own future call, not urgent.
- **`Unit.content_blocks`'s migration into Content's real model** — named in ADR-0004, but only
  one real instance exists; per this project's own Abstraction Rule, migrating it now would be
  fixing on one case rather than a confirmed pattern.
- **Reservation's ad hoc case-conversion** — fine today, single Capability uses it; formalize only
  once a second Capability needs the identical shape (already stated in the Schema Review itself).
- **The `ReplaceMedia` Processing Pipeline for beit-al-fakhar's frame-sequence Hero** — still
  manual `ffmpeg`, long-standing, no new tenant currently demanding automation.
- **Reservation's `moduleKey: "restaurant"` shape** — schema-ready, deliberately unexercised,
  pending Salman's own Decision 2 from the Restaurant Investigation (which tenant pilots it, if
  any) — correctly stays unbuilt until that's decided, not before.

## Related

- `.claudedocs/adr/ADR-0004.md`, `SCHEMA_ARCHITECTURE_REVIEW.md` — the evidence base for Q1, Q3,
  Q4.
- `.claudedocs/work/restaurant-capability-investigation/2026-07-29/investigation.md` — Q2, Q5's
  Restaurant dependency.
- `.claudedocs/evolution/platform-services-catalog.md` — Q3's Service-type promotion candidate.

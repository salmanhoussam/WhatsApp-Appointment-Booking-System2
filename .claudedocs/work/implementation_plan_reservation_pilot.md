# Implementation Plan — Reservation Pilot (hr / RK Barber Shop)

**Status: Approved — Execution beginning with the P0 Gate.** Project moved out of Investigation Only
(`.claudedocs/work/product-readiness-audit/2026-08-02/`) per Salman's confirmed decision in
`outputs/pilot-decision.md`, and this plan itself is now approved — see Approval Gates at the end.

This plan reuses documented architecture only. Every component below is either already real (cited
file:line) or was already named as Missing Capability / Target Architecture in
`.claudedocs/work/capability-reference-extraction/2026-08-02/reservation.md` — nothing here is a new
concept invented for this plan.

---

## Dependencies & Prerequisites

- **P0 Gate must close first** (below) — no reservation work touches multi-tenant data before it does.
- A real `Barber` record for `hr` must exist (today there is none — the `Barber`/`Reservation` system
  was only ever tested against a disposable `barberlab-test` tenant). Creating one ("Hassan") is a
  data prerequisite for Phase 2 testing, not a code task.
- `hr`'s real catalog items (`الشعر`/`قصة`/`كرياتين`) need real `durationMin` values set — today all
  three are priced identically at $5 with no duration, per
  `dashboard-calibration/2026-08-02/phase1-2-evaluation.md`.

**Reused, not rebuilt:**
- `Reservation` / `Barber` / `Resource` models — already real, `prisma/schema.prisma:675-728`.
- Per-barber conflict-checking logic — already real, `app/services/reservation_service.py:120-138,200-205`.
- Server-fired WhatsApp confirmation pattern — already real and proven on `smar`,
  `app/services/public_service.py:499-510` (fires immediately on booking creation, not a client-only
  `wa.me` link).
- Slot-generation *concept* (not code) — proven shape only, from this repo's own ancestor
  (`new-matirial/old servers/WhatsApp-Appointment-Booking-System-main.zip`'s `booking_engine.py`):
  respects working hours, service duration, and existing bookings.

---

## Priority 0 Gate — Tenant Isolation — ✅ CLOSED 2026-08-02

Confirmed, unresolved bug from the Technical Audit
(`.claudedocs/work/product-readiness-audit/2026-08-02/outputs/blocking-bugs.md`, item 4): a stale
`client_slug` request fires on admin login, scoped to whichever tenant was tested immediately prior —
confirmed independently twice (`footlab`→stale `hr`, `smar`→stale `footlab`). Not traced to a
file/line yet.

1. **Investigate** the real cause (likely candidates: `ActionInbox.jsx`, `admin.config.js`'s slug
   resolution timing — a race condition, not a hardcoded value, per the evidence already gathered).
2. **Fix** it.
3. **Re-verify tenant isolation broadly** — not just this one bug. A fresh multi-tenancy sweep (same
   shape as `cyber-sentinel`'s T1 threat class: every reservation-related query filtered by
   `clientId`, no exceptions) before any Reservation Pilot code is written, since this Pilot is about
   to introduce new cross-tenant-sensitive surfaces (staff lists, availability, bookings).

**Done when**: the stale-slug request no longer reproduces across at least two real tenant switches
in the same browser session, and a fresh multi-tenancy grep-and-check sweep of reservation-adjacent
queries comes back clean — with real evidence, not "should be fixed now."

**Closed, with real evidence:**
- **Root cause found**: `ProtectedRoute.jsx` only checked "does *any* token exist" — never that the
  token's own tenant matched the route being rendered. `tenant.config.js`'s `getTenantSlug()`
  resolves the admin-route slug from the stored JWT's `slug` claim, so a leftover JWT from the
  previously-tested tenant could render a different tenant's protected route and let its
  components fire real requests before anything caught the mismatch.
- **Fixed**: `ProtectedRoute.jsx` now compares the route's own `:slug` param (present on every
  affected admin route: `/dashboard/:slug/*`, `/:slug/dashboard/*`, `/:slug/admin/*`) against the
  stored JWT's `slug` claim; on mismatch, clears the token and redirects to `/login` before
  `children` ever renders.
- **Re-verified live**: logged in as `hr`, then navigated directly to `/dashboard/footlab/units`
  without logging out. Real evidence: redirected to `/login` client-side *before any API request
  fired* (zero requests in that window, confirmed via `browser_network_requests`), stale token
  cleared from `localStorage`, zero `client_slug=hr` requests anywhere in the trace.
- **Broader sweep**: `reservation_repo.py`, `barber_repo.py`, `resource_repo.py` read manually —
  every read query filters by `clientId`; the two `update_*` calls that don't filter by `clientId`
  in their own `where` are protected upstream in `app/api/v1/admin/{barbers,resources}.py` by a
  real `find_barber`/`find_resource` tenant-scoped lookup before the update ever runs (verify-then-
  write, not filter-on-write, but equally safe). No new isolation issue found.
- **Side finding, unrelated, not fixed**: one transient `500` on `GET /api/v1/admin/settings?
  client_slug=hr` during re-verification, traced in the backend log to the same known intermittent
  Supabase pooler flakiness this project has hit before (`Can't reach database server at
  aws-1-ap-southeast-2.pooler.supabase.com:6543`) — resolved on its own by the next request, not a
  code bug, not blocking.

**Phase 0.5 may now begin.**

---

## Implementation Phases

### Phase 0.5 — Capability Mapping — ✅ DONE 2026-08-02, real code read, not inferred

Scope kept deliberately narrow per Salman's explicit instruction: **one question only** — how does
data flow from first click to a created reservation — answered against the real
`reservation_service.py` pipeline, not product-design speculation (no packages, no Spa/Rooms, no
multi-staff redesign — those stay out, logged in `strategic-decisions.md` if they come up again).

**The real, confirmed pipeline** (`reservation_service.py:150-260`, the code's own docstring names
it exactly this way): **Validate → Resolve Resource → Resolve Barber → Working Hours → Conflict
Check → Create → Post Actions.**

```
CatalogItem  (existing — no relation to Reservation at all today, confirmed by reading the model)
      │  ← still needs a bridge (see Q7 below — genuinely open)
      ▼
create_reservation()  (existing — app/services/reservation_service.py:169)
      │  ├─ _resolve_barber()   (existing, line 120 — requires a real barber_id already
      │  │                       chosen by the caller; only runs when module_key == "barber")
      │  ├─ _check_working_hours()  (existing, line 80 — reads Barber.workingHours)
      │  └─ find_overlapping_by_barber()  (existing, reservation_repo.py — real conflict check)
      ▼
repo.create(create_data)   (existing, line 235 — a real Reservation row: clientId, moduleKey="barber",
      │                      customerName/Phone, reservedAt, durationMin, barberId, status="pending")
      ▼
Post Actions   (existing stage, confirmed EMPTY — the code's own comment: "No-op today for every
      │         module_key... no notification call anywhere in this path". Phase 4 fills this.)
      ▼
Calendar (ReservationsWeekCalendar.jsx — already renders real Reservation rows for hr today,
           confirmed via Browser Verification, 2026-08-01 — just has no staff-column yet, Phase 3)
```

**The eight questions, answered against real code:**

1. **Where does the service come from?** — Nowhere yet. `CatalogItem` has zero relation to
   `Reservation` in the schema — confirmed by reading the full model (relations listed: `client`,
   `category`, `galleryImages`, `restaurantOrderItems`, `storeCartItems`, `storeOrderItems` — no
   `reservations`). This is Q7 below, still genuinely open.
2. **Where does service duration come from?** — **Confirmed: nowhere structured.** `CatalogItem` has
   no duration column — only `metadata` (`Json?`, comment: *"Module-specific extra fields (duration,
   unit, sku, weight, etc.)"*). Same loose-bag pattern already flagged as a real gap for Store's
   variants/discounts. `Reservation.durationMin` (a real, typed column) is the only place duration
   is structured today — Phase 1's bridge must decide whether to read duration from `CatalogItem
   .metadata.duration` (matches the existing convention) or require it be set explicitly at booking
   time.
3. **How is staff selected?** — **Confirmed: the caller must already know the barber.**
   `_resolve_barber()` takes a `barber_id` from `metadata`, validates it belongs to the tenant and
   is active — there is no "list barbers who can do X" resolution anywhere. For v1 (one staff
   member) this is moot; recorded as a deliberate simplification, same as Salman's Q6 in the
   original framing.
4. **How are slots generated?** — **Confirmed: they aren't, yet.** Only single-time *validation*
   exists (`_check_working_hours`, `find_overlapping_by_barber`) — no function iterates candidate
   times and returns a list of open ones. This is Phase 1's one real piece of new logic — and it
   reuses the two validators above rather than reinventing them.
5. **How is conflict prevented?** — **Already real, already proven, unchanged scope.**
   `find_overlapping_by_barber()` (`reservation_repo.py`) + `_has_conflict()`, called from the real
   pipeline above.
6. **How is the Reservation created?** — **Already real.** `repo.create(create_data)` at
   `reservation_service.py:235` — confirmed fields listed in the diagram above. For `hr`, callers
   must pass `module_key="barber"` specifically (not `"services"`) to hit this real FK-backed path
   instead of the legacy metadata-string-matching branch.
7. **How does it reach the Calendar?** — **Already real for `hr` today.**
   `ReservationsWeekCalendar.jsx` already renders real `Reservation` rows with real customer
   names/times (confirmed via Browser Verification, 2026-08-01, before this Pilot was even decided)
   — it just has no staff-column dimension yet, which is Phase 3's job, not a data-flow gap.
8. **How does WhatsApp fire?** — **Confirmed: it doesn't, anywhere in this path.** Grepped
   `reservation_service.py` for "whatsapp" — zero matches. The pipeline's own "Post Actions" stage
   is a confirmed no-op. This is entirely Phase 4's job — no partial version exists to build on for
   this specific model (unlike `smar`'s separate `public_service.py`, which does have a working
   pattern to copy the *shape* of).

**Genuinely open — the one real decision left, not resolved here on purpose**: the `CatalogItem` ↔
`Reservation` bridge (Q1/Q7 above). Two real candidates, unchanged from the original framing: (a) a
`requires_booking` marker + duration on `CatalogItem.metadata` (consistent with the existing loose-
metadata convention), or (b) a separate lightweight mapping row. This is a real design choice, not
decided in this planning pass — it's Phase 1's first concrete task.

**Done — every question above has a real, code-cited answer, not "TBD." No packages/Spa/Rooms/
multi-staff-redesign discussion happened in this pass, per Salman's explicit scope instruction.**

### Phase 0.6 — Data Walkthrough (one linear trace, before any API is written)

Not implementation, not design, not a new Capability — one walkthrough of the data itself, so
Backend, Frontend, and bo-hussein are all looking at the same flow before the first line of code.

```
Customer
   │ chooses
   ▼
Catalog Service (Haircut)
   │ resolves to
   ▼
Reservation Service
   │ asks
   ▼
Availability Engine
   │ returns
   ▼
Available Slots
   │ customer selects
   ▼
Staff + Time
   │ creates
   ▼
Reservation
   │ triggers
   ▼
WhatsApp Confirmation
   │ appears in
   ▼
Calendar
```

| Step | Input | Output | Owner (real, code-cited) |
|---|---|---|---|
| Customer selects a service | Browsing `hr`'s service catalog | Selected `CatalogItem.id` | Frontend (Service Picker, new — Phase 2) |
| Catalog Service resolves | `CatalogItem.id` | Duration (from `.metadata`, per Q2) + Price | Catalog — existing `CatalogItem` model, no reservation link yet (Q7, open) |
| Customer selects staff | List of active `hr` barbers | Chosen `barber_id` | Frontend (Staff Picker, new) + `barber_repo.list_barbers()` (existing) |
| Availability Engine | `barber_id` + date + duration | Free Slots | **New — Phase 1's one real gap**, built on the existing `_check_working_hours()` + `find_overlapping_by_barber()` |
| Customer selects a slot | Free Slots list | Chosen date/time | Frontend (Calendar step, new — Phase 2) |
| Reservation created | `barber_id` + slot + `service_id` + customer info | A real `Reservation` row (`status="pending"`) | `create_reservation()` — **existing**, `reservation_service.py:169-238` |
| WhatsApp Confirmation | The new `Reservation` row | Outbound WhatsApp message sent | **New — confirmed empty today** ("Post Actions" stage, `reservation_service.py:240`) — Phase 4 |
| Appears in Calendar | The `Reservation` row (real DB state) | Rendered block on the admin Calendar | `ReservationsWeekCalendar.jsx` — **existing**, confirmed working for `hr` 2026-08-01; staff-column display is Phase 3 |

**Done — table confirmed against Phase 0.5's real, code-cited answers.** Three steps are genuinely
new (Availability Engine, WhatsApp trigger, the two frontend pickers) — everything else already
exists and works; this table makes that split explicit rather than treating the whole flow as
unbuilt.

### Phase 1 — Backend Foundation — ✅ DONE 2026-08-02, all three sub-phases verified

**1a — Real `Barber` record for `hr`.** Created via the existing `POST /api/v1/admin/barbers/`
endpoint (no new code) — "Hassan," `workingHours: {open_time: "09:00", close_time: "18:00",
closed_days: []}`. **Placeholder values, not confirmed real business hours** — flagged explicitly,
needs real merchant confirmation later, not silently treated as fact. Verified via a fresh
`GET /barbers/` call, real evidence: `id: f64ce71e-682c-4f3c-b17d-5fc48e0adaf5`.

**1b — `CatalogItem` ↔ `Reservation` bridge.** Candidate (a) chosen — `requires_booking: true` +
`duration_min` written into `CatalogItem.metadata` for `hr`'s 3 real services (الشعر 20min, قصة
30min, كرياتين 90min — durations are reasonable placeholders, not merchant-confirmed, same caveat
as working hours). Verified via a fresh `GET /catalog/items` call, real evidence: all 3 items show
the correct metadata.
- **Real bug found and fixed along the way**: `catalog_service.py`'s `admin_update_item()` passed
  `metadata` as a raw `dict` to Prisma instead of wrapping it in `Json(...)` — every PATCH with a
  real metadata value 500'd. Same class of bug already fixed once before in
  `reservation_service.py`'s `create_reservation()`. One-line fix, re-verified: all 3 PATCH calls
  then succeeded.

**1c — Availability/slot-generation engine.** New `reservation_service.get_available_slots()` +
`GET /api/v1/public/reservations/availability` (thin route, `?client_slug=`+`barber_id`+`date`+
`duration_min`). Generates candidates in `slot_step_min` (30min) increments across the barber's real
working hours, filtered through the already-existing `_check_working_hours()` and conflict-checking
— no new validation logic, only generation.
- **Real bug #1, found and fixed**: the first version queried the DB once per candidate slot (up to
  ~18 sequential round-trips) — real-world too slow under any DB latency. Fixed by adding
  `ReservationRepository.find_by_barber_on_date()` (one query for the whole day) and checking
  conflicts in memory instead.
- **Real bug #2, found and fixed**: candidate datetimes were built timezone-naive while
  `Reservation.reservedAt` comes back timezone-aware from the DB — real error hit live: `"can't
  compare offset-naive and offset-aware datetimes"`. Fixed by making every constructed datetime
  UTC-aware, matching `_check_working_hours()`'s own documented assumption.
- **Real, full verification, three cases, all with a manually-computed expected answer**:
  1. Empty calendar, 2026-08-03, 30min duration → **18/18 slots**, 09:00 through 17:30 exactly.
  2. A real test reservation created at 11:00 (30min) → **17 slots**, `11:00` specifically excluded,
     `10:30`/`11:30` correctly still open (no buffer time, per the v1 scope lock).
  3. Test reservation cancelled → **back to 18/18**, confirming cancelled bookings don't block slots.
  4. Test reservation cleaned up afterward (`status: cancelled`, same convention as every other test
     order/booking this project creates during verification).

**Environmental note, not a code issue**: this phase's verification was repeatedly interrupted by
the same intermittent Supabase pooler connectivity this project has hit before — confirmed via raw
TCP checks (general internet fine, pooler-specific TCP failing, then recovering) — resolved by
waiting and retrying each time, never by changing code to work around it.

### Phase 2 — Customer-Facing Frontend — ✅ DONE 2026-08-02, real end-to-end reservation created

Built as **one wizard, not four routed pages** (Salman's explicit direction) —
`frontend/src/pages/generic/normal/ReservePage.jsx` now renders a single card that swaps its inner
step (Service → Staff → Slot → Confirm → Success) via `AnimatePresence`, never a route change. Data
layer split into a new shared hook, `frontend/src/hooks/useReservationWizard.js`, matching this
project's existing `useCatalog.js` sibling pattern — the wizard consumes only the existing Phase 1
APIs (`GET /reservations/barbers`, `GET /reservations/availability`, `POST /reservations/`); no slot
or conflict math exists anywhere in the frontend.

**Real architectural finding, handled before writing any wizard code**: `ReservePage.jsx` is a
*shared generic page*, rendered for every auto-onboarded tenant via `_dynamic.routes.jsx`'s
`/reserve` route — not `hr`-specific. Replacing it outright would have silently broken any other
generic tenant using the old blind date/time form (restaurant table reservations, etc.), which is
explicitly outside this Pilot's scope. Fixed by real-data mode detection, not a hardcoded slug: the
page fetches `GET /reservations/barbers` first — if real `Barber` rows exist, it renders the new
Wizard; if not, it falls back to the original form (`LegacyReserveForm`, kept byte-for-byte
unchanged) untouched. No other tenant's behavior changed.

**Real bug found and fixed during verification** (not a frontend bug — a Phase 1 gap surfacing
here): the availability engine (`get_available_slots()`, Phase 1c) generated candidate slots across
the barber's full working hours with no filter against the current time — for *today*, it happily
offered slots already in the past (e.g. `09:00` when the real server time was `11:24 UTC`), which
`create_reservation()`'s own "cannot reserve a past time" guard then correctly rejected with a real
`400`. First real Browser Verification run reproduced this exactly: steps 1–12 passed, step 13
(submit) failed with a visible error banner, confirmed via the real POST body and console error, not
inferred. **Fixed** by adding a `candidate < now` skip in `get_available_slots()`
(`app/services/reservation_service.py`) — same file, does not touch `create_reservation()`'s own
logic. **Re-verified**: a fresh curl against `/availability` at `11:26 UTC` returned `11:30` as the
first slot, no earlier ones; a full second Browser Verification pass then completed the entire flow,
real reservation `c237bf16-6310-48c5-8138-568f7cbcc620` created (`POST` → `200`, body captured).

**Side finding, investigated, not a bug**: the first Browser Verification run's `GET
/reservations/barbers` call returned a real `500` before a second identical call (React StrictMode's
dev-mode double-effect, not app retry logic) succeeded — traced directly in the backend log
(`backend12.log`) to the exact same intermittent Supabase pooler connectivity this project has hit
repeatedly all session (`prisma.errors.DataError: Can't reach database server at
aws-1-...pooler.supabase.com:6543`), not a bug in this Phase's own code. No fix applied, per this
project's standing practice for this specific environmental issue.

**Product review, 2026-08-02 — Salman's verdict: 🟡 Improve, redesigned same day.** The 4-step
wizard was confirmed functionally correct (see above) but judged the wrong presentation for a real
barbershop owner's daily use: too many discrete steps, and a name/phone form that adds friction a
Pilot doesn't need. Redesigned per his explicit spec into a **single screen**
(`useReservationWizard.js` renamed to `useReservationBooking.js`, `ReservePage.jsx` rewritten):
service and staff as always-visible pill selectors (pre-selected by default, not empty first-click
targets), a real 7-day calendar strip below them, a time-slot grid for the selected day, a live
booking summary, and one action: **"تأكيد عبر واتساب"**. The name/phone form is gone entirely for
this flow — confirmation happens over WhatsApp instead.

**Explicit sequencing requirement, honored exactly**: Salman flagged a real correctness risk if
WhatsApp opened before the slot was held — a customer could pick a time, open WhatsApp, never send,
and the calendar would still show it free (or worse, two customers could race the same slot). Fixed
by sequencing `confirmViaWhatsApp()` to **create the Reservation (`status: pending`) first**, via the
same `POST /reservations/` used by the original wizard, and only then `window.open()` the WhatsApp
deep link — never the reverse. Since `customerName`/`customerPhone` are non-nullable DB columns
(`prisma/schema.prisma:681-682`) and this flow collects neither, both are set to a clearly-marked
placeholder (`"زبون واتساب"` / `"عبر واتساب"`); the shop owner reconciles the real customer against
the incoming WhatsApp message by hand — an explicit, named tradeoff, not a silent gap.

**Re-verified end-to-end with a fresh Browser Verification pass** (home page → click Book → single
screen confirmed, no step indicator → staff pre-selected, service pill list populated → picked a
non-default day and slot → summary updated live → clicked "تأكيد عبر واتساب" → a second browser tab
opened to a real WhatsApp deep link carrying the exact expected message → original tab showed an
inline "تم إنشاء حجزك" confirmation, not a wizard step → POST confirmed `200` with a real reservation
id). Two apparent anomalies were investigated and both traced to already-known causes, not new bugs:
a several-second delay before the service pills populated, and a slow (~7.9s) POST, both correlate
with the same recurring Supabase pooler flakiness (identical traceback signature already documented
above); and the opened tab's final URL resolving to `api.whatsapp.com/send/...` instead of `wa.me/...`
is `wa.me`'s own standard server-side redirect behavior, not a link-construction bug — the decoded
message text matched exactly what was constructed.

**Status: implemented and technically re-verified; awaiting Salman's own hands-on test in his
browser before this phase is called complete**, per his explicit request to run the full local stack,
leave it running, and give the final ✅/🟡/🔴 verdict himself rather than from an agent's report alone.

**Done-when checklist, verified with real evidence, not assumed**:
- [x] User selects a real service (`الشعر`, 20min/$5) — not a generic date/time form.
- [x] Only `hr`'s real active barber(s) appear (`Hassan`).
- [x] Only genuinely available times appear — respecting working hours, existing bookings
      (Phase 1c's own conflict logic, unchanged), and now also the current time.
- [x] The flow reaches a real confirmation screen with a real reservation ID, no WhatsApp step
      (correctly deferred to Phase 4, per scope).
- [x] Every other generic tenant's existing `/reserve` form is provably unaffected (mode-detected
      fallback, code unchanged).

### Phase 3 — Admin-Facing Frontend
- Calendar redesign exactly per `dashboard-calibration/2026-08-02/phase2-5-dashboard-vision.md`'s
  wireframe — staff-column-aware from the start (one column, "Hassan," today; extensible without
  restructuring later).
- Services card redesign (icon + name + duration + price + Active status), replacing the flat list —
  same wireframe document.
- Reservation blocks show service + duration + staff, fixing the confirmed gap from the Phase 1+2
  evaluation.

**Done when**: a real booking made in Phase 2 appears correctly on the admin Calendar, in the right
staff column, showing service + duration + staff on the block itself — not just a name.

### Phase 4 — WhatsApp Confirmation Integration
- Wire Phase 2's Confirmation step to the real server-fired pattern (`public_service.py:499-510`'s
  shape) — not a client-only `wa.me` link, matching `smar`'s already-proven approach rather than
  `footlab`/`caracas`'s weaker client-side-only pattern.

**Done when**: completing Phase 2's Confirmation step fires a real, verifiable outbound WhatsApp
message server-side, with no client-side action (no button the customer has to separately click to
"send") required to trigger it.

### Phase 5 — End-to-End Verification
- Full real Browser Verification pass (Playwright MCP, same method used throughout this project):
  complete customer journey (pick service → pick staff → pick a real available slot → confirm →
  WhatsApp fires) and the admin Calendar reflecting it correctly.
- Re-verify tenant isolation once more, post-implementation — not just the Phase 0 pre-check.

**Done when**: one real, unbroken pass through the entire loop succeeds with real Browser
Verification evidence (not assumed), and a fresh tenant-isolation check comes back clean.

---

## Explicitly Out of Scope for v1

Salman's own instruction, kept verbatim as a scope guard against creep during Phases 1–5: the first
version is exactly six steps — select service, select barber, select time, confirm, send WhatsApp,
appear in Calendar. Nothing else. Specifically **not** in this build:

- ❌ Loyalty points
- ❌ Advanced notifications
- ❌ Analytics
- ❌ POS
- ❌ Electronic payments

If any of these get suggested mid-implementation, they go into `strategic-decisions.md` or
`.claudedocs/todo_list.md` as a future item — they do not get quietly folded into this Pilot's scope.

---

## Verification Steps (per phase)

Every phase closes with real evidence, not "done" alone, per this project's Investigation Protocol —
Browser Verification Capability re-used at each boundary:
- Phase 0: real evidence the stale-slug bug no longer reproduces, across at least two tenant
  switches, plus a real multi-tenancy grep-and-check sweep.
- Phase 0.5: the data-flow diagram + written confirmation itself is the evidence — no gap left
  unnamed before Phase 1 starts.
- Phase 0.6: the Input/Output/Owner table itself is the evidence — confirmed accurate, not just drafted.
- Phase 1: backend-only — real API calls proving conflict-checking and availability computation work
  against `hr`'s real (new) `Barber`/`WorkingHours` data.
- Phase 2: real browser walkthrough of all four customer-facing steps, screenshots + DOM evidence.
- Phase 3: real browser walkthrough of the redesigned admin Calendar/Services views.
- Phase 4: a real WhatsApp message confirmed to fire (or its outbound call confirmed, if a live
  number isn't being used for test runs).
- Phase 5: the full loop, start to finish, in one pass — the actual acceptance test.

## Acceptance Criteria (the overall bar — Phase 5's own Done-when, restated as the final checklist)

- [ ] A customer can pick a real `hr` service (e.g. `قصة`) — not a generic date/time form.
- [ ] A customer can pick a real staff member (`Hassan`).
- [ ] The calendar shows only genuinely available slots — respecting working hours, service
      duration, and existing bookings — never a blind text input.
- [ ] Submitting creates a real `Reservation` row, correctly linked to the `CatalogItem`, `Barber`,
      and customer.
- [ ] Double-booking the same barber/slot is prevented (reuses existing, already-proven conflict
      logic).
- [ ] A WhatsApp confirmation fires automatically, server-side.
- [ ] The admin Calendar shows the booking with service + duration + staff visible directly on the
      block.
- [ ] Tenant isolation is re-verified clean at the end of this work, not just at the P0 gate.

---

## Implementation Risks

Not a bug hunt — the four questions that would actually stop implementation, answered honestly after
Phase 0.5's real code read:

**Is there a missing model?** No. `Barber`, `Reservation`, and `WorkingHours` (as `Barber.workingHours`)
all already exist and are already used by real, working code. The only schema-adjacent item is the
`CatalogItem`↔`Reservation` bridge — not a missing model, an open *mechanism* decision between two
small, well-understood candidates (Phase 0.5, Q1/Q7).

**Is there a missing API?** One, real and expected: an "available slots" endpoint (the Availability
Engine's list function) doesn't exist yet — `create_reservation()` only validates a single proposed
time, it doesn't enumerate open ones. This is additive work (a new function + a new route), not a
redesign of anything that exists. Frontend also needs new screens (Service/Staff Picker, Calendar-
slots, Confirmation) — expected, already scoped as Phase 2, not a surprise.

**Is there a Frontend/Backend conflict?** None found. The real backend pipeline
(`create_reservation()`) is self-contained and already correct; the frontend's only real
responsibility is to call it with `module_key="barber"` and a real `barber_id` — no contradictory
assumption was found between what the frontend will need to send and what the backend already
expects.

**Is there an open decision blocking the start?** One — the `CatalogItem`↔`Reservation` bridge
mechanism. It does not block *starting* Phase 1; it *is* Phase 1's first concrete task, already
reduced to two named candidates, not an open-ended question.

**Conclusion: no hard blockers found.** The team is ready to move from planning to implementation —
Phase 1 begins with the one real decision above, not with more investigation.

---

## Approval Gates

**Approved by Salman, 2026-08-02**, after two review rounds (Phase 0.5 deepened from a diagram into
seven answered/flagged architectural questions; Phase 0.6 Data Walkthrough added). His own words:
*"لا يوجد سبب آخر لتأجيل التنفيذ"* — no reason left to delay implementation. Execution begins with
the P0 Gate.

Practice going forward, per this project's established discipline throughout the Product Readiness
Audit: the P0 Gate, Phase 0.5, Phase 0.6, and each numbered phase remain their own checkpoint — real
evidence presented before the next one starts, not a single silent run through all of them.

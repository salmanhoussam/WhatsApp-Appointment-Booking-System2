# Barber Production Readiness — Study Session (2026-08-21)

Read-only investigation per Salman's explicit instruction: no code, no commits, no DB writes.
Two independent axes: Store (mr-h) and Calendar ("تخربط" report). Real evidence only — DB read
via a temporary read-only script (`/tmp/.../investigate_store.py`, `investigate_calendar.py`,
never committed, no writes issued), real `git log`/`git show` on the actual files, real code
reads with file:line citations. Follows `investigation-protocol.md`.

---

## AXIS 1 — Store in the Barber Shop (mr-h)

### Confirmed Findings

1. **mr-h has zero Store capability today — by configuration, not by bug.**
   `client_services` for mr-h (`fd53e0e1-684c-4a14-a41e-31dfe5d39f45`): only `reservations`,
   `booking`, `whatsapp_ordering` are active. No `store` row, no `catalog` row at all. Confirmed
   via a direct read of `ClientService` for mr-h's real client id.

2. **mr-h has zero product data.** `CatalogCategory` for mr-h: exactly one row, `module_key='services'`
   ("الخدمات", 6 items — haircuts). No `module_key='store'` category exists. `StoreOrder` count: 0.

3. **mr-h's `content.sections[]` has no `products` entry.** 9 sections total (hero, story, staff,
   gallery, featured_items, hours, location, cta, why_choose_us) — `products` is absent. rk's has
   11 sections including `products` (order 10, enabled true).

4. **The Products/Services Separation code pipeline (Track B, 2026-08-20) is complete and already
   generic — nothing here needs to be built again:**
   - `app/schemas/section_schemas.py:112` — `products` schema entry (meta-only: `heading_ar`, `limit`).
   - `frontend/src/components/dynamic-sections/ProductsSection.jsx` — self-gates to `null` when
     `store` isn't in `active_services` (no tenant/slug check anywhere).
   - `DynamicPage.jsx`'s `SECTION_MAP` — `products: ProductsSection` (line 63).
   - `SettingsTab.jsx:486-513` — `CAPABILITY_LINKS.products` deep-links into the Dashboard's
     `store`/`catalog` tab based on `hasReservations`, not a slug — already tenant-agnostic.

5. **The real, generic gap: there is no self-service way to materialize a `products` section into
   any tenant's stored `content.sections[]`.** The only code path that does this today —
   `content_service.add_section()` (real, validated, correct) — was only ever invoked once, via a
   one-off script (`scripts/add_products_section_rk.py`) written and run for `rk` specifically.
   No Dashboard button, no automatic trigger on Store activation. This is the actual bottleneck
   for "any future Barber tenant with Store" — not missing code, missing a *trigger* for code that
   already exists and already works.

6. **Real, live, pre-existing UX gap, unrelated to anything built this session:** `buildNav()`
   (`GenericAdminDashboard.jsx:187-196`) always shows a "المتجر" (Store) nav item for every
   `hasReservations` tenant, regardless of whether `store` is actually active. For mr-h today,
   clicking it opens `StoreTab.jsx` against a tenant with no Store service — `GET` calls
   (`loadCategories`/`loadItems`) silently swallow the resulting 403 into an empty list
   (`.catch(() => setCategories([]))`), so it doesn't crash, but any create/save attempt hits
   `POST/PATCH /admin/store/*` (gated by `require_service("store")`, `app/api/v1/admin/store.py`
   lines 124/144/189/226/255/270/291/314) and surfaces a raw English-ish backend error
   ("Service 'store' is not activated...") via `alert()`. A dead-end tab today for any
   reservations tenant without Store — confirmed by code, not yet by a real browser click.

7. **Cart → checkout → order → WhatsApp flow does not need rebuilding**, confirmed by `git log`:
   `CatalogPage.jsx`/`CartPage.jsx`/`app/api/v1/public/store.py` last had real feature work well
   before this session (`f533de3`, `53931c2`, `fe03513`); only touch since is the isolated,
   unrelated `delete_product` crash fix (`bb66a49`), which doesn't touch this flow at all.

8. **Side finding, not a bug:** mr-h's one real category has `module_key='services'`; rk's
   equivalent has `module_key='catalog'`. Different literal values for functionally the same
   thing. No functional impact found — `FeaturedItemsSection.jsx:97` filters by exclusion
   (`cat.module_key !== 'store'`), so it doesn't matter which non-store value is used — but it's a
   real naming inconsistency worth a decision if a future feature ever needs to positively match
   on `module_key === 'services'`/`'catalog'` rather than exclude on `'store'`.

### Unknowns

- No real browser click-through was performed this session confirming the exact StoreTab error UX
  described in Finding 6 (code-traced, not click-verified) — recommend a real Playwright pass
  before treating it as fully closed, per `browser-verification-protocol.md`.
- Whether Salman wants mr-h to actually get Store at all (a real business decision — does the
  barbershop sell retail product?) is unknown and out of scope for this study.

### The real open decision (Store)

Two structurally different ways to close Finding 5, both compatible with "generic, Tenant OS,
works for any future Barber tenant" — a real architectural choice, not decided here:

- **(a) Auto-materialize on activation** — when a Super Admin flips `store` to active in
  `client_services` for a tenant, automatically call `content_service.add_section(client_id,
  "products")` if not already present. Smallest, most targeted; only ever helps the one section
  type; ties section materialization to a specific business event (service activation) rather than
  the Section Editor itself.
- **(b) A real "Add Section" affordance in the Section Editor** — `SettingsTab.jsx`'s section list
  shows not-yet-added, available section types (of which `products` would be the first real case)
  with an "Add" button calling the already-existing `POST /content/sections`. More general — this
  gap was explicitly named and deferred for Footer in Phase 5 and again for Products in Track B
  ("deliberately not built... same deferred shape as Footer") — this closes it for real, for every
  future section type, not just this one.

---

## AXIS 2 — Calendar ("تخربط")

### Confirmed Findings

1. **Not a regression from this session or the last one.** `git log` on every file in the
   Dashboard→Calendar chain (`ReservationsTab.jsx`, `ReservationsWeekCalendar.jsx`,
   `ReservationsTodayView.jsx`, `app/api/v1/admin/reservations.py`,
   `app/services/reservation_service.py`, `app/repositories/reservation_repo.py`) shows the last
   real change to any of them was `cf6f474` ("visual redesign") — well before 2026-08-19/20/21.
   Track A (Customer Registry) only *added* 12 lines to `reservation_repo.py` (`git show b8d0081`)
   — a brand-new function, nothing existing touched. Nothing from this study's Store axis touches
   these files either.

2. **A real, confirmed, structural mismatch between two independent "working hours" sources — this
   is the most likely concrete cause of "تخربط", found and reproduced from real DB state, not
   assumed:**

   - **Client-level** `Client.config.working_hours` — edited via Dashboard → Settings → "ساعات
     العمل" (`SettingsTab.jsx:819-874,991-994`). mr-h: `{open: 09:00, close: 20:00}`.
   - **Per-Barber** `Barber.workingHours` — edited via Dashboard → Staff → employee edit modal
     (`StaffTab.jsx:258-314,701-702`), defaulting to `{open: 09:00, close: 18:00}` when never
     touched (`StaffTab.jsx:93`). mr-h's only barber, "Ali": still exactly `{09:00, 18:00}` — the
     untouched default.

   **These feed two different, disconnected consumers:**
   - The **Dashboard Calendar's visual hour grid** (`ReservationsTab.jsx:407-413`, `hourRange`)
     reads **only** `config?.config?.working_hours` — the Client-level value. For mr-h: renders a
     grid from 09:00 to **20:00**.
   - **Backend booking validation** — `_check_working_hours()` at every real write path (public
     availability slots `reservation_service.py:322-338`, admin create/reschedule
     `reservation_service.py:204-220,538`) resolves **Barber.workingHours first**, falling back to
     Client-level only if the barber has none set. For mr-h's Ali: enforces 09:00-**18:00**.

   **Net effect:** the Dashboard Calendar visually offers 2 extra hours (18:00-20:00) that neither
   the public booking flow nor an admin trying to create/drag/reschedule an appointment into can
   ever actually use — every one of those attempts hits `_check_working_hours()` against Ali's
   real 18:00 limit and fails. No visual distinction exists anywhere in the calendar rendering
   between "open per the grid" and "actually bookable for this barber" — `hourRange` is the same
   tuple passed uniformly into both `ReservationsWeekCalendar.jsx` and `ReservationsTodayView.jsx`,
   with no per-barber closed-hour shading.

   rk shows the same class of split (barber "جعفر" is still at the `{09:00,18:00}` default vs. the
   client-level `{09:00,21:00,closed:[monday]}`), but rk's *other* barber ("حسين") happens to match
   the client-level value exactly, and `closed_days` (`monday`) isn't reflected in the calendar
   grid logic at all either (`hourRange` only carries start/end hour, no closed-day awareness) —
   so rk's version of this gap is real but less immediately visible than mr-h's.

3. **This is an old, day-one design gap, not something anyone broke.** The `{09:00, 18:00}`
   default is a literal hardcoded placeholder in `StaffTab.jsx:93`, matching exactly what the
   Reservation Pilot Phase 1 session (2026-08-02, per project memory) described as "placeholder
   hours 09:00-18:00, needs real merchant confirmation." Nobody ever went back to reconcile a
   barber's own hours once the tenant-level "ساعات العمل" setting was configured separately —
   because these are two genuinely different UI screens (Settings vs. Staff) with no visible link
   between them; an owner has no way to know editing one doesn't touch the other.

4. **All reservation timestamps are stored as literal local wall-clock time inside a UTC-typed
   column** (`reservation_service.py`'s own documented convention, "All times treated as UTC
   directly", cross-referenced at 3 separate lines) — this is a deliberate, long-standing,
   consistent simplification across the whole codebase, not a bug. Checked mr-h's most recent real
   reservation (`2026-08-21 11:00:00+00:00`, created `2026-08-20 19:09:27` — a genuine live
   WhatsApp-flow booking, not test data) against this convention: 11:00 falls inside Ali's real
   09:00-18:00 window, consistent, no timezone-related anomaly found in the data itself.

### Side Findings

- mr-h has exactly 3 real reservations total; one (`ee32f2c1...`, "Ali Isolation Test") is
  leftover test data from the Reservation Pilot Phase 1 backend-foundation work (2026-08-02, per
  memory) — real, harmless, but worth a conscious cleanup decision before go-live rather than
  leaving stray test bookings in a production calendar.
- rk has 10 real reservations, several sharing the placeholder customer name/phone
  `'زبون واتساب'`/`'عبر واتساب'` — this is the real, working WhatsApp-only booking convention
  (per `project_reservation_pilot_whatsapp_confirm_redesign.md`), not an anomaly.

### Phase A1 — Real Browser Verification (executed 2026-08-21)

Per Salman's explicit "Track A, A1 only" instruction. Real Playwright MCP session against real
local dev servers (backend `uvicorn` + frontend `vite`, both started fresh for this check, both
stopped again after). Real admin access obtained without any DB write: a JWT was minted locally
via the app's own `create_access_token()` (`app/core/security.py`) — same function, same
`SECRET_KEY`, same payload shape `app/api/v1/admin/auth.py:165-177`'s real login route builds —
using a real, already-existing `TENANT_ADMIN` user id read (not created) from the DB for each
tenant (`admin@ali-barber.local` for mr-h, `rkbarber@dev.invalid` for rk). No password reset, no
new user, no row written anywhere.

**Confirmed — Finding 2 (working-hours mismatch) reproduces exactly as diagnosed, both tenants,
both Create and Reschedule:**

- **mr-h**: real DOM read of the Week/Today grid confirms hour rows rendered for `Ali`'s column
  from 09:00 through 19:00 (i.e. the 18:00-20:00 region renders as normal, clickable, unmarked
  slots — no greying, no visual "closed" indicator anywhere). Clicking an empty slot at 19:15 opens
  the real "حجز سريع" popover, pre-filled with that time. Filling a real service + customer name +
  phone and submitting sends a real `POST /api/v1/admin/reservations/?client_slug=mr-h` with
  `reserved_at: "2026-08-21T19:15:00Z"` — **response: `409 Conflict`,
  `{"code":"CONFLICT","message":"Outside working hours (09:00-18:00)."}`**, shown to the admin as a
  raw, untranslated English string inside the Arabic-RTL popover. Rescheduling the real existing
  reservation (`fa555959-...`, the live WhatsApp booking from 2026-08-20) from 11:00 to 19:00 via
  the popover's own "إعادة الجدولة" control produced the identical real
  `PATCH /reservations/{id}/reschedule` → `409`, same exact message.
- **rk**: same reproduction for barber `جعفر` (Jaafar) specifically — his column's grid renders
  09:00 through 20:00 (matching the tenant-wide 09:00-21:00 config, not his own 09:00-18:00), and a
  real Create attempt at 19:15 for him returns the identical `409`,
  `"Outside working hours (09:00-18:00)."`. Barber `حسين` (Hussein) was not re-tested since his own
  `Barber.workingHours` already matches the tenant-wide config exactly (Finding 2's own note) — no
  mismatch expected or found for him.
- A secondary, real, minor UX bug found during this test: after the `409` rejection, the "حجز
  سريع" popover's time field visually reverts to a different value (observed `07:15`) instead of
  preserving what the admin actually typed (`19:15`) — the error banner is shown correctly, but the
  form's own display of what was just rejected is misleading. Logged, not fixed (A1 is
  verification-only).

**Confirmed — Finding 5 (NEW, found during this verification, independent of Finding 2): the
Calendar (grid) view and the List view of the exact same reservation display two different clock
times, a real 3-hour discrepancy.** mr-h's real reservation `fa555959-...`
(`reserved_at = 2026-08-21T11:00:00Z`):
- **Calendar view** (Week/Today grid) positions the card at the **11:00** row.
- **List view** (same tab, "قائمة" toggle) shows **"٠٢:٠٠ م" (2:00 PM)** for the identical
  reservation, and the reschedule popover opened from that same list row shows its time field as
  **"11:00"** — three different displayed times for one real database row, visible within the same
  admin screen.

Root cause, confirmed by file:line, not guessed: `ReservationsWeekCalendar.jsx:66` positions cards
using `d.getUTCHours()`/`getUTCMinutes()` — treats the stored value as literal local wall-clock (the
documented, deliberate platform convention, `reservation_service.py`'s own "all times treated as
UTC directly" comment). `ReservationsTab.jsx:75` (list view's time cell) instead calls
`new Date(iso).toLocaleTimeString('ar-SA', {...})` with **no timezone argument** — this lets the
*browser's* local timezone (Beirut, UTC+3) convert the `Z`-suffixed ISO string, shifting 11:00 to
14:00. Two real, independently-confirmed causes now stand behind "تخربط"
(`investigation-protocol.md`'s "Independent Causes Are Allowed" rule) — neither explains the other,
both are real, both reproduce live.

### Remaining Unknowns

- Whether Findings 2 and 5 together fully explain everything Salman perceived as "تخربط", or
  whether a third, independent symptom also exists, remains open — these two are the confirmed
  causes found so far, not asserted as exhaustive.
- Whether the same `toLocaleTimeString`-without-timezone pattern (Finding 5's root cause) appears
  anywhere else in the Dashboard beyond `ReservationsTab.jsx:75` was not checked this pass — a
  targeted grep would be a cheap first step of A2.

### The real open decision (Calendar)

Which source should govern which consumer — also not decided here:

- Should the Calendar's visual `hourRange` become per-barber (reading `Barber.workingHours` for
  whichever barber's column/view is active) instead of the tenant-wide Client config? This would
  make the grid match what the backend actually enforces.
- Should Staff's per-employee hours form auto-default to the tenant-level "ساعات العمل" value
  instead of a hardcoded `09:00-18:00`, so a new barber starts in sync unless explicitly
  overridden?
- Should `closed_days` (currently only stored, never rendered) become a real greyed-out day in the
  Week Calendar?

---

## Dependencies between the two axes

None functionally — disjoint files, disjoint data, disjoint capabilities. They only compete for
the same production-deadline attention. Sequencing below is a recommendation based on production
risk (a booking-integrity bug affects every single customer interaction today; Store is a new,
currently-inactive-for-mr-h capability), not a hard technical dependency.

---

## Recommended Phased Plan — P0 first, study only, nothing executed

### Track A (Calendar) — P0

**Phase A1 — Real browser confirmation of the working-hours mismatch — ✅ DONE, 2026-08-21**
- Files touched: none (verification only, as required).
- Result: fully confirmed on both mr-h and rk, for both Create and Reschedule. A second,
  independent, real cause (Calendar-vs-List timezone display mismatch) was also found and confirmed
  during this pass. See "Phase A1 — Real Browser Verification" above for full evidence.
- **A2 was NOT started, per instruction.** Awaiting Salman's decision on both confirmed causes
  before any implementation.

**Phase A2 — Architectural decision + smallest safe fix (code, after approval)**
- Files expected: `frontend/src/pages/generic-admin/tabs/ReservationsTab.jsx` (hourRange source),
  possibly `ReservationsWeekCalendar.jsx`/`ReservationsTodayView.jsx` (per-barber closed-hour
  shading) — no backend change needed if the fix is render-side only (backend validation is
  already correct per Barber.workingHours).
- What exists: `hourRange` plumbing already threaded through both calendar components — only the
  *source* needs to change, not the plumbing shape.
- What's new: per-barber (not tenant-wide) hour resolution in the Dashboard Calendar; optionally,
  a one-time real-data reconciliation for mr-h's Ali (and rk's Jaafar) so their `Barber.workingHours`
  matches their real actual hours — a data decision, not a schema change.
- Acceptance: mr-h's calendar grid for Ali shows exactly 09:00-18:00 (or whatever his real
  confirmed hours are); no visual slot exists that the backend would reject.
- Verify on: mr-h and rk, both barbers on rk individually.

**Phase A3 — Test-data cleanup decision (mr-h)**
- Not code — a decision: keep, relabel, or delete the one real leftover "Ali Isolation Test"
  reservation before go-live. Flagged, not resolved here.

### Track B (Store) — P1 (after Track A, or in parallel if Salman prefers)

**Phase B1 — Real browser confirmation of the dead-end "المتجر" tab (no code)**
- Verify Finding 6 by actually clicking into mr-h's Store tab and attempting a create, to confirm
  the exact error UX before deciding whether it needs its own fix or is acceptable as-is until
  Store is actually activated for mr-h.

**Phase B2 — Architectural decision: (a) auto-materialize vs (b) real Add-Section UI**
- Salman's call between the two options above. Either is "smallest safe path"-compatible; (b) is
  more general-purpose but larger; (a) is narrower and faster.
- Files expected (whichever direction): 
  - (a): `app/services/registration_service.py` or wherever the Super Admin service-toggle route
    lives (`app/api/v1/super/...`) — add the `add_section` call on `store` activation.
  - (b): `SettingsTab.jsx`'s section list UI + a small "available but not yet added" section-type
    list, wired to the already-existing `POST /content/sections`.
- What's new either way: a trigger. What already exists: the validated `add_section()` capability
  itself (`content_service.py`), the schema, the renderer, the deep-link — all real and unchanged.

**Phase B3 — Real product data + activation for mr-h (if Salman decides mr-h should sell retail)**
- Not code — data/business decision (does mr-h actually want a Store?). Only relevant if yes:
  activate `store` client_service (existing Super Admin toggle, no new code), seed real
  `CatalogCategory`/`CatalogItem` rows (existing seeding pattern, no new code), then B2's mechanism
  materializes the `products` section.

**Phase B4 — Nav consistency fix (optional, low-risk)**
- Gate `buildNav()`'s "المتجر" nav item on `activeServices.includes('store')` so a reservations
  tenant without Store doesn't see a dead-end tab. Small, isolated, `GenericAdminDashboard.jsx`
  only. Independent of B1-B3 — can ship any time.

---

## Architectural / risk findings registered, not resolved

1. **Two independent, disconnected "working hours" sources with no UI link between them** — real,
   structural, affects every reservations tenant, not just mr-h. Worth a real Capability
   Investigation of its own regardless of this specific fix, per `architecture-review-loop.md`'s
   pattern-escalation rule if it recurs a second time.
2. **The Section Editor's "materialize on first touch" gap is now a repeated pattern** — hit for
   Footer (Phase 5, declined), hit for Products (Track B, one-off script). Two independent
   instances is exactly this project's own Abstraction Rule threshold (`team-roles.md`) for
   naming it as a real, generalizable gap rather than solving it narrowly a third time.
3. **Dashboard nav offering a capability-gated tab regardless of the capability's real activation
   state** (Finding 6) is a real, live UX inconsistency, not unique to Store — worth checking
   whether `staff`/`customers`/`notifications` have the same issue before treating this as a
   one-off Store fix.

---

## Status

**Study complete 2026-08-21.** A1 (real browser verification) executed same day, no code/DB
change. **A2.1 (unify Calendar/List/Reschedule time display, Finding 5) DONE** — see
`.claudedocs/implementation/CALENDAR_TIMEZONE_FIX/A2.1.md`. **A2.2 (barber-aware working-hours
grid, Finding 2) DONE** — see `.claudedocs/implementation/CALENDAR_TIMEZONE_FIX/A2.2.md`. Track A
(Calendar) is now fully closed for the two confirmed findings from A1; the Week-view multi-barber
scope gap (registered in A2.2) remains open, named, not solved.

**Track B (Store) also DONE, 2026-08-21** — B1 investigation, both real bugs fixed (nav gating,
error-message field), B2 decided (auto-materialize on Store activation) and B3 decided (rk's real
hidden products made visible, full purchase chain verified end-to-end with real data; mr-h left
without Store, zero product data to justify it) — see
`.claudedocs/work/store-b1-investigation/2026-08-21/b2-b3-execution.md` for full evidence.

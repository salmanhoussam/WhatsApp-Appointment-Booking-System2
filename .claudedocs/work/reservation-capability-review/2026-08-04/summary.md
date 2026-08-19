# Reservation Capability Review — Phase 3.1.2

**Date**: 2026-08-04
**Trigger**: Salman's explicit instruction — before adding Quick Create/Edit/Cancel, verify whether
the Reservation Capability is growing into a coherent Operating System or a collection of UI
features. Investigation only. No refactor. No new feature code.

**Scope note**: this is the seed of a future `architecture/capabilities/reservation.md` (same role
Content/Media's capability files play), per Salman's own framing — not written as that file yet.
Per `documentation-policy.md`, a Capability file is written once a Contract is actually decided, not
mid-investigation; this review is evidence for that decision, not the decision itself. Filed under
`.claudedocs/work/` per `investigation-protocol.md`'s evidence convention.

**Method**: every claim below cites the real file and line read. No response shape, endpoint, or
behavior is assumed — each was opened and read this session (2026-08-04), not recalled from memory.

---

## 1. Fetch Contract Map

| Operation | Caller | Endpoint | Service fn | Repo fn | Response shape | Loading strategy | Invalidation |
|---|---|---|---|---|---|---|---|
| **List/Load Day/Week** | `ReservationsTab.jsx:338-367` (`load()`) | `GET /admin/reservations/?date=` or `?date_from=&date_to=` or `?status=` | `reservation_service.list_reservations` (`reservation_service.py:348`) | `list_by_client` (`reservation_repo.py:31`) | `{success, data: Reservation[]}` | local `useState`, `useEffect([load])`, own `requestSeqRef` guard against out-of-order responses (`ReservationsTab.jsx:337-339`) | manual only — re-fires on `statusFilter`/`dateFilter`/`viewMode`/`weekStart`/`todayViewDate` change; **not** re-fired by a mutation elsewhere |
| **Day navigation (prev/next/today/date-picker)** | `DayNav` (`ReservationsTodayView.jsx:57-107`) → `onDateChange` prop → `setTodayViewDate` in `ReservationsTab.jsx:302` | *(none directly — changes the `date` param of the List/Load call above)* | — | — | — | triggers the same `load()` above via its dependency array | same as List/Load |
| **Staff (barber) loading** | `ReservationsTodayView.jsx:336-346` | `GET /admin/barbers/` | *(route only, no service layer — `barber_repo` called directly from the route)* | `barber_repo.list_barbers` | `{success, data: Barber[]}` | own local `useState`+`barbersLoading`, fetched in a mount-only `useEffect([])` | **none** — never refetched after create/edit/deactivate elsewhere; only refreshes on remount |
| **Catalog items (for service-name lookup)** | `ReservationsTodayView.jsx:347-349` | `GET /admin/catalog/items` | — | — | `{success, data: CatalogItem[]}` | same mount-only effect as barbers | none |
| **Availability (open slots)** | `useReservationBooking.js:155` (public booking flow only) | `GET /public/reservations/availability?barber_id=&date=&duration_min=` | `reservation_service.get_available_slots` (`reservation_service.py:265`) | `find_by_barber_on_date` (`reservation_repo.py:125`) | `{success, data: [{time, datetime}]}` | hook-local | manual re-call on barber/date/service change |
| **Drag-and-drop update** | `ReservationsTodayView.jsx:380-425` (`handleDragEnd`) → `onReschedule` prop → `ReservationsTab.jsx:381-385` (`handleReschedule`) | `PATCH /admin/reservations/{id}/reschedule` | `reservation_service.reschedule_reservation` (`reservation_service.py:374`) | `update_fields` (`reservation_repo.py:155`) + `find_overlapping_by_barber` | `{success, data: Reservation}` on 200; `{success:false, error:{code:"CONFLICT", message}}` on 409 | optimistic (mutates local `items` before the call resolves) | on success, parent's `reservations` state is patched too (`ReservationsTab.jsx:384`) → re-syncs child `items` via `useEffect(() => setItems(reservations), [reservations])` (`ReservationsTodayView.jsx:334`) |
| **Reschedule via popover form** | `ReservationPopover.handleMove` (`ReservationsTodayView.jsx:196-207`) → same `onReschedule` prop | same as above | same as above | same as above | same as above | **not** optimistic — waits for the await, closes on success | same parent-sync path as above |
| **Status change (incl. Cancel today)** | `StatusCell` (`ReservationsTab.jsx:109-142`) → `handleStatusChange` (`ReservationsTab.jsx:372-375`) | `PATCH /admin/reservations/{id}/status` | `reservation_service.update_status` (`reservation_service.py:361`) | `update_status` (`reservation_repo.py:143`) | `{success, data: Reservation}` / 400 on invalid transition | none — direct local `setReservations` patch on success, no optimistic pre-update | none beyond that local patch |
| **Create (public/customer)** | `useReservationBooking.js:180` | `POST /public/reservations/` | `reservation_service.create_reservation` (`reservation_service.py:141`) | `create` (`reservation_repo.py:14`) | `{success, data: Reservation}` / 409 on conflict | hook-local | n/a (customer flow, no admin list open) |
| **Create (admin)** | — | — | — | — | — | — | **does not exist** |
| **Edit (service/duration/name/phone)** | — | — | — | — | — | — | **does not exist** — only `reschedule` (time/barber) exists |
| **Cancel (customer)** | public booking confirmation page | `PATCH /public/reservations/{id}/cancel` | `cancel_by_customer` (`reservation_service.py:369`) | `cancel` (`reservation_repo.py:167`) | `{success, data:{status:"cancelled"}}` / 404 on phone mismatch | — | — |
| **Activity Feed (dashboard overview widget)** | `ActivityFeed.jsx:109-120` | `GET /admin/reservations/` (unfiltered) | same `list_reservations` as List/Load | same | same shape | own independent `useState`, mount-only fetch, **separate from ReservationsTab's own copy** | none — 30s poll (`ActivityFeed.jsx:123-127`) only re-fires `onRequestRefresh` (orders), never re-fetches its own reservations |
| **Overview stats card** | `OverviewTab.jsx:593-607` (`loadResStats`) | `GET /admin/reservations/stats` | `reservation_service.list_reservations` (reused, then aggregated in the route — `admin/reservations.py:74-101`) | same | `{success, data:{today_total, by_status}}` | own independent `useState`, mount-only | none |

---

## 2. Reservation Operations — Classification

| Operation | Status | Evidence |
|---|---|---|
| Load Day | ✅ Proven | `ReservationsTab.jsx:349-351`, real `date` param, real backend range filter (`admin/reservations.py:46-53`) |
| Previous / Next Day | ✅ Proven | `DayNav` arrows, `addDaysISO` (`ReservationsTodayView.jsx:40-44,61-69`) |
| Jump to Today | ✅ Proven | `ReservationsTodayView.jsx:83-93` |
| Date picker jump | ✅ Proven | `ReservationsTodayView.jsx:95-104` |
| Manual Refresh | 🟡 Partial | exists as a "↻" button in **List** view only (`ReservationsTab.jsx:448-458`); Today/Week views have no explicit refresh — only implicit reload on filter/date change |
| Staff (barber) loading | ✅ Proven, functionally | real bug (missing trailing slash → 401 → forced logout) found and fixed (`ReservationsTodayView.jsx:336-341` comment); loads correctly today |
| Drag (move time/staff) | 🟡 Partial | mechanically proven end-to-end via debug-log evidence (activation → collision → delta → API call → correct 409s) from the prior session; **no captured clean 200 success yet** — blocked purely by real clock time, not a code defect |
| Resize (change duration via drag) | ❌ Missing | not implemented; correctly named by Salman himself as "(future?)" |
| Change Staff (via drag) | ✅ Proven | `reschedule_reservation` accepts `new_barber_id`, re-runs working-hours + conflict check for the *target* barber (`reservation_service.py:399-419`) |
| Change Duration (any path) | ❌ Missing | no code path anywhere writes `durationMin` after creation — confirmed absent from `reschedule_reservation` (`reservation_service.py:374-422`) |
| Conflict Detection | ✅ Proven | real, reused pipeline stage (`_check_working_hours` + `_has_conflict`), confirmed via two real 409 responses in the prior session ("Outside working hours…", "Cannot reschedule to a past time slot.") |
| Create (admin, Quick Create) | ❌ Missing | no admin create-reservation endpoint or UI exists |
| Edit (service/duration/name/phone) | ❌ Missing | only `reschedule` exists, and it only ever patches `reservedAt`/`barberId`/`metadata.barber_id` (`reservation_service.py:397-419`) |
| Cancel | 🟡 Partial | technically reachable today via `StatusCell`'s `pending→cancelled` transition (`ReservationsTab.jsx:48`), reusing the generic status-update endpoint — but no dedicated Cancel button/confirmation UX exists, and the admin-side status endpoint has no phone/ownership check the way the customer-facing cancel endpoint does |
| Standalone "إعادة جدولة" button (non-drag reschedule) | ✅ Proven | `ReservationPopover`'s mini date+time form (`ReservationsTodayView.jsx:190-259`) already does exactly this, reusing the same backend endpoint |
| Status filter (pending/confirmed/…) | ✅ Proven | applies uniformly across List/Today/Week — `statusFilter` is appended to every request regardless of `viewMode` (`ReservationsTab.jsx:343`) |
| Week View | ✅ Proven, but scoped narrower | real week grid over the same data, no staff columns, no drag — deliberately unchanged per Salman's own Phase 3.1 instruction not to touch it yet |

---

## 3. Calendar State Machine (from real code, `ReservationsTodayView.jsx:374-425`)

```
Idle
 │  user presses a card (PointerSensor distance:8 / TouchSensor delay:200,tolerance:6)
 ▼
Dragging            (handleDragStart: activeId set, snapshotRef = items)
 │  user releases
 ▼
handleDragEnd fires
 ├─ over is null            → Idle (no state change, no revert needed — nothing was mutated)
 ├─ sameTime && !barberChanged → Idle (explicit no-op abort, before any mutation)
 └─ otherwise:
     optimistic setItems(...)      ← UI already shows the NEW position here, before the network call
     │
     ▼
    (unnamed "Saving" state — no boolean/flag exists for it in code; the only signal is the
     already-moved card and the fact that `onReschedule`'s promise hasn't resolved yet)
     │
     ├─ await onReschedule succeeds → Success
     │      items stays at new position; parent `reservations` is separately patched
     │      (ReservationsTab.jsx:384) → child re-syncs from the prop via useEffect (redundant
     │      but consistent — see Finding 2)
     │
     └─ await onReschedule throws (409 CONFLICT / 500 / network)
            → setItems(snapshot)            (revert to pre-drag position)
            → setConflictMsg(message)       (banner shown)
            → setTimeout 4000ms             (banner auto-clears)
            → Idle
```

Separate, parallel flow for the Popover's own reschedule form (`ReservationsTodayView.jsx:196-207`)
— **not optimistic**, no revert step needed because nothing is mutated ahead of the network call:

```
PopoverOpen → user clicks "نقل الموعد" → moving=true (button disabled)
  ├─ success → onClose()  (popover closes; parent's own setReservations patch is what
  │            actually changes what's on screen)
  └─ error   → error state shown inline, moving=false, popover stays open
```

Two structurally different state machines implement the same underlying mutation — see Finding 3.

---

## 4. Data Ownership

| State | Canonical owner | Confirmed single owner? |
|---|---|---|
| Selected day | `ReservationsTab.jsx:302` (`todayViewDate`), passed down via props | ✅ Yes |
| Selected staff | *(no such state exists anywhere — all staff columns always render together)* | N/A — not a real gap, just not built yet |
| Reservation list (canonical) | `ReservationsTab.jsx:293` (`reservations`) | 🔴 **No** — see Finding 2: `ReservationsTodayView.jsx:315` maintains its own derived `items` copy, independently mutated during drag, reconciled back only via a separate callback + a resync effect |
| Reservation list (Activity Feed) | `ActivityFeed.jsx:98` (`reservations`) | 🔴 **No** — fourth independent copy of overlapping data, see Finding 1 |
| Reservation stats (Overview) | `OverviewTab.jsx` (`resStats`) | 🔴 **No** — fifth, server-aggregated but still independently fetched/cached copy |
| Availability (open slots) | `useReservationBooking.js` (public flow only) | ✅ Yes, but scoped to a capability the admin side doesn't have yet (relevant once Quick Create needs the same concept) |
| Optimistic updates | Two independent implementations — drag path is optimistic, popover path is not | 🔴 **No single strategy** — see Finding 3 |
| Pending/in-flight mutation tracking | Popover has a local `moving` boolean; drag path has none at all | 🔴 **No shared concept**, and one path has none — see Finding 4 |

---

## 5. Architecture Findings

Findings are ordered by how directly they matter for Phase 3.2 (Quick Create/Edit/Cancel), not by
discovery order. Per the review's own instruction, abstractions are only named where at least two
independent cases confirm the same pattern — noted explicitly per finding.

**Finding 1 — No unified Reservation Client; 4 independent, uncoordinated owners of overlapping
reservation data.**
Evidence: `ReservationsTab.jsx:338-367` (`GET /reservations/`, tab-local state), `ActivityFeed.jsx:109-120`
(`GET /reservations/`, its own separate state — same endpoint, same data, zero relation to the
above), `OverviewTab.jsx:593-607` (`GET /reservations/stats`, its own state), plus the public-facing
`useReservationBooking.js` for a structurally identical but tenant-facing case. None share a cache;
a mutation in one (e.g. a drag reschedule) never invalidates the others. **First occurrence of this
pattern.**

**Finding 2 — Two parallel in-memory copies of the same reservation list, kept in sync by
convention rather than by a single owner.**
Evidence: `ReservationsTab.jsx` owns `reservations`; `ReservationsTodayView.jsx:315,334` derives its
own `items`, resynced via `useEffect(() => setItems(reservations), [reservations])`, and mutated
independently during drag (`ReservationsTodayView.jsx:410-413`) *before* the parent knows anything
happened. The parent only learns via the separate `handleReschedule` callback's own `setReservations`
call (`ReservationsTab.jsx:381-385`). Works today (confirmed by the prior session's debug-log
evidence), but it's two write paths for one conceptual value, not one.

**Finding 3 — Inconsistent optimistic-update strategy for the identical mutation.**
Evidence: the drag path (`ReservationsTodayView.jsx:410-424`) is optimistic with snapshot/revert;
the popover's `handleMove` (`ReservationsTodayView.jsx:196-207`) calls the exact same `onReschedule`
prop but is not optimistic at all. Same operation, two independently-written UX behaviors, no stated
reason for the difference.

**Finding 4 — No in-flight/pending-mutation guard on the reschedule path.**
Evidence: neither `handleDragEnd` nor `handleMove` disables the source card during its own await;
only the popover's *button* gets `disabled={moving}` (`ReservationsTodayView.jsx:246`) — the card
itself remains draggable throughout. Nothing prevents two concurrent `PATCH /reschedule` calls
racing on the same reservation.

**Finding 5 — Barber and catalog-item data is refetched from scratch on every Calendar↔Reservations
nav-tab switch, with no cache.**
Evidence: `GenericAdminDashboard.jsx:429-431` returns a fresh `<ReservationsTab>` element per
`switch` branch on every `activeTab` change, unmounting the previous tree; `ReservationsTodayView.jsx:336-350`'s
mount-only effect then refires `GET /barbers/` and `GET /catalog/items` on every such remount, even
though staff/catalog rarely change within a session. **This is the same underlying root cause as
Finding 1 (no shared client/cache layer), observed in a second, independent place** — per this
project's own Abstraction Rule (`rules/team-roles.md`) and the pattern-escalation rule in
`architecture-review-loop.md`, two independent confirmed occurrences of the same gap is the
explicit threshold for naming it as a real candidate rather than a one-off — see Recommendations.

**Finding 6 (side finding)** — Week View's detail modal still dumps raw
`JSON.stringify(selected.metadata, ...)` to the shop owner (`ReservationsWeekCalendar.jsx:301-308`)
— a real, still-live violation of the Phase 3.1 instruction "لا تعرض JSON IDs إطلاقاً," left over
because Week View wasn't touched during the Today View rebuild.

**Finding 7 (side finding)** — `Reservation.durationMin` has no write path anywhere except initial
creation (`reservation_service.py:239`). `reschedule_reservation` never touches it
(`reservation_service.py:374-422`, confirmed by reading the full function body). Any future Edit
feature that lets an owner change a service's duration on an existing reservation has no backend
support to build on yet — a real, confirmed gap, not a hypothetical one.

---

## 6. Recommendations

**No blocker for Phase 3.2.** Quick Create, Edit, Cancel, and the standalone Reschedule button can
all be built on the existing, proven mechanism (real backend pipeline, real conflict checking, real
drag mechanics) without any refactor being a prerequisite. Recommend proceeding — with three cheap
adjustments folded into that work rather than treated as separate refactor work:

1. **Route new mutations through the existing parent-owned pattern, not new independent call
   sites.** Quick Create and Edit are about to become the 5th/6th consumers of this data. Wire them
   through `ReservationsTab`'s existing `load()`/`handleReschedule` shape (parent fetches, parent
   owns, children call back up) rather than opening fresh `adminApi` calls inside
   `ReservationsTodayView` or a new component — this alone prevents Findings 1/5 from getting worse
   without requiring a refactor of what already exists.
2. **Fix Finding 3 and 4 while touching this code anyway** (align the popover's reschedule to the
   same optimistic+revert shape as drag, or explicitly decide non-optimistic is intentional and
   document why; add a simple `pendingIds` guard shared by both call sites). Small, isolated,
   cheaper now than after a 3rd/4th caller independently reinvents reschedule-handling again.
3. **Fix Finding 6** (Week View's raw JSON dump) — one file, isolated, no dependency on anything
   else in this review.

**Named as a future candidate, not built now**: a real shared Reservation Client (fetch + cache +
invalidation, replacing the 4 independent owners in Finding 1/5). The evidence for it now meets this
project's own two-independent-cases bar — but per "do not propose abstractions until at least two
independent cases exist" *and* "do not refactor yet," the right move is to name it, not build it
inside this review. Recommend revisiting it as its own scoped task once Quick Create/Edit are done,
so its real shape is informed by what those two additions actually needed rather than guessed at
now.

**Backend gap to design in from the start, not discover mid-build**: Edit will need `durationMin`
(and customer name/phone/service) to be writable on an existing reservation (Finding 7) — this
doesn't exist on `reschedule_reservation` today and isn't a drop-in extension of it, since duration
changes affect conflict-window math differently than a pure time/staff move does.

No inconsistent API contract was found beyond the above (response envelope is consistently
`{success, data}` / `{success:false, error:{code,message}}` everywhere checked); no evidence
surfaced that would justify stopping or redesigning the drag-and-drop mechanism itself — it is
sound. The real risk this review confirms is exactly the one Salman named going in: not that
anything built so far is wrong, but that the *fetch/ownership layer underneath it* has already
started fragmenting across 4-5 places, two full months before Search/Filters were even mentioned —
worth fixing the entry pattern now, before Phase 3.2 adds two more callers to it.

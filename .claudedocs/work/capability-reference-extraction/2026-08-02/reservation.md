# Reservation / Appointment Booking Capability

## References

- **`hr`** (RK Barber Shop) — the real target tenant this Capability needs to serve. **Precision
  worth stating plainly**: `hr` does not currently run the new Reservation system — its haircut/
  keratin "services" still route through the old `StoreCart`/`StoreOrder` checkout path. The new
  `Reservation`+`Barber`+`Resource` system was proven live only against a disposable `barberlab-test`
  tenant, never connected to `hr`. `hr` is named here as the real business this Capability must
  eventually serve, not as evidence the new system already works there.
- **`WhatsApp-Appointment-Booking-System-main.zip`** (`new-matirial/old servers/`) — this repo's own
  direct ancestor. Comparison only, not a build target; the code itself is discarded, the *ideas*
  are the reference.

## What exists today

Two disconnected halves. A real, well-modeled backend (`Reservation`/`Barber`/`Resource`,
`reservation_service.py` conflict-checking) with zero real-world wiring, and a real, in-production
checkout path (`hr`'s Store cart) that ignores all of it — a haircut and a bottle of pomade follow
the identical code path today, with no date/time/availability logic anywhere in it.

## Product Note — Multi-Staff Scheduling (added 2026-08-02, real tenant requirement, not hypothetical)

`hr` (RK Barber Shop) has two chairs and two people working simultaneously (the owner + one
employee) — a real, concrete fact about the real target tenant, surfaced during the Dashboard
Calibration walkthrough. Salman's own reasoning, worth keeping verbatim as the guiding note before
any Calendar work: **"صالونات الحلاقة قد تحتوي على أكثر من موظف يعمل في الوقت نفسه. يجب أن يُبنى
تصميم التقويم بحيث يدعم التوسع إلى Multi-Staff Scheduling، حتى لو بدأ الإصدار الأول بموظف واحد
فقط."**

**The resolved product question — what actually gets booked**: not the chair, the **Staff Member**.
His reasoning: each staff member has their own working hours, their own time off, their own skills —
the chair is just a resource they happen to use, not something a customer chooses. This maps
precisely onto the `Barber` model already in `Shared Models` below — not a new invention, a
confirmation that the existing schema anticipated the right shape. **What's actually missing is the
Calendar UI's support for it**, not the data model: today's `ReservationsWeekCalendar.jsx` (and this
session's own real screenshot evidence, `.claudedocs/work/dashboard-calibration/2026-08-02/`) renders
a single timeline with no staff dimension at all.

**How to apply going forward**: start with one staff member (e.g. "Hassan") today — don't over-build
for a hypothetical 5-8 employees — but the Calendar's own design must not assume a single timeline
that would need tearing down the moment a second chair is added. See the Phase 2.5 wireframe in
`.claudedocs/work/dashboard-calibration/2026-08-02/phase2-5-dashboard-vision.md` for the concrete
layout this implies.

**Naming insight, added same day — real, but explicitly NOT executed yet.** Salman's own framing: the
real underlying Capability isn't "Barber," and isn't "Chair" — it's **Resource / Staff Scheduling**.
Ask "what's the difference between Clinic and Barber?" and the honest answer isn't a different
Calendar — it's that both already use the same Reservation Capability, just with a different label on
who the resource is: Clinic → doctors (`Resource`), Barber → staff (`Barber`), and — his own
hypothetical, not yet real — a future Spa → therapists, a future Gym → trainers. **This is exactly
the situation `feedback_build_twice_before_abstracting` already governs**: Clinic (`Resource`) and
Barber (`Barber`) are the two real, independently-built cases this project deliberately did NOT merge
yet (see [[project_reservation_capability_stable]]) — Spa and Gym are still hypothetical, not real
third/fourth cases. **This note names the pattern for when a real third case shows up** (a Spa or Gym
tenant actually gets built) — it is not, by itself, a trigger to unify `Resource` and `Barber` into
one model now. Recorded here so the vocabulary ("Resource / Staff Scheduling" as the general
Capability name, not "Barber") is ready the moment that real third case exists, without re-deriving
this reasoning from scratch.

## ✅ Keep

- Per-resource/per-barber conflict-checking logic → `app/services/reservation_service.py:120-138,200-205`
- `Reservation` model shape (customer info, `reservedAt`, `durationMin`, status) →
  `prisma/schema.prisma:675-728`
- Old zip's working-hours + slot-duration config *idea* (`Client.startTime/endTime/slotDuration`) —
  the concept, not the code
- Old zip's slot-generation algorithm *shape* (`get_available_slots`/`get_nearest_slots` — respects
  service duration, existing bookings, and "now") — the concept
- Old zip's reschedule/cancel as first-class booking operations (`update_booking_time`,
  `cancel_booking`) — a real gap in the new system, worth reintroducing as a pattern

## ❌ Remove

- `hr`'s current checkout path (`POST /store/cart` → `POST /store/orders`) as the system-of-record
  for anything requiring a date/time — fine as e-commerce, wrong home for reservation-type items
- `app/api/v1/public/bookings.py` — looks like dead code, `SmarBookingDrawer.jsx` never calls it —
  confirm before deleting, don't generalize
- `ReservePage.jsx`'s current shape (a generic date/time form with no service/barber context) — the
  page exists, but the interaction model it offers isn't a real end-to-end flow

## 🟦 Missing Capability

- ~~Working hours — zero concept anywhere in the new system~~ **CORRECTED 2026-08-02, P0 sweep**:
  `Barber.workingHours` / `Resource.workingHours` (`Json?`) already exist in the schema
  (`prisma/schema.prisma:787`), and `reservation_service.py`'s `_check_working_hours()`
  (lines 80-96) already validates a requested time against them (`closed_days`/`open_time`/
  `close_time`). What's actually missing is narrower than previously stated: this only
  *validates* one candidate time — there is still no function that *generates* a list of open
  slots for a day. Real remaining gap: a slot-generator that iterates candidates and reuses this
  already-working validator, not a new Working Hours concept from scratch.
- **Slot generation / availability computation** — nothing today computes "here are the real open
  times" for a given day
- **Service + staff selection combined in one flow** — confirmed absent from `ReservePage.jsx`
  directly (no picker of either kind)
- **A link between `CatalogItem` and `Reservation`** — no shared identifier exists at all today, so a
  catalog "service" item has no way to even point at the booking system
- **Conversational/WhatsApp-native booking** — the old zip's paradigm (customer books entirely inside
  a WhatsApp chat, session state keyed by phone, no web form). A real, different UX pattern the
  current platform has never had — worth naming explicitly, not necessarily worth building now
- **Multi-staff Calendar UI** — the `Barber` model already exists at the schema level, but no
  Calendar view anywhere renders more than one linear timeline; a real, confirmed `hr` requirement
  (see Product Note above), not a hypothetical future case

## 🎯 Target Architecture

**Frontend**
- Reservation Calendar (public-facing date/time picker) — **staff-column-aware from the start**, even
  at one staff member, per the Product Note above
- Service + Staff Picker (the missing bridge between Catalog and Reservation)
- Availability display (surfaces real open slots, not a blind date/time input)

**Backend**
- `reservation_service.py` (already real — extend, don't replace)
- Availability / slot-generation engine (new — the old zip proved the shape, nothing live today)
- A `CatalogItem` ↔ `Reservation` link (new — smallest possible bridge, not a redesign of either
  model)

**Shared Models**
- `Reservation`, `Barber`, `Resource` (already real, keep)
- `WorkingHours` (new — doesn't exist as a model anywhere today)
- A booking-required marker on `CatalogItem` or equivalent link (new)

**Tenant Customization**
- Branding/colors (existing pattern, unchanged)
- Staff/employee list per tenant
- Working hours per tenant
- Service catalog per tenant (already exists via `CatalogItem`)

# Customer Booking Flow Review — `rk` `/reserve` (Phase 3.5, Pass 1)

Real Playwright browser (mobile 390×844) + direct backend probing. Two nested-browser passes plus
direct `curl` verification, per `investigation-protocol.md`'s Runtime Before Assumption.

## Confirmed Findings

1. **Steps 1–3 of the real `BookingPage` flow (service → barber → calendar date) are genuinely
   good product UX** — numbered sections, consistent single-selection visual language (green fill
   + checkmark) across all three pickers, "available days shown in black" caption is a real
   affordance most booking UIs skip, today pre-selected and visually distinct from past/other days.
   Verdict for this segment: **✅ Keep as-is.**
2. **`GET /reservations/availability` fails intermittently and severely** — direct `curl` probes
   (not just the browser session) across 7 real date requests for `حسين`
   (`f64ce71e-682c-4f3c-b17d-5fc48e0adaf5`) returned: 3× `500 INTERNAL_ERROR`, 2× a real, correct
   200 (`24 slots, 09:00–20:30, 30-min increments`), and **1× a full 2-minute hang with no response
   at all** (command timeout, not a fast failure). The same date (Aug 13) returned both a 500 (in
   the browser session) and a clean 200 (in direct curl) on different attempts — confirms genuine
   intermittency, not a per-date data issue.
3. **This rules out a slot-generation/business-config bug.** When the endpoint succeeds, it returns
   full, correct, real slot data — `حسين`'s working hours are populated and the engine works
   correctly. The problem is entirely the DB connectivity layer, matching this project's own
   long-standing, never-root-caused "recurring Supabase pooler flakiness" (named in memory/
   `todo_list.md` for weeks) — now confirmed to be directly blocking real customer bookings, not
   just an occasional annoyance.
4. **The frontend cannot distinguish "genuinely no slots" from "the request failed."** Both a real
   `200` with an empty array and a `500`/hang render the identical message: "لا توجد مواعيد متاحة
   في هذا اليوم — جرّب يوماً آخر" (no appointments available today, try another day). A real
   customer hitting a bad pooler moment sees a fully-booked-looking calendar for every day they try
   and has no way to know the site is actually broken, not the barber's schedule.
5. Because of #2–#4, the flow is **structurally unreachable past date-selection under real
   conditions today** — could not verify the Summary Card's final state, the WhatsApp-vs-on-site
   confirm split, the actual submit network call, or the `InlineConfirmation` screen. Confirmed at
   the DOM level: both confirm buttons stay `disabled=true` with no time slot selected, so this
   isn't a missed click — the rest of the flow is genuinely unverified, not assumed-fine.

## Side Findings

- Pass 1 of this review (before this document's direct-curl follow-up) hit the *other* known
  fallback path: a `barbers` 500 flipped `useReservationBooking.js`'s `mode` to `'legacy'`,
  rendering the old dark-theme flat form (no service/staff/calendar) instead of `BookingPage`.
  `mode = barbersLoading ? 'loading' : (barbers.length > 0 ? 'booking' : 'legacy')`
  (`useReservationBooking.js:120`) does not distinguish "barbers fetch failed" from "tenant
  genuinely has zero staff" — both silently degrade to the same inferior, separately-broken legacy
  flow (its own submit returned a real `400` in Pass 1, no reservation created, nothing to clean
  up). This is a second, independent frontend gap from #4 above — same root symptom class (pooler
  failure → silently wrong UI/message), two different code paths.
- No frontend tap-target/scroll evaluation was completed for the populated time-slot grid or the
  on-site confirm form, since the flow never reached that state under real conditions — an honest
  gap, not assumed passing.

## Unknowns

- Whether the Supabase pooler flakiness has a real, fixable root cause (connection pool sizing,
  retry/backoff policy, a specific query pattern) or is an external constraint of the current
  Supabase plan/tier — not investigated here; this review only confirms the symptom and its real,
  severe downstream product impact.
- The WhatsApp-vs-on-site confirm behavior, the actual reservation-creation network call, and the
  `InlineConfirmation` screen remain fully unverified (see Confirmed Finding #5) — needs a re-run
  once availability is reliably reachable, or a mocked/seeded path if backend reliability can't be
  guaranteed for the retest.

## Recommendation (not a decision — Salman's call)

Before continuing the planned UX/Product Review sequence (Admin dashboard, Staff-scoped passes),
this finding is a real Production Blocker, not a UX opinion: **a real customer today has a
meaningful chance of seeing "no appointments available" on every date they try, for a reason that
has nothing to do with the barber's actual schedule.** This sits squarely in the roadmap's own
"what production-ready means" definition (no data-correctness/silent-failure gaps) and arguably
outranks the routine Admin/Staff review passes in urgency, since it threatens whether a real
booking can be completed at all — the core function of the product before 2026-08-31.

Two independent things would need to happen to close this, and they're different kinds of work:
1. Root-cause/mitigate the Supabase pooler flakiness itself (backend/infra).
2. Fix the frontend's error-masking — distinguish a real empty day from a failed request in both
   `useReservationBooking.js`'s `mode` fallback and the availability-empty-state message (small,
   clear frontend fix, does not require #1 to be solved first — it at least stops lying to the
   customer about *why* nothing is available).

Not started — flagging for a sequencing decision, per the roadmap's own "no redesign/fix work
starts before the verdict is reported" rule, extended here since this is a bug rather than a UX
verdict but the same discipline applies: report first, decide second, execute third.

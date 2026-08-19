# Pilot Decision — the one open question that actually matters right now

Not a technical question. A business decision, explicitly Salman's to make — this document lays out
the real options and a recommendation, it does not decide.

## The question

Should `hr`'s first real Pilot be a **Retail Pilot** or a **Reservation Pilot**?

Naming matters here on purpose: SalmanSaaS was never meant to be a QR menu — it's a services
platform. A Pilot that only sells physical products doesn't test that core value proposition. Calling
it a "Store Pilot" would quietly blur that distinction for anyone reading this in two months —
**"Retail Pilot"** is the honest, narrower name for what that option actually tests.

## Option A — Retail Pilot

`hr` sells `منتجات العناية` (grooming products) via the real QR → browse → order → WhatsApp →
confirm flow, today. `الخدمات` (haircut, keratin) stay WhatsApp/inquiry-only — not bookable online —
until the Reservation bridge is built.

- **Tests**: the QR flow, the store checkout, the WhatsApp confirmation loop, real merchant
  reaction — with a real customer and a real merchant, immediately.
- **Doesn't test**: the actual Reservation Capability, the thing this platform is really meant to
  sell for a business like `hr`.
- **Available now**: the retail side of `hr`'s store was confirmed working this session (real
  products, real prices, real checkout).

## Option B — Reservation Pilot

Wait for the Reservation↔Catalog bridge, Working Hours, and the redesigned Calendar
(`strategic-decisions.md`) to actually be built and wired to `hr`, then Pilot the real
booking-an-appointment flow end to end.

- **Tests**: the real core value proposition — a customer actually booking a haircut, with real
  availability checking.
- **Doesn't test**: anything, until the engineering work above is done. Delays real customer/merchant
  evidence by however long that build takes, while the already-working retail side sits idle.

## Recommendation (not the decision)

**Option A — Retail Pilot now.** It produces real Pilot evidence immediately, using exactly what's
already proven to work, without waiting on engineering that hasn't started. The Reservation bridge
still gets built next regardless, per the already-established Capability Decisions sequencing
(`project_capability_layer_three_phases` in memory) — choosing Option A doesn't skip that work, it
just doesn't make the first real customer interaction wait on it.

## Final Decision: Reservation Pilot

Confirmed by Salman, 2026-08-02. Overrides the recommendation above (Retail Pilot) — this field is
the authoritative record, not the recommendation. The real Pilot for `hr` will test the actual core
value proposition: a customer booking an appointment end-to-end, with real availability checking.

This decision moves the project from **Investigation Only** into **Implementation Planning** — see
`.claudedocs/work/implementation_plan_reservation_pilot.md` for the build plan, itself gated behind a
separate approval before any production code is written.

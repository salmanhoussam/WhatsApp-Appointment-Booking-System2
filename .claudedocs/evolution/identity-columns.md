# Evolution — Identity Columns

How this platform stores the identity of a *person* — a tenant owner, a staff member, a customer —
and what goes wrong when a column demands one before the flow knows it.

---

## 2026-09-11

### Context

Two unrelated investigations ran back to back: an audit of the `clients` table (Salman could not log
into `barberlab-test` and found the table full of junk), and a root-cause on a merchant alert that
arrived reading *"الزبون: زبون واتساب / الرقم: عبر واتساب"*. They were expected to be separate
problems. They are the same problem.

### Discovery

**A `NOT NULL` constraint on an identity field, in a flow that legitimately does not yet know the
identity, does not prevent bad data — it mandates it.**

Two independent confirmed instances, neither predicted:

**1. `clients.phone` — `UNIQUE NOT NULL`.** Three different authors, in three different code paths,
independently invented the same workaround. The code states the reason outright:

```python
# app/services/demo_service.py:318-320
# Client.phone is UNIQUE NOT NULL — use a placeholder unique value.
placeholder_phone = f"demo-{slug}"        # → demo-demo-barber-6efb
```
Also `placeholder_{slug}` (`seed_unified_clients.py:83`) and `TODO_PHONE_{slug}`
(`onboard_anas.py:79`). Measured: **8 of 22 client rows** carried a value that is not a phone number.

**2. `reservations.customer_name` / `customer_phone` — `NOT NULL`.** The website's WhatsApp booking
path collects no identity — by an explicit 2026-08-02 product decision — so it stores a placeholder.
The hook says so in its own comment (`useReservationBooking.js:70-76`). Measured: **16 real
reservations** on two live tenants, customers their shops cannot call back.

Neither is sloppiness. In both cases the author knew, documented the reason, and had no other way to
satisfy the schema.

### Current understanding

The constraint was reached for as a *data-quality* guarantee and delivers the opposite. It cannot
distinguish "this value is missing because the flow is incomplete" from "this value is missing
because someone was careless", so it forces every incomplete flow to lie — and a lie that satisfies
a constraint is indistinguishable, at the database level, from the truth.

Two things follow, and both were adopted as decisions rather than left as observations:

- **The Seeder must stop and report a missing identity rather than substitute one**
  (`.claudedocs/decisions/client-tenant-identity-decision-gate.md`).
- **The website writes nothing at all until identity exists** — the hold begins when the WhatsApp
  message arrives, because that is the moment the phone number arrives
  (`.claudedocs/plans/reservation-whatsapp-handoff-and-customer-identity.md`, Phase 1).

The second is the sharper form of the lesson: the fix was not to relax the constraint, it was to
**stop creating the row before the identity exists**. Relaxing `NOT NULL` would have made the bad
data legal instead of making it unnecessary.

A related failure of the same family, found the same day: `clients.phone` is simultaneously the
shop's contact number, the inbound WhatsApp tenant-resolution key, and a uniqueness key — three
roles in one column, which is why one owner could not own two shops.

### Open questions

- Does the `UNIQUE` come off `clients.phone`, or does the column split by role? Deferred — it is a
  product question (may one owner own several shops? answered **yes**) whose schema consequence is
  not yet designed.
- `reservations.customer_*`: does a `hold` state carry identity from the start (so `NOT NULL` stays
  honest), or do the columns become nullable? The D1 decision — the hold is created **by** the
  arriving message, which carries the phone — means `NOT NULL` may survive untouched. That would be
  the cleanest outcome: the constraint kept, and no flow left that cannot satisfy it.

### Promoted?

**No — not yet.** Two confirmed instances meet this project's Abstraction Rule threshold
(`rules/team-roles.md`) for *naming* the pattern, which is what this entry does. It does not yet
justify an ADR: the shape of the remedy is still being decided per-case, and ADR-0005's own
precedent is that a repeating *problem* is not the same as a converged *solution*.
Revisit if a third independent instance appears.

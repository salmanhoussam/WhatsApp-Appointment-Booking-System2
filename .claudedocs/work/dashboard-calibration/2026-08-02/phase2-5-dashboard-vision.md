# Dashboard Product Readiness Calibration — Phase 2.5: Dashboard Vision

Runs before Phase 3 (industry research) — deliberately. Salman's own instruction: form the product's
own opinion first, using the real Phase 1+2 evidence, so external references (Square, Fresha, Booksy,
Shopify Admin, Stripe, Notion, Linear) can only *sharpen* this vision later, never replace it.
**Phase 3 stays frozen until this is reviewed.**

No code. No visual design. These are structural wireframes only — where information goes, not what it
looks like.

## The real root cause, deeper than any single page

Not a CSS/UI problem — a **mental-model mismatch**. A shop owner opening the dashboard in the morning
asks, in order: *who's coming in today → what's next this hour → what's running low → are there new
orders.* The current Overview tab answers a different question first — sales totals — before any of
those four. Every 🔴/🟡 verdict below is a symptom of that same mismatch, not four unrelated problems.

---

## Reservations (🔴 Needs Redesign) — combining List + Calendar into one view

**Why**: two separate problems compound each other. The List view's "today" default produces a false-
empty state (real bookings exist, just not today) — a data-filtering problem. The Calendar view is
structurally right (real week grid, real names, real times) but shows only a name per block, and was
built assuming a single timeline — which the Product Note below shows is the wrong shape for this
tenant.

**Product Note — Multi-Staff Scheduling** (full reasoning in
`.claudedocs/work/capability-reference-extraction/2026-08-02/reservation.md`): `hr` has two people
working simultaneously (owner + one employee). What gets booked is the **Staff Member**, not the
chair — a staff member has their own hours, time off, and skills; the chair is just a resource. Start
with one staff column today, but the layout itself must not assume a single timeline.

**Wireframe — Calendar, one staff member (today's real state)**:
```
            Hassan
09:00   ┌─────────────────────┐
        │ أحمد                 │
        │ Haircut · 45 min     │
        └─────────────────────┘
09:45   ┌─────────────────────┐
        │        فارغ          │
        └─────────────────────┘
10:00   ┌─────────────────────┐
        │ محمد                 │
        │ Beard · 20 min       │
        └─────────────────────┘
10:30   ┌─────────────────────┐
        │ سارة                 │
        │ Coloring · 90 min    │
        └─────────────────────┘
```

**Same layout, extended to a second staff member — no structural change, just another column**:
```
            Hassan                    Ali
09:00   ┌───────────────────┐   ┌───────────────────┐
        │ أحمد                │   │ محمد                │
        │ Haircut · 45 min    │   │ Beard · 20 min      │
        └───────────────────┘   └───────────────────┘
09:45   ┌───────────────────┐   ┌───────────────────┐
        │       فارغ          │   │ خالد                │
        └───────────────────┘   │ Haircut · 30 min    │
                                 └───────────────────┘
```

**Tapping a booking opens** (same shape Salman described in the original walkthrough, +staff when
there's more than one): Name, Phone, Service, Time, Staff member (only shown once >1 exists),
WhatsApp button, "وصل" button, "تم" button. Nothing else.

**No more separate "list" view with a today-only default** — the calendar itself, defaulted to the
current week with today visually highlighted, replaces it. If a flat list is still useful (e.g. for
scrolling through history), it should default to "الكل," never to a today filter that can read as
broken.

---

## Catalog — Services (🔴 Needs Redesign)

**Why**: rendered identically to a physical product today — a name and a price in a table row. A
service is not a product: it has a duration, and selecting one should start a booking, not add a cart
line. This is the same distinction the Store vs. Reservation product note already draws — a service
without a duration on-screen visually erases that distinction.

**Wireframe**:
```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  💇              │  │  🧔              │  │  ✨              │
│  Haircut         │  │  Beard           │  │  Keratin         │
│  30 min          │  │  20 min          │  │  90 min          │
│  $15      Active │  │  $10      Active │  │  $60      Active │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```
Duration sits next to the name, not hidden in an edit form. "Active" status visible at a glance
(today it's implied only by the item existing at all).

---

## Catalog — Products (🔴 Needs Redesign)

**Why**: today, 3 of 4 real products show no image at all, and the one that does shows a tiny, cropped
thumbnail — worse than uniformly no images, because it reads as broken rather than simply plain.

**Wireframe**:
```
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│              │   │              │   │              │
│   [image]    │   │   [image]    │   │   [image]    │
│              │   │              │   │              │
├──────────────┤   ├──────────────┤   ├──────────────┤
Hair Wax             Shampoo              Cologne
$15                  $12                  $22
```
Image on top, name below, price below that — exactly Salman's own spec from the first calibration
message. Edit/Delete move to a tap/hover action on the card, not permanent buttons on every row.

---

## Not redrawn here (🟡 Improve, not 🔴 Redesign — per Phase 2.5's own scope)

- **Overview** — the deeper "why" is captured above (today-first, not sales-first), but per Salman's
  own phase structure, a wireframe is only drawn for 🔴 pages. Revisit once the Reservations redesign
  above is settled, since "today's appointments" likely becomes Overview's new lead content.
- **Orders, Settings** — real gaps already named in Phase 1+2 (test data leaking into the UI, no
  Working Hours section) are data/content issues, not layout redesigns — no wireframe needed.

---

## Explicitly still frozen

No comparison against Square Appointments, Fresha, Booksy, Shopify Admin, Stripe Dashboard, Notion,
or Linear yet. Phase 3 starts only after this document is reviewed — its job when it does start is to
sharpen the wireframes above, not replace them.

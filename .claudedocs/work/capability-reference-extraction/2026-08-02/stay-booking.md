# Stay / Unit Booking Capability

## References

- **`smar`** (Beit Smar) — the only real reference; no second tenant runs this shape today.

## What exists today

A fully separate, smar-exclusive `Booking`/`Unit`/`Property`/`Price`/`Customer` model family
(`prisma/schema.prisma:152-343`) — **no relation at all** to the Reservation Capability's models.
Real live calendar/price lookup, real server-fired WhatsApp confirmation, real admin inbox with a
soft-lock and one-click decision. Structurally a different Capability from appointment booking, not
an alternate implementation of the same one — see `reservation.md` for why smar was ruled out as a
Barber reference this session.

## ✅ Keep

- Unit + date-range + add-on-services selection → `SmarBookingDrawer.jsx:215-239`
- Live calendar/price computation → `GET /{slug}/units/{id}/calendar`, `GET /{slug}/price`
- Server-fired WhatsApp confirmation (not client-only, unlike Store/Restaurant's pattern) →
  `public_service.py:499-510`
- Admin inbox pattern: 15-min soft-lock countdown, one-click Confirm/Reject →
  `ActionInbox.jsx:350-558`

## ❌ Remove

- `arrivalTime` as a free-text string — not real time data, should be a real field or dropped
- `app/api/v1/public/bookings.py` — apparent dead parallel router (`SmarBookingDrawer.jsx` doesn't
  call it), confirm and likely discard, same finding as in `reservation.md`

## 🟦 Missing Capability

- Customer-side self-service cancel/modify — only admin-side Confirm/Reject was confirmed this
  session; customer-facing change/cancel was not checked either way, flagged not asserted
- Multi-unit / combo booking — not checked, likely absent, flagged only
- Whether `paymentMethod`/`paymentReference` fields are wired to real payment processing, or exist
  as schema-only placeholders — not confirmed this session

## 🎯 Target Architecture

**Frontend**
- Property/Unit Browser (already real, keep shape)
- Availability Calendar (already real)
- Booking Drawer (already real, keep shape)

**Backend**
- `public_service.py`'s booking-creation path (already real)
- Price/Availability repository (already real)

**Shared Models**
- `Unit`, `Property`, `Price`, `Booking`, `Customer` (already real) — this Capability's models stay
  structurally separate from the Reservation Capability's, confirmed not worth merging

**Tenant Customization**
- Unit types per tenant (villa/chalet/pool/restaurant)
- Pricing calendar per tenant
- Branding

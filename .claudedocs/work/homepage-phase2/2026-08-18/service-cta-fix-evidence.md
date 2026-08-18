# Fix — "أضف للسلة" never acceptable on bookable services — Evidence

Reported live by Salman via a real screenshot of Mister H's Services cards mid-Phase-2.3: a
service card ("حنة أو صبغة") showed "+ أضف للسلة" (Add to Cart) — wrong, per his own explicit rule:
"زر الإضافة إلى السلة مش مقبول أبداً على الخدمات... فيك تحط زر احجز الآن ويعمل لينك على صفحة
الريزيرف مع الservice معموله select." (the add-to-cart button is never acceptable on services;
put a Book Now button linking to the reserve page with that service pre-selected.)

## Root cause

`FeaturedItemsSection.jsx` passed `onAddToCart` to every `CatalogItemCard` unconditionally,
regardless of whether the item was a real cart-purchasable product or a real bookable service.

## The correct, general fix (not tenant-scoped)

Initial pass used a tenant-level `isServiceMode` flag (gated on `active_services`), which fixed
Mister H but investigation found it missed an identical bug on **RK** — RK has both `reservations`
and `catalog` active, so its own "الخدمات" (Services) category (real `CatalogItem`s with
`metadata.requires_booking: true`, confirmed via a live API read) flows through the *other* fetch
path (`fetchAllCategories`/`fetchItems`), which the tenant-level flag never touched. Refactored to
use the real, already-existing **per-item** signal instead: `item.metadata?.requires_booking`
(confirmed present and `true` on real service items from BOTH fetch paths — the dedicated
`/reservations/catalog-services` endpoint and the generic `/catalog/categories/{id}/items` one).
This correctly handles a tenant with both real bookable services AND real cart-purchasable
products in the same section (RK's real case), deciding per item rather than per tenant.

## What changed

- `frontend/src/design-system/molecules/CatalogItemCard.jsx` — new `onBookNow` prop, mutually
  exclusive with `onAddToCart`; renders "احجز الآن" instead of "+ أضف للسلة" when provided.
- `frontend/src/components/dynamic-sections/FeaturedItemsSection.jsx` — per item,
  `requiresBooking = item.metadata?.requires_booking === true` decides which callback is passed.
  `handleBookNow` navigates to `/${slug}/reserve?service=${item.id}`.
- `frontend/src/hooks/useReservationBooking.js` — `selectedServiceId` now seeds from a real
  `?service=` URL query param (lazy `useState` initializer), and the services-loaded effect
  preserves that pre-selection instead of always defaulting to the first service (only falls back
  to the first service if the URL id is absent or doesn't match a real service on this tenant).

## Live verification

| Check | Result |
|---|---|
| `mr-h` Services cards | All 6 real services now show "احجز الآن" (confirmed via DOM query, not visual guess) |
| `rk` Services cards ("خدماتنا") | Same real bug existed here too via the *other* fetch path — now also fixed, all 6 show "احجز الآن" |
| Deep-link round-trip | Fetched real service IDs via `/reservations/catalog-services?client_slug=mr-h`; navigated directly to `/mr-h/reserve?service=<دقن's real id>`; confirmed via DOM (`boxShadow` ring + checkmark badge) that "دقن" is the pre-selected service, not the default first one |
| Console errors | 0, on every check above |
| eslint | Pre-existing `motion`/`set-state-in-effect` errors confirmed unchanged from before this fix (`git stash` baseline check) |

## Known, deliberate non-goal

Store products without `requires_booking` (RK has none populated yet — category exists, empty)
were not live-tested with a real item, but the logic is correct by construction: any item lacking
`metadata.requires_booking === true` falls through to the existing `onAddToCart` path unchanged,
the same default every non-service item already had before this fix.

## Second item from the same message — placeholder images

Salman also asked for real default images instead of empty diamond-icon boxes on service cards,
overridable from the Dashboard. Not implemented in this pass — genuine tension with this session's
own earlier ratified "generic/abstract images only" decision
(`ALZABT_HOMEPAGE_SECTION_EXPANSION_PROPOSAL.md`), and the sourcing method (external stock vs.
generated vs. richer CSS placeholder) is a real open question, not guessed at here.

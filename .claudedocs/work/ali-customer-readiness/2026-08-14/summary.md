# Ali Customer-Readiness — Re-confirmed, 2026-08-14

Follows `investigation-protocol.md`. Does not rewrite or supersede
`.claudedocs/work/ali-customer-readiness/2026-08-08/summary.md` — that doc's findings and
recommendation stand; this is a fresh, dated re-check confirming they're still current, plus one
new finding, per this project's evidence-immutability convention. Origin: Salman asked to resume
Ali onboarding (separate item, `RESERVATION_PRODUCTION_ROADMAP.md` step 6, unrelated to Alzabt).

## Confirmed — nothing has changed since 2026-08-08

Live queries against the current DB/API (real, not inferred):

- `GET /api/v1/public/ali/config` — `config: {}`, `primary_color: null`, `whatsapp_number: null`,
  `active_services: ["reservations", "booking", "whatsapp_ordering"]` — no `catalog`/`store`.
- `GET /api/v1/admin/barbers/{ali-barber-id}/services?client_slug=ali` (real admin JWT) —
  `data: []`. **0 `BarberService` rows** — "Ali" (the barber) is assigned to none of the 6
  existing services.
- `GET /api/v1/admin/catalog/categories?client_slug=ali` → `403 FORBIDDEN — Service 'catalog' is
  not activated for this tenant` — confirms the service-key gap is still real and unresolved.
- Admin login (`admin@ali-barber.local`) required a password reset
  (`python -m scripts.reset_hr_admin_password --slug ali --password password123`) — the
  2026-08-05 seed script's documented password no longer worked. Same script/pattern already used
  for RK earlier this session; scoped to one tenant's `TENANT_ADMIN` row only.

## New finding — the 6 `CatalogService` rows are placeholder data, not real pricing

`GET /api/v1/public/reservations/catalog-services?client_slug=ali` — all 6 services (شعر، شعر
ودقن، كرياتين، دقن، تمشيط أو تسريح، حنة أو صبغة) are priced flat at **$5.00 each**, regardless of
real duration (15 to 90 minutes). This is consistent with the 2026-08-08 doc's own conclusion that
these rows are an incidental side effect of the old `CatalogItem`→`CatalogService` migration, not
a real, deliberately-priced setup — now confirmed with concrete evidence (the flat price itself),
not just inferred from the migration's mechanics.

## Decision (Salman's, this session)

**Hold — do not assign "Ali" to the 6 services yet.** Assigning the barber to services still
priced as placeholder data would formalize misleading configuration, not real progress. No
business data invented on Ali's behalf.

## Standing tenant-configuration items — explicit, unchanged, require real input (not invented)

1. `BarberService` assignments — hold until pricing is real.
2. `catalog`/`store` activation — real product decision (does Ali's shop sell retail products?).
3. Real per-service pricing — replace the flat $5 placeholder.
4. `settings.json` + real `page_content.json` (branding, page copy).
5. `primary_color`.
6. WhatsApp number.

None of these were touched or guessed at. This investigation is scoped to Ali only — no Alzabt
surface (Calendar, Demo Builder, `/alzabt`, root IA) was reopened or touched.

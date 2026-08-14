# Phase 2 — Extraction Evidence

**Boundary, as approved**: `provision_barber_domain(client_id, barber_name, services)` — both
arguments required, no default content inside the shared function. Demo Builder decides what
content to pass; the shared function only knows how to turn given content into real rows.

## What changed

- **New**: `app/services/provisioning_service.py` — `provision_barber_domain()`, the extracted
  mechanism. Pure — no hardcoded service list, no placeholder name, no idempotency guard, no
  `provisioning_status` write (none needed yet; Demo Builder is still its only caller and has no
  retry path today — building one now would be speculative infrastructure with nothing to protect,
  per the same Abstraction Rule this whole arc has held to throughout).
- **Changed**: `demo_service.py`'s `_seed_demo_barbershop()` now computes the same `barber_name`
  it always did and calls the shared function with `_BARBERSHOP_SEED_SERVICES` (unmoved, still
  lives in `demo_service.py` — it's Demo Builder's own content decision, not the shared
  mechanism's). Unused imports (`Json`, `barber_repo`, `catalog_service_repo`,
  `barber_service_repo`) removed — their only real usage was the code just extracted.

Two structural defaults were judged, not silently assumed, to belong inside the shared function
rather than being required arguments — flagged explicitly, not hidden: the category's fixed name
("الخدمات"/"Services" — every Barber-vertical tenant needs a category, this label isn't
demo-flavored the way the barber's own name or price list are) and default working hours
(09:00–20:00, no closed days — a starting point any tenant edits via the Dashboard afterward, same
as the rest of its Content-layer config). Named here for visibility; revisit if this reads
differently to Salman than it did during extraction.

## Impact map (before any edit)

`_seed_demo_barbershop()` had exactly one real caller anywhere in the codebase —
`_seed_demo_catalog()`'s `business_type == "barbershop"` branch, itself called only from
`create_demo_tenant()`. Zero risk of an unexpected consumer.

## Live regression evidence

Real, live HTTP call to the actual Demo Builder endpoint (`POST /api/v1/public/demo/create`), the
same one a real visitor hits, running the post-extraction code:

```
Request:  business_type=barbershop, name_ar="اختبار الاستخراج فيز 2", name_en="Phase2ExtractionTest"
Response: 200, slug=demo-phase2extractiontest-8628
```

Resulting real domain objects, checked via the same public, reservations-native endpoints a real
customer's booking flow uses:

```
GET /public/reservations/barbers
  → 1 barber: "الحلاق الرئيسي — اختبار الاستخراج فيز 2"  (matches the exact naming template)

GET /public/reservations/catalog-services
  → 6 services, exact order and content match to _BARBERSHOP_SEED_SERVICES:
    شعر/Haircut, لحية/Beard Trim, شعر ولحية/Haircut & Beard, كرياتين/Keratin Treatment,
    تصفيف/Styling, صبغة/Hair Color

GET /public/{slug}/config
  service_type: barbershop
  active_services: [booking, catalog, reservations, whatsapp_ordering]
```

Direct DB check (once a connection succeeded — this environment's own pooler flakiness recurred
again during this round, same pre-existing condition as Phase 1/Backfill): `vertical='barber'`,
`provisioning_status=None` — both exactly as expected, neither touched by this round's scope.

**Byte-identical to the pre-extraction shape** — every field, every count, every name, matches
what `_seed_demo_barbershop()` produced before this round. Test tenant cleaned up immediately
after verification (not a real tenant, this round's own artifact).

## What was NOT done, exactly per instruction

- Phase 3 not started — Self-Registration is not wired to `provision_barber_domain()`.
- No batch-level idempotency guard built (named as deferred, not silently skipped — see above).
- `provisioning_status` is not written by this round.
- P0.1 and Section System untouched.
- No second hidden assumption found beyond the two flagged (category name, working hours) — both
  judged low-stakes and structural, not the kind the boundary finding was about; extraction was not
  stopped a second time.

# Existing-Tenant Vertical Classification — Proposal Only

**Status:** Proposal only. **No `Client.vertical` write for any existing tenant. No backfill
executed.** Per Salman's explicit instruction: before any backfill, classify each existing tenant
with real evidence, never inference from an already-unreliable field (`service_type`). Answers
step 4 of the approved sequence (A ✅ done, commit `e5e031c` → this step → separate approval →
backfill). P0.1 remains HOLD, untouched by this document.

**Method**: a real, live, read-only inventory of all 31 tenants currently in the database (32 minus
one orphaned test artifact from this session's own debugging, cleaned up as housekeeping — see
Note at the end). For each: `service_type`, `templateKey`, real active `client_services`, real
`Barber` row count, real `CatalogService` row count — the actual, checkable facts, not a guess from
a name or a single field.

---

## The important note recorded first, as instructed

**Self-registration now correctly activates `reservations`, but still does not create real
`Barber`/`CatalogService` rows.** The fix landed in `e5e031c` closes the *capability-activation*
gap (Break A) — a self-registered Barber-template tenant now gets `reservations` in its
`client_services`, matching what the Demo Builder already does. It does **not** touch
`_seed_demo_barbershop()` or any equivalent — that seeding logic lives only in `demo_service.py`,
never called from the self-registration path. Concretely: **"choosing Barber" during
self-registration is now correct at the capability level, but not yet a complete provisioning
experience the way Demo Builder is** — a self-registered Barber tenant has `reservations` active
but zero bookable staff/services until someone (the business owner, or a developer) adds them
manually via the Dashboard's Staff tab. This is the real, concrete gap behind Salman's own
question — whether Demo Builder and Self-Registration need a single, unified provisioning
contract — which stays explicitly deferred until after this classification is resolved, per his
instruction.

---

## Tier 1 — Real, evidenced Barber-vertical candidates

Every tenant below has **all three** of: `reservations` active, at least one real `Barber` row,
and real `CatalogService` rows shaped like Barber offerings (haircut/beard/etc., not placeholder
text). This is the same evidence bar the Demo Builder's own `_seed_demo_barbershop()` produces —
not inferred, directly observed.

| Slug | Real name | `service_type` today | Barbers | CatalogServices | Active services | Evidence |
|---|---|---|---|---|---|---|
| `rk` | RK Barber Shop | `barbershop` | 2 | 6 | booking, catalog, reservations, store, whatsapp_ordering | Real production tenant, this project's own Reservations reference implementation |
| `ali` | صالون علي للحلاقة | `services` | 1 | 6 | booking, reservations, whatsapp_ordering | Reclassified as a demo tenant (2026-08-14), market-researched real pricing; `service_type='services'` is itself the live, confirmed instance of the self-registration bug this arc traced |
| `alzabt-demo` | صالون عالزبط | `barbershop` | 2 | 6 | booking, catalog, reservations, whatsapp_ordering | The project's own canonical Alzabt demo/reference tenant |
| `demo-barber-a484` | صالون تجريبي فحص | `barbershop` | 1 | 6 | booking, catalog, reservations, whatsapp_ordering | Demo Builder trial tenant, 2026-08-12 |
| `demo-barber-c57f` | صالون بلايرايت التجريبي | `barbershop` | 1 | 6 | booking, catalog, reservations, whatsapp_ordering | Demo Builder trial tenant, 2026-08-12 |
| `demo-barber-5513` | صالون فحص الحد الثالث | `barbershop` | 1 | 6 | booking, catalog, reservations, whatsapp_ordering | Demo Builder trial tenant, 2026-08-12 |
| `demo-barber-82d5` | صالون فحص الحد الرابع | `barbershop` | 1 | 6 | booking, catalog, reservations, whatsapp_ordering | Demo Builder trial tenant, 2026-08-12 |
| `demo-barber-f93b` | فحص حد 1 | `barbershop` | 1 | 6 | booking, catalog, reservations, whatsapp_ordering | Demo Builder trial tenant, 2026-08-12 |

**A real, honest split inside this tier, worth Salman's own call, not decided here**: `rk`, `ali`,
and `alzabt-demo` are the three tenants this entire investigation arc has actually been about —
real or reference-quality, worth backfilling on their own merit. The five `demo-barber-*` rows are
14-day trial artifacts from Demo Builder load/limit testing (their own names — "فحص الحد الثالث,"
"فحص حد 1" — literally translate to "threshold check #3," "limit check #1"); their trial windows
(created 2026-08-12) are likely already expired or near it. Whether backfilling disposable,
possibly-expired trial tenants is worth doing at all — versus simply letting them age out — is a
housekeeping question, not a classification one; named here so it isn't silently bundled into "7
tenants to backfill" without Salman noticing 5 of them are throwaway test artifacts.

---

## Tier 2 — Out of scope, `vertical` should correctly stay `null`

Real, live, non-test tenants whose real business shape is retail or restaurant, not a Reservations
vertical at all — per the already-ratified scope decision (`vertical` stays Reservations-only for
now, per `ALZABT_VERTICAL_REGISTRY_ARCHITECTURE.md`'s Decision #4). Assigning any of these a
vertical would be a scope violation, not a classification — named here to close the list, not to
propose action.

| Slug | Real name | Real shape |
|---|---|---|
| `smar` | (real estate) | `real_estate`, luxury villas/chalets — a different domain than Reservations entirely |
| `cafe` | كافيه | `restaurant` |
| `caracas` | كاراكاس | `restaurant`, real production tenant |
| `footlab` | فوتلاب | `ecommerce`/store, real production tenant |
| `olivello` | أوليفيلو | `ecommerce`/store, real production tenant |
| `arizona` | أريزونا | `restaurant`, real production tenant |
| `beit-al-fakhar` | بيت الفخار | `ecommerce`/store, real production tenant |
| `tastybites` | تيستي بايتس | `restaurant` (0 real catalog data — likely also a test artifact, see Tier 3 note) |

---

## Tier 3 — Cannot be classified from evidence alone; needs a human decision, not inference

Every tenant here either has genuinely ambiguous evidence, or is a known disposable test artifact
already documented as such elsewhere in this project — assigning either a vertical without
Salman's explicit call would be exactly the guessing he asked not to do.

| Slug | Real name | Why it can't be auto-classified |
|---|---|---|
| `roz` | (unreadable — stored as mojibake, `service_type='services'`) | Zero real `Barber`/`CatalogService` evidence, name itself unrecoverable from the DB as stored — genuinely unknown, not just unlabeled |
| `barberlab-test` | (no name set) | Real `Barber` rows (2) exist, but this is the explicit, already-documented disposable test tenant from the Barber-vs-Resource architecture comparison (`.claudedocs/evolution/reservation-capability.md`, 2026-07-31: *"kept for now... safe to delete whenever it's no longer needed"*) — a hygiene/deletion candidate, not a real business to classify |
| `pilot-test-20260720` | مطعم تجريبي - اختبار الطيار الأول | Has `reservations` active but **zero** `Barber` rows and `templateKey='food-restaurant'` — this is a restaurant-table-reservations pilot, a shape the current `VERTICAL_REGISTRY` (Barber only) has no entry for at all; forcing it into `'barber'` would be actively wrong |
| `test-fashion`, `test-catalog-fix`, `magic-test`, `assi`, `sneakers-lb`, `sneakers-beirut`, `store-pilot-test-20260727`, `store-pilot-20260731`, `bohussein-redirecttest-1786113608`, `bohussein-test-1786114296` | (various) | All confirmed test/pilot artifacts by name and by zero real `Barber`/`CatalogService` data — not Reservations-shaped at all (retail-only), same reasoning as Tier 2, listed separately here only because their names make "is this a real tenant" itself a real question, not because their vertical is ambiguous |

---

## Recommendation

1. **Tier 1's real three (`rk`, `ali`, `alzabt-demo`)** are the only backfill candidates with both
   strong evidence *and* real product significance — recommend these as the actual scope of any
   backfill, whenever separately approved.
2. **The 5 `demo-barber-*` trial artifacts** — recommend a explicit, separate decision from Salman:
   backfill them too (cheap, consistent), or exclude them as expiring/expired trial noise not worth
   the write. Either is defensible; not decided here.
3. **Tier 2 stays `null` permanently**, not as a temporary gap — this is the correct, scoped state
   under the current architecture, not a pending classification.
4. **Tier 3 gets no vertical from this process.** `roz` and `barberlab-test` are real hygiene
   questions (unreadable data; a documented disposable test tenant) worth their own small decision,
   separate from vertical classification. `pilot-test-20260720` is genuine evidence that a second
   real Reservations vertical shape (restaurant-table booking) already exists in this database and
   isn't Barber-shaped — worth keeping in mind whenever Clinic/Beauty (or a "Restaurant
   Reservations" vertical) gets its own `VERTICAL_REGISTRY` entry later, not something to force into
   `'barber'` now.

## What this document does not do

- Does not write `Client.vertical` for any tenant.
- Does not decide whether Demo Builder and Self-Registration need a unified provisioning contract
  — explicitly deferred, per Salman's own instruction, until this classification is resolved.
- Does not decide `barberlab-test`'s or the 5 `demo-barber-*` tenants' disposition — named as real,
  separate, small decisions, not folded into "the backfill."

**Housekeeping note, not part of the classification**: one additional orphaned test tenant from
this session's own earlier debugging (`demo-verticalregistrytestrestaurant-b7c6`, empty
`client_services`, missed in an earlier cleanup pass) was found during this inventory and deleted —
it was never a real tenant, created and abandoned within this session, not existing tenant data.

---

Stopping here, per instruction. Waiting for a decision on Tier 1's scope (3 vs. 8) before any
backfill executes, and waiting on the separate, still-deferred unified-provisioning-contract
question.

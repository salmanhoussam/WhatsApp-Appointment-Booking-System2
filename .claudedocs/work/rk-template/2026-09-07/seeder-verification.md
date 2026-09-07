# RK Template Seeder — end-to-end verification

**Rule applied (Salman, 2026-09-07):** *"لا نختبر كوداً جديداً على عملاء حقيقيين أبداً."*
Two throwaway tenants were created on production, verified, and deleted immediately.

## Run 1 — `rk-template-selftest` (template defaults)

```
barbers            2  (expect 2)      ← D1
catalog_services   6  (expect 6)
catalog_items      5  (expect 5)
barber_services   12  (expect 12)     ← 2 × 6, every barber to every service
H3 stale clientId  0  (MUST be 0)
F1 service currency {'USD'}
✅ ALL CHECKS PASSED
```

**The D1 number is the point.** RK itself holds 3 links of which 2 belong to an inactive barber —
**one bookable combination out of 21**. The template produces **twelve**.

## Run 2 — `rk-selftest-sar` (`--currency SAR --primary-color #123456 --barbers "أحمد,خالد"`)

Run 1 did **not** actually prove F1: the template's currency is USD, so deriving and hardcoding
give the same answer. A second run with a different currency was needed.

```
F1 service currency {'SAR'}  (expect {'SAR'})
barber_services   12
H3 stale clientId  0
✅ ALL CHECKS PASSED
```

**F1 proven.** Under the previous hardcoded `"USD"` literal these six services would have been
priced in dollars for a Saudi tenant, silently. D1/F3 overrides also confirmed working.

## 🔴 Real gap found — the template produces a tenant with no page

Public API and a real browser agree:

```
GET /public/rk-template-selftest/config  → 200
  active_services  ['reservations','store','whatsapp_ordering']  ✅
  config keys      [catalog_layout, font, hero, page_background, story, working_hours]  ✅
  content.sections 0                                              ❌
services 6 ['دقن','تمشيط أو تسريح','شعر']   barbers 2 ['سامي','زياد']
```

Browser on `demo.salmansaas.com/rk-template-selftest`:

> **«الصفحة قيد الإعداد. استخدم بناء الصفحة في لوحة التحكم لإضافة الأقسام.»**

The shell, nav and CTAs render; there is no content. **The tenant is bookable but pageless.**

This fails the project's own gate in `rules/tenant-onboarding.md` §7:

```
Client → User → Services → Settings → Page Content → Media → Public Page renders → Dashboard renders
```

The seeder covers **Client → User → Services → Settings** and stops. That rule was written after
exactly this failure hit RK Barber Shop on 2026-07-23.

**Not fixed here** — the template carries no `page_content`, and choosing its sections is a
content/product decision, not something to invent inside a verification run. Recorded as the
seeder's one known incompleteness.

## Teardown

`scripts/cleanup/drop_selftest_tenants.py` — hardcoded allow-list of exactly the two fixture slugs,
no argument can select a different one, and it refuses if either fixture ever acquired a real
reservation, customer or order. Deliberately **not** added to `delete_demo_test_tenants.py`, whose
asserted 17-slug list exists to stop precisely this kind of ad-hoc widening.

```
✅ no transactional rows on either fixture
deleted 2 client row(s) (children cascade)
remaining selftest tenants: 0 · total tenants: 20
```

---

# `mr-h` vs the template — Salman's request

| | mr-h | template |
|---|---|---|
| vertical | `barber` | `barber` ✅ |
| currency | USD | USD ✅ |
| services | 6 | 6 ✅ |
| **barber_services** | **10 of 12** | 12 |
| service_type | **`services`** | `barbershop` ❌ |
| primary_color | **`#6D28D9`** | `#2F4F4F` ❌ |
| client_services | `booking`, reservations, whatsapp_ordering — **no `store`** | reservations, **store**, whatsapp_ordering ❌ |
| store items | 0 | 5 |
| `requires_booking` fossils | **1** | 0 ❌ |
| content.sections | **9** ✅ | 0 (template seeds none) |

### What matters in that table

**`mr-h`'s 10/12 is probably correct, not broken.** The two missing links are both on `وديع `:
كرياتين and حنة أو صبغة. A barber who doesn't do keratin or colouring is a real thing. **This is
not RK's failure mode** — RK's 1-of-21 was two of three links pointing at an inactive barber.

**`primary_color = #6D28D9` is F3 caught in the wild.** That is `demo_service.py`'s hardcoded
default, not a chosen brand colour — mr-h was provisioned before F3 was parameterised.

**`service_type = "services"`** disagrees with the template's `barbershop`, and `client_services`
still carries `booking`, which gates nothing anywhere (established 2026-09-06). Both are legacy
provisioning residue, not active faults.

**Trailing space in `'وديع '`** — a real data-quality nit in a live tenant.

**mr-h has 9 content sections and the template has none** — the one place mr-h is *ahead* of the
template, and it points straight at the gap above.

## Unknowns

- The **booking flow itself was not exercised** on the fixtures — barbers/services were confirmed
  over the public API, but no reservation was created, because that writes transactional rows the
  teardown guard deliberately refuses.
- The **dashboard was not opened** for either fixture.

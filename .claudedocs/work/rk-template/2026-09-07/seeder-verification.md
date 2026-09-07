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

---

# D6 — page_content added, and verified in a browser

**Salman, 2026-09-07:** *"متجر تجريبي بدون واجهة هبوط هو منتج معطل بيعياً وتسويقياً."*

Four sections, the standard structure he named, written into `Client.config.content.sections`:

| order | type | data |
|---|---|---|
| 0 | `hero` | `title_ar` (substituted with the real shop name), subtitle, CTA, `bg_type: "color"` |
| 1 | `featured_items` | `heading_ar: "خدماتنا"`, limit 6 — **Services** |
| 2 | `staff` | `heading_ar: "فريقنا"` — **Barbers** |
| 3 | `products` | `heading_ar: "منتجاتنا"`, limit 6 — **Products** |

**Every one is data-driven and needs no uploaded media.** Hero falls back to a colour background;
the other three each fetch their own rows from the API the seeder has just populated. **RK's own
section media was deliberately not copied** — its URLs sit on a different Supabase project and in
one of the three drifted storage folders this template already excludes. Nothing is fabricated.

`{{name_ar}}` is the only placeholder, substituted at seed time so the hero shows the real name from
the first render.

## Verified — fixture `rk-selftest-page`

```
D6 page sections   4 (expect 4) ['hero','featured_items','staff','products']
barber_services   12 · H3 stale 0 · F1 {'USD'}      ✅ ALL CHECKS PASSED
```

Real browser on `demo.salmansaas.com/rk-selftest-page`:

```
emptyState        false          ← was true before D6
rootLen           41,909         ← was 13,340
headings          صالون الاختبار · خدماتنا · دقن · تمشيط أو تسريح · شعر ·
                  شعر ودقن · حنة أو صبغة · كرياتين · فريقنا · منتجاتنا
barbers rendered  ['سامي','زياد']
products rendered ['واكس تصفيف الشعر','عطر ريحة رجالي']
CTAs              احجز ✅   أضف للسلة ✅
```

Screenshot: `rk-template-page-renders.png`. Fixture deleted immediately after.

**The template now satisfies `rules/tenant-onboarding.md`'s completion gate end-to-end:**
Client → User → Services → Settings → **Page Content** → Public Page renders.

## Side finding — the backend section enum is behind the renderer

`app/schemas/page_content.py:68-76` lists **9** section types. `DynamicPage.jsx:62-76` renders **15**.
`staff`, `products`, `hours`, `testimonials`, `offers` and `why_choose_us` render fine but are absent
from the enum — and `rk` itself already stores `products`, `hours` and `testimonials` rows, so the
enum is evidently not enforced on the path that writes them (config is written as raw JSON).

Not a blocker and not touched. Recorded because the next person to trust that enum as the list of
valid types will be wrong.

## Unknowns (unchanged)

- The booking flow itself was never exercised on a fixture — that writes transactional rows the
  teardown guard deliberately refuses.
- The dashboard was not opened for any fixture.

# Ali Demo — Populate from Real Market Research

Follows `investigation-protocol.md`. Origin: Salman reclassified `ali` from "real customer tenant
awaiting real data" (held earlier this same day, `.claudedocs/work/ali-customer-readiness/
2026-08-14/summary.md`) to "demo tenant meant to showcase the product convincingly" — with an
explicit condition: market-realistic data built from real research, never fabricated as if it
were Ali's own real business identity. Scoped to Ali tenant configuration only — no Alzabt surface
(Calendar, Demo Builder, `/alzabt`, root IA, Step 13) touched.

## Sources relied on

- **Fresha real Lebanon barber listings** (`fresha.com/lp/en/bt/barbers/in/lebanon`, fetched
  directly) — 5 real Beirut/Mount Lebanon shops with real advertised prices:
  - London Base Barbershop (Hazmieh) — Haircut $15, Haircut & Beard $25
  - Crew Cuts — Beard Trim $5, Haircut+Beard+Skin $15
  - The Chop House — Hair & Beard $15, Beard $7
  - Edy Atallah Men's Hair Specialist — Haircut $15, Haircut & Beard $20, Keratin "from" ~$30
    (LBP 2,700,000 at the ~90,000 LBP/$1 rate implied by this same source's other LBP/$ pairs)
  - The Fade Cartel Barber Shop — Beard $2, Buzz Cut $3, Skin Fade $7
- [Expatistan — Beirut men's haircut price index](https://www.expatistan.com/price/men-haircut/beirut)
- [Fresha — Best Barbers near me in Lebanon](https://www.fresha.com/lp/en/bt/barbers/in/lebanon)
- General hair-colouring price search (used only as an upper-bound sanity check for the henna/dye
  line, not a direct anchor — those results were dominated by full-salon color services, not a
  men's barbershop touch-up).

## Final dataset — 6 services, price built from the real range above, not copied from one shop

| Service (name_ar) | Duration (unchanged) | New price | Real-market anchor |
|---|---|---|---|
| شعر (Haircut) | 20 min | **$15** | Matches London Base ($15) / Edy Atallah ($15) directly |
| دقن (Beard) | 15 min | **$8** | Between Crew Cuts ($5) and Chop House/higher quotes ($7-10) |
| شعر ودقن (Hair & Beard) | 30 min | **$20** | Between Chop House ($15) and Edy Atallah/London Base ($20-25) |
| تمشيط أو تسريح (Styling) | 20 min | **$10** | Grooming add-on tier, below a full haircut |
| حنة أو صبغة (Henna/Dye) | 45 min | **$25** | Barbershop-tier touch-up, well below full-salon color ($95+) |
| كرياتين (Keratin) | 90 min | **$40** | Anchored to Edy Atallah's real "from ~$30" barbershop quote, priced up for the longer duration |

Deliberately not identical to any single real shop's own 3-4-tier price ladder — built as a
distinct set informed by the cluster of 5 real quotes.

## What was changed (all in `scripts/populate_ali_demo_data.py` + `scripts/seed_page_content.py`)

- **6 `CatalogService` prices**: $5.00 flat → the researched, varied prices above.
- **6 `BarberService` rows created**: "Ali" (the barber) assigned to all 6 services — was 0 rows,
  the exact gap held earlier this session pending real pricing.
- **`Client.primary_color`**: `null` → `#1C3D5A` (professional navy — a tenant's own brand color,
  distinct from RK's `#2F4F4F` and from Alzabt's own marketing Violet `#7C3AED`, which never
  applies to tenant-rendered surfaces per the Two Distinct Brand Layers principle).
- **`Client.config.content`**: populated via the real, existing onboarding pipeline
  (`scripts/data/ali/page_content.json` → `seed_page_content.py`, not a new ad-hoc structure) —
  hero, story, featured services, closing CTA. All copy is original demo text for a fictional
  "صالون علي للحلاقة," not lifted from any real shop's actual marketing copy.
- **`scripts/data/ali/settings.json`**: created, `_meta.note` explicitly states this is demo data,
  not a real registered business, and cites this summary file for sourcing.

## What was deliberately NOT done, and why

- **No WhatsApp number set** — stayed `null`. Salman's instruction allowed "a clear placeholder OR
  disabled"; disabled is the more conservative of the two explicitly-sanctioned options, so no
  number (real-looking or placeholder) was invented.
- **No `image_url` populated on any service** — researched Unsplash as a genuinely viable, clearly-
  licensed source (free, no attribution required, commercial use permitted), but chose not to use
  it this pass: every other tenant in this platform (RK, `alzabt-demo`, every Demo Builder tenant)
  uses the icon-only fallback, never photos. Adding real photography for Ali alone would be an
  inconsistent, one-off departure from the established pattern, and re-introduces exactly the
  "could look like it's misrepresenting a real place" risk Salman flagged as the top concern — for
  a cosmetic addition with no functional necessity. Deferred, not forgotten.
- **`catalog`/`store` service NOT activated** — no clear demo reason for this barbershop to also
  sell retail products. Matches Salman's own instruction to leave it disabled absent a clear
  reason.
- **No testimonials section** — the template shape supports one, but fabricated customer reviews
  with invented names would be closer to fabricating identity-adjacent content than market-
  realistic pricing is; skipped for the same reason as the WhatsApp number.

## Real browser verification (desktop + mobile)

**Booking page (`/ali/reserve`)** — clean:
- All 6 real prices/durations render correctly: شعر 15 USD, شعر ودقن 20 USD, كرياتين 40 USD, دقن
  8 USD, تمشيط أو تسريح 10 USD, حنة أو صبغة 25 USD.
- Barber "Ali" appears correctly in the selection flow and the summary panel.
- **0 console errors, 0 warnings.**
- Mobile (390×844): no horizontal overflow.
- Screenshots: `ali-demo-reserve-desktop.png`, `ali-demo-reserve-mobile.png`.

**Dashboard (`/ali/dashboard`)** — login and routing clean, one real bug found (see below):
- Real login (`admin@ali-barber.local` / `password123`, reset earlier this session) → correct
  canonical redirect chain → `/ali/dashboard/calendar`.
- Screenshot: `ali-demo-dashboard.png`.
- **`BarberService` assignment independently re-confirmed via the correct, working admin endpoint**
  (`GET /api/v1/admin/barbers/{id}/services?client_slug=ali`) — returns all 6 real service IDs.
  Not just inferred from the booking page rendering; verified directly a second way.

## Real bug found — NOT fixed, out of this thread's scope

**The Staff tab's own "الخدمات التي يقدمها [barber]" panel never loads**, stuck on "جاري
التحميل..." indefinitely. Root cause, confirmed via real console evidence: the frontend calls
`GET /api/v1/admin/catalog/categories?client_slug=ali` and `.../catalog/items?client_slug=ali`
(each fired twice — a separate, smaller duplicate-fetch issue) — both return `403 Forbidden`,
because those routes are gated behind `require_service("catalog")`, and `ali` correctly does NOT
have `catalog` activated (a reservations-only tenant, by design, per this same investigation).

This means: **the Staff↔Service admin UI is quietly broken for any tenant that doesn't also have
the `catalog`/`store` service active** — it queries the old `CatalogItem` admin routes instead of
the real, working, `CatalogService`-based `/api/v1/admin/barbers/{id}/services` endpoint (the one
used to verify the assignment above). RK happens to have `catalog`+`store` both active, which
masks this bug there; a reservations-only tenant like Ali exposes it directly. **Real, structural,
confirmed — but this is shared `GenericAdminDashboard`/`StaffTab.jsx` code, the exact Alzabt RC
surface this thread was explicitly told not to reopen.** Flagged here for a future, separate,
explicitly-approved fix — not touched.

## What remains missing (unchanged from the 2026-08-14 hold, explicit product decisions only)

- Real WhatsApp number (left disabled).
- Any photography (left icon-only, consistent with the rest of the platform).
- Testimonials (skipped, would require fabricating customer identities).

## Commit

Separate from all prior Alzabt/Ali work this session — see the accompanying commit for exact
files. Ali's own tenant data only; zero files under `frontend/src/pages/generic-admin/`,
`frontend/src/pages/alzabt/`, `frontend/src/pages/home/`, or `app/api/v1/public/demo.py` /
`demo_service.py` were touched.

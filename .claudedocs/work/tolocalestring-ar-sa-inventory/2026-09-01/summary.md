# Investigation — Remaining hardcoded `'ar-SA'` locale usage

**Date:** 2026-09-01
**Scope:** Read-only inventory of item #3 from the Unified i18n reconciliation
(`GenericAdminDashboard`/other tenants/schema explicitly excluded per Salman's own constraints).
No code edited, no refactor, no commit, no push, no deploy.

**Method:** `grep -rn "'ar-SA'" frontend/src --include="*.jsx" --include="*.js"`, then every match
read in its surrounding function/component context to determine (a) whether the file already has
`useAppLanguage()`/`lang` in scope, (b) who the text is for (customer vs. merchant/admin), (c)
whether it's live code or a comment. Also searched for `Intl.NumberFormat`/`Intl.DateTimeFormat`
with `'ar-SA'` (zero results) and for any existing shared formatter utility in `utils/`, `hooks/`,
`i18n/` (none found).

---

## Confirmed Findings

### Raw inventory — every match

35 raw lines matched `'ar-SA'` across 19 files. Of those, **8 lines in 5 files are already
migrated** (the `lang === 'ar' ? 'ar-SA' : 'en-US'` dynamic pattern, built in Phases 3/4/cleanup
this session): `design-system/atoms/PriceTag.jsx:47`, `design-system/molecules/
CatalogItemCard.jsx:238`, `design-system/organisms/CartDrawer.jsx:191,282`, `pages/catalog/
templates/CatalogList.jsx:90`, `pages/catalog/templates/CatalogShowcase.jsx:105`, `pages/generic/
normal/CartPage.jsx:67,558`. These are excluded from the "remaining" count below — listed here only
so the total (35) reconciles.

**Remaining hardcoded occurrences — file : line : context**

| # | File | Line | Call | 
|---|---|---|---|
| 1 | `pages/beit-al-fakhar/checkout/CheckoutPage.jsx` | 28 | `(item.price * item.quantity).toLocaleString('ar-SA')` |
| 2 | `pages/beit-al-fakhar/checkout/CheckoutPage.jsx` | 33 | `totalPrice.toLocaleString('ar-SA')` |
| 3 | `pages/beit-al-fakhar/checkout/ShowroomPanel.jsx` | 75 | `(item.price * item.quantity).toLocaleString('ar-SA')` |
| 4 | `pages/beit-al-fakhar/checkout/ShowroomPanel.jsx` | 103 | `totalPrice.toLocaleString('ar-SA')` |
| 5 | `pages/beit-al-fakhar/product/ProductPage.jsx` | 202 | `Number(item.price).toLocaleString('ar-SA')` |
| 6 | `pages/demo/DemoCatalogPage.jsx` | 104 | `Number(item.price).toLocaleString('ar-SA')` |
| 7 | `pages/demo/DemoCatalogPage.jsx` | 181 | `Number(item.price).toLocaleString('ar-SA')` |
| 8 | `pages/demo/DemoCatalogPage.jsx` | 250 | `Number(item.price).toLocaleString('ar-SA')` |
| 9 | `pages/demo/DemoPublicPage.jsx` | 87 | `Number(item.price).toLocaleString('ar-SA')` |
| 10 | `pages/demo/DemoPublicPage.jsx` | 149 | `Number(item.price).toLocaleString('ar-SA')` |
| 11 | `pages/demo/DemoPublicPage.jsx` | 208 | `Number(item.price).toLocaleString('ar-SA')` |
| 12 | `pages/footlab/spatial/SpatialHomePage.jsx` | 91 | `Number(item.price).toLocaleString('ar-SA')` |
| 13 | `pages/moments/MomentTemplate.jsx` | 119 | `new Date(page.event_date).toLocaleDateString('ar-SA', {...})` |
| 14 | `pages/generic-admin/components/ActivityFeed.jsx` | 25 | `Number(price).toLocaleString('ar-SA')` (`fmtPrice`) |
| 15 | `pages/generic-admin/components/KanbanBoard.jsx` | 81 | `new Date(iso).toLocaleTimeString('ar-SA', {...})` (`fmtTime`) |
| 16 | `pages/generic-admin/components/KanbanBoard.jsx` | 88 | `n.toLocaleString('ar-SA')` — **two call-sites on this one line** (both ternary branches) (`fmtPrice`) |
| 17 | `pages/generic-admin/components/TopItemsWidget.jsx` | 38 | `Number(val).toLocaleString('ar-SA')` (`fmtRevenue`) |
| 18 | `pages/generic-admin/tabs/OrdersTab.jsx` | 60 | `d.toLocaleDateString('ar-SA', {...})` (`fmtDate`) |
| 19 | `pages/generic-admin/tabs/OrdersTab.jsx` | 64 | `new Date(iso).toLocaleTimeString('ar-SA', {...})` (`fmtTime`) |
| 20 | `pages/generic-admin/tabs/OrdersTab.jsx` | 68 | `Number(val).toLocaleString('ar-SA')` (`fmtPrice`) |
| 21 | `pages/generic-admin/tabs/OverviewTab.jsx` | 120 | `Number(n).toLocaleString('ar-SA')` (`fmt`) |
| 22 | `pages/generic-admin/tabs/OverviewTab.jsx` | 208 | `Number(payload[0]?.value \|\| 0).toLocaleString('ar-SA')` (chart tooltip) |
| 23 | `pages/generic-admin/tabs/OverviewTab.jsx` | 290 | `Number(v).toLocaleString('ar-SA')` (chart Y-axis tick) |
| 24 | `pages/generic-admin/tabs/ReservationsTab.jsx` | 71 | `new Date(iso).toLocaleDateString('ar-SA', {...})` (`fmtDate`) |
| 25 | `pages/generic/normal/CartPage.jsx` | 220 | `(item.price * item.quantity).toLocaleString('ar-SA')` (already-known, see below) |
| 26 | `pages/generic/normal/CartPage.jsx` | 225 | `totalPrice.toLocaleString('ar-SA')` (already-known, see below) |

**Not a live occurrence:** `pages/generic-admin/tabs/ReservationsTab.jsx:73` matched `'ar-SA'` but
is a **comment**, not code — it documents a `toLocaleTimeString('ar-SA', ...)` call that was
already removed 2026-08-21 in favor of a shared `fmtTimeUTC` helper (per the comment's own text).
Not counted in the totals below.

### Classification, by group

**Group A — `beit-al-fakhar` checkout (#1–5, 5 occurrences, 3 files).** `CheckoutPage.jsx:28,33`
sit inside that file's own WhatsApp order-message builder (surrounding lines are hardcoded Arabic
`طريقة الدفع`/`العنوان`/`رقم الطلب` — a merchant-facing message, same shape as `CartPage.jsx`'s
already-established `buildStoreWhatsAppMessage()`) → **Category (b), intentionally fixed.**
`ShowroomPanel.jsx:75,103` and `ProductPage.jsx:202` are real customer-facing price displays, but
neither file imports `useAppLanguage`/has any `lang` variable anywhere — `item.name_ar` is also
hardcoded directly in both → **Category (a), genuinely language-dependent**, but each needs a
whole-file migration (add the context import, resolve names via `resolveTenantText`, etc.), not a
one-line swap — this is `beit-al-fakhar`'s own bespoke checkout system, never touched by any phase
of the RK-scoped work.

**Group B — `/demo/{slug}` auto-onboarding pages (#6–11, 6 occurrences, 2 files).**
`DemoCatalogPage.jsx` and `DemoPublicPage.jsx` are the auto-onboarded-trial-tenant rendering path
(`routing.md` §0: distinct from the registry-based tenant product). Zero `lang`/context anywhere in
either file → **Category (a)**, same whole-file-migration caveat as Group A. Different real
audience (trial signups, not an existing tenant's customers) than anything touched this session.

**Group C — `footlab/spatial/SpatialHomePage.jsx` (#12, 1 occurrence).** Footlab's own bespoke
spatial/3D presentation page — distinct from `footlab/normal/StorePage.jsx`, which Phase 3 already
migrated. No `lang` in scope → **Category (a)**, whole-file migration needed, not started.

**Group D — `moments/MomentTemplate.jsx` (#13, 1 occurrence).** The occasion-pages tenant module —
`dir="rtl"` is hardcoded directly on the page root, plus Arabic-only fallback copy. No `lang`
anywhere in the file → **Category (a)**, and the largest lift of any single file here (direction
itself is hardcoded, not just the date format).

**Group E — `generic-admin/*` (#14–23, 12 occurrences across 6 files — `ActivityFeed.jsx`,
`KanbanBoard.jsx`, `TopItemsWidget.jsx`, `OrdersTab.jsx`, `OverviewTab.jsx`, `ReservationsTab.jsx`).**
Every one confirmed merchant/owner-facing by its surrounding text (`منذ X د/س/ي` relative-time
strings, `الإيرادات` revenue label, order counts) — this is `GenericAdminDashboard.jsx`'s own tab/
component tree. Per the standing constraint that the Admin Dashboard is "new capability work, not
migration of a broken system," explicitly out of this arc → **Category (c), fixed for a real
business/scoping reason** (not because Arabic-only is judged correct long-term, but because the
whole Dashboard's labels/layout are Arabic-only today — changing just these date/price calls in
isolation would produce a half-English, half-Arabic screen, which is worse than the current
consistent state). Ties directly to the already-logged "Dashboard Auto-Translation" backlog item.

**Group F — `generic/normal/CartPage.jsx` (#25–26, 2 occurrences).** Already known and already
classified in Phase 3's own Implementation Log entry — inside `buildStoreWhatsAppMessage()`,
merchant-facing, deliberately left Arabic-only. Re-confirmed here only for this inventory's own
completeness, not a new finding.

### Shared-formatter check

**No shared price/date formatter utility exists anywhere in the codebase** (`utils/`, `hooks/`,
`i18n/` all checked — nothing named `formatPrice`/`formatCurrency`/`formatDate` outside the
reservation-flow-scoped `formatDate` built inside `useReservationBooking.js` this session, which is
private to that one hook, not exported for reuse). None of the 26 remaining occurrences are
"indirectly covered" by anything — every one is a locally-defined, independently-duplicated helper.

---

## Side Findings

- **Real, notable duplication inside Group E alone**: 5 near-identical local helper functions
  (`fmtPrice`/`fmt`/`fmtRevenue`, all doing `Number(x).toLocaleString('ar-SA')` plus an optional
  currency suffix) are independently redefined in `ActivityFeed.jsx`, `KanbanBoard.jsx`,
  `TopItemsWidget.jsx`, `OrdersTab.jsx`, and `OverviewTab.jsx` — plus 3 separate `fmtDate`/`fmtTime`
  helpers doing the same `toLocaleDateString`/`toLocaleTimeString('ar-SA', {...})` shape in
  `KanbanBoard.jsx`, `OrdersTab.jsx`, `ReservationsTab.jsx`. Noted as a real finding for whenever
  the Admin Dashboard's own i18n/formatting work is actually scoped — not something this
  investigation is proposing to extract now (no request made for that, and it's inside the
  explicitly-excluded Admin Dashboard).
- `KanbanBoard.jsx:88` is the one line in this whole inventory with **two** `'ar-SA'` call-sites
  (one per ternary branch) — worth knowing precisely if a future fix targets "line count" rather
  than "call-site count."
- `pages/generic-admin/tabs/ReservationsTab.jsx` already shows the *pattern* a future fix would
  follow for the rest of Group E: its own comment documents replacing a duplicated
  `toLocaleTimeString('ar-SA', ...)` with a shared `fmtTimeUTC` helper (in
  `reservationInteractions.jsx`) on 2026-08-21, specifically to stop disagreeing with the
  Calendar/Today views on timezone handling — precedent exists in this codebase for consolidating
  one of these duplicated formatters, just not yet for language.

## Unknowns

- Whether `beit-al-fakhar`, the `/demo/{slug}` funnel, `footlab`'s spatial page, and `moments` are
  ever intended to get bilingual support at all is a real product-scope question this
  investigation does not answer — each is a different bespoke surface with a different real
  audience, and no signal either way was given for any of them.
- Whether the Admin Dashboard's future i18n work (if scoped) would keep these 5+ duplicated
  formatter functions as-is or consolidate them into one shared helper is a design decision for
  that future work, not decided here.

---

## Answering the 5 required closing points

1. **Exact count of remaining occurrences:** **26 live call-sites** on 25 live code lines across
   **13 files** (one comment-only match in `ReservationsTab.jsx:73` excluded as not live code; 8
   already-migrated dynamic occurrences in 5 other files excluded as not "remaining"). 12 of the 26
   sit inside `GenericAdminDashboard.jsx`'s own component tree (6 files); the other 14 are spread
   across `beit-al-fakhar` (5), `/demo/{slug}` (6), `footlab/spatial` (1), `moments` (1), and
   `CartPage.jsx`'s already-known intentional pair (2, not new).
2. **Classification:** 12 sites (Group E, Admin Dashboard) → Category (c), fixed for a real
   business/scoping reason tied to the standing Admin Dashboard exclusion. 12 sites (Groups A–D,
   customer-facing bespoke tenant pages) → Category (a), genuinely language-dependent but each
   requires a whole-file migration, none started. 2 sites (Group A's `CheckoutPage.jsx`) + 2 sites
   (Group F, `CartPage.jsx`, already known) = 4 sites total → Category (b), intentionally fixed
   (merchant-facing WhatsApp messages). Zero sites classified (d) as live dead code (the one dead
   match found was a comment, not code, and is excluded from the count rather than classified).
3. **Safe candidates for a later migration (if/when approved):** the 5 Group A/B/C/D customer-
   facing *price-display* sites that are pure `toLocaleString` calls with no other Arabic-only
   coupling in their immediate vicinity (`ShowroomPanel.jsx:75,103`, `ProductPage.jsx:202`,
   `DemoCatalogPage.jsx:104,181,250`, `DemoPublicPage.jsx:87,149,208`, `SpatialHomePage.jsx:91`) —
   though each still needs its *file* to gain `useAppLanguage()` first, since none currently import
   it. `MomentTemplate.jsx` is the weakest candidate of this set (its whole page root direction is
   hardcoded, a bigger lift than the date call alone).
4. **Which should remain fixed:** the 4 merchant-facing WhatsApp-message sites (`CheckoutPage.jsx`
   ×2, `CartPage.jsx` ×2 already-known) — genuine business reason, not a gap. The 12 Admin
   Dashboard sites, for as long as the Dashboard itself has no i18n scoping decision — fixing only
   these calls in isolation would be incoherent against an otherwise all-Arabic screen.
5. **Ambiguous cases needing Salman's decision:** whether `beit-al-fakhar`, the `/demo/{slug}`
   trial funnel, `footlab/spatial`, and `moments` are meant to ever join the unified bilingual
   product at all — none of these were named in any prior instruction, and each is a structurally
   separate, bespoke surface (own theme, own layout, some with zero i18n architecture at all) where
   "migrate it" is a real, separately-scoped decision, not a mechanical continuation of RK's work.

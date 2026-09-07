# Unified Tenant Header — Session Handoff

**STATUS: INVESTIGATION COMPLETE / IMPLEMENTATION NOT STARTED.**

No code was written or modified in the session that produced this document. This is a full
handoff so a future session can implement Phase 2 onward without repeating Phase 1
investigation.

---

## 1. Objective

Create ONE canonical, reusable public tenant header (`TenantHeader`) that every tenant's public
pages can render with tenant-specific configuration — instead of Smar being the only tenant with a
polished header and every other tenant type having a separate, less complete nav component (or, in
the most important case, no header at all).

Smar's current header is the **visual reference** — not to be redesigned, only extracted/
generalized. This is a frontend public-header componentization task only. Backend, tenant
resolution, database/schema, Railway, authentication architecture, reservation logic, and WhatsApp
logic are explicitly out of scope and were not touched.

---

## 2. Phase 1 investigation results (summary)

Real investigation (reading actual files, checking actual imports, cross-referencing actual live
behavior observed earlier in the same session) found that the project already contains **two
separate, competing tenant-navigation systems** — not one header to extract and zero elsewhere:

1. `TenantHeader.jsx` — smar's real, already-generic-looking header component (visual reference),
   but with hardcoded Smar-shaped navigation.
2. `TenantModuleNav.jsx` — a second, already-existing, already-capability-aware nav component used
   by every non-Smar module tenant today (RK, footlab, and others), driven by a real, complete
   `getNavItems()` system.

**Building a new header from scratch, as the original task framing implied, would have created a
third competing component.** The correct direction — confirmed and agreed before this handoff — is
to merge the two existing ones, not invent a new one.

A third, independently significant finding: `DynamicPage.jsx` (the actual homepage real visitors
land on for RK, Mr H, and every generic tenant) currently renders **no header/nav at all** — see
§9.

---

## 3. Exact location of `TenantHeader.jsx`

```
frontend/src/design-system/organisms/TenantHeader.jsx
```

Already lives in the **shared** design-system folder, not a Smar-specific directory. Currently
imported by exactly two files, both Smar-only:
```
frontend/src/templates/ShowcaseTemplate.jsx   → route /smar/showcase
frontend/src/templates/ListingsTemplate.jsx   → route /smar/listings
```
The task's own visual reference (logo/name, Home/Units/Gallery/Contact, AR/EN toggle, profile
icon, gold "BOOK NOW" button) was directly confirmed against a real live screenshot of
`/smar/listings` taken earlier in the same session (see
`.claudedocs/implementation/BILINGUAL_AUDIT/evidence.md`'s own screenshot of this same page, taken
during the immediately-preceding Bilingual Audit task).

Smar's *other* pages (`/smar/spatial`, `/smar/gallery`) use their own separate spatial-specific
header components (`pages/smar/spatial/SmarHeader.jsx`, `pages/smar/showcase/ShowcaseHUD.jsx`) —
cinematic/GSAP spatial pages, not the reference UI this task describes. Out of scope; not touched,
not part of this consolidation.

---

## 4. Exact role of `TenantHeader.jsx`

Already substantially generic, not hardcoded to Smar's identity:
- Reads `name_ar` / `name_en` / `logo_url` / `whatsapp_number` from `useTenantConfig()` — the
  component's own doc comment states *"Zero prop drilling — works for any slug on any route."*
- Uses `useTenantSlug()` / `useTenantBase()` (`frontend/src/hooks/useTenantSlug.js`) for all
  routing — **not** hardcoded `/smar/...` paths anywhere in the component.
- Real language toggle: local `lang` state (`'ar' | 'en'`), sets `dir={isRtl ? 'rtl' : 'ltr'}` on
  the `<header>` element itself, every visible label already has both an `ar` and `en` string.
- Profile/login button → opens `GlobalAuthModal` (`design-system/organisms/GlobalAuthModal.jsx`,
  427 lines, real implementation, calls real `POST /public/{slug}/auth/login` — genuine
  customer-facing auth, tenant-scoped via the same `useTenantSlug()`, already generic).
- "Book Now" CTA → opens WhatsApp (`wa.me/{whatsapp_number}`) with a prefilled bilingual message.
- Responsive: desktop `<nav>` row + `md:hidden` mobile hamburger with its own dropdown panel, both
  already implemented.
- Imports only already-generic shared pieces: `Button` (`design-system/atoms`) and
  `GlobalAuthModal` — nothing Smar-specific in either.

**The one genuinely Smar-specific part** — and the only thing that actually needs to change:
```js
const NAV_LINKS = [
  { ar: 'الرئيسية',   en: 'Home',    action: () => navigate(`${base}/showcase`) },
  { ar: 'الوحدات',    en: 'Units',   action: () => navigate(`${base}/listings`) },
  { ar: 'معرض الصور', en: 'Gallery', action: () => navigate(`${base}/gallery`) },
  { ar: 'تواصل معنا', en: 'Contact', action: () => { /* opens WhatsApp */ } },
];
```
Hardcoded, identical for every tenant regardless of type — real-estate-shaped ("Units"), which is
wrong for a restaurant/barber/store tenant.

---

## 5. Exact location/role of `TenantModuleNav.jsx`

```
frontend/src/design-system/organisms/TenantModuleNav.jsx
```

Own header comment, verbatim (real, first-party documentation of exactly this split):
> *"Sticky top nav for restaurant/store module tenants. Reads active services from
> useTenantConfig() and renders nav links dynamically from the service-catalog... Used by:
> MenuPage (caracas), StorePage (footlab), and any future module tenants. NOT used by smar — smar
> has its own spatial TenantHeader."*

Confirmed via real import search — currently used by:
```
frontend/src/pages/footlab/normal/StorePage.jsx
frontend/src/pages/generic/normal/CartPage.jsx
frontend/src/pages/generic/normal/CatalogPage.jsx
frontend/src/pages/generic/normal/ReservePage.jsx
frontend/src/pages/beit-al-fakhar/product/ProductPage.jsx
frontend/src/pages/beit-al-fakhar/checkout/CheckoutPage.jsx
frontend/src/components/Footer.jsx
```
i.e. this is what RK's, Mr H's, and footlab's Cart/Reserve/Catalog pages actually render today —
directly confirmed live, multiple times, earlier in this same session during the Functional Sweep.

What it has that `TenantHeader.jsx` doesn't: real capability-aware nav items (§6). What it lacks
compared to `TenantHeader.jsx`: no logo, no language toggle, no profile/login button, no Book Now
CTA. It renders `item.labelAr` unconditionally — never `labelEn` — so it isn't actually bilingual
in practice today either, despite the data supporting it.

---

## 6. How `getNavItems()` currently works

```
frontend/src/config/service-catalog.js
```

`TenantModuleNav` gets its nav items from `useTenantConfig()`'s own `navItems` field
(`frontend/src/hooks/useTenantConfig.js:91`):
```js
navItems: getNavItems(resolved.active_services ?? [], resolved.slug ?? slug),
```

`getNavItems(activeServices, slug)` is a real, complete, already-correct capability-aware nav
generator — a static lookup table (`SERVICE_CATALOG`) keyed by the tenant's real `active_services`
(the same `client_services` bridge-table data this whole session's backend work has used
throughout). Already covers every tenant type this task names:

| `active_services` key | labelAr / labelEn | route |
|---|---|---|
| `booking` (real estate — smar) | الوحدات / Units | `/{slug}/listings` |
| `gallery` | المعرض / Gallery | `/{slug}/gallery` |
| `restaurant` / `restaurant.menu` (caracas) | القائمة / Menu | `/{slug}/menu` |
| `store` (footlab) | المتجر / Shop | `/{slug}/store` |
| `catalog` (generic services — RK, mr-h) | الخدمات / Services | `/{slug}/catalog` |
| `reservations` (barber/clinic — RK, mr-h) | احجز موعد / Book | `/{slug}/reserve` |

Granular dot-notation keys (e.g. `restaurant.table_booking`, `store.loyalty`) exist too and
correctly suppress their parent module key when present, to avoid duplicate nav entries. Sorted by
a `priority` field already defined per entry. Every entry already has **both** `labelAr` and
`labelEn` — the bilingual data for navigation already fully exists; only the *consumer*
(`TenantModuleNav`) never uses the English half.

`getServiceRoute(serviceKey, slug)` and `MODULE_KEYS` are two more exports in the same file, not
directly relevant to the header but noted for completeness — not touched, not needed for this task.

---

## 7. Which parts of the two components should be merged

Agreed direction (not yet implemented):

- **Keep from `TenantHeader.jsx`** (the visual/behavioral reference, per the task's own explicit
  "do not redesign" instruction): logo/name row, language toggle UI, profile/login button, Book
  Now CTA button, responsive desktop-nav + mobile-hamburger structure, all existing spacing/
  typography/visual hierarchy.
- **Replace `TenantHeader.jsx`'s hardcoded `NAV_LINKS`** with `TenantModuleNav.jsx`'s proven
  `navItems` (from `getNavItems()`), rendering `isRtl ? item.labelAr : item.labelEn` — both fields
  already exist, this is a genuine "finally use data that's already there," not new logic.
- **Book Now visibility**: gate on the same condition `DynamicPage.jsx` already uses today
  (`activeServices.includes('reservations')` — see that file's own `reserveHref` construction) —
  reuse this exact existing condition rather than inventing a new one. Real estate tenants
  (`booking` capability) may need their own equivalent check — confirm against how Smar's current
  Book Now decides visibility before assuming the same single condition covers both cases.
- **Cart**: leave alone entirely (§11) — not part of the header merge.
- **Language state**: leave as local `lang` state, unchanged from `TenantHeader.jsx`'s current
  behavior (§12) — explicitly not attempting language-system consolidation in this task.

---

## 8. Which existing behavior must remain unchanged

Per the task's own explicit list — restated here as the acceptance bar for the merge:
- Visual appearance: spacing, typography, button hierarchy, responsive breakpoints, visual
  hierarchy — identical to current Smar `TenantHeader.jsx` rendering.
- Navigation behavior and active states.
- Book Now CTA behavior (opens WhatsApp with a prefilled message, using `config.whatsapp_number`).
- Profile/Login behavior (opens the real `GlobalAuthModal`, unchanged).
- AR/EN local-state toggle behavior (still works exactly as it does today — a local, per-header
  toggle, not wired to a shared context).
- Tenant-aware routing via `useTenantSlug()`/`useTenantBase()` — no hardcoded slugs anywhere in
  the shared component.
- No change to any backend endpoint, tenant-resolution logic, reservation logic, or auth API
  contract — the header only *calls* existing, unmodified APIs (`GET .../config`,
  `POST /public/{slug}/auth/login`), same as it does today.

---

## 9. `DynamicPage.jsx` finding

```
frontend/src/pages/generic/normal/DynamicPage.jsx
```

This is the real homepage every generic tenant's visitor lands on first (`/rk`, `/mr-h`, and any
tenant onboarded under the current canonical architecture per `rules/frontend/routing.md`).
**Confirmed: it imports neither `TenantHeader` nor `TenantModuleNav` — no header/nav component at
all.** Only its *secondary* pages (`CartPage.jsx`, `ReservePage.jsx`, `CatalogPage.jsx`) render
`TenantModuleNav`. Directly cross-checked against this session's own earlier live browser evidence
of RK's real homepage (hero section → content sections → footer, no persistent top nav bar until
navigating to `/rk/cart` or similar).

**Consequence for the implementation**: this isn't purely a "swap header A for header B" task on
already-header'd pages. The single most important page in the whole product currently has no
header at all — the next session must *add* one, not just replace one.

---

## 10. Caracas special-case finding — RESOLVED 2026-08-31

**Correction to the earlier §10 note above (kept for history, not deleted per this project's
documentation norms):** the "fourth, separate `t()` translation mechanism" hypothesis was
**unconfirmed at the time it was written** and is now **disproven by direct inspection**.

**Evidence — no `t()`/i18n mechanism exists in caracas:**
```
grep -rn "useTranslation|LanguageContext|const t |function t(|import.*translations| t(\`| t('" \
  frontend/src/pages/caracas/
→ zero matches
```
Every caracas page's copy (nav labels, hero text, CTAs, footer) is a hardcoded Arabic string
literal, with `dir="rtl"` set once at the page root — the identical pattern the 2026-08-30
Bilingual/RTL Audit already found across the rest of the product
(`.claudedocs/implementation/BILINGUAL_AUDIT/evidence.md`). Caracas is not a special i18n case; it
is one more instance of the same already-documented gap.

**1. Which Caracas public pages render a header/nav:**
| Page | Route | Header? |
|---|---|---|
| `pages/caracas/normal/HomePage.jsx` | `/caracas/home` | Own inline `<nav>`, lines 54-79 |
| `pages/caracas/normal/SpecialPage.jsx` | `/caracas/special` | Own inline `<nav>`, lines 19-47 — near-duplicate of HomePage's nav (different red/white token set), not shared even between caracas's own two pages |
| `pages/caracas/normal/MenuPage.jsx` | `/caracas/menu` | **None** — starts directly with a hero + sticky category-filter bar (filters items, not a site nav — no links elsewhere) |

**2. Which component renders it:** No shared component. Each of `HomePage.jsx`/`SpecialPage.jsx`
inlines its own raw `<nav>` JSX directly in the page file. Neither imports `TenantHeader.jsx` nor
`TenantModuleNav.jsx` — confirmed via `caracas.routes.jsx` (only imports `HomePage`, `SpecialPage`,
`MenuPage`, the *generic* `CartPage`/`ReservePage`, and `CaracasAdminDashboard`; no design-system
header import anywhere in the caracas route tree).

**3. `t()` translation system:** Does not exist (see Evidence above). §10's original note is
corrected.

**4. Compatible with `useTenantConfig().navItems`?** Structurally yes — caracas is a `restaurant`
module tenant, and `service-catalog.js` already carries real `restaurant`/`restaurant.menu` entries
(`labelAr: 'القائمة'`, route `/{slug}/menu`) — the same mechanism RK/Mr H/Footlab already use. But
nothing on caracas's pages currently reads `navItems` — its nav is 100% hand-built, twice.

**5. Can the shared `TenantHeader.jsx` support Caracas without coupling to a caracas-specific
translation implementation?** Yes, trivially — there is no such implementation to couple to, so
that specific risk the earlier note worried about does not exist. The real risk is **visual, not
architectural**: `HomePage.jsx`/`SpecialPage.jsx` are bespoke, full-bleed cinematic pages (own color
tokens per page — `#EA580C`/`#C8821A` amber-orange vs. `#CF0F1E` red — parallax hero, ticker, story
reel) where the nav is baked into that specific page's visual composition (transparent bar over a
hero image, page-specific accent color), not a generic content-page utility bar. Swapping either
page to the shared `TenantHeader.jsx` changes their shipped visual identity — out of this task's
Strict Scope ("Do NOT touch... unrelated UI... unrelated cleanup").

**6. Decision — Caracas remains a documented special case, not touched this pass:**
- `HomePage.jsx` and `SpecialPage.jsx` → **SPECIAL CASE**. Keep their own bespoke inline nav
  as-is. Not a translation-coupling risk (disproven); a visual-identity-preservation call instead,
  consistent with the same protection this task already gives Smar's own visual design.
- `MenuPage.jsx` → **known, separate, deferred gap** (no header/nav at all — same shape as the
  `DynamicPage.jsx` finding in §9, not a caracas-specific issue). Not in Step 3's named integration
  list (Smar/RK/Mr H/Footlab) and not addressed in this implementation pass; flagged for a future
  session, not silently dropped.

**No blocker found.** Proceeding to Step 2 (shared header implementation) and Step 3 (Smar/RK/Mr H/
Footlab integration) as planned.

---

## 11. Cart behavior that must remain unchanged

`DynamicPage.jsx` already has a separate, working, capability-gated cart implementation, unrelated
to either header component:
```js
const showCart  = hasOrderCapability(activeServices)   // utils/capabilities.js
// ...
{showCart && <CartBadge count={cartCount} ... />}       // design-system/molecules/CartBadge
{showCart && <CartDrawer isOpen={cartOpen} ... />}       // design-system/organisms/CartDrawer
```
A floating badge + slide-in drawer, not integrated into any header/nav bar. Already correctly
capability-gated (`hasOrderCapability`). **Per Phase 8's explicit instruction to follow existing
patterns rather than invent new configuration architecture, and per no concrete reason found to
change working behavior: leave this exactly as it is.** The shared `TenantHeader` does not need to
render, own, or know about the cart — `DynamicPage.jsx` (or whichever page) keeps mounting
`CartBadge`/`CartDrawer` alongside the new header, independently, same as today.

---

## 12. Language-system decision

The same session's immediately-preceding Bilingual Audit
(`.claudedocs/implementation/BILINGUAL_AUDIT/evidence.md`) already found **three** separate,
non-consolidated `LanguageContext.jsx` implementations in this codebase (main app legacy,
marketing app, showcase app), confirmed the real product (`DynamicPage.jsx`) has **no** working
language toggle today at all (Arabic is hardcoded via inline `direction: 'rtl'` styles throughout),
and live-verified that the one reachable legacy toggle (on Smar's own `/smar/listings` page)
produces a broken, half-translated result when actually used.

**Explicit decision for this task**: do not attempt to fix or consolidate any of that here. The
merged `TenantHeader` keeps `TenantHeader.jsx`'s own existing local `lang` state exactly as-is —
this is a minimum-safe-change per the original task's own Phase 4 instruction ("First determine the
minimum change required... language architecture consolidation can be a separate task"). It
regresses nothing (nothing today depends on a shared language context for the real product) and
does not expand into the much larger, already-separately-flagged "unify all i18n systems" work.

---

## 13. Implementation record — executed 2026-08-31

The plan below (kept for history) was superseded during execution once real inspection (§10 and a
fresh read of every routing file) showed the actual page landscape was narrower than assumed:
`footlab/normal/StorePage.jsx` is **dead code** (zero real importers — `footlab.routes.jsx` routes
`/footlab/store` through the generic `CatalogPage.jsx` instead), and `CatalogPage.jsx`/
`CartPage.jsx`/`ReservePage.jsx` already had working, capability-aware headers (`TenantModuleNav`,
confirmed by Step 1's own verification to already share the identical `navItems` data source) —
so "swap them to `TenantHeader`" would have been exactly the "blindly replace existing headers"
the task explicitly forbade, for zero functional gain. The real gap was narrower and more precise:
**one page, `DynamicPage.jsx`, had no header of any kind.** Executed sequence:

1. `TenantHeader.jsx` — replaced the hardcoded `NAV_LINKS` array with `navItems` from
   `useTenantConfig()`. Desktop + mobile nav now render `navItems.map(item => ...)`, labelAr/labelEn
   switched by `isRtl`, `onClick={() => navigate(item.route)}` — the exact pattern already proven in
   `TenantModuleNav.jsx`. The old hardcoded "Home" and "Contact" links are gone (they aren't
   `client_services`-gated features, so `getNavItems()` never produced them): the brand/logo is now
   a clickable button (`onClick={goHome}`, `navigate(`/${slug}`)`) to preserve equivalent "back to
   home" functionality without inventing a second nav array; "Contact" is superseded by the
   pre-existing Book Now CTA, which already opens WhatsApp — left unmodified. Accent color was
   **deliberately left as the fixed gold `#d4a853` chrome** (not parameterized to
   `config.primary_color`) — the task's instruction was to reuse `navItems`, not add per-tenant
   theming, and `Button`'s `gold` variant (`design-system/atoms/Button.jsx`) is a fixed Tailwind
   class set, not prop-configurable; changing that would be a real, unrequested design-system
   change. Every tenant that gets `TenantHeader` today shares one consistent premium dark-glass-gold
   chrome, matching what Smar already ships.
2. `DynamicPage.jsx` (`frontend/src/pages/generic/normal/DynamicPage.jsx`) — imported and rendered
   `<TenantHeader />` as the first element inside the root div; added `paddingTop: 64` to that same
   root div's inline style (matches the header's `h-16` = 64px) so the trial ribbon, sections, and
   footer all shift down uniformly, in their original relative order — the ribbon is not hidden
   behind the fixed header (live-verified on `/demo/rk`, see §16).
3. No other files were touched. `TenantModuleNav.jsx`, `service-catalog.js`, `CatalogPage.jsx`,
   `CartPage.jsx`, `ReservePage.jsx`, `footlab/normal/StorePage.jsx` (dead code, left as-is —
   deleting it is a separate hygiene decision, not part of this task), `beit-al-fakhar`'s
   `ProductPage.jsx`/`CheckoutPage.jsx` (not named in the task's tenant list) — all read-only or
   untouched, confirmed via `grep` before and after.

**Superseded original plan (kept for history, not deleted):**
<details>
Read caracas's actual page files first (§10) → in `TenantHeader.jsx` replace `NAV_LINKS` with
`navItems` → verify Smar unchanged → wire into `DynamicPage.jsx` → switch `CartPage.jsx`/
`ReservePage.jsx`/`CatalogPage.jsx`/`footlab/StorePage.jsx` from `TenantModuleNav` to `TenantHeader`
→ classify `beit-al-fakhar` separately → live-verify → only then treat `TenantModuleNav.jsx` as
superseded. Steps 1–2 executed as planned; step 3 confirmed via live verification (§16); steps 5–6
were **not executed** — see the correction above for why (already-working headers, one dead-code
file, "do not blindly replace" applies).
</details>

## 14. Files actually touched this pass

```
frontend/src/design-system/organisms/TenantHeader.jsx      MODIFIED — navItems-driven nav, clickable brand/logo → home
frontend/src/pages/generic/normal/DynamicPage.jsx           MODIFIED — <TenantHeader /> added, paddingTop: 64 added
.claude/docs/implementation/UNIFIED_TENANT_HEADER/evidence.md   MODIFIED — this file
```
Everything else named in the earlier "files expected to be touched" list (§ below, kept for
history) was **read, not modified** — `TenantModuleNav.jsx`, `service-catalog.js`/`getNavItems()`,
`CatalogPage.jsx`, `CartPage.jsx`, `ReservePage.jsx`, `footlab/normal/StorePage.jsx`,
`pages/caracas/normal/*.jsx`.

**Page classification (task's required scheme):**

| Page | Tenant(s) | Classification | Why |
|---|---|---|---|
| `templates/ShowcaseTemplate.jsx`, `templates/ListingsTemplate.jsx`, `pages/smar/gallery/SmarGalleryPage.jsx` | Smar | **SHARED HEADER** | Already rendered `<TenantHeader />` before this task; now correctly capability-driven instead of hardcoded. No page-level change needed — fixed entirely inside `TenantHeader.jsx` itself. |
| `pages/generic/normal/DynamicPage.jsx` | RK, Mr H (and any future generic-onboarded tenant) | **SHARED HEADER** | Real gap (§9) — had zero header. `<TenantHeader />` added. |
| `pages/generic/normal/CatalogPage.jsx`, `CartPage.jsx`, `ReservePage.jsx` | RK, Mr H, Footlab (store/cart/reserve), Caracas (cart/reserve) | **SHARED HEADER + CAPABILITIES** | Already unified at the *data* layer (§1 verification: `TenantModuleNav` already consumes the identical `navItems`/`getNavItems()` pipeline `TenantHeader` now also uses) — deliberately kept on the lighter `TenantModuleNav` *component* rather than swapped, since these are transactional pages (search/filters/cart) `TenantModuleNav`'s simpler chrome already suits, and swapping would be "blindly replacing an existing header." |
| `pages/caracas/normal/HomePage.jsx`, `SpecialPage.jsx` | Caracas | **SPECIAL CASE** | Bespoke cinematic pages, nav baked into the page-specific visual composition — see §10. |
| `pages/footlab/spatial/SpatialHomePage.jsx` | Footlab | **SPECIAL CASE** | Same shape as caracas's Home/Special: bespoke inline header (`Footlab` wordmark + Shop/Cart), integral to a pinned 500vh cinematic scroll stage. Confirmed live-unchanged (§16). |
| `pages/caracas/normal/MenuPage.jsx` | Caracas | **Deferred gap, not touched** | No header/nav at all (same shape as the original `DynamicPage.jsx` finding) — not named in the task's Step 3 tenant list, left as a documented, separate future item. |
| `pages/footlab/normal/StorePage.jsx` | — | **Dead code, not touched** | Zero real importers; `footlab.routes.jsx` never routes to it. Noted, not deleted (deletion is a separate hygiene decision). |
| `pages/beit-al-fakhar/product/ProductPage.jsx`, `checkout/CheckoutPage.jsx` | beit-al-fakhar | **Out of scope, not touched** | Not named in the task's tenant list (Smar/RK/Mr H/Footlab/Caracas). |

## 15. Files/systems explicitly out of scope — confirmed untouched this session

- Backend: nothing in `app/` was read or modified this session for this task.
- Tenant resolution (`app/core/tenant.py`, `useTenantSlug.js`'s own resolution logic) — read-only,
  used as-is, not modified.
- Database / Prisma schema — not touched.
- Railway configuration or environment variables — not touched.
- Authentication architecture/APIs — `GlobalAuthModal` and its real `POST /public/{slug}/auth/
  login` call are reused exactly as they exist; no auth code read or modified beyond confirming
  this endpoint is real (not a stub) via a source read.
- Reservation business logic — not touched.
- WhatsApp logic — the header's own "Book Now"/"Contact" `wa.me` link construction is existing,
  unmodified `TenantHeader.jsx` behavior; no WhatsApp backend/webhook code touched.
- No unrelated UI changes, no unrelated cleanup performed.

**Not yet committed/pushed** — implementation and verification are both complete (below); commit is
withheld pending explicit go-ahead per the task's own "Only commit/push after the implementation
and verification are complete" instruction. `git status` for this task's scope: `TenantHeader.jsx`,
`DynamicPage.jsx`, and this evidence file are the only real diffs from this pass.

## 16. Verification results — executed 2026-08-31, real browser (Playwright MCP)

Backend (`uvicorn`, port 8000) and frontend (`vite`, port 5173) started locally for this pass. Per
`rules/frontend/browser-verification-protocol.md`: real DOM/console checks below, not `curl`/build
success alone.

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Smar renders correctly (`/smar/showcase`) | ✅ Pass | `headerCount:1`, gold chrome/branding pixel-equivalent to before (screenshot reviewed), nav now shows الوحدات/الخدمات/المعرض (booking+catalog+gallery — matches Smar's real active_services, more accurate than the old hardcoded 4-link list), 0 console errors, 0 warnings |
| 2 | Smar `/smar/listings` | ✅ Pass | `headerCount:1`, 0 console errors, 0 warnings |
| 3 | RK renders, header now present on homepage | ✅ Pass | `/rk` — `headerCount:1` (after ~2s config-load, LoadingScreen dot beforehand — expected), nav: الخدمات/الوحدات/المتجر/احجز موعد, real hero content below with correct spacing (no header/hero overlap — screenshot reviewed), 0 console errors, 1 pre-existing unrelated Framer Motion warning (present on caracas too, which this task never touched — confirmed not a regression) |
| 4 | Mr H renders, header now present on homepage | ✅ Pass | `/mr-h` — `headerCount:1`, real tenant name "صالون مستر إتش", nav: الوحدات/احجز موعد, 0 console errors, 0 warnings, screenshot reviewed |
| 5 | Footlab | ✅ Pass — confirmed unchanged (SPECIAL CASE) | `/footlab` — own bespoke "FOOTLAB / SHOP / CART" header intact, untouched. 2 pre-existing `404` on `/api/v1/public/catalog/items` (missing `client_slug` param in `SpatialHomePage.jsx:152`) — **side finding, pre-existing, not caused by this task** (that file was never touched) |
| 6 | Caracas | ✅ Pass — confirmed unchanged (SPECIAL CASE) | `/caracas/home` — own "CARACAS / الرئيسية / المنيو / احجز طاولة" nav intact, 0 errors. `/caracas/menu` — still correctly header-less (deferred gap, untouched), 0 errors |
| 7 | Tenant-scoped navigation | ✅ Pass | All `navItems` routes are `/{slug}/...` (from `getNavItems()`, unmodified) — verified on RK (`/rk/...`) and Mr H (`/mr-h/...`), never hardcoded to `/smar/...` |
| 8 | Book Now | ✅ Verified by code inspection, not re-clicked live | `handleBookNow` function body is byte-identical to before this change (only `NAV_LINKS`/brand-click logic was touched) — opens `wa.me` in a new tab, deliberately not click-tested live to avoid navigating away from the app under test |
| 9 | Profile/Login | ✅ Pass | Clicked the profile icon on `/rk` — `GlobalAuthModal` opened (login/register UI present), 0 new console errors |
| 10 | AR/EN behavior | ✅ Pass | Clicked "EN" on `/rk` — header flipped to LTR, nav labels translated (Services/Units/Shop/Book), "BOOK NOW" uppercase, "AR" toggle shown — screenshot reviewed. Page *content* (hero text) correctly stays Arabic, unchanged, per §12's explicit scope limit |
| 11 | RTL/LTR | ✅ Pass | `dir` attribute on `<header>` flips with `lang` state exactly as before this change (untouched logic) |
| 12 | Mobile | ✅ Pass | `/rk` at 390×844 — header shows hamburger + profile + EN toggle (brand name correctly hidden via pre-existing `sm:inline-block`, unchanged), tapped hamburger → dropdown shows all 4 nav items + Book Now, RTL-correct — screenshot reviewed |
| 13 | Desktop | ✅ Pass | 1440×900 across Smar/RK/Mr H — see rows 1–4 |
| 14 | Playwright/browser tests run | ✅ Done | This entire table — `mcp__playwright__browser_navigate/evaluate/console_messages/take_screenshot/click/resize`, real local dev servers, not simulated |
| 15 | Console errors | ✅ Pass (with 1 disclosed pre-existing side finding) | 0 errors on every page this task touches (Smar ×2, RK ×2 viewports + `/demo/rk`, Mr H, `/rk/catalog`, caracas ×2). Footlab's 2 errors are pre-existing and unrelated (row 5) |
| 16 | No backend/API behavior changed | ✅ Pass | Zero files under `app/` read or modified this session; the only network calls this task's changed pages make are the pre-existing `GET /{slug}/config` (already deduped by TanStack Query — `DynamicPage` and `TenantHeader` share the same `[slug,'config']` cache key, confirmed no duplicate request pattern introduced) |
| — | Trial ribbon regression check (not in the original list, added because `paddingTop` was a real structural change to `DynamicPage.jsx`) | ✅ Pass | `/demo/rk` — header renders, "✦ صفحة تجريبية — RK Barber Shop" ribbon renders directly below it (not hidden behind the fixed header), 0 console errors |

## 17. Status

**CLOSED — 2026-08-31, Salman's explicit decision.**

`TenantHeader.jsx` now sources its nav from `navItems`/`getNavItems()` (§1's confirmed single
pipeline) instead of a hardcoded array; `DynamicPage.jsx` (RK/Mr H's real homepage, previously
header-less — §9) now renders it. Smar's existing header wiring required no page-level changes.
Caracas and Footlab's bespoke homepages are confirmed investigated and deliberately left unchanged
(SPECIAL CASE, §10 and §13's classification table). All verification checks in §16 passed with real
browser evidence; one pre-existing, unrelated side finding (Footlab's `/catalog/items` 404s) was
found and disclosed, not fixed (out of this task's scope). Committed as `671ea99` (only
`TenantHeader.jsx` + `DynamicPage.jsx`, not pushed).

**Phase-plan closure note (epistemic honesty, requested explicitly):** the original session that
specified this task used a numbered Phase 1–12 structure. That numbered list itself is **not**
preserved verbatim anywhere in this repository — it predates a context compaction, and only a
handful of citations survived inline in this document (line 6: "Phase 2 onward... Phase 1
investigation"; line 307: "Phase 8's explicit instruction" — cart; line 327: "Phase 4 instruction"
— language). A later reconstruction mapped all 12 phases to what was actually executed and verified
(Phase 1 = investigation, Phases 2–12 = implementation/integration/verification, all satisfied by
commit `671ea99` + the live verification pass in §16) — that reconstruction is a best-evidence
inference from topic order and what was actually checked, **not a verbatim record**, and is recorded
here as such rather than presented as equivalent to the lost original.

**Closure basis**: real evidence (commit diff, live browser verification in §16) shows every
concern the task named — nav-source unification, tenant configuration, language behavior, routing,
Book Now, profile/login, cart, applying the header to Smar/RK/Mr H, RTL/LTR, visual fidelity — is
satisfied today. No further code changes to this task.

**Findings spun out as a separate backlog (2026-08-31), not folded back into header work:**

| Finding | Disposition |
|---|---|
| Caracas `MenuPage.jsx` — no header at all | backlog / UX decision |
| Footlab `footlab/normal/StorePage.jsx` — dead code | later cleanup |
| Footlab `SpatialHomePage.jsx:152` — `/catalog/items` 404 | needs confirmation the flow is real before fixing |
| `beit-al-fakhar`'s `ProductPage.jsx`/`CheckoutPage.jsx` | classification later |
| Full AR/EN content translation + i18n consolidation | separate i18n project, not a quick win — tracked in `.claudedocs/implementation/BILINGUAL_AUDIT/evidence.md` |

**Next work**: Production Readiness Final Sweep (Functional → Security → Production environment →
UI Polish → Bilingual, in that order per Salman's 2026-08-31 direction) — tracked in
`.claudedocs/sessions/2026-08-31.md`, not in this document.

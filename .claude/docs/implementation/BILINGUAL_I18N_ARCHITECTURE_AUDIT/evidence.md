# Bilingual / i18n Architecture Audit — SalmanSaaS

**Status: STUDY ONLY. No code was modified, refactored, or fixed while producing this document.**

Follows: `investigation-protocol.md` (Confirmed/Side Findings/Unknowns discipline, Evidence
Interrogation), `browser-verification-protocol.md` (real browser evidence before conclusions).
Trigger: Salman's explicit 6-phase spec, 2026-09-01, after live-testing RK's language toggle
himself and finding it cosmetic. Supersedes the narrower `.claudedocs/implementation/
BILINGUAL_AUDIT/evidence.md` (2026-08-30, found 3 systems) in scope, not in conclusion — that
audit's core finding ("no working i18n for the real tenant product") is confirmed again here,
now completely inventoried and re-verified live.

**Governing correction, applied throughout this document (Salman's own instruction before
approving the investigation plan):** the mechanisms found below are not 15 peers of the same
kind. They are grouped into 5 real categories — only Category A entries are actual candidates
for "reuse as the foundation"; the others are data, plumbing, side effects, or dead code. Phase 3
evaluates against SalmanSaaS's real requirements, not popularity or completeness-in-isolation.
The Recommendation is written last, after the comparison — not decided in advance.

---

## FACTS

### Phase 1 — Every mechanism found, categorized

A full sweep of `frontend/src/` (not just what the prior audit already found) turned up **15
distinct mechanisms**. Grouped:

#### Category A — Real i18n systems (Context + dictionary + real language state)

The only entries structurally eligible as a "foundation" candidate in Phase 3.

| # | Mechanism | File(s) | State storage | Dictionary | RTL handling | Status | Live reach |
|---|---|---|---|---|---|---|---|
| A1 | Core `LanguageContext` | `context/LanguageContext.jsx` (34 lines) + `utils/translations.js` (136 lines, ~40 keys) | `useState('ar')`, no persistence | Real, ~40 keys, AR/EN | Writes `document.documentElement.dir`/`.lang` directly — the **only** mechanism in the whole codebase that does this | **Dead** | None — its 3 consumers (`SmarHeader.jsx`, `SmarTimelineGallery.jsx`, `ShowcaseHUD.jsx`) are all orphaned; their host route `/smar/spatial` now immediately redirects to `/smar/listings` and renders `null` |
| A2 | Marketing site `LanguageContext` | `pages/marketing/context/LanguageContext.jsx` + `pages/marketing/translations.js` (111 lines) + `useTranslation.js` hook | `localStorage` key `appLang` | Real, complete, AR/EN | `dir` on a wrapping `<div>` inside the Provider — not document root | **Live, complete** | Marketing site only (`/marketing`, and `ShowcaseRoutes` variants at `/`, `/home`, `/showcase` on the showcase subdomain) — 12 real consumer components (Navbar, HeroSection, ServicesSection, CTASection, FAQSection, etc.) |
| A3 | Showcase/demo-builder `LanguageContext` | `pages/showcase/context/LanguageContext.jsx` (context name `ShowcaseLanguageContext`) + `pages/showcase/translations.js` (123 lines) | `localStorage` key `showcaseLang` (distinct key from A2) | Real, complete, AR/EN | Same pattern as A2 — wrapping `<div>`, not document root | **Live, complete** | Showcase/demo-builder app only — real consumer `DemoLandingPage.jsx` |

**Live-verified this session (browser, real dev server, `127.0.0.1:5173`):** neither A2 nor A3
is reachable from any real tenant page (`/rk`, `/rk/store`, `/smar/listings`) — confirmed by
direct navigation; none of these routes mount the marketing or showcase apps.

#### Category B — Translation data sources (real AR/EN pairs, no delivery mechanism of their own)

| # | Mechanism | File(s) | What it is | Live reach |
|---|---|---|---|---|
| B1 | `service-catalog.js` `labelAr`/`labelEn` pairs | `frontend/src/config/service-catalog.js` | A static dictionary of nav-item definitions (e.g. `المتجر`/`Shop`, `احجز موعد`/`Book`), exposed via `getNavItems()` | Real bilingual data exists at the source; only one of its two consumers (Category C1) ever reads the English half |
| B2 | `UnitCard.jsx`/`UnitGrid.jsx` prop-drilled `lang` | `design-system/molecules/UnitCard.jsx`, `design-system/organisms/UnitGrid.jsx` | The single most functionally-complete bilingual **component pattern** in the tenant product: real `name_ar`/`name_en` and `description_ar`/`description_en` fallback-pair selection, a type-label map, per-card `dir={lang==='ar'?'rtl':'ltr'}` | Live but **permanently pinned to Arabic** — its one real caller (`ListingsTemplate.jsx`) passes the hardcoded literal `lang="ar"`, not a value from anything dynamic |

**Live-verified this session:** clicking `/smar/listings`'s own header toggle does **not**
change `UnitGrid`'s rendered content — confirmed by evaluating the page's actual text content
before and after the click; the array of headings/descriptions was identical (still fully
Arabic), matching the code fact that `lang="ar"` there is a hardcoded literal, disconnected from
any toggle.

#### Category C — Local/cosmetic UI mechanisms (a toggle that doesn't reach page content)

| # | Mechanism | File(s) | What it actually toggles | Live reach |
|---|---|---|---|---|
| C1 | `TenantHeader.jsx`'s local `lang` state | `design-system/organisms/TenantHeader.jsx` (added 2026-09-01, same session) | Its own nav labels (via B1), brand name, "Book Now" button text/WhatsApp fallback message, sign-in `aria-label` — nothing else. Plain `useState`, no context, no prop out, not persisted | Header-only, on all 4 of its real call sites (`DynamicPage.jsx`, `ListingsTemplate.jsx`, `ShowcaseTemplate.jsx`, `SmarGalleryPage.jsx`) — none of which pass or read any prop from it |
| C2 | `TenantModuleNav.jsx` | `design-system/organisms/TenantModuleNav.jsx` | Nothing — reads only `labelAr` (line-confirmed twice), never `labelEn`. No `lang` state, no toggle UI exists at all | Catalog/Cart/Reserve pages, footlab, beit-al-fakhar — **no language control of any kind on these pages** |
| C3 | `GenericAdminDashboard.jsx` | `pages/generic-admin/GenericAdminDashboard.jsx` | Nothing — no `useLanguage`, no `LanguageContext`, no `translations` import anywhere in the file; its own nav arrays don't even have a `labelEn` field | Every generic-dashboard tenant's admin panel |

**Live-verified this session, the central finding of Phase 2:**

- `/rk` (DynamicPage): `document.documentElement.lang`/`.dir` = `"ar"`/`"rtl"` before AND after
  clicking the header's EN toggle — **no change at all** to the document root.
- Same click: the header's own nav visibly switched to English ("Book", "Shop", "BOOK NOW") and
  the toggle button itself flipped to read "AR" — so C1's own internal state genuinely works —
  but the hero heading, subheading, and CTA button (`DynamicPage.jsx`'s rendered section content)
  stayed 100% Arabic, unchanged, in the same screenshot. This is the literal, live proof of "the
  toggle is real but cosmetic, contained to the header."
- `/rk/store` (CatalogPage.jsx, uses C2): a full accessibility-tree snapshot of the page header
  found exactly 3 buttons — brand name, "احجز موعد", "المتجر" — **zero** EN/AR toggle element
  anywhere on the page. Confirms C2's "no toggle exists at all" as observed fact, not inference.
- `/smar/listings`: has the same EN/AR toggle pattern as `/rk` in its header; clicking it does
  not change any of `UnitGrid`'s 8 sampled text nodes (still fully Arabic before and after) —
  live confirmation of B2's "permanently pinned" finding.
- Zero console errors or warnings across all three page navigations and both toggle clicks.

#### Category D — Language-related side effects (not a system — just where attributes get set)

| # | Mechanism | Status |
|---|---|---|
| D1 | Hardcoded `direction: 'rtl'` inline style literals | Live, permanent, unconditional. 14 of 15 `components/dynamic-sections/*.jsx` files, plus `CartPage.jsx`, `CatalogPage.jsx`, `DynamicPage.jsx`, `ReservePage.jsx`, `SpatialPropertyDetails.jsx` — none read from any context, prop, or `lang` state; each is a fixed literal |
| D2 | `frontend/index.html`'s `<html lang="en">`, no `dir` attribute at all | Confirmed unchanged, spot-checked directly this session. Its only would-be runtime writer is A1, which is dead — so in practice this attribute never changes at runtime on any live page |

#### Category E — Dead/legacy (cleanup targets only, never design input)

| # | Mechanism | Why dead |
|---|---|---|
| E1 | `BookingFlow.jsx` | `const lang = 'ar'; // TODO: wire to LanguageContext in Phase 35` — unfinished, and the component itself is unimported anywhere |
| E2 | `pages/smar/spatial/i18n.js` | A full standalone AR/EN dictionary (63 lines), structurally similar to `utils/translations.js` — but never imported by any file, anywhere |
| E3 | `SpatialHomePage.jsx`'s fake `LanguageContext` | `export const LanguageContext = { t: {} }` — a plain object, not `React.createContext(...)`; its one consumer (`SmarHero.jsx`) is unreachable since the host route redirects away |
| E4 | `pages/catalog/CatalogPage.jsx` | An orphaned duplicate of the real, routed `pages/generic/normal/CatalogPage.jsx` — zero importers anywhere |
| E5 | `ChaletCard.jsx` + `AboutResort.jsx` + `ChaletInterior.jsx` + `CustomerHeader.jsx` + `DateSearchBar.jsx` | The exact component family the 2026-08-30 prior audit live-tested and found broken (mixed-language unit cards) — the route that mounted them (`/smar/listings`) has since been rewritten to use B2 (`UnitGrid`/`UnitCard`) instead; this whole family is now unimported anywhere |
| `components/LanguageSwitcher.jsx` | A standalone toggle button taking `currentLang`/`onChange` as props — not imported anywhere |

Two `localStorage` keys exist for language, both inside Category A's non-product apps: `appLang`
(A2, marketing), `showcaseLang` (A3, showcase). **Nothing touching the real tenant product
persists a language choice anywhere.**

### Phase 2 — Real product coverage, summarized

| Page | Has a visible toggle? | Does clicking it change page body content? | RTL source |
|---|---|---|---|
| `/rk` (DynamicPage, generic-dashboard tenant home) | Yes (C1) | **No** — header only | D1 (hardcoded) |
| `/rk/store` (CatalogPage, uses C2) | **No toggle exists at all** | N/A | D1 (hardcoded) |
| `/rk/reserve`, `/rk/cart` | Same as `/rk/store` (C2) — no toggle | N/A | D1 (hardcoded) |
| `/smar/listings` | Yes (same C1 pattern) | **No** — `UnitGrid` stays pinned to `lang="ar"` literal | D1 (hardcoded) |
| Generic admin dashboard (`GenericAdminDashboard.jsx`) | No (C3) | N/A | D1 (hardcoded) |
| Marketing site (`/marketing`) | Yes (A2) | **Yes, fully working** | A2's own Provider |
| Showcase/demo-builder (`/`, `/home`, `/showcase` on that domain) | Yes (A3) | **Yes, fully working** | A3's own Provider |

**Conclusion, stated as plainly as the prior audit stated it:** the real, sellable tenant
product — every generic-dashboard tenant's public page, cart, catalog, reservation flow, and
admin dashboard, plus smar's own listings page — has **no working bilingual toggle**. Arabic is
the only language that ever actually renders, by hardcoded design, everywhere except two
non-product apps (the marketing landing page and the old showcase/demo-builder tool).

---

## PROBLEMS / GAPS

1. **No single source of truth for "what language is the user viewing in."** Three independent,
   non-communicating pieces of state exist that could plausibly hold this (A1's context, C1's
   header-local `useState`, B2's hardcoded literal) — none is connected to the others, and none
   is connected to `document.documentElement`, D1's scattered `direction: 'rtl'` literals, or D2's
   static `<html lang="en">`.
2. **A working toggle exists on exactly the wrong layer.** C1 (`TenantHeader.jsx`) is real,
   already-shipped UI that visibly works — but it was built as (and stays) a header-local
   cosmetic control, with no mechanism to propagate its choice anywhere else, even to sibling
   components on the same page.
3. **`TenantModuleNav.jsx`-based pages have no language control surface at all.** This isn't "a
   toggle that doesn't work" — Catalog/Cart/Reserve/Shop, the actual transaction-completing pages
   for every generic-dashboard tenant, have zero UI element a visitor could even attempt to click.
4. **Tenant-specific content has no representation in any Category A system.** A2 and A3's
   dictionaries are static UI-string translations (button labels, section headings for a fixed
   marketing page) — neither has any concept of "this tenant's own `name_ar`/`name_en` pair for
   this specific unit/service/product." The one place that pattern is actually built correctly is
   B2 (`UnitCard.jsx`), which is not a system at all — it's an isolated component pair, unwired to
   anything dynamic.
5. **RTL is set independently of language, in ~20 different files.** D1's hardcoded
   `direction: 'rtl'` never asks any system what language is active — it is simply always true,
   everywhere, regardless of anything else in this document.
6. **`document.documentElement`'s `lang`/`dir` never change at runtime on any live tenant page.**
   The only code capable of writing to it (A1) is dead. A screen reader, browser translation
   feature, or any tooling that reads the document's own declared language/direction gets
   permanently wrong information (`lang="en"`, no `dir`) on every real page, regardless of what a
   visitor sees rendered.
7. **Three separate `localStorage` conventions already exist for the same concept** (`appLang`,
   `showcaseLang`, and C1's total absence of persistence) — a fourth, uncoordinated convention is
   the default outcome if nothing changes before the real product gets its own persistence.
8. **Side observation, named because it's a small mirror of the exact problem this document is
   about:** this audit itself was requested to be written to `.claude/docs/implementation/`, a
   second, currently git-untracked documentation root that already holds one other document
   (`UNIFIED_TENANT_HEADER/evidence.md`, from yesterday) — distinct from this project's documented
   canonical `.claudedocs/implementation/` convention, where the *prior*, narrower bilingual audit
   already lives. Not resolved by this document; noted as observed fact only, at Salman's own
   explicit instruction to use the literal path as given.

---

## ARCHITECTURAL OPTIONS

Three real candidates, evaluated against SalmanSaaS's actual stated requirements — not against
each other's popularity, and not by whether a system happens to be "complete" in the narrow scope
it was already built for.

**Requirements checklist** (from Salman's own spec): Arabic, English, RTL/LTR, every tenant
vertical, every tenant public page, shared design-system components, tenant-specific components,
reusable translation keys, **tenant-specific content** (not just static UI strings), persistence
of language preference, consistent switching, and room for a future 3rd language without a
rebuild.

### Option 1 — Adopt A2 (marketing site's `LanguageContext`) as the foundation, extend to the product

| Requirement | Verdict | Evidence |
|---|---|---|
| AR/EN | Pass | Real, complete dictionary already |
| RTL/LTR | Partial | Sets `dir` on a wrapping `<div>`, not `document.documentElement` — would need to change to reach `document.documentElement` for D2's gap to close |
| Persistence | Pass | Real, working `localStorage` (`appLang`) |
| Shared design-system components | Partial | The dictionary shape (flat key→string) works for UI strings, but every one of ~20 D1 files would still need individual migration off hardcoded `direction: 'rtl'` |
| **Tenant-specific content** | **Fail** | Zero concept of per-tenant data (a unit's own `name_ar`/`name_en`) — this dictionary is authored once, for one fixed page, not per-tenant |
| Every tenant vertical | Fail as-is | Built for exactly one page (the marketing site); would require real, non-trivial rework to become tenant-aware, not a drop-in |
| Future languages | Pass, structurally | Dictionary shape supports adding a 3rd key per string — no architectural blocker |

### Option 2 — Adopt B2's pattern (`UnitCard.jsx`'s prop-drilled `lang` + fallback-pair resolution) as the foundation

| Requirement | Verdict | Evidence |
|---|---|---|
| AR/EN | Pass | Real fallback-pair resolution already correct |
| RTL/LTR | Pass, per-component | Already does `dir={lang==='ar'?'rtl':'ltr'}` correctly, live |
| **Tenant-specific content** | **Pass — the only option that does** | This is the one place `name_ar`/`name_en`-style per-tenant data is already handled correctly |
| Persistence | Fail | None — the pattern has no state of its own; it's fed a literal by its caller |
| Reusable translation keys (static UI strings, e.g. "Book Now") | Fail | This pattern only solves tenant *data*, not shared UI vocabulary — no dictionary exists in this pattern at all |
| Shared design-system components | Fail as a full solution | Solves the tenant-content half of the problem, not the UI-string half — would need pairing with something like Option 1's dictionary shape |
| Every tenant vertical | Fail as-is | Currently used by exactly one caller, fed a hardcoded literal |

### Option 3 — Design a new, unified layer purpose-built for SalmanSaaS's real shape, reusing pieces from both

| Requirement | Verdict | Evidence |
|---|---|---|
| AR/EN | Pass, by design | Built to spec |
| RTL/LTR | Pass, by design | Set once, at the document root, from one real source of truth — closes D2 |
| Persistence | Pass, by design | One real convention, not a 4th ad-hoc one |
| Tenant-specific content | Pass, by design | Adopts B2's already-correct fallback-pair pattern for tenant data, rather than re-deriving it |
| Shared design-system components | Pass, by design | Adopts Option 1's dictionary shape for static UI strings, rather than re-deriving it |
| Every tenant vertical, every public page | Pass, by design | The explicit design goal, not an afterthought |
| Future languages | Pass, by design | A 3rd language is a 3rd key/locale file, not an architecture change |

**No option scored a clean pass on every requirement as an off-the-shelf adoption.** Options 1 and
2 each get real, specific credit for one half of the problem (static UI strings vs. tenant
content, respectively) and a real, specific gap on the other half — neither is disqualified by
being "not popular enough" or "not the newest code"; each is disqualified by a concrete,
requirement-by-requirement gap stated above. Option 3 is not "build something more elaborate
because 15 mechanisms were found" — it is what naming those two real, non-overlapping gaps
honestly leads to: reuse both correct pieces, don't invent a third dictionary shape or a third
persistence convention alongside `appLang`/`showcaseLang`.

---

## RECOMMENDATION

**Option 3 — a single new unified layer, built from the two pieces that already work, not a
larger system chosen because a bigger number of mechanisms was found.**

- **Preferred approach**: one real Context (or equivalent single source of truth), mounted at the
  app root the way A1 already demonstrates is possible (`App.jsx`'s existing `LanguageProvider`
  slot is the proven mounting point — A1's own code is the reference for "how to reach
  `document.documentElement`," even though A1 itself stays retired). Two data shapes underneath
  it: a shared static-string dictionary (Option 1's proven shape, for "Book Now"/"Shop"/nav
  labels/etc.) and a tenant-content resolution pattern (Option 2's proven `name_ar`/`name_en`
  fallback-pair shape, generalized past `UnitCard.jsx`'s one caller). One `localStorage`
  convention, replacing the informal `appLang`/`showcaseLang` split rather than adding a third.
- **What gets reused**: A2's dictionary-shape and Provider-mounting pattern; A1's
  `document.documentElement.dir/lang`-writing technique (the only place in the codebase that
  already does this correctly); B2's fallback-pair resolution logic and per-component `dir`
  pattern; B1's existing `labelAr`/`labelEn` data in `service-catalog.js` (already real, already
  correct, just needs a real reader on the C2 side too).
  **What gets retired**: every Category E entry outright (all 6 are already unreachable dead
  code — retiring them is deletion, not migration); C1's *implementation* (a header-local
  `useState`) gets replaced by a real context read, though its UI surface (the visible EN/AR
  button) is exactly right and should look the same to a visitor; D1's ~20 scattered `direction:
  'rtl'` literals become reads from the one real source of truth instead of fixed literals.
- **Main risks**: (1) D1's blast radius — ~20 files each need their own migration, and each is a
  real chance to regress a currently-working RTL layout if done carelessly; (2) A2/A3 stay
  correctly untouched (marketing/showcase apps have their own working systems and their own
  audiences) — a naive "unify everything" pass could wrongly fold them in and break two things
  that currently work; (3) `client.config.content.sections`' tenant-authored data (Arabic-only
  today, per every section schema this session touched) has no `_en` fields at all yet — this is
  a real backend/schema question, not just a frontend one, and is explicitly out of this
  document's scope to design.
- **Estimated complexity**: not small. This is a real, multi-file, cross-cutting feature — not a
  toggle fix. The Category-by-category breakdown above is what keeps the estimate honest: most of
  the "15 mechanisms" collapse into "delete 6 dead files" and "stop hardcoding one CSS property in
  ~20 files," which is real but mechanical work; the genuinely hard part is narrow — one real
  Context, one dictionary shape, one tenant-content pattern, correctly generalized from what
  already half-works in B2.
- **Suggested phases** (sequencing only — see Migration Plan below for the actual steps):
  1. Design + build the one real Context/dictionary/tenant-content layer (new code, isolated,
     doesn't touch any live page yet).
  2. Migrate the design-system layer (`TenantHeader.jsx`'s C1, `TenantModuleNav.jsx`'s C2 — giving
     C2 a real toggle for the first time) to read from it.
  3. Migrate `DynamicPage.jsx` + its ~15 dynamic-section components (D1's largest single cluster)
     to stop hardcoding `direction: 'rtl'`.
  4. Migrate `GenericAdminDashboard.jsx` (C3) — currently has no i18n concept whatsoever, the
     largest genuinely-new surface, not a migration of existing broken code.
  5. Retire Category E outright (E1-E5 + `LanguageSwitcher.jsx`).
  6. Leave A2/A3 alone — correctly out of scope, already working for their own audiences.

---

## MIGRATION PLAN

1. **What gets migrated first**: the new unified layer itself (Recommendation's phase 1) — built
   and tested in isolation, mounted at the app root, touching zero live pages until it's proven
   correct on its own. Then C1 (`TenantHeader.jsx`) is the first live consumer, since it's the one
   place a real, working toggle UI already exists and just needs its wiring redirected — lowest
   risk, most visible proof the new layer works.
2. **What can remain temporarily**: D1's scattered `direction: 'rtl'` literals, page by page, as
   long as each page is migrated in one complete pass (never half-migrated — a page reading the
   new context for labels while still hardcoding its own `dir` is a worse, more confusing state
   than today's consistent-if-wrong hardcoding).
3. **What gets deprecated**: A1 (`context/LanguageContext.jsx` + `utils/translations.js`) once
   its `document.documentElement`-writing technique has been ported into the new layer — the file
   itself can be deleted immediately since it's already fully dead. All of Category E deleted
   immediately, no migration needed (already unreachable). C1's own current `useState`
   implementation is deprecated in favor of the new context, but its rendered UI stays visually
   identical.
4. **How to avoid breaking existing tenant pages**: migrate one page type at a time, verify with
   real browser evidence (the same nested-Playwright technique used for this audit's own Phase 2)
   before moving to the next, and never touch A2/A3 (marketing/showcase) at all — they are out of
   scope and already correct for their own audiences.
5. **How to migrate shared components**: `TenantHeader.jsx` and `TenantModuleNav.jsx` first (both
   already read `service-catalog.js`'s B1 data — the migration is "read from the new context
   instead of local state / add a toggle that didn't exist," not "invent new translation data").
6. **How to migrate tenant-specific content**: generalize B2's fallback-pair pattern
   (`name_ar`/`name_en` resolution) into the shared layer, then apply it everywhere a section
   currently renders `data.heading_ar`/`text_ar`/etc. directly — this is the part that also needs
   a real backend/schema decision (adding `_en` fields to `content.sections`' authored data),
   explicitly flagged as a separate, larger decision this document does not make.
7. **How to verify AR/EN after each stage**: the same method this audit's own Phase 2 used —
   direct `document.documentElement.lang/dir` evaluation, a real click on the toggle, a real
   before/after comparison of rendered text content, a console-error check, on a real dev server,
   for every migrated page — not a code read alone.
8. **How to eventually remove the old systems**: Category E's 6 entries are removable on day one
   (already dead). A1 is removable once its one useful technique is ported. C1/C2's *old*
   implementations are removed the moment each is migrated to the new layer — never left running
   in parallel past that page's own migration.

---

## Unknowns

- No real Playwright session was available for the `GenericAdminDashboard.jsx` (C3) — it requires
  authentication, out of this session's quick verification pass; its "no i18n at all" finding is
  code-read-confirmed (no `useLanguage`/`LanguageContext`/`translations` import anywhere in the
  file, no `labelEn` field in its own nav arrays) but not independently browser-screenshotted this
  round.
- The nested Playwright tool itself reported an internal inconsistency worth flagging honestly
  rather than silently resolving: its console-message step said "Total messages: 3" while listing
  9 raw log lines. Reported as-is in the Phase 2 raw evidence above; does not affect this
  document's conclusions (all 9 lines were debug/info-level Vite/React DevTools noise, zero
  errors or warnings either way).
- Whether `client.config.content.sections`' authored tenant data should eventually carry parallel
  `_en` fields (and how a tenant admin would author them) is a real, separate architectural
  question this audit surfaces (Recommendation, Risk 3) but does not answer — it is a backend/
  schema decision, explicitly out of a frontend-focused audit's scope, and is flagged for a
  future, separately-scoped decision rather than silently assumed either way.

---

### 📌 Checkpoint: Phase Numbering Clarification (2026-09-01)

**Numbering Systems Distinction:** The "Phases 1–6" mentioned earlier in this document refer to
the internal structure of the initial architecture study (where "Phase 5" is the
`## MIGRATION PLAN` section). The "Phases 1–4" used in the `## Implementation Log` below refer to
the actual, committed execution work done on 2026-09-01. These are two distinct, non-continuous
numbering systems. Never assume a "Phase 5" implementation task automatically follows Phase 4.

**Migration Plan Status:** The study's "Phase 5" (`## MIGRATION PLAN`) is already complete as
reference material. It is not a queued to-do list to execute automatically.

**Execution Status:** No further Migration Plan execution is scheduled by this note. The real
remaining items (e.g., deleting the now-fully-dead `context/LanguageContext.jsx` +
`utils/translations.js` + Category E's dead files, or addressing the `CartDrawer.jsx` RTL/locale
gap surfaced during Phase 3) stay logged strictly as reference candidates. They will only be
picked up when explicitly requested by Salman.

## Implementation Log (post-study — ADR-0006 ratified the Recommendation above)

Status changed from STUDY ONLY once Salman explicitly approved execution ("Go ahead. Start phase
one.", then approved Phase 2, then Phase 3). This section records what was actually built, kept
separate from the FACTS/PROBLEMS/OPTIONS/RECOMMENDATION sections above, which stay as the
original point-in-time study.

- **Phase 1** — `frontend/src/context/AppLanguageContext.jsx` (new Context, `localStorage` key
  `tenant_lang`, writes `document.documentElement.lang/dir`), `frontend/src/i18n/dictionary.js`
  (shared static-string dictionary + `t()`), `frontend/src/i18n/resolveTenantText.js`
  (generalized `UnitCard.jsx` fallback-pair pattern). Isolated, mounted nowhere yet.
- **Phase 2** — Wired `AppLanguageProvider` into `App.jsx`. Migrated `TenantHeader.jsx` and
  `TenantModuleNav.jsx` (which gained a real toggle for the first time) to the shared context.
  **Real bug found and fixed**: the old dead `LanguageProvider` (`context/LanguageContext.jsx`)
  was still mounted as the new Provider's parent — its own always-`'ar'`, unpersisted effect ran
  *after* the new one on every mount (child effects fire before parent effects) and silently
  clobbered the correct value back to Arabic on every navigation/reload. Fixed by removing the
  dead Provider's mount from `App.jsx` (the file itself untouched, just unmounted). Live-verified:
  `lang`/`dir`/`localStorage` persist correctly across real navigation and reload after the fix.
- **Phase 3** — Content wiring: `UnitGrid.jsx`/`UnitCard.jsx` (removed the hardcoded `lang="ar"`
  literal at the one real caller, `ListingsTemplate.jsx`); `CatalogItemCard.jsx`,
  `CategoryPill.jsx`, `CatalogGrid.jsx`/`CatalogList.jsx`/`CatalogShowcase.jsx`, `CatalogPage.jsx`,
  `CartPage.jsx`, `footlab/normal/StorePage.jsx` all now resolve tenant content via
  `resolveTenantText()` (or footlab's own already-real `{ar,en}`-object `getName()` helper, made
  lang-aware rather than force-fit into the flat-key resolver) and static UI strings via `t()`.
  Locale-aware price formatting (`toLocaleString('ar-SA' | 'en-US')`) fixed in every file touched
  this phase — the wider, ~20-file spread of this same `'ar-SA'`-only pattern elsewhere (admin
  dashboard widgets, checkout pages, `CartDrawer.jsx`) was found but is explicitly **out of
  scope** for this phase, not silently fixed.
  Hardcoded `direction: 'rtl'` removed from all 14 `components/dynamic-sections/*.jsx` files plus
  `DynamicPage.jsx`/`ReservePage.jsx`'s fallback/error states — verified live (no horizontal
  overflow, no visual regression, RTL/LTR both render correctly, zero console errors across
  `/rk`, `/rk/store`, `/rk/reserve`, `/rk/cart`).
  **Deliberately NOT translated**: `buildStoreWhatsAppMessage()` (CartPage.jsx) stays
  Arabic-only — it's read by the merchant on their own WhatsApp (whose admin dashboard has zero
  i18n, Category C3), not by the browsing customer; translating it would be a regression, not an
  improvement. Noted explicitly in that function's own comment, not silently left as a gap.

- **Phase 4** — Reservation flow + checkout, closing the one real gap Phase 3 flagged and left
  open (the calendar prev/next arrows staying RTL-oriented regardless of `dir`).
  `useReservationBooking.js`: added `EN_WEEKDAYS`/`EN_WEEKDAYS_SHORT`/`EN_MONTHS`, made
  `buildMonthGrid()`/`weekdaysShort` lang-aware via `useAppLanguage()`, added a public
  `formatDate(iso)` (closes over the current `lang`) for UI display. Kept the original
  `formatArabicDate()` **private and unchanged** — it's used only to build the WhatsApp message
  sent to the merchant, same Arabic-only-for-merchant convention `CartPage.jsx` already
  established in Phase 3. `ReservePage.jsx`: **real bug fixed** — `CalendarPanel`'s prev/next
  chevrons were hardcoded (`ChevronRight` for "previous", `ChevronLeft` for "next", an RTL-only
  reading) regardless of the page's actual `dir`; now swap based on `lang`. Wired `resolveTenantText()`
  for service names (`ServiceCircle`, `SummaryCard` — confirmed `CatalogService` really returns
  `name_en`, `app/services/catalog_service_service.py:21`) and `t()` for ~30 new dictionary keys
  covering the whole `BookingPage`/`CalendarPanel`/`SummaryCard`/`ConfirmPanel`/
  `InlineConfirmation` tree, plus `ReservePage`'s own loading/unavailable/error fallback text.
  `LegacyReserveForm`/`LegacyPage` (a separate mode for non-Barber tenants) deliberately left
  untouched — out of the stated scope ("BookingPage و CalendarPanel... التي تؤثر على /rk/reserve").
  **Checkout flow: found already fully done in Phase 3, not new work** — `CartPage.jsx` (RK's
  real checkout) already calls `useAppLanguage()` (line 271), already uses dynamic
  `toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US')` (lines 67, 558); the only remaining
  `'ar-SA'` literals in that file (lines 220, 225) are inside `buildStoreWhatsAppMessage()`,
  intentionally Arabic-only per Phase 3's own documented merchant-facing convention — verified by
  direct code read, not re-touched.
  Live-verified via nested Playwright on `/rk/reserve`: `dir`/`lang` flip `rtl/ar` → `ltr/en` on
  toggle (direct DOM read, not inferred); calendar prev button now renders `chevron-left` on the
  left and next renders `chevron-right` on the right (correct LTR convention); heading/breadcrumb
  read as real English ("Book Your Appointment", "Choose Service · Choose Barber · Choose Date ·
  Confirm"); zero console errors. **Side finding, not fixed**: 3 of RK's real `CatalogService`
  rows have no `name_en` in the DB, so `resolveTenantText()` correctly falls back to Arabic for
  those three service names in the English view — a content gap (missing translation data), not
  a code bug; belongs to the already-logged Dashboard Auto-Translation backlog item below, not a
  new item.

- **Post-checkpoint execution (2026-09-01)** — the two reference candidates named in the
  Phase-Numbering Checkpoint above, explicitly requested by Salman ("go ahead"):
  1. **Dead-code removal** (Migration Plan items 3 & 8). Confirmed by real import-graph
     investigation, not assumed from the audit's own category labels — one label turned out
     stale: `design-system/organisms/BookingFlow.jsx` was listed in Category E ("#2, unfinished
     TODO") but is actually live, imported by `ProductShowcaseHome.jsx`, `TenantHeader.jsx`,
     `ListingsTemplate.jsx`, and `design-system/organisms/index.js` — **excluded from deletion**,
     not touched. Deleted, all confirmed zero real importers by grepping both full paths and bare
     component names, plus barrel-file re-exports: `context/LanguageContext.jsx`,
     `utils/translations.js` (the root dead pair — their only 3 importers, `SmarHeader.jsx`/
     `SmarTimelineGallery.jsx`/`ShowcaseHUD.jsx`, were themselves confirmed unrouted/unreferenced
     first), `pages/smar/spatial/i18n.js`, `pages/catalog/CatalogPage.jsx` (unrouted duplicate of
     the real `pages/generic/normal/CatalogPage.jsx`), `pages/smar/showcase/ShowcaseHUD.jsx`,
     `pages/smar/spatial/SmarHeader.jsx`, `pages/smar/spatial/SmarTimelineGallery.jsx`,
     `components/{AboutResort,CustomerHeader,DateSearchBar,ChaletCard,ChaletInterior}.jsx`.
     `pages/smar/spatial/SpatialHomePage.jsx` (real, routed at `/smar/spatial`) kept — only its
     one dead line (`export const LanguageContext = { t: {} }`) removed. `vite build` clean;
     live-verified via nested Playwright that `/smar/spatial` still redirects to `/smar/listings`
     and `/smar/showcase` still renders (non-empty DOM, zero console errors) after the deletions.
  2. **`CartDrawer.jsx` gap, plus one more found while fixing it.** Removed the hardcoded
     `direction: 'rtl'` (kept `right`/`borderLeft` as physical values, same out-of-scope
     convention as `CategoriesGridSection.jsx`'s `textAlign`); wired `useAppLanguage()`,
     `resolveTenantText()` for item names, `t('total', lang)`, and locale-aware
     `toLocaleString()`; static strings (`سلة الطلبات`/`السلة فارغة`/`إتمام الطلب ←`) converted
     to inline lang ternaries, matching `CartPage.jsx`'s own convention exactly (same English
     wording, so the two read as one system). **Second real gap found along the way**: the
     drawer's own trigger button, `design-system/molecules/CartBadge.jsx`, was itself
     hardcoded-Arabic (`عرض السلة`, no language awareness at all) — not caught by the original
     audit's 15-mechanism sweep. Fixed the same way (`useAppLanguage()` + a new `viewCart`
     dictionary key). `CartBadge` is shared by `DynamicPage.jsx`/`CatalogPage.jsx` (both in
     scope) and `beit-al-fakhar/product/ProductPage.jsx` (a different tenant's own bespoke page,
     out of scope but harmless to also fix since the component is tenant-agnostic and
     `AppLanguageProvider` is already mounted app-wide).
     Live-verified via nested Playwright: seeded a real cart item into `rk_generic-cart`
     `localStorage` (the tenant-scoped Zustand persist key), clicked the real "View Cart"/"عرض
     السلة" trigger (found only after discovering the actual button text — an earlier
     verification attempt wrongly assumed a 🛒 emoji trigger and reported a false negative),
     confirmed the drawer opened, item name ("Test Product"), heading ("Order Cart"), and "Total"
     label all rendered correctly in English; zero console errors. `vite build` clean.

### Backlog — explicitly logged, not implemented

**Dashboard Auto-Translation** (Salman's own future-enhancement note, 2026-09-01): once the Admin
Dashboard's own refactoring phase is scoped, add an automatic-translation feature (via a
translation API) that auto-fills a `name_en`/`description_en` field when the tenant admin finishes
typing the Arabic field. Not implemented now — logged here for that future phase. Directly related
to this audit's own Recommendation Risk 3 (tenant-authored content has no `_en` fields anywhere
today) and to Category C3 (`GenericAdminDashboard.jsx` has zero i18n) — the natural place this
lands once that Dashboard work is scoped.

# Bilingual (AR/EN) & RTL/LTR Audit — Evidence

Follows: `investigation-protocol.md` evidence discipline, `browser-verification-protocol.md`
("real evidence first, code inspection second"). Trigger: Salman's explicit "Functional Sweep —
Step 4" instruction (2026-08-30), the final Security/Functional Sweep step.

**Headline finding, established before anything else in this report matters**: the task's own
framing assumes a working EN/AR toggle exists for the real product that this audit should check
for compliance issues. Real investigation found the opposite — **the current product (every
tenant's public pages and the canonical admin Dashboard) has no functioning bilingual toggle at
all.** Arabic is hardcoded, permanently, at the component level. A legacy toggle mechanism does
exist and is still reachable on one real, live tenant (`smar`) — exercising it live produced a
genuinely broken, half-translated page (screenshot below), which is itself the most concrete,
literal answer to this task's own verification instruction ("manually toggle the language...
document the results").

---

## 1. Architecture: is there a real i18n mechanism at all?

- No `react-i18next`/`react-intl`/any i18n library in `frontend/package.json`.
- A real, working `LanguageContext.jsx` exists (`frontend/src/context/LanguageContext.jsx`) — a
  genuine `ar`/`en` translation dictionary (`utils/translations.js`, ~130 keys), correctly toggles
  `document.documentElement.dir`/`lang` on language switch. Mounted at the app root
  (`App.jsx:118`), so it's technically reachable from anywhere.
- **But the real, current product never uses it.** Confirmed via direct search:
  `DynamicPage.jsx` (the canonical public-page renderer for every generic tenant — RK, mr-h, every
  tenant onboarded under the current architecture) and `GenericAdminDashboard.jsx` (the canonical
  admin surface, `rules/frontend/routing.md`'s own documented single source of truth) **never
  import `useLanguage` or `utils/translations` anywhere.**
- The only real consumers of this `LanguageContext`/`translations.js` pair are legacy,
  pre-Generic-Dashboard components: `ChaletCard.jsx`, `CustomerHeader.jsx`, `DateSearchBar.jsx`,
  `AboutResort.jsx`, `ChaletInterior.jsx` (all smar-era, chalet-themed), plus `SmarHeader.jsx`,
  `SmarTimelineGallery.jsx`, `ShowcaseHUD.jsx` (smar's own separate spatial/showcase pages).
- **Two more, entirely separate `LanguageContext.jsx` implementations exist**
  (`pages/marketing/context/LanguageContext.jsx`, `pages/showcase/context/LanguageContext.jsx`) —
  each with its own translation dictionary, used only by the Alzabt marketing site and the old
  showcase/demo-builder app respectively. **Three independent, non-consolidated i18n systems
  exist in this codebase, none of which cover the real tenant product.**
- `frontend/index.html`'s root `<html>` tag is hardcoded `lang="en"` with **no `dir` attribute at
  all** — the actual RTL rendering real tenants get comes entirely from `direction: 'rtl'` set as
  an inline style, repeated in dozens of individual components (`DynamicPage.jsx`, `CartPage.jsx`,
  `ReservePage.jsx`, `CatalogPage.jsx`, and more) — never from the document root, never from a
  language context, never dynamically. **This is why there is no real toggle for the current
  product: even if `LanguageContext.toggleLang()` were wired in, these hardcoded inline styles
  would keep overriding it.**
- Matches (and confirms, doesn't newly discover) a memory note from this project's own history:
  *"AR/EN+RTL and booking back-navigation are twice-named 'MUST HAVE' gaps, still open"* — this
  audit is the first real, concrete evidence trail behind that already-flagged gap.

**Conclusion: this is not "some strings aren't translated" — it's "the real product has exactly
one supported language (Arabic), by hardcoded design, with no working switch."** Building a real
one is a genuine feature (audit every component, extract every string, fix every hardcoded
`direction: 'rtl'`, consolidate 3 separate i18n systems into one) — squarely the "too massive, defer
to UI Polish" case this task's own instructions explicitly carve out. Not attempted in this pass.

---

## 2. Live verification: the one real, reachable toggle — and what happens when you use it

`smar` (a real, live, documented tenant) is the one surface where a visible language toggle button
("EN"/"AR") actually exists in the UI, since its own spatial/listings pages are exactly the legacy
components that still use `LanguageContext`. Per this task's own explicit instruction #4
("manually toggle the language... document the results"), tested it live:

1. Navigated to `https://alzabt.salmansaas.com/smar/listings`.
2. Clicked the real "EN" button in the nav bar.
3. Result, screenshot saved at `smar-en-toggle-broken.png` (same folder as this file):

- The **nav bar itself** translated correctly: "Home / Units / Gallery / Contact / BOOK NOW", and
  the toggle button correctly flipped to show "AR" (so clicking it again would presumably revert).
- **Every unit card's content stayed broken and inconsistent**:
  - Unit names: `"فيلا إبريس"`, `"كوخ واو — Vav"`, `"ألف — Aleph"` — Arabic, or a jarring
    Arabic-then-English mashup, never a clean English name.
  - Descriptions: full Arabic paragraphs on most cards (`"فيلا إبريس — فيلا فاخرة بغرفتي نوم..."`)
    — **except one single card** (`"Aleph — كوخ ألف"`), which showed a genuinely complete English
    description (`"Discover Alep Patio Cottage at Beit Smar Boutique Resort your getaway hub in
    Batroun midlands..."`) — proving some unit records do have real `description_en` data, most
    don't, and nothing in the UI accounts for the gap (no fallback message, just silently shows
    whatever language the specific record happens to have).
  - `"يتسع لـ 4 أشخاص"` (capacity), `"عرض التفاصيل"` (the button — should read "View Details") —
    stayed Arabic on every card, no exception.
  - Prices rendered as `"٠٠٠ USD"`/`"١٦٥ USD"` — **Arabic-Indic numerals**, not Latin digits, even
    in "English" mode.
  - **The page's own visual layout never flipped to LTR** — badges, price, and button all stayed
    positioned exactly as they were in Arabic mode. Root-caused directly to §1's finding: this
    listings page's own container components hardcode `direction: 'rtl'` inline, which the
    language toggle's `document.documentElement.dir` change cannot override.

**This is the real, concrete, literal answer to "toggle the language and document the results":
the one toggle that exists produces a broken, half-translated, still-RTL-positioned page.** Not
fixed in this pass — same "too massive" reasoning as §1 (this isn't one bug, it's the accumulated
effect of no real i18n system ever having been built for this content).

---

## 3. RTL/LTR Layout Integrity — the current (permanent Arabic) rendering itself

Distinct question from §1/§2: independent of whether English ever works, does the *current*,
single-language Arabic/RTL experience itself render correctly? This codebase uses **inline styles
throughout the real product** (`style={{...}}`), not Tailwind utility classes — `DynamicPage.jsx`
has zero `className="..."` usage and 18 `style={{` blocks — so this task's own named example
(`ml-4` vs `ms-4`) doesn't literally apply; the equivalent risk here is inline
`marginLeft`/`marginRight`/`left`/`right`/`textAlign` properties that assume a fixed physical side.

Found 50 such properties across the core product (`generic/normal/*.jsx`, `generic-admin/**/*.jsx`).
Categorized all of them by reading each in context, then live-verified the ambiguous ones:

- **Most are either symmetric (`left: 0, right: 0` on a full-width element — direction-agnostic by
  construction) or deliberately, correctly forcing LTR+right-align for embedded numeric/phone
  content** (`direction: 'ltr', textAlign: 'right'` — a real, sophisticated, *correct* pattern
  appearing consistently across `CustomersTab.jsx`, `ReservationsTab.jsx`, `OrdersTab.jsx`,
  `StaffTab.jsx`, `reservationInteractions.jsx`: phone numbers need LTR digit ordering to read
  correctly, but should stay right-aligned to match the surrounding Arabic layout — this is
  someone having already solved this specific problem correctly, not a bug).
- **Live-verified** RK's real Dashboard Overview (`alzabt.salmansaas.com/rk/dashboard/overview`):
  sidebar correctly on the right, breadcrumb top-right, no visible spacing/alignment defects.
  Matches this whole session's extensive earlier live testing of RK's Dashboard (Functional Sweep
  steps 1–3) — across dozens of real screenshots and interactions, no RTL layout break was ever
  observed anywhere in the current product.

**Conclusion: no confirmed, currently-visible RTL layout bug found in the core product's
single-language (Arabic) rendering.** The remaining ambiguous cases (a `marginRight: 'auto'`
"push" pattern in a few flex rows, a couple of unexplained fixed-corner `left:`/`right:` positions)
are not confirmed bugs and would only become worth revisiting *if* a real bilingual mode is ever
built — logged here as a note for that future pass, not fixed now since there's nothing currently
broken to fix.

---

## 4. Backend API messages — hardcoded language, no translation-key system

Sampled real `HTTPException(detail=...)` strings across `app/api/v1/admin/*.py`,
`app/core/*.py`, `app/services/*.py`. Confirmed: a genuine, inconsistent **mix of hardcoded English
and hardcoded Arabic**, chosen file-by-file with no discernible rule, and no error-code taxonomy the
frontend could translate instead of showing the raw string:

```
"Failed to fetch bookings"              (English)
"Booking not found."                    (English)
"Barber not found."                     (English)
"Database connection failed"            (English)
"بيانات الدخول غير صحيحة"                (Arabic — wrong login credentials)
"هذا الحساب غير نشط حالياً"               (Arabic — account inactive)
"رابط غير صالح أو منتهي الصلاحية"         (Arabic — invalid/expired link)
"لا توجد بيانات للتحديث"                  (Arabic — no data to update)
```

Every response does carry a machine-readable `error.code` (`"NOT_FOUND"`, `"UNAUTHORIZED"`, etc.)
alongside the message — but this session's own extensive live testing (all 4 Functional Sweep
steps) repeatedly observed the raw `message`/`detail` string surfacing directly in the UI, not a
frontend-translated equivalent keyed off `code`.

**Not fixed this pass** — this is precisely the example this task's own instructions named as the
massive case to defer ("e.g., rewriting the entire backend error handling"). Would require
defining a real error-code taxonomy and rewiring every exception site across dozens of files, plus
a frontend translation layer to consume codes instead of raw messages. Documented for the future
UI Polish / roadmap phase, not attempted here.

---

## Summary

| Area | Finding | Action |
|---|---|---|
| Real product i18n mechanism | **None exists** — permanent hardcoded Arabic, 3 separate unconsolidated legacy `LanguageContext` implementations cover none of it | Documented — real feature build, not a quick win |
| Live language toggle (smar, the one place it's reachable) | **Confirmed broken** when actually used — half-translated, inconsistent, layout stays RTL | Documented with screenshot evidence — same root cause as above |
| RTL layout of the current (Arabic-only) product | **No confirmed bug** — reviewed 50 candidate properties, live-verified the ambiguous ones | No fix needed |
| Backend API messages | **Confirmed real EN/AR mix**, no translation-key system, quantified with real examples | Documented — matches this task's own named "too massive" example |

**Recommendation**: this whole area (real bilingual support for the core product) is a genuine,
scoped candidate for the UI Polish phase already on the roadmap after this Sweep — not a handful
of CSS tweaks, a real feature spanning frontend content, backend messages, and 3 fragments of
existing i18n infrastructure worth consolidating into one rather than building a fourth.

# Mister H Homepage — Phase 2 Implementation Contract

**Slug note (2026-08-18)**: real routing slug is `mr-h` (renamed from `mister-h` — `.` isn't
URL-safe). "Mister H" here means the brand; every real URL/endpoint uses `mr-h`.

**Status: Implementation Contract. No code written yet.** Operationalizes
`ALZABT_MISTER_H_HOMEPAGE_DESIGN_SPECIFICATION.md` (ratified as a direction) into checkable,
file-level phases, per `documentation-policy.md`'s workflow — "no code is written without an
Implementation Contract... listing exactly which files change, what tests are required, success
criteria, and a rollback plan." This document is that gate for Phase 2. **Waiting for approval
before Phase 2.1 starts.**

---

## 0. What the 7 new reference images actually change

Reviewed as visual evidence (luxury/moody barbershop interiors + a scissors/comb product shot +
2 real cutting-in-progress photos), cross-referenced against the Design Specification's §2 tokens
— per this project's Evidence Interrogation discipline, stating plainly what's confirmed vs. new:

| Finding | Confirmed / New | Action |
|---|---|---|
| Near-black background + warm off-white text + gold/brass accent (hardware, lighting fixtures, frames, mirror trim) repeated across all 7 images | **Confirmed**, not new | None — Design Spec §2.1 stands unchanged |
| Low-key, high-contrast, close-up product/action photography | **Confirmed** | None — Design Spec §2.3 art-direction criteria stand unchanged |
| A visible "Starting from $X / View Full Price List" strip, distinct from the main gold CTA banner | **New** — not named in either prior document as its own thing | See §1.4 below — corrects the earlier Expansion Proposal recommendation |
| Hero as full-bleed background media with dark overlay (one reference image shows barber mid-cut with the whole frame as the photo, no separate framed box) | **Strengthens, doesn't resolve**, Design Spec's already-named Open Decision #1 | Still requires your explicit choice — see §5.1 |
| No purple anywhere in any of the 7 images — pure black + gold | **New tension, not previously named** | Real, see §5.2 — this is a genuine open question, not assumed either way |

---

## 1. Corrections to Earlier Documents (named explicitly, not silently applied)

### 1.1 Promo/pricing strip — supersedes Expansion Proposal §1 item 8

`ALZABT_HOMEPAGE_SECTION_EXPANSION_PROPOSAL.md` originally recommended folding this into
`featured_items` as an optional footer line. Salman's latest message recommends treating it as a
second `cta` variant instead (`variant: "promo-strip"`, distinct from the existing `variant:
"banner"` proposal) — a small, dark charcoal card with a thin gold accent border, heading + CTA on
the same row, sitting between Services and Gallery. This is a coherent extension of the
already-approved `cta` variant pattern (§2 of the Expansion Proposal), not a new section type or a
conflicting decision. **Correction adopted in this Contract**: `cta` gains two variants, not one —
`banner` (full gold, the "Book in 10 seconds" break) and `promo-strip` (charcoal card, thin gold
border, pricing-teaser tone). Both additive, both default to current plain rendering when unset.

### 1.2 Hero media shape — clarifying what Phase 1 already unified vs. what's still a visual-mode choice

Salman's message asks for `hero.media: { type, url }` instead of two separate fields. **This is
already true at the data-storage layer** — Phase 1 (commit `29c92cc`) gave `GalleryImage` a real
`mediaType` (`image`/`video`) field precisely so one row covers both. What remains split is at the
**section-rendering layer**: `HeroSection.jsx` currently has two different visual treatments keyed
off two different field names — `bg_image_url` (full-bleed background) vs. `framed_video_url`
(small framed card, built earlier this session per Salman's own Dribbble-driven correction). That
split is not a data-model gap to close; it is two legitimate rendering modes that happen to read
from differently-named fields. Closing it means picking which mode is Mister H's real default
(§5.1) — not renaming fields for their own sake.

---

## 2. Phase Sequence

Matches Salman's own 10-step order, mapped onto real files. Each phase is independently committable
and independently revertable (additive changes throughout — no existing tenant's rendering changes
until its own migration step, matching Phase 1's proven pattern).

| Phase | What | Depends on |
|---|---|---|
| 2.1 | Section data model: `enabled` field | None — can start immediately once approved |
| 2.2 | Design tokens: freeze Visual Language into a shared, reusable form | 2.1 not required, but should land before 2.3 |
| 2.3 | Component work: Hero mode, Services card, `why_choose_us`, `cta` variants, Gallery preview, Location, Footer | 2.1, 2.2 |
| 2.4 | Media Foundation Phase 2: `page_gallery`, `page_logo` | Already scoped in `ALZABT_MEDIA_CONTENT_FOUNDATION_PROPOSAL.md` §7 — cited, not duplicated |
| 2.5 | Asset Pack sourcing for Mister H | Content work, gated on Salman/Ali — not engineering, can run in parallel with 2.1-2.4 |
| 2.6 | Dashboard Settings surface: section enable/order/content editors | 2.1, 2.4 |
| 2.7 | Verification: real browser test, owner edits without code | All above |

---

## Phase 2.1 — Section Data Model: `enabled`

**Preconditions**: none — this is the smallest, lowest-risk phase and the one the Design
Specification §4 already flagged as the real precondition for everything after it.

**Files**:
- `app/repositories/content_sections_repo.py` — new function `set_section_enabled(client_id,
  section_type, enabled: bool)` and `reorder_sections(client_id, ordered_types: list[str])`,
  following the exact same read-merge-write mechanic already established in this file (no new
  pattern introduced).
- `app/services/content_service.py` — thin wrappers, same pattern as `media_service.py`'s existing
  `replace_page_media`/`get_page_media`.
- `app/api/v1/admin/content.py` — two new routes: `PATCH /admin/content/sections/{type}/enabled`,
  `PATCH /admin/content/sections/reorder`. Same dependency chain as every other admin route
  (`get_current_admin_user` → `require_service`).
- `frontend/src/pages/generic/normal/DynamicPage.jsx` — line 276-278's existing filter/sort gains
  one more condition: `.filter(s => s?.type && s.enabled !== false)` (default `true` when the field
  is absent, so every existing tenant's current sections keep rendering exactly as today — this is
  the backward-compatibility guarantee, not assumed, stated as the acceptance test below).

**Success Criteria**:
- A section with `enabled: false` in `content.sections[]` does not render, confirmed via a real
  public-page browser check (not just a code read).
- Every tenant with no `enabled` field on any section (i.e. every tenant today, including RK)
  renders identically before and after this change — confirmed via a real before/after screenshot
  diff on RK specifically, since RK is the tenant with the most sections live today.
- `PATCH /admin/content/sections/{type}/enabled` round-trips correctly — set false, confirm public
  config reflects it, set true, confirm it reverts.

**Rollback**: additive-only change (new optional field, new routes, one new filter condition with a
safe default) — revert is a plain `git revert` of this phase's commit, no data migration needed.

---

## Phase 2.2 — Design Tokens: freeze the Visual Language into a shared form — Status: DONE (2026-08-18)

**File**: `frontend/src/components/dynamic-sections/homepageTokens.js` — placed alongside the
section components themselves (not `design-system/`, which is cross-tenant/global per
`feature-structure.md`), matching §5.3's resolved "homepage-scoped, not a global redesign" scope.
No component files touched in this phase, per the Contract's own stated boundary — this phase only
produces the token source of truth.

**Values** (all traceable to §0's confirmed findings and the two ratified briefs, none invented):
`background: '#080808'`, `surface: '#141414'`, `text: '#F3EEE4'` (warm off-white, never pure
white per Design Spec §2.1), `mutedText: '#A79E8E'`, `accent: '#D9A441'` (reused verbatim from
`ReservePage.jsx`'s existing `GOLD` constant — one real brand gold, not two subtly different
ones), `border: 'rgba(217,164,65,0.22)'`, `overlay` (a dark bottom-fade gradient — the "photo
fades into black" treatment both briefs named repeatedly), a `spacing` scale (96px/56px/24px/12px)
for the reference's "breathing room."

**Real finding during implementation**: fonts were checked against what's *actually* loaded
(`frontend/index.html`'s Google Fonts link: Cairo, Tajawal, Playfair Display, Space Mono) rather
than assuming a new webfont was needed. Playfair Display (the obvious "editorial display font"
choice) has **no Arabic glyphs** — unusable for this tenant's real Arabic content. `headingFont`
uses `'Tajawal', 'Cairo'` (Tajawal already loaded at weight 800/900, the closest real match to
"condensed, bold, tall, editorial" that still renders Arabic correctly); `bodyFont` reuses
`'Cairo'` (already `DynamicPage.jsx`'s own default). No separate label font: Arabic has no
uppercase transform, so the label/eyebrow register is `bodyFont` at smaller size + `accent` color
+ wider letter-spacing, not a distinct family — Space Mono has no Arabic glyphs and would silently
fall back for Arabic label text.

**Success Criteria**: met — values traceable to §0, 0 eslint errors, no component wiring (correctly
out of scope for this phase).

**Rollback**: new, standalone file — nothing in the codebase imports it yet, trivially removable.

---

## Phase 2.3 — Component Work

**Precondition**: 2.1, 2.2 complete and merged.

**Real mechanism discovered while implementing Hero, applies to every row below**: every
`dynamic-sections/*` component is shared across all tenants rendering via `DynamicPage.jsx` — RK
included. §5.2's black+gold homepage theme cannot be hardcoded into these shared components without
silently changing RK's rendering too. Fixed with a real, additive, per-tenant `Client.config.
homepage_theme` flag (`"black_gold"` or absent — absent for every tenant except Mister H),
threaded from `DynamicPage.jsx` as a `homepageTheme` prop. Every component below branches on this
prop; absent means byte-identical output to before Phase 2.3 existed. Not a `slug ===` check — real
tenant config data, same sanctioned pattern as `reserveHref`'s existing `active_services` gate.

| Component | File | Change | Status |
|---|---|---|---|
| Hero | `frontend/src/components/dynamic-sections/HeroSection.jsx` | Add the full-bleed background-media composition mode (§5.1's chosen default), preserving the existing framed-card mode as a still-valid alternate (not deleted); `themeAccent`/`homepageTokens` used when `homepageTheme === 'black_gold'` | **DONE** — commit pending, evidence: `.claudedocs/work/homepage-phase2/2026-08-18/phase2.3-hero-evidence.md` |
| Services | `frontend/src/components/dynamic-sections/FeaturedItemsSection.jsx`, `design-system/molecules/CatalogItemCard.jsx` | Photo-as-hero-of-card treatment + black+gold theme; also fixed a real bug found live (Add-to-Cart shown on bookable services, on both `mr-h` and `rk`) and added a richer generic service-icon placeholder | **DONE** — commits pending, evidence: `phase2.3-services-evidence.md`, `service-cta-fix-evidence.md`, `service-placeholder-evidence.md` |
| Staff/Team | `frontend/src/components/dynamic-sections/StaffSection.jsx` | Black+gold theme only (not originally scoped, added at Salman's direction alongside the section reorder below) | **DONE** — evidence: `phase2.3-staff-evidence.md` |
| Gallery | `frontend/src/components/dynamic-sections/GallerySection.jsx` | Black+gold theme done this pass; `data.limit`/`data.gallery_link` preview mode (Expansion Proposal §2) still not done | **Theme DONE**, preview mode not started — evidence: `phase2.3-gallery-evidence.md` |
| Story | `frontend/src/components/dynamic-sections/StorySection.jsx` | Black+gold theme only (not originally scoped, added at Salman's direction) | **DONE** — evidence: `phase2.3-story-evidence.md` |
| Hours | `frontend/src/components/dynamic-sections/HoursSection.jsx` | Black+gold theme only (not originally scoped, added at Salman's direction) | **DONE** — evidence: `phase2.3-hours-evidence.md` |
| Location | `frontend/src/components/dynamic-sections/LocationSection.jsx` | Black+gold theme done this pass; two-column info-vs-map asymmetry tightening (Design Spec §3.5) still not done | **Theme DONE**, layout tightening not started — evidence: `phase2.3-location-evidence.md` |
| Why Choose Us | `frontend/src/components/dynamic-sections/WhyChooseUsSection.jsx` (new) | Per Expansion Proposal §2 — 4 icon+title+body cards, no photography; real content seeded for Mister H, placed right after Services (own placement judgment call, not explicitly specified) | **DONE** — evidence: `phase2.3-why-choose-us-evidence.md` |
| CTA | `frontend/src/components/dynamic-sections/CtaSection.jsx` | Add `variant: "banner"` (Expansion Proposal §2) and `variant: "promo-strip"` (§1.1 correction, this document) | Not started |
| Footer | `frontend/src/components/Footer.jsx` (new, site-wide, not in `dynamic-sections/`) | Per Expansion Proposal §3 — rendered once by `DynamicPage.jsx`, outside the sections loop, sourced from already-real `Client` fields + the one real gap (`instagram_url`, see §4 below) | Not started |
| `DynamicPage.jsx` | same file as Phase 2.1 | Register `why_choose_us` in `SECTION_MAP`, mount `<Footer>` after the sections loop | Not started |

**Section order, changed 2026-08-18 (Salman's explicit instruction)**: Hero → Services →
Staff/Team → Gallery → Story → Hours → Location → CTA. Executed via the real Phase 2.1 reorder
endpoint, evidence: `section-reorder-evidence.md`.

**Success Criteria**: every new/changed component verified live on Mister H via real browser
screenshot at 390px and desktop width (per `browser-verification-protocol.md` — DOM state, console,
network, not code-read alone); RK confirmed unaffected by every change in this phase (same
regression-check discipline Phase 1 already established).

**Rollback**: each row above is its own independently revertable file; per this project's
one-commit-per-phase convention (`feedback_migration_manifest_structure.md`), each component change
lands as its own commit so a single bad component can be reverted without touching the rest.

---

## Phase 2.4 — Media Foundation Phase 2

Already fully scoped in `ALZABT_MEDIA_CONTENT_FOUNDATION_PROPOSAL.md` §7 (`page_gallery`,
`page_logo`, extending the exact `imageType`/`mediaType` pattern Phase 1 proved). Not restated here
— cited so this Contract's phase numbering stays complete. Gallery's real content (§3 above) is
blocked on this phase, per the Media binding rule (Design Spec §5).

---

## Phase 2.5 — Asset Pack Sourcing (content, not engineering)

Refines the Design Specification's §6 checklist with the explicit **no-photo-needed** list from
Salman's latest message — worth stating plainly since every other section in this document leans on
real photography and it's easy to over-collect:

**Needs real photography**: Hero (fallback image; video already exists), Services (1 per service,
~6), Gallery (6-12 to start).
**Does NOT need photography**: Why Choose Us, CTA (both variants), Testimonials, Footer, Location
(map is not a photo, it's the embedded map itself).

Runs in parallel with 2.1-2.4 — gated on Salman/Ali providing material, not on engineering sequence.

---

## Phase 2.6 — Dashboard Settings Surface

**Precondition**: 2.1 (enabled/reorder routes exist), 2.4 (`page_gallery` exists to manage).

**Files**: extends the real pattern Phase 1 already proved (`SettingsTab.jsx`'s `HeroMediaSection`)
— a new `SectionManager` area in the same file (or a new tab, TBD at implementation time) reading
`GET /admin/content/sections` (new, list all sections with type/enabled/order) and writing to the
Phase 2.1 routes. Per-section content editors (Story/Gallery/Hours/Location — already-named gaps
from earlier this session) are **not** re-scoped here; this phase is specifically the
enable/disable/reorder control surface, not a rebuild of every content editor.

**Success Criteria**: a real end-to-end browser test — toggle a section off in the Dashboard,
confirm it disappears from the real public page, toggle it back on, confirm it returns — same
verification rigor as Phase 1's real file-upload proof (`.claudedocs/work/media-content-foundation/
2026-08-18/evidence.md`), not a script.

---

## Phase 2.7 — Verification

The real test Salman named explicitly: **the tenant owner changes the homepage — content, media,
which sections show, their order — entirely through the Dashboard, with zero code edit and zero
deploy.** Evidence must be a real browser session performing exactly that sequence, following
`browser-verification-protocol.md`'s evidence checklist (DOM state, console, network, screenshot,
final URL) — not a claim.

---

## 3. Explicit Non-Goals for Phase 2

No cart/checkout UI, no changes to the reservation/booking data model, no changes to the
`Service → Barber → Slot → Reservation` flow — none of this touches the booking Capability, per
the standing constitution that any blocker there stops for a report first rather than being
absorbed silently.

---

## 4. Small Named Gap, Carried Forward Unchanged

`instagram_url` on `Client` — one additive field, already named in the Expansion Proposal §3, real
but trivial, folded into Phase 2.3's Footer work rather than its own phase.

---

## 5. Decisions — resolved 2026-08-18

### 5.1 Hero composition mode — RESOLVED: full-bleed

**Decision**: full-bleed background media, dark overlay, text/CTA on top. `hero.media` is a real
union (Phase 1's `GalleryImage.mediaType` already proves this at the storage layer) — video shown
when one is selected, image otherwise, and a designed fallback (never an empty gap) when neither
exists yet. The framed-card mode built earlier this session is **not deleted**, kept as a still-
valid alternate for a future case, but is not Mister H's default. Reasoning given: the framed-card
treatment visually diverges from the reference's own grammar.

### 5.2 Purple vs. black-only — RESOLVED: black + gold for the homepage, purple stays scoped to booking

**Decision**: the homepage/general site uses black + gold (per the reference images' own clear
identity). `Client.primary_color` (`#6D28D9`, confirmed live) is **not changed** — it stays exactly
as-is because `ReservePage.jsx`'s booking flow already depends on it in production. Going forward:
`site/home visual theme = black + gold` (a fixed design-system palette, not derived from
`primary_color`) vs. `booking theme = tenant primary_color` (unchanged). Reasoning given: forcing
the whole site into a single tenant-configurable color is worse architecture than letting the
homepage and the booking experience each have their own deliberate visual register — recorded here
as the binding rule for Phase 2.2's tokens and any future Barber-vertical homepage work.

### 5.3 Token scope — RESOLVED: homepage-scoped, built reusable

**Decision**: Phase 2.2's tokens are scoped to the homepage implementation (not a global
design-system rewrite), but structured as a real, named token set from the start — not inline
magic values — so they can be promoted to a broader scope later if the identity proves out on a
second tenant. Concrete token names to use in Phase 2.2:
`homepage.background`, `homepage.surface`, `homepage.text`, `homepage.mutedText`,
`homepage.accent`, `homepage.border`, `homepage.overlay`, `homepage.headingFont`,
`homepage.bodyFont`, `homepage.spacing`.

---

## 6. Acceptance Criterion for Phase 2 as a whole — binding, stated once

Restated here in full because it is the standard every later phase's "done" claim is measured
against, not a soft goal: **the Mister H owner must be able to, from the Dashboard alone — enable/
disable/reorder sections, and edit their text/images/video — with the public homepage reflecting
every change, with zero code edit and zero deploy.** A visually polished homepage that doesn't
satisfy this is **not** a complete Phase 2, regardless of how good it looks. Phase 2.7's
verification step exists specifically to prove this end-to-end, the same way Phase 1's evidence
proved the equivalent claim for hero media alone.

---

## 7. Phase 2.1 — Status: DONE (2026-08-18)

Implemented and verified end-to-end: `set_section_enabled`/`reorder_sections` in
`content_sections_repo.py`, wrappers in `content_service.py`, two new routes in `content.py`,
`DynamicPage.jsx`'s filter now respects `enabled`. Real evidence (live API calls against Mister H's
real admin JWT, a real Playwright browser confirming the `staff` section actually disappears/
reappears from the rendered DOM, and a real RK regression check via both curl and browser) recorded
in `.claudedocs/work/homepage-phase2/2026-08-18/evidence.md`. No redesign, no new media — exactly
Phase 2.1's stated scope, nothing more.

**Next**: Phase 2.2 (design tokens, per §5.3's resolved values) can start once approved.

# LIVE_PAGE_EDITOR_PLAN.md — A Real Page Editor: Architecture Plan

**Status:** Design only — no code changes made while writing this. Consumes
`.claudedocs/architecture/TENANT_OS_PLAN.md` (the Content Capability, §8's Live Preview
principle, §7's Direct Manipulation philosophy); does not redefine anything that document already
owns.

## Why this document exists

Salman: the dashboard has two "page editor"-looking tabs, and neither does the actual job — see
the real page, click a section, edit it in place. This plan is grounded in a fresh, read-only
investigation of both tabs and of how a real tenant page actually renders, done before writing
anything below. Every claim here is a verified fact, cited to a real file and line.

---

## Confirmed Findings

1. **The currently-wired "Page Editor" tab (`CanvasPageEditor.jsx`, mounted as `پagebuilder` in
   `GenericAdminDashboard.jsx`) does not render the real page at all.** Its center canvas
   (`centerCanvas`, `CanvasPageEditor.jsx:1002-1224`) is a separate, hand-rolled mockup: colored
   summary cards with an emoji + label + a few truncated text/image fields. It imports **zero**
   components from `frontend/src/components/dynamic-sections/` — confirmed by its full import
   list (lines 17-23). Two section types (`featured_items`, `categories_grid`) render literally
   nothing but the placeholder text "انقر للتعديل من اللوحة اليمنى" — no products, no grid, no
   images, ever, regardless of real data.

2. **The real, production rendering pipeline is a completely separate, working system**:
   `frontend/src/pages/generic/normal/DynamicPage.jsx` reads
   `tenantConfig.config.content.sections[]`, sorts by `order`, and maps each `section.type` through
   a real `SECTION_MAP` (lines 52-63) to one of 10 real, richly-built components under
   `components/dynamic-sections/` (`HeroSection.jsx` — 82vh, framer-motion spring animations,
   video/image backgrounds, real CTA — and 9 siblings). This is what a real visitor sees at
   `/demo/:slug`, `/:slug`, and the tenant's own subdomain.

3. **The orphaned second tab, `PageBuilderTab.jsx` (never imported, confirmed again this pass),
   has the identical defect** — its own hand-rolled `LivePreview` (lines 722-927) is the same kind
   of fake mockup, also importing nothing from `dynamic-sections/`. Its one real, worth-keeping
   idea is real `@dnd-kit` drag-and-drop reordering (`CanvasPageEditor` only has ↑/↓ buttons).

4. **The save path is real and already correct — this is not where the problem is.**
   `CanvasPageEditor`'s save (`CanvasPageEditor.jsx:798-817`) → `PATCH /settings` →
   `app/api/v1/admin/settings.py` writes straight into `Client.config` (Json) →
   `invalidate_tenant_cache()` → the public `GET /{slug}/config` endpoint returns that exact same
   field → `DynamicPage.jsx` reads it. A save made in the fake canvas genuinely does reach the
   real live page on reload. The entire defect is in the **editing experience**, not persistence.

5. **A real, working foundation for exactly what's wanted already exists — on a different tab.**
   The **Settings** tab renders a real `<iframe src="/demo/{slug}">` (`GenericAdminDashboard.jsx:
   527-534`) — the actual `DynamicPage.jsx` page, live, inside the dashboard — plus a real
   `postMessage` bridge: `GenericAdminDashboard.jsx:260-269` pushes a `PREVIEW_UPDATE` message on
   every settings-form keystroke; `DynamicPage.jsx:216-233` merges it into local state and
   re-renders instantly, no save/reload needed. Today this only carries 3 primitive fields (accent
   color, hero type, catalog layout) — but the plumbing itself, iframe + postMessage + instant
   re-render, is real, tested, and exactly the right shape.

6. **No click-inside-the-iframe-to-select-a-section exists anywhere.** Confirmed via grep: no
   message type besides `PREVIEW_UPDATE` exists in the codebase. `SettingsTab.jsx` has no
   click-select logic — it's a plain form reporting field changes upward.

7. **`CanvasPageEditor` is exposed unconditionally for every tenant**, including bespoke ones — but
   for beit-al-fakhar specifically, `Client.config.content.sections` is genuinely empty, because
   beit-al-fakhar's real pages (`HomePage.jsx`, `ProductPage.jsx`, `CheckoutPage.jsx`, built and
   validated earlier this session) are **hand-built, tenant-specific React components** — Template
   layer (`TENANT_OS_PLAN.md` §4), not the generic section-driven Content model at all. The
   "Page Editor" tab is structurally incapable of ever doing anything useful for this tenant, not
   just poorly built for it.

**A fresh Architecture Integrity Finding, per `TENANT_OS_PLAN.md`'s taxonomy (§16)**: `CanvasPageEditor.jsx`
and `PageBuilderTab.jsx`'s mockup canvases are **Duplicate Architecture** relative to
`DynamicPage.jsx` + `dynamic-sections/*` — two independent, drifted implementations of "render a
section," one abstract and visibly lower-fidelity, one real. This is also a direct violation of
`TENANT_OS_PLAN.md` §8's own principle, written before this investigation happened: *"the preview
must render using the exact same public-facing components a real customer sees ... not a second,
parallel preview renderer that could drift from the real page."* The two fake canvases are exactly
the anti-pattern that section warned against.

---

## Recommended Approach

**Do not repair the fake canvas. Delete the approach, keep what's real, extend what already
works.**

### Track 1 — Generic, section-driven tenants (footlab, caracas, olivello)

1. **Kill the mockup canvas.** `CanvasPageEditor.jsx`'s `centerCanvas` is replaced by the same real
   `<iframe src="/demo/{slug}">` the Settings tab already uses — the actual `DynamicPage.jsx`
   rendering, live, inside the editor tab.
2. **Extend the existing `postMessage` protocol**, not invent a new one — add full
   `sections[]`/content payloads to the same `PREVIEW_UPDATE` message the Settings tab already
   sends, so any edit updates the real iframe instantly, the same way accent-color changes already
   do today.
3. **Add one new message type, `SELECT_SECTION`, flowing the other direction** — `DynamicPage.jsx`
   gets a thin click-capture layer (only active when rendered inside the dashboard's iframe,
   detected via a query param or `postMessage` handshake, never active for a real visitor) that,
   on click, reports which real `section.id`/`type` was clicked back to the parent dashboard via
   `window.parent.postMessage`.
4. **Keep the existing right-panel section-type editor forms** (`HeroEditor`, `OffersEditor`, etc.,
   `CanvasPageEditor.jsx:550-562`) — these are real, working, and not the problem; only the
   **center canvas** they surround is being replaced.
5. **Net result**: click any real section on the real live-rendered page → the matching real form
   opens in the side panel → edits push live into the same iframe instantly → Save persists via
   the already-correct `PATCH /settings` path. This is `TENANT_OS_PLAN.md` §7's Direct
   Manipulation philosophy and §8's Live Preview principle, both satisfied by extending real,
   already-built infrastructure — not new infrastructure.
6. **`PageBuilderTab.jsx` is deleted**, not kept as a second option — its one good idea
   (`@dnd-kit` drag-reorder) is cherry-picked into whichever reorder interaction Track 1 ends up
   needing; the file itself has no further reason to exist once Track 1 lands (closes the
   Duplicate Architecture finding above completely, rather than leaving one fake canvas fixed and
   a second one still orphaned).

### Track 2 — Bespoke, hand-built tenants (beit-al-fakhar, and any future tenant built the same way)

No `sections[]` to hook into — a genuinely different, smaller mechanism is needed, not a
variant of Track 1:

1. **An opt-in "editable region" wrapper component**, used inside a bespoke tenant's own real page
   files (`HomePage.jsx`, `ProductPage.jsx`, etc.) around whatever pieces are real Content per
   `TENANT_OS_PLAN.md` §4/§6 — e.g. the Hero headline, the About copy, a WhatsApp number display.
   When the page is rendered inside the dashboard's edit context, the wrapper becomes clickable and
   opens an inline editor for whatever real field backs it (`Client.config` for text,
   `CatalogItem`'s own existing edit modal for a product card — reused, not reinvented, per
   Design Principle 2).
   When rendered for a real visitor, the wrapper is inert — zero behavior change, zero performance
   cost.
2. **This is new Template-layer work per bespoke Template**, not a Content-layer capability itself
   — a developer marks which real elements of *their* hand-built page are editable regions once,
   at build time, the same way a Content Capability's Contract (§12) is written once per domain.
   A future bespoke tenant inherits nothing automatically; each bespoke Template's editable regions
   are that Template's own explicit design decision, per §4's Template-layer rule.
3. **Concretely for beit-al-fakhar right now**: `HomePage.jsx`'s hero headline/subtitle/video,
   `ProductPage.jsx`'s story text, and any other real, already-identified Content items from
   `TENANT_OS_PLAN.md` §6's Store Content Ownership Matrix are the first real candidates —
   scoped, not "wrap everything."

### Why two tracks, not one unified mechanism

Per the Abstraction Rule (`rules/team-roles.md`): a shared abstraction is earned only after two
independent real cases prove the same stable shape. Track 1 and Track 2 solve the same *user-facing*
problem (click a real section, edit it live) through genuinely different *mechanisms* (a shared
section-type registry vs. an opt-in wrapper around bespoke JSX) because their underlying content
models are different (data-driven `sections[]` vs. hand-written components). Forcing beit-al-fakhar
onto the `sections[]` model would mean throwing away the real, validated, custom pages already
built and reviewed this session — not a serious option. A shared editing *shell* (the iframe +
postMessage + right-panel-editor pattern) is reused across both tracks; only the *content
mechanism* underneath differs.

---

## Sequencing

1. **Track 1 first** — it has a real foundation already 80% built (the Settings-tab iframe +
   postMessage), touches three real, already-live tenants (footlab, caracas, olivello), and
   closes a documented Architecture Integrity Finding outright.
2. **Track 2 second, scoped to beit-al-fakhar's Hero + a small number of real Content items** —
   proves the "editable region" pattern on one real bespoke tenant before generalizing it to any
   future bespoke Template.
3. **`PageBuilderTab.jsx` deleted as part of Track 1**, not as a separate cleanup task — deleting it
   before Track 1 lands would remove the only reference for its drag-reorder UX; deleting it after
   would leave dead code sitting through an entire implementation cycle for no reason.

---

## What this plan deliberately does not do

- No code written yet — Track 1 and Track 2 are both real, scoped Implementation Contract work,
  not performed in this document.
- No decision on the exact `SELECT_SECTION`/`PREVIEW_UPDATE` message payload shapes — named as the
  mechanism, not specified field-by-field.
- No decision on which specific beit-al-fakhar elements become Track 2's first editable regions
  beyond the Hero (a reasonable, not exhaustive, starting scope).
- No re-litigation of `TENANT_OS_PLAN.md`'s Content Capability, Live Preview principle, or
  Direct Manipulation philosophy — this plan applies them, it doesn't redefine them.

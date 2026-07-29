# Site Configuration Capability — Sprint 3, Phase 3 Verification

**Date:** 2026-07-29. Executes the plan as refined by Salman's 3 corrections: (1) the Editing
Engine is an optional presentation layer, not the Capability itself — Rendered Content gets Inline
Editing, Global Configuration gets Dashboard Controls; (2) Capability → Operations, not Capability
→ Fields — Site Configuration's write behavior is a new Operation type, `UpdateConfiguration`; (3)
`saveFieldValue` must never become a capability switchboard.

## What Changed — and one real finding that changed the scope

The plan's original Phase 3 scope included wiring Brand Name into `<EditableRegion>` for inline
click-to-edit. **During execution, this was not built** — a real investigation of the generic
public page (`DynamicPage.jsx`) found no existing rendered surface that shows `Client.name_ar`
as its own distinct, always-visible piece of content, separate from Content's own `hero.title`
(the two happen to share the same string for `hr` today, but are different fields with different
Sources of Truth). The only two places `name_ar` renders today are a demo-only `TrialRibbon`
(`isDemoRoute` only, not shown for real tenants) and a "coming soon" empty-page fallback (only
shown when zero sections exist — not RK Barber's case). Forcing an `EditableRegion` onto either of
these would have been manufacturing a rendered surface to exercise the mechanism, not genuinely
wrapping existing Rendered Content — exactly the anti-pattern Salman's own new principle warns
against. **Recommendation, not executed**: if a real Brand Name display element is wanted later
(e.g. a persistent header), build that as real UI first, then wire it — not the reverse.

**What Phase 3 actually delivered instead — the anti-dispatcher fix Salman called the most
important point:**

- **New `frontend/src/tenant-os/schemas/sectionFieldHelpers.js`** — `getSectionFieldValue`,
  `applySectionFieldUpdate`, `getSectionFieldPreviewPatch`, three pure functions parameterized by
  `field.sectionType`/`field.dataField`, shared by Content's and Media's schema entries (both
  already live in the identical `content.sections` shape) — mirrors `content_sections_repo.py`'s
  own extraction on the backend "once a second Capability needed the identical shape."
- **`tenant-os/schemas/content.js` and `media.js`** — every entry now carries `getCurrentValue`,
  `applyLocalUpdate`, `getPreviewPatch` (all three pointing at the shared helpers above).
- **`GenericAdminDashboard.jsx`'s `saveFieldValue`** — no longer patches `content.sections`
  inline. It now calls `field.applyLocalUpdate(settings, field, newValue)` and
  `field.getPreviewPatch(updatedSettings, newValue, field)` generically — zero `if (capability ===
  ...)` branches, and this shape holds regardless of how many Capabilities/Operations exist later.
- **The click handler's "read current value before showing the prompt" logic** — same fix, now
  calls `field.getCurrentValue(settings, field)` instead of assuming the `content.sections` shape
  directly.

## Evidence (per Evidence Interrogation)

**Unit-level**: direct Node execution of the 3 shared helper functions against a synthetic
`settings` object — `getSectionFieldValue` correctly read `'OLD TITLE'`; `applySectionFieldUpdate`
correctly wrote `'NEW TITLE'` into the `hero` section while leaving `story`'s and `hero`'s own
`bg_image_url` untouched; `getPreviewPatch`'s returned shape matched.

**Lint**: `npx eslint` on all 4 touched frontend files — zero new errors. The only 2 pre-existing
issues (`motion` unused, `err` unused in 2 catch blocks) were confirmed pre-existing by stashing
the diff and re-linting the original file (identical errors, same count).

**Real end-to-end browser test, via CDP** (handling the real native `window.prompt()` dialog —
still the standing, separately-tracked P-004 finding from the Acceptance Review, not touched by
this Phase):
1. Real login as `hr`'s TENANT_ADMIN, real dashboard load, clicked the Settings tab to render the
   live-preview iframe.
2. Confirmed 3 real `EditableRegion`s present in the iframe:
   `media:hero.bg_image`, `content:hero.title`, `content:story.heading` — registration mechanism
   (`discovery.js`) unaffected by the refactor, as expected (it wasn't touched).
3. Clicked the real `hero.title` region → real `Page.javascriptDialogOpening` event captured,
   `defaultPrompt` correctly showed the *actual current* `hero.title_ar` value (proving
   `getCurrentValue` works against real live data, not just the synthetic unit test).
4. Accepted the dialog with a new test value → confirmed via `GET /api/v1/public/hr/config`
   (independent of the admin UI) that the new value was really persisted.
5. Re-ran the same click → dialog now showed the just-saved value as its default, confirming the
   full read/write round-trip is stable across repeated real edits.
6. Zero console errors throughout; no second (failure) dialog ever appeared.

**Revert + Capability Isolation** — reverted `hero.title_ar` back to RK Barber's real value
("RK Barber Shop") via the real `PATCH /content/hero-title` route, then confirmed via
`GET /public/hr/config`:
- `hero.title_ar`: reverted correctly.
- `hero.bg_image_url` (Media): unchanged.
- `story.heading_ar` (Content's second field): unchanged.
- `whatsapp_number` (Site Configuration, Phase 2's own field): unchanged.

No cross-capability contamination from this refactor.

## Side Findings

- Brand Name having no real independent rendered surface today is itself informative: it suggests
  `Client.name_ar` may belong closer to "Global Configuration" than "Rendered Content" in practice,
  reinforcing rather than contradicting Salman's own Inline/Dashboard split — the evidence just
  didn't support classifying it as Inline yet.

## Unknowns

- Media's `ReplaceMedia` write path was not independently re-tested with a real file upload this
  phase (the shared helper functions are generic/parameterized and already proven correct via the
  unit test + Content's real browser test using the identical functions) — a full image-upload CDP
  test was judged lower marginal value given this, not skipped by oversight.

## Related

- `.claudedocs/evolution/capability-operations-model.md` — the Capability → Operations →
  Interfaces idea this phase's `UpdateConfiguration` naming and Inline/Dashboard split come from.
- `.claudedocs/reviews/site-configuration-phase2-verification.md` — Phase 2's own verification.

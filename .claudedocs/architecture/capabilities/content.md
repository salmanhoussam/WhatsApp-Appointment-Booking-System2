# Content Capability (page copy, distinct from Catalog's product data)

Per the Capability Contract model (`../adr/TOS-003-capability-contract-model.md`). Extracted from
`TENANT_OS_PLAN.md` §13 (Contract), §20 (Maturity) during the ADR-0003 migration (Phase 5).

## Ownership

Editorial page copy — Hero title/subtitle/CTA text, Story heading and body, About/Why-Us/
Testimonials copy — stored in `Client.config.content.sections[].data`. Explicitly distinct from
Catalog's product data and from Site Configuration's business-fact fields (per
`site-configuration.md`'s Ownership Matrix: *"Site Configuration owns no editorial text — anything
that represents Content stays inside the Content Capability, even if it historically lived inside
`config.hero`."*).

**Corrected during Sprint 3's Phase 0 re-investigation** — an earlier pass overstated what Sprint 1
actually built. Only `hero.title` and `story.heading` are real, Engine-editable fields; the rest of
this table's fields have real *data* that renders, but no Admin route or `EditableRegion` yet —
"the data field exists and renders" and "is editable through the Engine" are different claims.

## Contract

| Sub-capability | Status | Mechanism |
|---|---|---|
| Edit Hero title | ✅ Real, Engine-editable | `content_service.py` → `/content/hero-title` |
| Edit Story heading | ✅ Real, Engine-editable | `content_service.py` → `/content/story-heading` |
| Edit Hero subtitle/CTA text | ⚠️ Data exists, not yet Engine-editable | Renders from `config.content.sections[hero].data.subtitle_ar`/`cta_text_ar`; no Admin route, no `EditableRegion` |
| Edit About/Why-Us/Testimonials copy | ⚠️ Data exists, not yet Engine-editable | Renders from their respective `config.content.sections[].data`; no Admin route, no `EditableRegion` |
| Edit SEO metadata (title/description) | ⚠️ Gap | No real field found |

## Operations (Editing Engine, `TOS-002`)

| Field | Operation type | Status |
|---|---|---|
| `hero.title` | `UpdateField` | ✅ Real |
| `story.heading` | `UpdateField` | ✅ Real |
| `hero.subtitle`, `hero.cta_text` | `UpdateField` | ⚠️ Gap — no route/`EditableRegion` yet |
| About/Why-Us/Testimonials fields | `UpdateField` | ⚠️ Gap — no route/`EditableRegion` yet |

## Schema

`Client.config.content.sections[]` — an ordered array; each entry has a `type` (`hero`, `story`,
`about`, `why_us`, `testimonials`, etc.) and a `data` object whose shape is section-type-specific.
Rendered by `DynamicPage.jsx` → `SECTION_MAP` → the matching component (`HeroSection.jsx`,
`StorySection.jsx`, `TestimonialsSection.jsx`, etc.).

## Admin Projection

`app/api/v1/admin/content.py` → `content_service.py` — the one canonical write path for
Engine-editable fields. This is a genuinely clean Service (no shared Broken-Architecture finding
with Site Configuration, per the ratified 2026-07-22 separation decision below).

## Public Projection

`GET /public/{slug}/config` → `config.content.sections[]` (already real, unchanged) — read by both
`DynamicPage.jsx` (every real visitor) and the Dashboard's own live-preview `<iframe>`, proving the
Admin/Public split (`../adr/TOS-002-editing-engine.md` §4.7) is a genuine end-to-end guarantee, not
a mock.

## Maturity

**Stable** (as of 2026-07-22, up from Developing) — its own clean `content_service.py` (no shared
Broken-Architecture finding with Site Configuration anymore — separated per the ratified decision
below), a real Dashboard Interface proven across 2 independent fields/components
(`content.hero.title`, `content.story.heading`, on `HeroSection.jsx`/`StorySection.jsx`
respectively). Governance (Draft/Publish, Audit) and AI Access still incomplete, matching Stable's
own definition (Implementation clean + at least one Interface working; Governance/AI Access may
remain).

## Open Findings

None currently open for this Capability specifically. The Duplicate Architecture finding that
previously affected the dashboard's page-editing surface
(`PageBuilderTab.jsx` vs `CanvasPageEditor.jsx`) is **✅ Resolved** — both files deleted once the
Editing Engine (`../adr/TOS-002-editing-engine.md`) proved out as the real replacement across two
independent real fields, with zero changes needed to `EditableRegion.jsx`, `discovery.js`, or the
click-capture/live-preview plumbing.

## Related

- `../adr/TOS-002-editing-engine.md` — the Editing Engine mechanism this Capability's real fields
  are wired through.
- `site-configuration.md` — the Ownership Matrix that keeps editorial text inside this Capability
  rather than Site Configuration, even for historically `config.hero`-nested fields.

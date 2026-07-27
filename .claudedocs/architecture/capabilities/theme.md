# Theme Capability

Per the Capability Contract model (`../adr/TOS-003-capability-contract-model.md`). Extracted from
`TENANT_OS_PLAN.md` §10 (Theme Editing), §20 (Maturity) during the ADR-0003 migration (Phase 5).

## Ownership

Explicitly not a full Theme Builder, and explicitly not everything-drag-and-drop from day one, per
`../principles/P-002-content-vs-structure.md`'s Template-layer correction. Narrower than
`site-configuration.md`'s own Theme Tokens row — this file documents specifically the *visual*
tokens a tenant may pick from a developer-curated menu; Site Configuration is everything else about
how the tenant's business itself is set up.

## Contract — the Content/Template boundary applied to theming

| Editable (Content, tenant picks a value) | Real mechanism | Protected (Template, developer-owned) |
|---|---|---|
| Primary color | `Client.primary_color` | The color token *system* itself (GS MAR Glassmorphism tokens, spring physics presets in `.claude/rules/frontend/animations.md`) |
| Font | `Client.config.font` | Which fonts are available to choose from (a curated list, not open text entry) |
| Hero media (image/video) | `Client.hero_video_url` / `config.content.hero` — see `site-configuration.md`'s Known Boundary Debt for why this specific field is currently fragmented | The Hero *section's* layout/animation code |
| Section order (of an already-fixed set) | `Client.config.content.sections[].order` | Which section *types* exist at all (`SECTION_TYPES` registry) |
| Section show/hide | A per-section `enabled`/visibility flag within `config.content` | Deleting a section type from the Template's vocabulary |

The line is exactly the Content-vs-Template boundary
(`../principles/P-002-content-vs-structure.md`), applied specifically to theming: the tenant picks
*values* from a developer-defined *menu* of tokens/sections — never free-form CSS, never a new
section type, never a new component, and never full layout freedom just because a drag-and-drop
interaction pattern exists elsewhere in the Tenant OS.

## Operations (Editing Engine, `TOS-002`)

| Field | Operation type |
|---|---|
| Primary color, font | `UpdateField` (picked from a curated set, not free text) |
| Hero media | `ReplaceMedia` — see `media.md` |
| Section order | `ReorderList` |
| Section show/hide | `ToggleVisibility` |

## Schema

`Client.primary_color`, `Client.config.font`, `Client.config.catalog_layout`,
`Client.pageType`/`templateKey`, `Client.config.content.sections[].order`, per-section visibility
flag.

## Admin Projection

Shares `site-configuration.md`'s target Service (`client_service.py`, not yet fixed) for the
token-level fields (color/font/layout/page-type). Section order/visibility is part of the Content
Capability's own section array.

## Public Projection

`GET /public/{slug}/config` — same keys, already real.

## Maturity

**Developing** — a narrower slice of Site Configuration, sharing its same underlying
Broken-Architecture finding rather than having an independent one of its own.

## Open Findings

None independent of `site-configuration.md` — see that file's Open Findings for the shared
Broken-Architecture finding this Capability's write path (once built) will also go through.

## Related

- `site-configuration.md` — the broader Capability this one is a purely-visual slice of.
- `../principles/P-002-content-vs-structure.md` — the Content/Template boundary this Contract
  applies specifically to theming.

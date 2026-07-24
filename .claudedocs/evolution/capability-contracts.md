# Capability Contracts — Evolution Log

Accumulating real evidence about whether `rules/backend/architecture.md §9`'s "One Capability →
One Contract → One Service → One Source of Truth" principle actually holds in practice, or
quietly drifts. See `.claude/rules/documentation-policy.md`'s "Architecture Evolution Log" section
for what this file is and isn't.

## 2026-07-24

### Context

Salman reported a real 500 crash on RK Barber's public page. Investigation
(`.claudedocs/reviews/rk-barbar-story-experience-verification.md` addendum has the full trace)
found `app/api/v1/public/__init__.py`'s slug-in-path catalog endpoints
(`list_catalog_categories`, `list_catalog_category_items`, `get_catalog_item`) calling
`catalog_service` function names that never existed — only their `*_public`-suffixed
counterparts do, already used correctly by a separate, working nested router
(`app/api/v1/public/catalog.py`).

### Discovery

This is the **second independent real case** of the exact same shape of problem this project has
now found: **two parallel implementations of one Capability's public read path, only one of which
actually works** — confirmed the frontend really does call the broken one
(`frontend/src/services/catalogApi.js` → `/${slug}/catalog/categories`), while a different part of
the frontend (`pages/catalog/CatalogPage.jsx`) calls the correct nested one
(`/catalog/categories?client_slug=`). The first case was Media
(`.claudedocs/evolution/media-capability.md`, 2026-07-23: `bg_image_url` generic path vs.
`hero_video_url` bespoke path). Both are the same failure mode: a second route/endpoint quietly
grew alongside the "real" one, and nothing caught the divergence until a real tenant exercised the
broken path.

### Current Understanding

Two independent real cases is exactly this project's own Abstraction Rule threshold for treating
something as a confirmed pattern rather than a one-off (`rules/team-roles.md`). Unlike a Section
type or a code abstraction, though, this isn't "should we generalize a shared implementation" —
it's "this principle (`architecture.md §9`) is being violated in practice, twice, independently,
and both times the violation shipped a real bug to a real tenant before being caught." That's a
different kind of signal: not a promotion question, a **compliance** question.

### Open Questions

- Is there a third instance already sitting undiscovered in Store, Restaurant, or Booking's public
  routes? Not audited — this entry doesn't claim to have checked, only reports the two real cases
  found so far.
- Should routes ever be duplicated across `__init__.py` directly and a nested sub-router for the
  same resource at all, even temporarily during a migration? Both real cases suggest the answer is
  no, but two cases aren't yet a proposed rule change — recording the question, not the rule.

### Promoted?

No — not to an ADR yet. But flagged here explicitly as a candidate for a real, scoped repository
audit (matching `rules/repository-hygiene.md`'s existing audit convention) of every public route
file for the same "route defined twice, only one calls a real function" shape, the next time
significant time is available for it — not a full generalization, a targeted grep-and-verify pass.

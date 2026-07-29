# Capability Contracts — Evolution Log

Accumulating real evidence about whether `rules/backend/architecture.md §9`'s "One Capability →
One Contract → One Service → One Source of Truth" principle actually holds in practice, or
quietly drifts. See `.claude/rules/documentation-policy.md`'s "Architecture Evolution Log" section
for what this file is and isn't.

## ADR-0005 Candidate Watchlist

Not an ADR. Not a Review. A single, quickly-scannable place so that two months from now, finishing
Booking doesn't require re-reading this whole file to know whether ADR-0005 has "earned" being
written yet — the answer lives here, updated as each Capability below is actually checked.

**Evidence (independent instances confirmed so far)**
- ✓ Media — dual hero-write-path (2026-07-23 entry below)
- ✓ Catalog — `admin/restaurant.py`/`admin/store.py` bypassing `catalog_service.py`
- ✓ Site Configuration — `client_service.py` built, never wired (Sprint 3, 2026-07-29)

**Pending (next real cases to check against, not yet audited for this specific pattern)**
- ☐ Site Configuration — re-check: has anything *beyond* the already-found `client_service.py`
  case shown a converging solution shape?
- ☐ Booking

**Decision Threshold**: promote to ADR-0005 when two independent Capabilities converge on the same
Contract *solution* — not merely on confirming the same problem repeats again.

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

## 2026-07-28

### Context

The RK Barber Acceptance Review and its follow-up Module Resolution Review
(`.claudedocs/reviews/module-resolution-review-2026-07-28.md`) investigated why services and
products were showing under the wrong heading on `hr`'s public page.

### Discovery

**A third independent instance of this same failure mode** — this time not two routes/write-paths,
but **three separate frontend implementations of the same tenant-`moduleKey` derivation function**
(`useGenericStore.js`, `DynamicPage.jsx`, `GenericAdminDashboard.jsx`), silently disagreeing on the
edge case that mattered (what happens when no service matches). Same shape as Media (2026-07-23) and
the public-catalog-routes case above (2026-07-24): a second/third copy grew alongside "the real
one," and nothing caught the divergence until a real tenant (`hr`, again) exercised the path where
they disagreed.

### Current Understanding

Answers this file's own 2026-07-24 Open Question ("is there a third instance already sitting
undiscovered") — yes, though not in the place that entry guessed (Store/Restaurant/Booking's public
*routes*); it was in the frontend's *derivation logic* layered on top of those routes. Three
independent real cases now, not two — the pattern isn't just "duplicate backend write/read paths,"
it's the more general "a second/third implementation of the same decision grows unnoticed until a
real tenant's real combination of Capabilities exercises the divergence." This time the response
went further than logging a watch-point: it produced a ratified ADR
(`.claudedocs/adr/TOS-004-plural-capability-resolution.md`) and a phased migration plan
(`CAPABILITY_RESOLUTION_PLAN.md`), because the root cause here wasn't just "which copy is correct"
but a wrong conceptual model underneath all three copies.

### Open Questions

- The original 2026-07-24 question stands, now narrowed: is there a *fourth* instance, in Store,
  Restaurant, or Booking's own route definitions specifically (not derivation logic)? Still not
  audited.
- Should this file's own accumulating pattern (now 3 real cases across Media, Catalog routes, and
  Capability Resolution) itself be promoted to a standing repository-hygiene check, rather than
  waiting for a fourth real case? Raised, not decided.

### Promoted?

Partially — not this Evolution file itself, but the third instance's root cause was serious enough
on its own to become `TOS-004` directly (see Related below), skipping the "needs a second case"
threshold since two *independent* cases (RK Barber's real bug + the dormant `health-gym` template's
prior manual workaround) already existed for that specific finding.

## 2026-07-29

### Context

The Architecture Checkpoint Review (post-Sprint 3) named the same pattern this file has tracked
since 2026-07-23, this time citing three instances across three different Capabilities: Media's
dual hero-write-path (2026-07-23 entry above), Catalog's `admin/restaurant.py`/`admin/store.py`
bypassing `catalog_service.py` (already a named Open Finding in `catalog.md`), and Site
Configuration's `client_service.py` (built, never wired — Sprint 3, this same session).

### Discovery

Salman's own explicit decision, given directly rather than left as a recommendation: the pattern
has repeated enough to state as a general Principle, but not enough to promote to an ADR yet — an
ADR must answer "what is the solution," and this evidence only confirms the *problem* repeats, not
that any specific *solution* (Service Registry, Capability Registry, unified Contract, Dispatcher,
or something else) has converged. Writing an ADR now would jump from problem to solution without
this project's own verification cycle.

### Current Understanding

Promoted to a stated Principle in `rules/backend/architecture.md` §9 (2026-07-29): *"Each
Capability should expose one canonical contract and one canonical write path. Parallel
implementations must be treated as temporary migration states, not permanent architecture."*
`ADR-0005` is explicitly named and deliberately left open — not scheduled, not designed — pending
further real evidence from the next 2-3 Capabilities this Principle gets checked against (Site
Configuration and Booking named explicitly as the next places to look, given both already surfaced
real findings this session).

### Open Questions

- Same standing question this file has carried since 2026-07-24, now sharpened: when the *next*
  instance is found (Site Configuration or Booking are the named candidates to watch), does a
  converged solution shape become visible, or does a fourth instance just add more evidence to the
  same still-open problem statement?

### Promoted?

Yes → Principle (`rules/backend/architecture.md` §9, 2026-07-29). **Not** yet → ADR — explicitly
deferred, per Salman's own reasoning: `Finding → Principle → observe next 2-3 Capabilities → ADR
only if/when the solution converges`, not `Finding → ADR` directly. This is a different, more
conservative promotion than TOS-004's (which did jump straight from Finding to ADR) — the
difference is that TOS-004's real solution was already clear from the evidence itself; this
pattern's solution is not yet.

## Related

- `.claudedocs/evolution/media-capability.md` — the first real case of this pattern (two hero-media
  write paths).
- `.claudedocs/adr/TOS-004-plural-capability-resolution.md` — the third case's own promoted decision
  (a different instance of this same family, promoted directly to an ADR since its solution was
  already clear — contrast with this entry's own, deliberately slower promotion).
- `.claudedocs/evolution/capability-resolution-layer.md` — the resolution being built in response
  (for the `TOS-004` case specifically, not this entry's still-open ADR-0005 candidate).
- `.claudedocs/reviews/architecture-checkpoint-review-2026-07-29-addendum.md` — where this
  promotion was first proposed and then explicitly deferred by Salman.

# Content Sections — Evolution Log

Accumulating understanding of the generic Editing Engine's section-type registry (`SectionType`
in `app/schemas/page_content.py`, `SECTION_MAP` in `DynamicPage.jsx`) as a *pattern surface* — which
section types turn out to be one-tenant one-offs vs. genuinely reusable shapes worth their own
Capability. See `.claude/rules/documentation-policy.md`'s "Architecture Evolution Log" section for
what this file is and isn't.

## 2026-07-23

### Context

RK Barber Shop (`hr`)'s Steps 4-5: building `video_story`, a new section type that renders a
sequence of videos as a narrative block (not a gallery) — see
`.claudedocs/reviews/rk-barbar-verification.md` and `.claudedocs/evolution/media-capability.md`'s
2026-07-23 entry for the technical build.

### Discovery

`video_story` is architecturally different from every other existing section type in one specific
way, per Salman's own framing: `hero`/`story`/`gallery`/`featured_items`/etc. all present *content*
— `video_story` is the first section type built to carry *narrative flow* (a video literally
leading the reader through the page), even though v1 deliberately doesn't render that flow as
navigation yet (§0/Phase 0.5 of the RK Barber review — no segment/category CTAs, real category
data doesn't exist yet).

### Current Understanding

Today `video_story` is exactly one Section, used by exactly one tenant (`hr`) — correctly scoped
as tenant-specific content inside a shared, developer-owned type registry (Section 2's existing
"Template-layer/developer-owned" rule, `TENANT_OS_PLAN.md §10`). It is **not** a Capability and
does not warrant one yet.

### Open Questions — explicit promotion criteria (Salman's own words, recorded verbatim)

Salman will watch, across future tenant builds, whether `video_story` (or a "narrative flow"
shape like it) is independently needed by:
- restaurants,
- real estate,
- showrooms/showcases.

**"إذا تكرر مرتين أو ثلاث، وقتها لا يعود مجرد Section، بل يصبح Capability أو Pattern يستحق ADR
خاصًا"** — if this repeats across 2-3 independently-motivated tenant types, `video_story` stops
being just a Section and becomes a real Capability/Pattern candidate, deserving its own ADR. This
is the same Abstraction Rule already governing this project (`rules/team-roles.md`), applied here
specifically to a Section type rather than a code abstraction — recorded explicitly so the
threshold is visible next time this file gets revisited, not something that has to be re-derived
from memory.

### Promoted?

No — exactly one real case (`hr`) exists. Revisit this file the next time any tenant build
considers a similar video-led or narrative-flow section.

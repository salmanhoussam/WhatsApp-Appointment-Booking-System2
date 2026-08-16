# P2 Empty-State Remediation — `location` / `story` / `gallery` / `testimonials` — Proposal

**Status: Proposal only. No code changed.** Scope requested: the 4 sections named explicitly —
`location`, `story`, `gallery`, `testimonials`. Follows this session's established discipline:
Proposal → Approval → Implementation → Verification → Evidence → Commit.

## Correction to the assumed scope — read before anything else

The earlier research (Track 2A, §10) assumed all 4 named sections needed an empty-state fix. Real
code + real RK/Ali seed-content evidence, gathered for this Proposal specifically, shows that's
only true for **one** of the four. Stating this precisely up front, per the instruction to
distinguish already-evidenced from merely-proposed:

| Section | Component behavior today | RK's real seeded content (`scripts/data/hr/page_content.json`) | Ali's real seeded content (`scripts/data/ali/page_content.json`) | Verdict |
|---|---|---|---|---|
| `gallery` | `GallerySection.jsx:96` — `if (images.length === 0) return null` | `images: []` — collapses correctly, confirmed | No `gallery` section configured at all | **Already correct — no bug found, no change proposed** |
| `testimonials` | `TestimonialsSection.jsx:28` — `if (items.length === 0) return null` | `items: []` — collapses correctly, confirmed | No `testimonials` section configured | **Already correct — no bug found, no change proposed** |
| `story` | `StorySection.jsx` — **no guard**, always renders heading; body/stats are individually conditional | `body_ar`: a real, substantial, well-written paragraph ("في RK Barber Shop، الحلاقة مش مجرد قصة شعر...") — genuinely real content, not empty, not placeholder | Also real, substantial content ("صالون علي مكان صغير بس بخبرة كبيرة...") | **No observed bug on either real tenant.** A defensive guard is still proposed below (hardens against a *future* tenant with a genuinely empty story), but this is precautionary, not a fix for anything currently broken. |
| `location` | `LocationSection.jsx` — **no guard**, always renders heading; paragraph/tags/map are individually conditional | `para_ar: "قريباً"` (literal, truthy string — not empty), `maps_url: ""`, `tags: []` | **No `location` section configured at all** — Ali doesn't show this bug because it doesn't render the section, not because it's fixed | **The one real, confirmed, live bug.** `data.para_ar` is *truthy* (it's the string "قريباً"), so no ordinary empty-check would ever catch it — this is a content problem wearing an empty-state costume. |

**This changes the shape of the Proposal materially**: 2 of 4 sections need zero code changes; 1
needs a defensive hardening with no observed live bug; 1 needs a real fix, and that fix requires an
explicit design choice (below), not just "add a null check."

## Impact Map

| File | Change | Blast radius |
|---|---|---|
| `frontend/src/components/dynamic-sections/LocationSection.jsx` | Add an empty-state guard | Every tenant using the `location` section (currently: RK only, among real production tenants) |
| `frontend/src/components/dynamic-sections/StorySection.jsx` | Add a defensive empty-state guard | Every tenant using `story` — no visible change for RK/Ali (both have real content), only affects a tenant with genuinely empty story |
| `GallerySection.jsx`, `TestimonialsSection.jsx` | **None** | N/A |
| `DynamicPage.jsx` | **None** — confirmed by reading it: each section renders inside a plain `<div key id>` with no fixed height/margin of its own (`DynamicPage.jsx:319`), so a component returning `null` already collapses cleanly today for `gallery`/`testimonials` — the same mechanism applies automatically to `location`/`story` once they gain the same guard. No wrapper-level change needed. |
| Backend (`app/`), DB, API, `scripts/data/*/page_content.json` | **None** in this Proposal's code-change scope — see the Decision Required section below for why RK's actual "قريباً" text is a separate, explicit choice, not silently included here |

## Exact Before/After Behavior

### `location` (the real fix)

**Before**: for a tenant with no real location content, the section renders a bare heading
("الموقع") with nothing underneath if `para_ar`/`tags`/`maps_url` are all empty — a visibly
incomplete-looking block. For RK specifically, it renders the heading **plus the literal text
"قريباً"** as the paragraph, because `para_ar` holds that string, not an empty value.

**After (Part 1 — structural guard, unconditionally proposed)**: `LocationSection` returns `null`
(renders nothing at all — same mechanism already used by `GallerySection`/`TestimonialsSection`)
when `para_ar`, `tags`, and `maps_url` are all empty. This fixes any *future* tenant with genuinely
empty location data. **This alone does not change RK's rendered output**, because `para_ar` is not
empty — it's "قريباً".

**After (Part 2 — RK's actual visible fix, requires your choice)**: see Decision Required below.

### `story` (defensive only)

**Before**: if a tenant's `story` section has no `body_ar` and no `stats`, the section still
renders a heading + accent line with nothing else underneath.

**After**: `StorySection` returns `null` when `body_ar` is empty AND `stats` is empty. **No visible
change for RK or Ali** — both have real body text today, confirmed above.

## Decision Required — how to actually fix RK's visible "قريباً"

Two real options, not silently decided here:

**Option A — Code-only, no tenant data touched (recommended)**: extend the `location` guard to
treat a small, explicit set of known placeholder strings ("قريباً", "قريبا", empty after trim) as
equivalent to empty — i.e. `LocationSection` collapses even though `para_ar` is technically
non-empty. This is the same principle `ALZABT_SECTION_SYSTEM_CONTRACT.md`'s `hours` entry already
states ("must never render literal placeholder text... indistinguishable from real configured
data"), applied here as an explicit, documented sentinel-value check — not a mysterious string
match; the check and its reasoning live in a code comment. **Trade-off, stated plainly**: this is
inherently a little fragile (string matching) and only ever catches the specific placeholder
strings it knows about — a different placeholder word wouldn't be caught. It does not require
touching RK's real database row or `page_content.json` at all.

**Option B — Data-only fix, code stays structural-only**: leave `LocationSection`'s guard as a pure
empty-check (Part 1 above), and separately request explicit approval to edit RK's real
`para_ar` value (either to genuinely empty, so the guard collapses it, or to real location text if
you have it) — a real write to a real production tenant's content, requiring the same explicit
approval this session's standing rules require for any RK data change, and executed as its own
small, separate step (not bundled into this code Proposal).

**Recommendation: Option A.** It achieves the actual visible fix, touches no production data, is
fully reversible (a code revert), and generalizes automatically to Ali or any future tenant that
might get seeded with the same placeholder habit — but it's genuinely your call, since it's a
real trade-off (code fragility vs. a data write), not a technical question with one right answer.

## Risks

- **Option A's string-matching is fragile** — a differently-worded placeholder ("لاحقاً", "TBD",
  etc.) would not be caught. Scoped explicitly to the exact strings seen in real seed data today,
  not a general "detect nonsense text" system — no such system is proposed.
- **`story`'s guard is unverified against any real empty-story tenant** — no such tenant exists
  today among RK/Ali/alzabt-demo (all three have real story content, per this Proposal's own
  evidence gathering... only RK/Ali confirmed directly above; alzabt-demo not re-checked here as
  it's explicitly out of scope, non-production). The guard's correctness for a genuinely-empty case
  will be verified via a throwaway test tenant (see Verification Plan), not assumed.
- **None of these changes touch the reservations engine, the Dashboard, or any API contract** —
  confirmed: both files are pure presentational components (`data` prop in, JSX out), no
  `publicApi`/`adminApi` imports in either file (confirmed by reading both in full).

## Rollback Path

Both changes are isolated, single-file, single-guard-clause edits. Rollback = `git revert` the
commit, or manually remove the added `if (...) return null` line — no data migration, no DB state,
no API contract involved in either direction.

## Verification / Evidence Plan

1. **Before/after screenshot of RK's real live `/rk/home` (or its current real slug) Location
   section** — confirms the "قريباً" text is gone (if Option A approved) and no layout artifact
   (stray empty heading, unexpected gap) is left behind.
2. **Confirm no regression on Ali** — Ali has no `location`/`gallery`/`testimonials` sections
   configured at all today, so this change should be a no-op for Ali; verified by loading Ali's
   real public page and confirming zero visual/console change.
3. **Throwaway test tenant** for the `story` defensive guard specifically — create one via the
   already-proven Demo Builder path (`business_type: barbershop`, real, isolated, fully deletable
   afterward, same pattern used for every throwaway-tenant test this session), manually clear its
   `story.body_ar`/`stats` via a direct (non-production) DB write, confirm the section collapses
   cleanly with no artifact, then delete the throwaway tenant.
4. **Console check** — zero new console errors on RK/Ali/the throwaway tenant, per this project's
   standing browser-verification discipline.
5. Evidence written to `.claudedocs/work/p2-empty-state-location-story/<date>/evidence.md` per this
   project's standing convention — real screenshots, real before/after, not a bare "done" claim.

## What Is NOT In This Proposal

- No change to `ALZABT_SECTION_SYSTEM_CONTRACT.md` or `ALZABT_VERTICAL_REPERTOIRE_MATRIX.md`.
- No `page_templates/barber.json`.
- No Dashboard editor work (that's the separate, parallel P1 workstream).
- No change to `gallery` or `testimonials` — confirmed already correct, not touched.
- No write to RK's or Ali's real production data — Option A avoids this entirely; Option B, if
  chosen instead, would be its own small, separately-approved step, not bundled here.

## Awaiting

1. Approval to proceed with the `location` structural guard + `story` defensive guard (both
   low-risk, code-only).
2. Your choice of **Option A vs. Option B** for RK's actual visible "قريباً" fix.

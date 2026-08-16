# P2 Empty-State Remediation — Evidence

Proposal: `.claudedocs/architecture/ALZABT_P2_EMPTY_STATE_LOCATION_STORY_PROPOSAL.md`
(approved 2026-08-16 — Option A for `location`, defensive guard for `story`, zero change to
`gallery`/`testimonials`, confirmed already correct).

## What changed

Two files, exactly as proposed:
- `frontend/src/components/dynamic-sections/LocationSection.jsx` — placeholder-string sentinel
  (`"قريباً"`/`"قريبا"` treated as no real content) + structural empty-check (`return null` when no
  real paragraph, no tags, no map — same mechanism `GallerySection`/`TestimonialsSection` already use).
- `frontend/src/components/dynamic-sections/StorySection.jsx` — defensive guard (`return null` when
  `body_ar` empty AND `stats` empty).

## Live verification — RK (real production tenant)

| Check | Result |
|---|---|
| `#s_location` div | `innerHTML.length === 0` — the literal "قريباً" text is gone, section collapses cleanly |
| `#s_story` div | Real content still renders: "من نحن... في RK Barber Shop، الحلاقة مش مجرد قصة شعر..." — unaffected, exactly as predicted (RK's story was never empty) |
| Console | 0 errors |

## Live verification — Ali (real production tenant)

| Check | Result |
|---|---|
| `#s_story` div | Real content still renders: "قصتنا... صالون علي مكان صغير بس بخبرة كبيرة..." — unaffected |
| `#s_location` | Does not exist in Ali's page (no such section configured) — confirmed nothing to regress |
| Console | 0 errors, 0 warnings |

## Genuinely-empty case — throwaway tenant (`demo-barber-ac0a`, fully deleted after)

Created via the real `/demo/create` endpoint (`business_type: barbershop`), then a real
`content.sections[]` was written directly (test-only, on a throwaway tenant) with `story.body_ar
= ""`, `stats: []` and `location.para_ar = ""`, `tags: []`, `maps_url: ""` — the genuinely-empty
case neither RK nor Ali actually exercises today.

| Check | Result |
|---|---|
| `#s_story` div | Exists (DynamicPage's own wrapper), `innerHTML.length === 0` — component correctly returned `null` |
| `#s_location` div | Same — `innerHTML.length === 0` |
| Console | 0 errors |

Confirms both guards behave correctly in the actual empty case, not just the placeholder case.

## Regression check

`GallerySection.jsx`, `TestimonialsSection.jsx` — untouched, per the Proposal (already correct).
`npx eslint` on both changed files shows one pre-existing `motion` unused-var warning that also
fires identically on the untouched `GallerySection.jsx`/`HoursSection.jsx`/`TestimonialsSection.jsx`
— confirmed pre-existing tooling quirk, not introduced by this change.

## Data impact

**Zero** on RK or Ali — no DB write to either tenant. The only data created and destroyed was one
throwaway tenant (`demo-barber-ac0a`), created via the real `/demo/create` endpoint and fully
deleted (Client, User, ClientService, CatalogService, CatalogCategory, Barber, BarberService — all
explicitly removed) immediately after verification. One real, transient Supabase pooler failure
occurred during cleanup (`P1001`) — the `connect_db()`/`with_db_resilience()` retry logic (built
earlier this session) recovered automatically on the next attempt; cleanup completed successfully.

## Result

Both guards verified live on both real production tenants (no regression) and on a throwaway
tenant exercising the genuinely-empty case directly. RK's visible "قريباً" is confirmed gone.
`gallery`/`testimonials` confirmed untouched and still correct.

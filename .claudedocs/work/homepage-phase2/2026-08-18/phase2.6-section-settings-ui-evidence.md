# Homepage Phase 2.6 — Section Settings Dashboard UI — Evidence

Contract: `ALZABT_HOMEPAGE_SECTION_SETTINGS_CONTRACT.md`. The Dashboard Renderer for everything
built this phase — the real acceptance test Salman named, verified end-to-end.

## Real, additional bug found and fixed while building this

The pre-existing "Hero Text" card in `SettingsTab.jsx` wrote to `Client.config.hero.{title_ar,
subtitle_ar, cta_ar}` — a field **`HeroSection.jsx` has never read** (it reads `content.
sections[hero].data.{title_ar, subtitle_ar, cta_text_ar}`). Confirmed via a real API read:
`config.hero` was `null` for Mister H despite the real hero text having been set correctly weeks
earlier through a different path (the rebrand script). Confirmed via a full-codebase grep:
`config.hero` is referenced **nowhere else** — a fully dead, disconnected card since it shipped.
Removed and replaced: hero's real text fields now live in the new Section Settings area, writing
to the field `HeroSection.jsx` actually reads.

## Real architectural decision, named explicitly

`content.py`'s own header previously deferred a generic Dispatcher route "until a second real
Capability/Operation proves the routing shape actually repeats." `ALZABT_HOMEPAGE_SECTION_
SETTINGS_CONTRACT.md` names 9 real sections needing the identical shape — that threshold is met.
One generic `PATCH /content/sections/{type}/fields` route replaces what would otherwise be 9
near-identical hand-written routes.

## What changed

- `frontend/src/pages/generic-admin/tabs/SettingsTab.jsx`:
  - Removed the broken "Hero Text" card and its dead `config.hero` read/write path.
  - Added a real Working Hours card (`Client.config.working_hours`) — confirmed via a full grep of
    every admin tab that this field had **zero editing surface anywhere** before this (only ever
    read, e.g. `ReservationsTab.jsx`'s calendar-range calculation).
  - New `SectionSettingsArea` + `SectionRow`: lists every real section (via the new `GET
    /content/sections`), per-section enable checkbox (`PATCH .../enabled`), up/down reorder
    (`PATCH .../reorder`), and an expandable field-editor form driven by `SECTION_FIELDS` — a
    direct transcription of the Contract's own field inventory table, not invented independently.
    Media fields with dedicated Renderers (hero, gallery) are absent from this config on purpose.

## Live verification — the real acceptance test, real browser, real data

Logged into Mister H's real admin dashboard (fresh JWT injected into `localStorage`, same auth
mechanism the app itself uses).

| Verb | Action | Result |
|---|---|---|
| **Hide** | Unchecked "فريقنا" (Staff) | Confirmed on the real public homepage: `s_staff` completely absent from the DOM |
| **Reorder** | Moved "معرض الصور" (Gallery) up past "فريقنا" | Confirmed on the real public homepage: exact new order `hero, featured, why_choose_us, gallery, story, hours, location, cta` (staff correctly absent, mid-sequence) |
| **Edit content** | Changed Story's `heading_ar` via the real form + real "حفظ" button (used Playwright's real `.fill()`, not raw DOM manipulation — a first attempt using direct `.value` assignment silently failed to trigger React's controlled-input state, a verification-script issue, not an app bug, caught by checking the real API afterward rather than trusting the UI alone) | Confirmed on the real public homepage: the edited heading text visible verbatim, screenshot-confirmed |
| **Replace media** | Already proven end-to-end in the two prior commits (Hero Phase 1, Gallery this session) — not re-tested here, would be redundant |
| **Revert everything** | Re-enabled Staff, restored the original order, restored the original Story heading — all via direct API calls (same mechanism the UI itself uses) | Confirmed via a fresh public config read: exact match to the pre-test state. Confirmed via a fresh browser load: `s_staff` present again, section order restored, no leftover test text |
| Console errors throughout | 0, except one already-diagnosed transient Supabase pooler 500 on a single `/admin/settings` GET (immediately followed by a successful retry on the same endpoint in the server log) — the same already-documented recurring infra flakiness, not caused by this work |
| `rk` regression | Own real dashboard settings page loaded cleanly, 0 console errors: real working hours (`09:00 AM`–`09:00 PM`), real section list including a section type (`story_experience`) with no entry in `SECTION_FIELDS` — correctly shows only enable/reorder controls, no broken edit button. Public homepage unaffected throughout the entire test sequence |

## Data impact

Real, temporary test writes to Mister H only (staff enabled toggle, section order, story heading),
all confirmed reverted to the exact real pre-test state. Zero writes to RK or any other tenant.

## What this closes

The full acceptance test Salman named as the binding definition of "done": *"أفتح Dashboard →
أغيّر section أو أخفيه → أغيّر النص/الصورة → Save → أفتح Homepage → أرى النتيجة، بدون deploy."*
Verified end-to-end, real browser, real data, every verb — not a claim.

## Deferred, named explicitly (per the Contract's own §4)

`stats[]`/`tags[]`/`items[]` array-field editing (Story's stats, Location's tags, Why Choose Us's
items) — needs a repeatable-group UI, a meaningfully bigger surface, deliberately not built this
round to avoid exactly the "build everything at once" Salman warned against. Logo/Nav stays
out of scope per his own explicit call.

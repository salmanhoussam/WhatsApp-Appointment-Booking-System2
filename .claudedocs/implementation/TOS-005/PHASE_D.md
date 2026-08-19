# TOS-005 Phase D — Repeatable-Group Dashboard UI + Service-Layer Hardening — Evidence (2026-08-19)

Follows: `.claudedocs/implementation/TOS-005/CONTRACT.md` Phase D, plus a real, additional
requirement Salman raised when authorizing this phase: **page content must only ever change
through the Dashboard, never a script reaching around it.** Addressed as two things — a Dashboard
UI real enough that nobody needs a script to edit content anymore, and a real code hardening so the
canonical Service (not only the Route) refuses invalid writes regardless of caller.

## Part 1 — Service-layer validation hardening

**Real gap found while addressing the requirement**: `validate_fields`/`validate_repeatable_item`
were only ever called inside `content.py`'s route handlers, not inside `content_service.py`'s own
functions. A script (or a future AI action) that imported `content_service` directly and called
`update_section_fields`/`add_repeatable_item` would have bypassed validation entirely — the exact
shape of risk Salman named.

**Fix**: `content_service.update_section_fields`/`add_repeatable_item`/`update_repeatable_item` now
call `validate_fields`/`validate_repeatable_item` internally, raising `ValueError` on a violation.
Redundant with the route's own pre-check for a normal HTTP request (harmless, both agree); the real
value is for any *direct* Service caller, which now gets refused bad data without depending on the
route layer at all.

**Real, honest limit, documented in `section_schemas.py`'s own module docstring, not hidden**: a
script writing to `Client.config` via raw Prisma (`db.client.update`), bypassing `content_service.py`
entirely, is not something code in this Service can prevent — that's Python import discipline, not
a technical guard. 3 real historical scripts already do exactly this
(`scripts/fix_cta_mrh.py`, `scripts/add_why_choose_us_mrh.py`, `scripts/set_mrh_social_contact.py`,
all dated 2026-08-18, all one-off and already executed, all predating this Contract) — not rewritten
retroactively (`repository-hygiene.md`'s own norm against editing historical files), but the
established convention going forward is explicit: any *future* script touching section content
must call `content_service.py`, never raw Prisma.

## Part 2 — Repeatable-Group Dashboard UI

**Files**: `frontend/src/pages/generic-admin/tabs/SettingsTab.jsx` — new `FieldInput` (one shared
kind→input-type renderer, used by both `SectionRow`'s scalar fields and the new component, so the
switch logic exists exactly once) and `RepeatableGroupEditor` (`{sectionType, field, fieldSchema}` →
generic add/edit/delete/reorder rows — never `StoryEditor`/`LocationEditor`/`WhyChooseUsEditor`).
Local per-row draft state, committed only via an explicit "حفظ" per row (matches this file's
existing scalar-field convention; avoids a per-keystroke autosave race where two overlapping PATCHes
against the same index could interleave and silently drop a character).

## Acceptance — real browser, real Dashboard UI, not curl

All of this was done by clicking real buttons and typing into real form fields inside the actual
Mister H Settings page (`ليش تختارنا` / `why_choose_us.items`), verified after each step via a real
`GET /public/mr-h/config` read:

1. **Add** — selected "موثوق" from the real `<select>`, typed a real title/body, clicked
   "+ إضافة" → confirmed the 5th item landed in the real public config.
2. **Edit** — typed a new title into the newly-added row's own input; the row's "حفظ" button
   appeared automatically (dirty-row detection) and was clicked → confirmed the edit landed.
3. **Delete** — clicked the row's own "حذف" → confirmed back to the original real 4 items.
4. **Reorder** — clicked the first item's "↓", confirmed the swap in the real public config;
   clicked it back with "↑", confirmed the original order restored exactly.
5. **Zero regression** — 0 console errors throughout the whole Dashboard session; real public
   homepage (`/mr-h/home`) reflects the final, restored state; RK (`/rk/home`) reconfirmed
   unaffected, 0 console errors.

## Real tenant data hygiene

Every add/edit/reorder made during this UI verification was undone by the end of the sequence,
through the same UI, not a manual fix — confirmed identical to the pre-test state via a final
public config read.

## Result — the CMS Readiness Gate's binding acceptance test, met in full

Salman's own closing test from `ALZABT_HOMEPAGE_SECTION_SETTINGS_CONTRACT.md` §6, extended to
repeatable content: hide a section, reorder it, edit its text, replace its media, **add/edit/
delete/reorder items inside a repeatable group** — all from the real Dashboard, zero code, zero
deploy, seen live on the real public homepage. All four phases (A→B→C→D) of TOS-005 are complete,
each independently verified with real evidence, each its own commit.

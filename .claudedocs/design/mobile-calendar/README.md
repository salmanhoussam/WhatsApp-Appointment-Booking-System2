# Mobile Calendar — Approved Design (local archive)

Permanent local copy of the Mobile Day Calendar redesign, approved by Salman 2026-08-23. The
Claude Artifact link is a live, shareable view of the same content — this folder is the
project's own durable record, per this project's own documentation discipline (a decision must
not live only as an external link).

## Contents

| File | What it is |
|---|---|
| `MOBILE_CALENDAR_UX_APPROVED.md` | The approved design itself — goal, audit, principles, STAFF vs TENANT_ADMIN behavior, Day mobile behavior, colors, touch interactions, what must not change, acceptance criteria. Source of truth for implementation. |
| `assets/mockup.html` | The exact HTML file that was published as the Artifact — open directly in any browser for a full interactive, pixel-accurate copy of the approved mockup (phone frames, real rk data, callouts). Byte-identical to what Salman reviewed and approved; not a redrawn copy. |

## Origin

- Investigation (read-only, current mobile Day/Week behavior): earlier this session, root-caused
  via direct code reads of `ReservationsTodayView.jsx`/`ReservationsWeekCalendar.jsx` — no mobile
  branch existed at all; `isMobile` was computed in `ReservationsTab.jsx` but never reached either
  calendar component.
- Design study + mockup: built as a Claude Artifact using rk's real DB data (barbers جعفر/حسين,
  real 2026-08-23 reservations) — original link:
  **https://claude.ai/code/artifact/05ce212f-7ef0-4f13-ad9a-0bb826c666ef**
- Approval: Salman, 2026-08-23, "GREEN LIGHT للتنفيذ."

## Scope note

This design covers **Day view on mobile only**. Week view's existing horizontal-scroll pattern
was reviewed earlier the same session and found to already be a deliberate, contained design
(not a bug) — left untouched by this design and by its implementation.

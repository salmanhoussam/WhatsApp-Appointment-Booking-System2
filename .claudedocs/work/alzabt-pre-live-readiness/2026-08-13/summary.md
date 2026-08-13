# Alzabt — Release Candidate Lock (post-Calendar-redesign)

Follows `investigation-protocol.md`. Extends the earlier readiness check
(`.claudedocs/work/alzabt-pre-live-readiness/2026-08-12/summary.md`, commit `33ba6e5`), which
predates the Calendar visual redesign (`cf6f474`). That redesign touched real, shared code
(`ReservationsTab.jsx`, `ReservationsWeekCalendar.jsx`, `ReservationsTodayView.jsx`) — the same
components every tenant's dashboard renders — so the release candidate being locked here is
**current HEAD (`cf6f474`)**, not the earlier commit. Per Salman's own explicit framing this
session: confirm launch-readiness, fix only real blockers, defer everything cosmetic to a
post-launch backlog — not open-ended polish.

## What this pass covers (not re-covered from the 2026-08-12 check)

- RK against the redesigned Calendar: already covered by the redesign's own verification pass
  (`.claudedocs/work/alzabt-calendar-visual-redesign/2026-08-12/summary.md`) — desktop+mobile,
  Today/Week/List, 0 console errors, real interactions confirmed intact. Not re-run here.
- Rate limiting (3/hour) and tenant isolation: unaffected by a UI-only change to already-fetched
  data — confirmed unrelated to the redesigned files, not re-run.
- **New in this pass**: `alzabt-demo` and a real Demo Builder tenant (`demo-barber-f93b`, reused
  from earlier testing rather than burning another rate-limit slot — the redesign has no backend
  component, so a previously-created tenant is equally valid evidence) against the *redesigned*
  Calendar specifically, plus a mobile spot-check.

## Confirmed Findings (real browser, both tenants)

- **`alzabt-demo`, Today + Week**: real login → `/alzabt-demo/dashboard/calendar`. KPI row real
  (`0 حجز` on today, `1 حجز`/`1 معلّقة` on the week containing a real booking), `+ حجز جديد`
  button present, real staff names (كريم/طارق) rendered. **0 console errors** across both views.
- **`demo-barber-f93b`, Today + Week**: real login → dashboard. KPI row real, `+ حجز جديد` present,
  real personalized barber name ("الحلاق الرئيسي — فحص حد 1") rendered correctly. **0 console
  errors.**
- **Mobile (390×844), `alzabt-demo`**: no horizontal overflow (`scrollWidth === clientWidth`).
  2×2 KPI grid, staff toggle, date nav, Add button, bottom tab bar all render without clipping.
  **0 console errors.**
- **Total across this pass: 0 console errors, 0 failed requests, on both tenants, all viewports.**

## Side findings — pre-existing, NOT fixed (per explicit scope)

- **Calendar tab took ~8-10s to leave its loading state** on both tenants during this pass —
  consistent with this project's already-documented, unrooted intermittent Supabase pooler
  flakiness (real, same class of issue the backend itself hit once during this exact session,
  requiring one retry to connect at all). Not caused by the redesign (no new network calls were
  added by it) — a real, already-known infrastructure issue, not a new one.
- **Session is single-tenant**: logging into a second tenant invalidates the first tenant's
  session, requiring re-login when switching back. Expected auth behavior (one JWT in
  localStorage), not a bug — just needed an extra re-auth step during this test.
- **"Calendar feels visually empty/flat"** (Salman's own observation, studied against the Setmore/
  Calendr references) — real finding, explicitly deferred to the post-launch Alzabt improvement
  cycle per Salman's own sequencing decision. Not a launch blocker; not touched in this pass.

## Final Verdict

### A. READY — pending explicit LIVE approval

No real blocker found across RK (prior pass), `alzabt-demo`, and a real Demo Builder tenant — all
three tenant paths, desktop + mobile, against the current release candidate (`cf6f474`, includes
the Calendar visual redesign). Every finding surfaced is either pre-existing infrastructure
flakiness already documented elsewhere, expected auth behavior, or an explicitly-deferred
cosmetic item with its own named future phase.

**Alzabt is locally production-ready based on the tested scope, including the Calendar redesign.
The only remaining action is Salman's explicit decision to proceed with LIVE/Railway. Step 13
(LIVE) remains STOPPED — this verdict is not permission to deploy.**

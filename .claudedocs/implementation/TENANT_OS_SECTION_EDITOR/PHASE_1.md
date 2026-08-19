# Tenant OS Section Editor — Phase 1 (Section Shell / Layout Manager) — Evidence (2026-08-19)

Follows: `.claudedocs/architecture/ALZABT_CMS_SECTION_EDITOR_IMPLEMENTATION_PLAN.md` §11 Phase 1.
Salman's 3 explicit constraints for this phase, all honored:
1. No big refactor — shell/layout only, schema/media/legacy settings untouched.
2. No data change — `content.sections[]`'s shape/values unchanged; only its Dashboard presentation
   changed.
3. Full acceptance test before any further phase; **Phase 2 does not start automatically.**

## Code change

`frontend/src/pages/generic-admin/tabs/SettingsTab.jsx` only. `SectionRow` (the old inline-
accordion component) split into two components with **identical, unmoved logic**:
- `SectionListRow` — the compact list line (checkbox/label/reorder/select-to-view). No field
  logic.
- `SectionEditorPanel` — exactly `SectionRow`'s old expanded-content block (field computation,
  `values` state, `handleSave`, `RepeatableGroupEditor` mounting) — verbatim, not rewritten, now
  rendered as a dedicated panel instead of an inline accordion.

`SectionSettingsArea` gained `selectedType` state (defaults to the first real section on load) and
a two-column layout: list (150px) + editor panel (remaining width), replacing the old single-column
accordion list. `handleToggleEnabled`/`handleMove`/`load` — **byte-for-byte unchanged**, same
routes, same optimistic-update-then-revert-on-failure logic as before this phase.

No backend file touched. No `Client.config`/`content.sections[]` write path changed. No new route.

## Acceptance Test — real browser, both tenants, real evidence

**Mister H (`mr-h`)**:
- Section list renders all 9 real sections with correct labels, no visible regression vs. the
  pre-Phase-1 accordion list.
- **Select section**: clicking a list row switches the editor panel (Hero → الخدمات → ليش تختارنا,
  each showing its own correct fields/repeatable groups) — confirmed via real DOM text reads after
  each click.
- **Enable/disable**: toggled `featured_items` off — confirmed via `PATCH .../enabled` network
  capture (`200`), confirmed via `GET /public/mr-h/config` (`enabled: false`), confirmed the real
  public homepage (`/mr-h/home`) skips straight from Hero to the next section with the grid gone —
  then confirmed re-enabling restores it (network capture + config read).
- **Reorder**: confirmed via real click on Hero's `↓` — network capture shows the route succeeding
  (`200`) and `GET /public/mr-h/config` reflecting the new order. Restored to the original order
  afterward via the same real route.
- **Section editor opens on the opposite side**: confirmed structurally throughout — every
  selection test above showed the editor panel populated next to the list, not replacing it.
- **Live preview keeps working**: the existing `<iframe src="/demo/{slug}">` (unchanged,
  untouched, still owned by `GenericAdminDashboard.jsx`) confirmed present and rendering real
  content throughout every test above.
- **Repeatable groups still work inside the new panel**: `why_choose_us.items` rendered its 4 real
  items (select/text/textarea + reorder/delete) plus the add form, unchanged from Phase D's own
  behavior.
- **Zero regression on the real public homepage**: final check, `/mr-h/home` — Hero → real Services
  grid (all 6 items, correct order) → 0 console errors, exact pre-testing state restored.

**RK (`rk`) — the cross-tenant confirmation (the plan's own §12 pass condition)**:
- Real login, real Settings page load, **0 console errors, 0 warnings**.
- Section list renders all **10** of RK's real sections (a genuinely different, larger set than
  Mister H's 9, including `story_experience`/`video_story`/`testimonials` — the 3 real
  label-only sections named in the plan's own §3 table) — same generic code, zero
  `if slug === ...` anywhere in the new code, confirmed by reading the diff.
- Selected `تجربة القصة` (`story_experience`, a label-only section) — editor panel correctly shows
  "لا توجد عناصر قابلة للتعديل لهذا القسم بعد." (the `SectionEditorPanel`'s own real empty-state
  branch), 0 console errors — proves the generic engine handles a section with zero editable
  fields gracefully, not just the 9 fully-wired ones.
- Live preview iframe confirmed present, correctly pointed at `/demo/rk`.
- Real public homepage (`/rk/home`) — 0 console errors, unaffected.

## Side finding — real, pre-existing, NOT a Phase 1 regression

While retrying the reorder test through unusually heavy Supabase pooler flakiness (see below), one
sequence of two rapid clicks (the first failing with a real `500`, the second succeeding)
produced a double-swap in `content.sections[]`'s real order rather than a clean single swap.
Root-caused, not assumed: `handleMove`'s existing optimistic-update-then-`load()`-revert-on-failure
logic has a real race window — if a second click fires before the failed first click's `load()`
revert has resolved, the second click computes its swap from the *already-optimistically-updated*
(but not yet server-confirmed) local list. **This logic is completely unchanged from before Phase
1** (confirmed: `handleMove` was not touched by this phase's diff) — a pre-existing characteristic
of the original code, only surfaced here by unusually bad backend flakiness during rapid manual
retries. Restored to the correct real order via the same real route immediately after finding it.
Named here as a real finding for a future hardening pass, not fixed in this phase (out of Phase
1's own "no logic change" scope).

## Side finding — real, external, not a code issue

Multiple real Supabase pooler connectivity failures during this verification session (`Can't reach
database server at aws-1-ap-southeast-2.pooler.supabase.com:6543` and, once, a connection-pool
timeout) — confirmed via direct `/dev/tcp` reachability checks (genuinely unreachable at points,
genuinely reachable moments later) and backend logs, matching this project's own long-documented
recurring infra flakiness pattern. Every failed request was retried and succeeded on retry; no
step in this Acceptance Test was accepted from a single, unverified attempt.

## Result

All of Phase 1's own acceptance criteria pass, on both tenants, with real evidence, zero
tenant-specific code. **Phase 2 does not start automatically** — awaiting Salman's review of this
evidence and explicit go-ahead, same gate discipline as TOS-005's own A→D sequence.

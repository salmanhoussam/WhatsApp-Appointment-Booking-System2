# Product Decisions — from today's Product Evaluation passes

Pure UI/UX/Flow judgments only — no bug tracking here, that lives in `blocking-bugs.md`. Every item
below is a pointer to where the real evidence already lives, not a duplicate.

## Dashboard (hr)

Full scorecard: `.claudedocs/work/dashboard-calibration/2026-08-02/phase1-2-evaluation.md`.

| Page | Verdict |
|---|---|
| Overview | 🟡 Needs Improvement |
| Reservations — List | 🔴 Needs Redesign |
| Reservations — Calendar | 🟡 Needs Improvement |
| Catalog — Services | 🔴 Needs Redesign |
| Catalog — Products | 🔴 Needs Redesign |
| Orders | 🟡 Needs Improvement |
| Settings | 🟡 Needs Improvement |
| QR | ✅ Ready |

## Wireframes for the 🔴 pages

Full detail: `.claudedocs/work/dashboard-calibration/2026-08-02/phase2-5-dashboard-vision.md`.

- **Services** — card layout (icon + name + duration + price + Active status), replacing the flat
  list.
- **Products** — image-first cards (image top, name, price), replacing the flat list.
- **Reservations/Calendar** — merged List+Calendar view, staff-column-aware from the start (see
  Multi-Staff Scheduling in `strategic-decisions.md`).

## Root cause behind all three 🔴 verdicts

Same underlying mismatch, not three separate problems: the dashboard answers the *system's* question
first (numbers, tables, raw data) instead of the *owner's* question first. See
`feedback_owner_first_framing` in memory for the standing design principle this produced.

## Not yet evaluated this way

`footlab` and `smar`'s customer-facing and admin pages were investigated as a **Technical Audit**
today, not a Product Evaluation pass — no `✅/🟡/🔴` UX verdicts exist for them yet. If a Product
Evaluation of those tenants is wanted later, it's a separate, deliberate pass — not assumed to be
covered by today's bug-finding work.

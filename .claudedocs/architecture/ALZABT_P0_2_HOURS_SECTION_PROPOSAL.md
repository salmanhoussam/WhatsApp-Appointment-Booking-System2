# P0.2 — `HoursSection` Real-Data Proposal

**Status:** Discovery + proposal only. **No code.** Per `ALZABT_SECTION_SYSTEM_WORK_SEQUENCE.md`'s
own P0.2 entry, re-read this pass, re-verified against real code and real DB state, not carried
forward from that document's own claims alone.

---

## Governing docs re-read (this pass)

- `ALZABT_SECTION_SYSTEM_WORK_SEQUENCE.md`'s P0.2 entry: "confirm `GET /public/{slug}/config`
  already returns this field (it does — same field the admin dashboard reads)"; "a tenant with no
  real `working_hours` configured either... needs a real, honest empty state — not a fabricated
  schedule"; "don't remove the `data.rows[]` override entirely if a tenant genuinely wants custom
  display text."
- `ALZABT_SECTION_SYSTEM_CONTRACT.md`'s `hours` entry: `Reads live data? No — ... this is itself a
  real, confirmed gap`; visual-quality rule: "should never render literal placeholder text
  ('قريباً') in a way indistinguishable from real configured hours — an honesty/empty-state
  concern, not just a visual one."
- Both confirmed still accurate against the real code below — no drift found.

---

## Impact map — every real reader/writer of "hours" data, verified live

| Source | Model | Real writer (admin UI) | Real readers |
|---|---|---|---|
| **`Barber.workingHours`** | Per-staff-member, `Json?` | `StaffTab.jsx` (`working_hours` fields, lines 253/307/644) → `PATCH/POST /admin/barbers` (`app/api/v1/admin/barbers.py:126-157`) | `reservation_service.py`'s booking-engine validation (`_check_working_hours`, `get_available_slots`) — **highest-priority source, per-barber, already live-editable** |
| **`Resource.workingHours`** | Per-resource (non-Barber moduleKeys), `Json?` | `app/api/v1/admin/resources.py` | Same booking engine, only when no Barber involved |
| **`Client.config.working_hours`** | Tenant-wide, `Json?` inside `Client.config` | **No admin UI writes this anywhere** — confirmed by grep, `SettingsTab.jsx` has zero references to `working_hours`. Real values on `rk`/`alzabt-demo` came from one-time seed scripts (`scripts/data/hr/page_content.json` — `hr` is RK's pre-rename slug — and `scripts/seed_alzabt_demo_tenant.py`), never a live editor | Booking engine's own fallback when no Barber/Resource hours set (`reservation_service.py:206-218`); already publicly read and rendered on `ReservePage.jsx:576-579` (`"يومياً {open}-{close}"`, hidden entirely if unset) |
| **`section.data.rows[]`** | Authored page content, per-tenant, per-section | Not directly editable via any admin UI found (page content is set via `scripts/seed_page_content.py` / page templates at onboarding, not through a live content editor) | `HoursSection.jsx` only |

**`HoursSection.jsx` itself is not buggy** — `rows.length === 0 → return null` is already a correct,
honest empty state at the component level. The problem is upstream: **the row data it's given is
authored, one-time-seeded text**, and for RK specifically, that authored text is the literal
placeholder `"قريباً"`. Traced to its real origin: `scripts/data/hr/page_content.json` (`hr` = RK's
slug before the rename) — a one-time seed, never a component bug, never re-touched since.

## Real current data, verified live (not assumed)

| Tenant | `Client.config.working_hours` | `Barber.workingHours` (per barber) | `hours` section `data.rows` |
|---|---|---|---|
| **RK** | `{open:09:00, close:21:00, closed_days:[monday]}` | جعفر: `{09:00–18:00, no closed days}` · حسين: `{09:00–21:00, closed monday}` | `[{"أيام الأسبوع", "قريباً", "قريباً"}]` — the literal placeholder |
| **Ali** | `None` — never seeded | Ali: `{09:00–18:00, no closed days}` | no `hours` section in Ali's real page at all |
| **alzabt-demo** | `{09:00–20:00, no closed days}` | كريم: `{09:00–20:00}` · طارق: `{10:00–19:00, closed friday}` | no sections at all (pre-existing, unrelated) |

**A real complication this proposal must surface, not silently resolve**: RK already has **two real
barbers with genuinely different working hours** (جعفر ends at 18:00, حسين at 21:00 and is off
Monday). `Client.config.working_hours` is a single tenant-wide value that does not, and structurally
cannot, represent that divergence — it happens to numerically match حسين's hours on RK today, which
looks like a coincidence of how it was originally seeded, not a designed relationship. This is not a
new gap introduced by this proposal — `ReservePage.jsx`'s own already-shipped, already-live
`hoursText` makes the exact same simplification (tenant-wide only, no per-barber view) — but it is
the one real design question this proposal cannot skip.

## Which sections consume structured hours — confirmed, not assumed

Checked `SECTION_MAP`'s all 12 entries and each one's own data shape (`ALZABT_SECTION_SYSTEM_CONTRACT.md`,
re-verified against the real components this pass): **only `hours` reads or displays anything
related to opening hours.** `location`'s `tags[]`/`maps_url` are unrelated (address/parking, not
schedule). No other section touches this data in any form — this is a fully isolated, single-file
change, same isolation class as P0.1.

## Retail/restaurant tenants — confirmed unaffected either way

`scripts/data/page_templates/restaurant.json`'s own `hours` section ships real, meaningful authored
content (weekday-grouped opening hours) — restaurant/store tenants have no equivalent live
`working_hours` data source (no Barber/Resource-shaped staff-hours concept applies to them), so
authored `data.rows` is their genuine, intended design, not a gap. Whatever priority rule is chosen
below, a tenant with no real `working_hours` (every retail/restaurant tenant, always) falls straight
through to its existing authored rows — byte-identical behavior to today.

---

## The one real decision this proposal needs from you before any code

**Option A — Real data is the default; `data.rows` is an explicit override only.**
`HoursSection` reads `Client.config.working_hours` (mirroring `ReservePage.jsx`'s own already-shipped
pattern) and expands it into weekly rows (7 Arabic weekdays, `closed_days` marked `closed: true`,
others showing `open_time–close_time`) whenever it's set — regardless of whether `data.rows` also
happens to contain old authored content. `data.rows` only wins when no real `working_hours` exists
at all.
— *Consequence, stated plainly*: RK's live page would immediately stop showing "قريباً" and start
showing real hours (09:00–21:00, closed Monday — حسين's numbers, since that's what `Client.config`
holds) the moment this ships. This is a **rendering change on a real production tenant**, not a
data mutation (RK's own `section.data.rows` stays untouched in the DB either way) — but it's a
visible, live effect you should sign off on explicitly, not discover after the fact.
— Matches the Work Sequence doc's own stated intent most closely ("real `working_hours` should be
the default").

**Option B — `data.rows` wins whenever present; real data only fills a true gap (no rows authored at
all).**
Safer in the narrowest sense — RK's page does not change today. But it doesn't actually close the
real complaint (RK, a live production tenant, keeps showing "قريباً" indefinitely) unless a separate,
later, explicitly-approved step clears RK's own authored rows. Ali (no `hours` section at all today)
would still get nothing either way under this option, since it has no rows to fall back from.

**My recommendation: Option A**, with the consequence called out above stated to you before
implementation, not discovered after. It's the only option that actually fixes the real, live thing
this whole P0.2 item exists to fix, it's consistent with an already-shipped precedent
(`ReservePage.jsx`), and it does not touch any tenant's stored data — only what gets computed at
render time.

---

## Proposed change scope (pending your decision above — still no code)

- **One file**: `frontend/src/components/dynamic-sections/HoursSection.jsx`.
- **No backend change** — `GET /{slug}/config` already returns `config.working_hours` at the same
  path `ReservePage.jsx` already reads it from; confirmed live this pass.
- **No schema change.**
- Data shape addition: `config` prop (same pattern P0.1 just established — already spread into every
  section via `DynamicPage.jsx`'s existing `sectionProps`, no `DynamicPage.jsx` edit needed).
- Transform: `Client.config.working_hours → weekly rows`, in Arabic weekday order, using the same
  `closed_days` string values (`"monday"`, etc.) already used by `barbers.py`/`reservation_service.py` —
  no new vocabulary invented.
- Empty state: no real `working_hours` and no authored `rows` → section renders nothing (`return
  null`), same honest-empty-state convention `HoursSection.jsx` already uses today, same one Ali
  would hit if it had an `hours` section at all.

## What this proposal explicitly does not do

- Does not touch `RK`, `Ali`, or `alzabt-demo`'s stored tenant data.
- Does not build a per-barber hours view (Option A's own named simplification, matching existing
  precedent, not a new gap).
- Does not touch `service_type`, `page_template`, Section System, or any other deferred item.
- Does not add a `Client.config.working_hours` editor to `SettingsTab.jsx` — out of scope; this
  proposal only makes the *public* section read what already exists, not add a way to write it.

Waiting for your decision on Option A vs. B before writing any code.

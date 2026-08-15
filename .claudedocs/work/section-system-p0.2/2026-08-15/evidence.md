# P0.2 — `HoursSection` real-data fix (Option A) — Evidence

**Scope**: `frontend/src/components/dynamic-sections/HoursSection.jsx` only, per
`ALZABT_P0_2_HOURS_SECTION_PROPOSAL.md`, Option A approved. No backend, no schema, no
`DynamicPage.jsx`, no `ReservePage.jsx`, no other section, no tenant data modified.

## The fix

`Client.config.working_hours` (the same field `ReservePage.jsx`/`ReservationsTab.jsx` already read)
is the default source whenever it's genuinely configured (`open_time` + `close_time` set) — expanded
into 7 weekday rows using the exact same lowercase English `closed_days` vocabulary
`reservation_service.py`'s `_check_working_hours()`/`get_available_slots()` already use, no new
format invented. `data.rows` — the section's original authored content — is now only a fallback for
a tenant with no real `working_hours` at all. Nothing is written to any tenant's stored data; only
what's computed at render time changed.

## Live verification (real Playwright browser, this session, dev server)

Two navigations hit a transient `503` from the known, pre-existing Supabase pooler flakiness
(unrelated to this change, encountered repeatedly throughout this whole session) — each resolved
cleanly on an immediate retry, noted honestly rather than omitted.

| Tenant | Real `Client.config.working_hours` | Before | After |
|---|---|---|---|
| **RK** (`/rk/home`) | `{open:09:00, close:21:00, closed_days:['monday']}` | Hours section showed the literal authored placeholder `"قريباً"` (row: `أيام الأسبوع — قريباً — قريباً`) | ✅ Real weekly hours: الأحد–السبت 09:00–21:00, **الإثنين marked مغلق**. Confirmed by reading the section's own DOM text directly, not inferred. 0 console errors, only the pre-existing unrelated Framer Motion warning. **`"قريباً"` still appears once on the page — in the separate, untouched `location` section**, confirmed by direct DOM inspection to be a different section entirely, out of P0.2's scope. |
| **Ali** (`/ali/home`) | `None` — never seeded | No `hours` section exists in Ali's real page at all | ✅ Unchanged — no `hours` section, component never mounts, 0 console errors. Confirms this component doesn't crash or misbehave for a tenant with neither source. |
| **alzabt-demo** (`/alzabt-demo/home`) | `{open:09:00, close:20:00, closed_days:[]}` | 0 sections | ✅ Unchanged — 0 sections, 0 console errors/warnings, nothing to regress. |
| **Genuine retail/restaurant** | No real tenant currently has both an `hours` section and `catalog`/`store`-only capabilities (same finding as P0.1) — built and immediately deleted a throwaway `business_type: "restaurant"` demo tenant (`demo-p02testrestaurant-ca2b`), confirmed `config.working_hours: None` before injecting a real authored `hours` section (weekday-grouped text, matching `restaurant.json`'s own real default shape) | — | ✅ Authored rows render exactly as authored (`الاثنين — الجمعة: 11:00 ص — 11:00 م`, `السبت: 12:00 م — 12:00 ص`) — the fallback path works, retail/restaurant behavior is byte-identical to before. 0 console errors. **Tenant deleted immediately after verification.** |

**Network check**: RK's request list after the fix is identical to before it — `GET /rk/config` once,
no new request added. This is a pure render-time transform of data already being fetched; confirmed
directly, not assumed.

## What was NOT touched, confirmed by the diff itself

`git diff` shows exactly one file. `config` is a new destructured prop, already being passed into
every section via `DynamicPage.jsx`'s existing `sectionProps` spread (unchanged, no edit needed
there — same precedent P0.1 already established). Backend, schema, `ReservePage.jsx`, and every
other section are untouched.

## Result

All 4 requested live checks pass with real evidence. RK's live page no longer shows the placeholder
Hours text and now reflects its real, structured working hours — a rendering change only, no tenant
data mutated. Ali, alzabt-demo, and a genuine retail/restaurant case all confirm no regression.

# Ali → Mister H Rebrand — Evidence

Executed per Salman's explicit, detailed "green light" (2026-08-16) — full rebrand, including slug
change, approved with exact field values specified by him (name_en/name_ar wording, real location/
phone/hours data from the real `mr.salon.h` Instagram profile, hero video, and an explicit
instruction to drop the old navy `#1C3D5A`).

## Pre-change investigation (real evidence, not assumed)

- Grepped `frontend/src/router/`, `frontend/src/utils/`, `app/core/config.py`,
  `app/services/public_service.py` for hardcoded `"ali"` slug references — **zero found**. Ali uses
  the generic dynamic resolver (`GenericAdminDashboard`/`DynamicPage`), no per-tenant route file,
  no CORS/storage-folder hardcoding — confirmed a slug rename is a pure DB change with no code-side
  cleanup needed.
- Checked Supabase `properties/ali/` — empty, nothing to migrate.
- Read the real, live `Client` row and `content.sections[]` for `ali` directly from the DB (not the
  seed script file, which can drift) before writing anything.

## What changed

**Supabase Storage**: uploaded the real shop video to
`properties/mister-h/pages/home/hero/hero-video.mp4` (new slug's folder, per
`storage-tenant.md`'s convention).

**`Client` row** (`slug: ali` → `mister-h`):
| Field | Before | After |
|---|---|---|
| `slug` | `ali` | `mister-h` |
| `name` | Ali Barber Shop | Salon, Mister H |
| `name_ar` | صالون علي للحلاقة | صالون مستر إتش |
| `name_en` | Ali Barber Shop | Salon, Mister H |
| `primary_color` | `#1C3D5A` | `#5B4FE9` — a reasoned electric indigo-blue read from the small circular profile photo in the real `mr.salon.h` Instagram screenshot (neon blue/purple interior lighting); **flagged explicitly as a best-effort read from a low-resolution reference, not a precise pixel sample** — easy to adjust with one more field update if it doesn't match well enough live |
| `config.working_hours` | not set | `{open_time: "09:00", close_time: "20:00", closed_days: []}` — real hours from the Instagram bio ("Open 9am-close 8pm") |

**`content.sections[]`** (6 sections, was 4):
- `hero` — `bg_type: "color"` → `"video"`, `bg_image_url` → the new Supabase video URL, `title_ar`
  → "صالون مستر إتش" (was "صالون علي للحلاقة")
- `story` — `body_ar` fully rewritten, zero "Ali"/"علي" mentions, new copy for Mister H; stats kept
  (still accurate: 6 services, 1 dedicated barber, 7 days/week)
- `featured_items` — unchanged
- `hours` *(new)* — renders from the real `config.working_hours` above (same live-data mechanism
  `HoursSection.jsx` already uses for RK, per the earlier P0.2 fix — not a new mechanism)
- `location` *(new)* — real text: "بتلاقونا في خربة سلم، الجنوب — للحجز والتواصل: 71455767"
  (Khirbet Selem, South Lebanon + real phone number, both from the Instagram bio)
- `cta` — unchanged, reordered to last

**`Barber` row** — left untouched (`name: "Ali"`), per Salman's explicit framing: Ali is the real
barber/owner, distinct from the shop's brand name.

## Live verification

| Check | Result |
|---|---|
| `GET /api/v1/public/mister-h/config` | `200`, correct `name_ar`, `primary_color`, all 6 sections present |
| `GET /api/v1/public/ali/config` | `404` — old slug no longer resolves, confirmed intentional |
| Real browser, `/mister-h/home` | Hero renders with real video playing (`<video>` element, correct `src`), title "صالون مستر إتش", new indigo CTA button color, story text fully rewritten (zero "Ali" mentions), Hours section shows real 09:00–20:00 rows for every day, Location section shows real "خربة سلم، الجنوب" + phone. Screenshot: `mister-h-rebrand-verification.png` |
| Console | 0 errors |
| `/mister-h/dashboard` (unauthenticated) | Redirects cleanly to `/login` — normal behavior, not a regression |
| One real, transient Supabase pooler `500` hit mid-verification (`P1001`, unwrapped `get_tenant_config` DB call — this route isn't yet covered by the `with_db_resilience()` retry wrapper built earlier this session) | Self-resolved on retry within seconds; backend log shows clean `200`s immediately before and after — same external, already-documented pooler flakiness, not a new bug. **Side finding**: `public_service.py`'s `get_tenant_config()` DB call is one of the few remaining unwrapped hot-path DB calls — worth a future small resilience pass, not done here (out of this task's scope) |

## Not changed (explicitly out of scope)

- `Barber.name` (stays "Ali").
- `User` (admin login) row — email/credentials untouched; still references the old name internally.
  Not requested, and changing login credentials without being asked risks locking out whoever has
  the current password.
- No new Dashboard editor was built — the location/hours data was written directly to the DB as
  authored content, using the same fields the (still-missing) Dashboard editors would eventually
  write to. This is real production content, not a Dashboard capability.

## Data impact

Real, intentional write to a real production tenant, explicitly authorized. No other tenant
(RK, alzabt-demo) touched. Fully reversible via a symmetric DB update if ever needed (all previous
values recorded in the table above).

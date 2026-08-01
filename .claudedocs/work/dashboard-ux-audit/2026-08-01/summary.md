# Dashboard UX Audit — 2026-08-01
Follows: Investigation Protocol (`.claude/rules/investigation-protocol.md`)
Method: Browser Verification Capability (`.claude/skills/frontend/browser-verification-capability/SKILL.md`)

**Scope, per Salman's explicit staged request:** (1) find the real cause of his own login lockout,
(2) investigate whether it's a one-off or a systemic onboarding gap, (3) map the dashboard URL
inconsistency, (4) audit the *current* dashboard against his stated vision for Calendar and
Products — evidence and comparison only, no code changes in this pass.

## Confirmed Findings

### 1. The login lockout — real, evidenced, not a one-off

- `hr`'s admin user (`rkbarber@dev.invalid`) had **never successfully logged in**
  (`lastLoginAt: null`, checked directly in the DB) and its one-time magic setup link
  (`/setup?token=...`) had **expired the day before Salman tried** (`setupTokenExp:
  2026-07-30T13:42:28Z`).
- **Unblocked**: a real password was set via the app's own existing, legitimate mechanism
  (`POST /api/v1/auth/create-user`, protected by `SECRET_KEY` — built for exactly this, no new code
  written). Verified working end-to-end via a real browser login (typed credentials into the actual
  `/login` form, not a synthetic token).
- **Credentials, for Salman**: `rkbarber@dev.invalid` / `RkBarber2026!`

### 2. This is a systemic onboarding gap, not specific to `hr` — confirmed by reading the real registration code

- `registration_service.py`'s `setup_url` (the magic link) is generated with a **7-day expiry** and
  is **only ever returned in the registration API's JSON response** — grepped the entire codebase:
  it is never emailed, never sent via WhatsApp, never displayed anywhere persistent. Whatever relays
  it to the tenant (a human copying it from a screen, presumably) is the only delivery path.
- **No resend-setup-link mechanism exists anywhere in the codebase** (confirmed via grep — the only
  "resend" match is the unrelated Resend.com email-provider library name).
- **No password-reset flow exists anywhere** (no "forgot password" route, frontend or backend —
  confirmed via grep, zero matches).
- **Conclusion**: any real tenant who doesn't act on their setup link within 7 days, or loses it,
  ends up in exactly the state `hr` was in — locked out, with no self-service way back in. The only
  current recovery path is the platform-owner-only `create-user` endpoint Salman just used on
  himself. This will recur for every future tenant unless addressed — logged here as a real gap,
  **not fixed in this pass**, per the explicit scope of this audit.

### 3. The dashboard URL inconsistency — mapped, one confirmed bug found

Two different URL patterns exist for the same destination:

| Pattern | Where it's used | Status |
|---|---|---|
| `/{slug}/dashboard` | `registration_service.py`'s own returned `dashboard_url`; `SetupPage.jsx`'s redirect after a successful magic-link setup | **The official/intended pattern** — used by both the registration flow's own stated output and the setup flow's own redirect target |
| `/dashboard/{slug}/units` | `Login.jsx`'s post-login `navigate()` call — the **only** place in the codebase using this shape | The outlier. Confirmed real via a live login test: it does resolve to a working dashboard (not broken/404), but it's architecturally inconsistent with the pattern the rest of the system considers canonical |

**Assessment, not a fix**: `Login.jsx` is very likely the leftover Salman predicted ("بقايا من
معمارية قديمة"). It works today because `/dashboard/:slug/*` happens to also be a separately
registered route pointing at the same `GenericAdminDashboard` component — but it's a second, redundant
path to the same place, exactly the kind of drift this project's own principles warn about. Not
touched in this pass — logged as a real, confirmed candidate for later cleanup, not urgent since it
doesn't currently block anything.

## Current Dashboard — what exists, evidenced via a real logged-in browser session

**Tabs (sidebar nav)**: نظرة عامة (Overview) · الطلبات (Orders) · الحجوزات (Reservations) ·
الكتالوج (Catalog) · الإعدادات (Settings). No tab named "Calendar" or "Products" — those live inside
Reservations and Catalog respectively.

### Calendar — closer to the vision than expected, not a from-scratch build

- **Already exists**: a real weekly calendar grid (`ReservationsWeekCalendar.jsx`), toggle-able from
  a default list view. Hourly rows 09:00–20:00. **Customer names do appear inside time slots** as
  real clickable blocks (verified with real data: "زبون اختبار حقيقي" at 11:00, "Test Patient" at
  10:00, etc.) — this is close to Salman's described vision already.
- **Gap #1**: each calendar block shows only a name + start time — **no service name or duration**
  visible on the block itself (his stated requirement: "الخدمة قدا وقتها" / the service and its
  duration shown together).
- **Gap #2**: the default List view auto-filters to "today," and shows a **false-empty state** (0
  results) until the user manually switches to "الكل" (all dates) — real reservations exist (9 of
  them, real names/phones/dates), they're just hidden by the default filter. This would look exactly
  like "nothing is working" to anyone who doesn't know to change the filter — plausibly part of
  what made Salman feel lost.
- **Working Hours as a distinct, editable settings section**: not confirmed present or absent in
  this pass — the calendar's 09:00–20:00 row range was observed, but whether that's a real editable
  per-day Working Hours config or a fixed display range wasn't specifically checked. **Logged as an
  Unknown**, not asserted either way.

### Catalog / Products — the clearest real gap vs. the stated vision

- Categories render as small tiles (الخدمات / منتجات العناية). Clicking into a category shows its
  items as **plain list rows** — name (AR/EN) + price + edit/delete buttons.
- **No product images appear anywhere in this view.** This is a genuine, confirmed gap against
  Salman's explicit ask (a square card: image on top, name below, price, edit/delete) — today's
  Catalog tab is a list/table, not a card grid, for both Services and Store products alike.

### Settings / QR — already meets a "clear enough" bar, no gap found

- A QR code **is** visible, in a clearly labeled section ("رابط متجرك ورمز QR"), positioned near the
  top of the Settings tab (no significant scrolling required), paired with the real store URL and a
  copy-link button, alongside a live preview iframe of the public page. No redesign need identified
  here.

## Current vs. Desired — the comparison Salman asked for, before any code is written

| Area | Current state | Salman's vision | Gap size |
|---|---|---|---|
| Login/Onboarding | Real, systemic gap (see Confirmed #1–2) | A new tenant should be able to get in within a minute | **Real gap — needs a real fix**, not just for `hr` |
| Dashboard URL | Two patterns, one is legacy drift | One clear, canonical URL | **Minor** — works today, worth cleaning up later, not urgent |
| Calendar (Reservations) | Real week-calendar exists, names show in slots, working hours shown as grid rows | Same, plus service+duration visible per slot, plus Working Hours/Services management in the same place | **Needs polish, not a rebuild** — the hard part (real calendar UI) already exists |
| Products (Catalog/Store) | Plain list rows, no images | Square image-card grid | **Needs real redesign** — closest thing to "build new" of everything audited |
| QR / Settings | Clear, well-placed, working | Same | **No gap** |

## Side Findings

- Catalog items DO have an `image_url` field in their data model (confirmed earlier this session —
  `GET /store/products` returns `image_url`/`images`) — the gap is purely in the Catalog tab's own
  rendering (a list, not a grid using that existing field), not a missing backend capability.
- The Overview tab's "آخر الطلبات" (Latest Orders) panel showed a real empty state ("لا توجد طلبات
  بعد") during this audit — expected and correct, not a bug, just noting it wasn't confused with a
  broken panel.

## Unknowns

- Whether a distinct, editable Working Hours settings section exists elsewhere in Settings (not
  checked directly) — needs a dedicated look before concluding this needs to be built vs. already
  exists elsewhere in the UI.
- Whether Catalog items' existing `duration` field (if one exists on the Service side) is stored but
  simply not rendered in the list view, or genuinely absent from the data model — not checked this
  pass.
- Whether the false-empty "today" filter default is intentional (a deliberate default for daily
  triage) or an oversight — not clear from the UI alone, would need to check the intent behind that
  default.

## What is explicitly NOT decided by this audit

No redesign has been proposed or built. Per Salman's own staged process, this document is the
"what exists vs. what's wanted" input — the next step is his review of this comparison, then a
wireframe/design proposal for the Products grid and the Calendar's service+duration display
specifically (the two real gaps found), before any implementation begins.

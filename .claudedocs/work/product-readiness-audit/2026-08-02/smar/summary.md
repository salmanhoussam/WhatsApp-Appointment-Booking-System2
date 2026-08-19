# Product Readiness Audit — smar (Booking / Chalets)

Investigation + real Browser Verification only (Playwright MCP against the local dev server,
`localhost:5173`). No code changes, no redesigns, no fixes applied. Session was interrupted mid-run
by a real laptop restart; servers were restarted and the audit resumed cleanly — no evidence was lost.

## Scorecard

| Page/Step | Verdict | One-line reason |
|---|---|---|
| Canonical landing (`/smar/home`) | 🔴 Needs Redesign | **Confirmed live infinite-redirect loop — the canonical URL is completely broken** |
| Showcase (`/smar/showcase`, the real working entry point) | ✅ Ready | Real content, zero console errors, cinematic scroll-pinned hero confirmed working as designed |
| Listings (`/smar/listings`) | ✅ Ready | 18 real units, real prices/descriptions, filters, zero console errors |
| Reservation drawer | ✅ Ready | Real date fields, guest counters, computed total, WhatsApp confirm — the best-built reservation flow found across either tenant today |
| Admin Dashboard (`/smar/admin`) | ✅ Ready | Real, richer than either other tenant audited today — password reset with explicit approval, verified live |

## Confirmed critical bug — `/smar/home`, the canonical URL, is completely broken

Per `CLAUDE.md`'s own routing rule, `/{slug}/{defaultRedirect}` is the one canonical public URL for
every registered tenant — for smar, `frontend/src/router/tenants/index.js` sets
`defaultRedirect: 'home'`, so the canonical URL is `/smar/home`. **That URL does not work.**

- Navigating to it produces a live infinite redirect loop: `window.location.href` was captured
  containing the literal string `/showcase` repeated **16,333 times** in a row.
- Real cause, traced (not just observed): `smar.routes.jsx` has no `path="home"` route defined at
  all — only `path="showcase"`. A request to `/smar/home` falls through to the catch-all route,
  which does `<Navigate to="showcase" replace />` — a **relative** navigate. Each failed re-match
  appends another `/showcase` segment instead of resolving to the absolute `/smar/showcase`, so it
  never stabilizes.
- Real, measured impact: `browser_take_screenshot` timed out (page unresponsive), and
  `browser_console_messages` captured **163 repeats** of React's own
  `"Maximum update depth exceeded"` render-loop error.
- Salman confirmed this live on his own machine during the audit (screenshot showed the exact same
  repeating `/showcase/showcase/showcase...` URL) and confirmed it's a real, already-known, already-
  deferred issue — **not fixed in this pass**, per the mission's explicit no-fixes rule and his own
  standing instruction.
- Worked around for the rest of this audit by navigating directly to `/smar/showcase`, the real
  working route.

## What was verified past the redirect bug

- **Showcase page** (`/smar/showcase`): real Arabic hero copy ("بيت سمار — حيث يهدأ العالم، وتبدأ أنت
  من جديد"), zero console errors. A large stretch of the page (roughly 4,300px of a 5,075px total
  scroll height) initially looked like empty black space in a single full-page screenshot — checked
  further before concluding anything: scrolling through it in steps confirmed this is a real,
  working scroll-pinned cinematic hero (background image swaps as you scroll, matching the
  documented "GSAP Z-axis cinema" pattern for this template), not a bug. Real footer content
  ("اصنع ذكرياتك هنا", CTA, social links) confirmed at the true bottom of the page.
- **Listings** (`/smar/listings`): 18 real unit cards (شاليه/فيلا types), each with a real name, real
  Arabic description, real capacity, real nightly price (e.g. "ألف — Aleph", $165/night, sleeps 2),
  category filter pills, all real API calls (`/public/smar/config`, `/public/smar/listings`)
  returned 200.
- **Reservation drawer** (opened by clicking "عرض التفاصيل" on a unit): real check-in/check-out date
  fields, a live-computed nights count, adult/child guest steppers, a live-computed approximate
  total, and a clear "تأكيد الحجز عبر واتساب" (Confirm via WhatsApp) CTA with a note that final
  details/price get confirmed by the team. This is a materially more complete booking experience
  than what exists on `hr` today — a real, working date-based flow, not a blind form.

## Confirmed real bug — unbounded failing image retry loop

A background image request keeps failing and **retrying indefinitely with no backoff or limit**,
confirmed by querying the network log twice ~10 seconds apart while the page sat idle (drawer open,
no user action) — the failure count grew from 104 to 116 repeats in that window alone:
```
GET https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beitsmar/homepage/beitsmar7.jpg
=> [FAILED] net::ERR_BLOCKED_BY_ORB
```
`ERR_BLOCKED_BY_ORB` means the browser is rejecting this specific asset due to a cross-origin/
MIME-type mismatch — worth checking that object's actual `Content-Type` header and CORS config on
the Supabase bucket. Left running long enough (a real customer browsing on their phone), this would
mean continuous, uncapped background network activity — a real battery/data concern, independent of
whatever visually broke to begin with.

## Admin dashboard — verified after credential reset, richest of the tenants audited today

`admin@salmansaas.com`'s password was reset (with your explicit approval) via the same `create-user`
mechanism used for `hr` and `footlab`, then verified live: lands directly on "Action Inbox" (0
pending, correctly empty — no test reservation was actually submitted during this audit, per the
mission's no-actions scope). Sidebar shows a genuinely more mature admin than either other tenant:
Action Inbox, Reservations, الوحدات (Units), معرض الصور (Gallery), الخدمات الإضافية (Add-on Services),
Overview, **Housekeeping, Maintenance, Gardens**, إعدادات المنصة (Platform Settings), Page Builder,
إدارة الفريق (Team management). Zero console errors, zero failed API calls (44 requests, all 200).

**Confirmed cross-tenant side finding, same shape as `footlab`'s**: right after this admin session
loaded, two requests fired for `client_slug=footlab` — the tenant tested immediately before this one
in the same browser — before settling into correct `smar`-scoped calls. **This is now confirmed
independently twice in one session** (footlab's admin showed a stale `client_slug=hr` request right
after login; smar's admin showed a stale `client_slug=footlab` request right after login) — the
pattern tracks whichever tenant was tested immediately prior, strongly suggesting a real race
condition (a request fired before the tenant context fully updates on login/navigation) rather than
a hardcoded value. Worth treating as a real multi-tenancy hygiene finding, per this project's own
`rules/global.md` critical rule — not traced to a specific file/line in this investigation-only pass.

## Unknowns

- Whether the `/smar/home` redirect bug affects only the bare `/home` segment or a broader class of
  unmatched paths under `/smar/*` — only the one URL was tested; not exhaustively probed.
- Root cause of the cross-tenant stale-slug request — confirmed as a real, twice-independent pattern
  above, but not traced to a specific file/line (out of scope for this pass).

**Resolved during this session, no longer Unknown**: admin dashboard access (verified live after an
approved credential reset).

## Current strengths

- The reservation drawer (date range, guest counters, live total, WhatsApp confirm) is the strongest
  booking UX found across both tenants audited today — real, complete, and functional.
- Listings page: real data, real filtering, zero console errors, zero failed API calls.
- The showcase's cinematic scroll design works as intended once you're actually on it.
- The admin dashboard is the most complete/mature of any tenant audited today (Housekeeping,
  Maintenance, Gardens, Team management, Page Builder — real operational depth, not just CRUD).

## Biggest weaknesses

- The canonical public URL for this tenant is completely broken with a real infinite loop — this is
  the single most severe finding across both tenants audited today, since it's the literal front door.
- An uncapped failing network retry loop running in the background on the listings page.
- The cross-tenant stale-slug request pattern — confirmed independently on both tenants audited
  today, worth escalating rather than treating as a one-off.

## Top three improvements

1. Fix the `/smar/home` → `/smar/showcase` redirect: either add a real `path="home"` route, change
   `defaultRedirect` in the registry to `"showcase"`, or make the catch-all's `Navigate` absolute
   (`to="/smar/showcase"`) instead of relative — any one of these breaks the loop. (Not fixed here —
   flagged, per the mission's explicit no-fixes rule and Salman's own confirmation this is a known,
   deferred item.)
2. Fix or cap the `beitsmar7.jpg` retry loop — either the asset/bucket config or add a retry limit on
   the `<img>` error handler.
3. Confirm whether the ~4,300px of scroll-pinned hero before reaching real listings content is the
   right pacing for a customer trying to book quickly, versus a first-time visitor exploring the
   brand — not a bug, a real product-pacing question worth a deliberate answer.
4. Investigate the cross-tenant `client_slug` request firing right after an admin login switches
   tenants — same pattern confirmed twice independently (footlab and smar) in this one session, see
   `footlab/summary.md` for the paired finding.

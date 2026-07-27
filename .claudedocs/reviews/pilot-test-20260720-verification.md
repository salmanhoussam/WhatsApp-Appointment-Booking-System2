# Restaurant Template Reference Sign-off — `pilot-test-20260720`

**Tenant:** `pilot-test-20260720` — **Date:** 2026-07-27 — **Purpose:** browser visual sign-off
gating `TEMPLATE_ROADMAP_VISION.md`'s Restaurant → Store → Clinic sequencing (Store template does
not start until this is closed). Follows `investigation-protocol.md`'s evidence discipline —
Confirmed/Side Findings/Unknowns, no claim stronger than what was actually checked.

---

## 1. What Was Attempted

A real, end-to-end browser visual check: start both servers (`./start_dev.sh`), open
`localhost:5173/demo/pilot-test-20260720` in a real headless Chrome instance, confirm all 8
sections render real content (not placeholder/empty states), zero console errors, and the CTA
(WhatsApp link) is genuinely clickable — the same standard already applied and closed for
beit-al-fakhar's `/store` page (`.claudedocs/reviews/store-experience-review.md`).

## 2. Confirmed Findings

- All local tooling required for the check is real and ready: `venv/`, `frontend/node_modules/`,
  a real Chrome binary (`/usr/bin/google-chrome`), and the `pilot-test-20260720` tenant fixture
  data all present and correct — confirmed by direct inspection, not assumed.
- The Vite frontend dev server starts cleanly every time, in under 1 second, both attempts.
- The FastAPI backend's own database connectivity to Supabase (`aws-1-ap-southeast-2.pooler.
  supabase.com`, ports 6543/5432) is **genuinely intermittent, confirmed by direct measurement, not
  inferred**: a raw TCP connect to port 6543 succeeded once, then failed again ~15 seconds later
  when the backend's own Prisma engine attempted the same connection (`P1001: Can't reach database
  server`), then failed again on a third raw TCP check taken immediately after. Two independent
  measurement methods (raw `/dev/tcp` check, and Prisma's own connection attempt) agree the
  connection is unstable right now — this is not a code bug in this project, and not a blanket
  network restriction on this environment (general internet egress and DNS resolution both work
  correctly throughout — verified separately in the same session).
- This matches a previously-documented pattern in this project: intermittent Supabase pooler
  connectivity was already a confirmed real cause in the beit-al-fakhar `/store` investigation
  (cited in `.claude/rules/investigation-protocol.md`'s own "Independent Causes Are Allowed"
  section) — this is the same class of environmental instability recurring, not a new one.

## 3. Blocked

**Blocked by Environment Network Egress (Supabase DB ports 6543/5432 unreachable).** Per Salman's
explicit instruction (2026-07-27), the retry budget for this session is spent — one quick retry was
attempted, connectivity was briefly confirmed then dropped again before the backend could stay up
long enough to serve a single request, and further retries are not worth the time right now.

## 4. Current Reference — What Stands In Until Manual Verification

Pending a real browser check (on Salman's own machine, where Supabase connectivity is presumably
stable, or in a future session where this environment's connection to Supabase is confirmed
stable first), the **API-verified state remains the current reference**, per the prior session's
own work (`.claudedocs/sessions/2026-07-20.md` and prior todo-list entries): all 8 section types
resolve to real components under `DynamicPage.jsx`'s `SECTION_MAP` (confirmed via a real
`GET /config` call, not assumed), and the CTA link is wired to a real WhatsApp number in the
fixture data. This is **not** the same claim as a visual sign-off — per
`investigation-protocol.md`'s "Runtime Before Assumption" rule, an API response proves the data
layer is correct, not that it renders correctly on a real page (CSS, layout, and any client-side
rendering bug remain unverified by an API check alone). The gap between these two claims is the
entire reason this sign-off exists as its own step.

## 5. Side Findings

None new this pass — no code was exercised long enough to observe any real application behavior
beyond the DB connection attempt itself.

## 6. Unknowns

- Whether the Supabase pooler instability is transient (will resolve on its own within
  minutes/hours) or tied specifically to this sandboxed environment's egress path — not
  determined; would need a longer observation window or a check from a different network to
  isolate.
- Everything downstream of a successful page load (section rendering, console errors, CTA
  click-through) — genuinely unverified, not just unconfirmed. No claim is made about them either
  way.

## 7. Verdict

- [x] **Blocked, not failed.** No evidence contradicts the existing API-verified state; no new
  evidence confirms the visual layer either. The Restaurant template's reference-quality sign-off
  stays open, explicitly, rather than being marked done on partial evidence.
- [ ] Recommendation for Salman: run `./start_dev.sh` locally and open
  `localhost:5173/demo/pilot-test-20260720` directly when convenient — a five-minute check on a
  machine with stable Supabase connectivity would close this immediately, faster than further
  retries from this environment.

---

*Per this project's Reviews discipline, this document is not edited after the fact to reflect a
later successful check — a follow-up verification, once real, gets its own dated entry or a new
file, not a silent edit here.*

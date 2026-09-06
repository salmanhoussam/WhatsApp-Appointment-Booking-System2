# Frontend Performance + Capability Audit — 2026-09-05

**Type:** Investigation (read-only). No code changed, nothing committed, Phase 1's earlier fix untouched.
**Trigger:** Salman, tested live from Munich: the site is slow to open and the reservation page sat
"waiting" ~12s. His explicit instruction: audit before any fix, do not assume video is the cause, do
not accept the earlier Phase 1 API fix as proof the whole frontend is fast.

**Method:** production build (`npx vite build` → `dist/`) served through a scratchpad static+proxy
server, driven by a real browser (Playwright MCP), plus direct `curl` timing against the **live
production backend** (`api.salmansaas.com`). Dev-server numbers were deliberately not used for the
bundle audit — they are not representative.

---

## THE HEADLINE FINDING (new — reframes every prior session's diagnosis)

Three measurements, production, taken minutes apart:

| Probe | What it touches | Time |
|---|---|---|
| `GET /definitely-not-a-real-route-xyz` (404) | network + middleware, **no DB** | **0.135 – 0.155 s** |
| `GET /health` → `prisma.execute_raw("SELECT 1")` ([main.py:93](../../../app/main.py)) | network + middleware + **1 trivial DB round trip** | **1.58 – 1.84 s** |
| `GET /api/v1/public/reservations/barbers?client_slug=rk` | + tenant resolution + barbers query | **2.92 – 3.20 s** (4 consecutive runs) |

`connect` time to Railway was **8–24 ms** in every single run.

### What this proves

1. **Network to Railway is not the problem.** 10ms connect, and a 404 completes in 150ms.
2. **The FastAPI app, middleware, and Railway itself are not the problem.** Same 150ms.
3. **One trivial `SELECT 1` costs ~1.7 seconds.** This is not query complexity, not N+1, not ORM
   overhead, not app logic — `SELECT 1` has none of those. The cost is the **DB round trip itself**.
4. Therefore every endpoint's latency ≈ `0.15s + (number of DB round trips × ~1.4s)`. This formula
   predicts the observed numbers: `barbers` ≈ 2 round trips ≈ 2.9s ✅; `/rk/config` ≈ 5 round trips
   ≈ 7–8.4s ✅.

### Where the round trip goes

`.env`'s pooler host is **`aws-1-ap-southeast-2.pooler.supabase.com`** — Sydney. Raw TCP connect
from this machine to that host: **326–389 ms**. So a single `SELECT 1` at ~1.7s is roughly **5× the
raw round-trip time**, consistent with handshake + auth + query + result across a long-haul link.

**Control that rules out "it's just this machine":** local backend (my machine → Supabase) gave
`SELECT 1` = **1.62–1.93s**; production (Railway → Supabase) gave **1.58–1.84s**. *Essentially
identical.* Both are far from Sydney. The problem travels with the database, not with the client or
the host.

**Consequence that matters for planning:** no amount of frontend work fixes this. Even a perfectly
parallelized page still pays ~3s for one stage of data.

---

## Audit A — Initial load (`/rk`, production build, real browser)

**The bundle is fast and is NOT the problem:**

| Metric | Value |
|---|---|
| TTFB | 9 ms |
| DOM interactive | 75 ms |
| DOMContentLoaded | 123 ms |
| load event | 125 ms |
| JS: 35 chunks, 622 KB, **all finished by** | 321 ms |
| CSS + fonts finished by | 49 ms |
| Total transferred | 718 KB |
| **Last resource finished at** | **20,001 ms** |

Code-splitting works well (`ReservePage` is its own 33 KB chunk, loaded in 26 ms on demand).

**The 20 seconds is a 3-level sequential cascade, each level paying DB latency:**

```
t=0.61s  store/categories        ──5.39s──►  t=6.00s
t=6.00s      store/products      ──4.28s──►  t=10.29s   (waits for categories)
t=10.62s         product image   ──9.38s──►  t=20.00s   (waits for products)
```

Plus, in parallel and off the critical path: `catalog-services` 5.75s; the two videos 0.65s → 4.07s.

The single slowest resource on the page was a **product image at 9.38s** that could not even begin
until 10.6s, because it is two dependency levels deep.

---

## Audit B — Journey: homepage → "احجز الآن" → booking ready

Measured with a marker set immediately before the click; config already warm from the homepage
(realistic — this is what a real user experiences).

| Step | Start (after click) | End | Cost |
|---|---|---|---|
| ReservePage + 6 sibling JS chunks | +0 ms | +32 ms | **32 ms** |
| Stage 1 — `barbers` ∥ `catalog-services` (parallel) | +89 ms | +3,680 ms | **3.6 s** |
| Stage 2 — `barbers?service_id` ∥ `availability` (parallel) | +3,819 ms | +8,752 ms | **4.9 s** |
| **Total click → booking UI ready** | | | **≈ 8.75 s** |

**JavaScript accounts for 0.4% of that. API latency accounts for ~99.6%.**

Stage 2 is a **genuine** data dependency (`selectedServiceId`/`durationMin` come from Stage 1's
response) — unlike the false dependency fixed earlier today, this one cannot simply be parallelized
away. Two stages is the floor for the current design, so the journey costs ≥ 2 × per-call latency.

---

## Audit C — Video / media

**Verdict: video is NOT the cause of the reported slowness, and does not block the critical path.**

- **Nothing video-related is in the build.** Zero `.mp4/.webm/.mov` in `dist/`, zero JS imports of
  video, zero video files in `public/`. Salman's own reasoning was correct: these are
  `<video src="https://…supabase…">` network resources, so the build never touches them.
- **RK's two homepage videos, measured:** 2.53 MB + 3.60 MB = **6.13 MB**.
- On the homepage they loaded 0.65s → 4.07s **in parallel**, finishing long before the 20s cascade —
  so they were not the critical path.
- **`ReservePage` contains no video at all** — so video has zero connection to the 12s reservation
  complaint specifically.

**Real problems found anyway (separate item, lower priority):**
- Both videos are served with **`Cache-Control: no-cache`** — a returning visitor revalidates/refetches
  6.13 MB on every visit. This is an upload-time Supabase setting, not a hosting migration.
- No `poster`, no `preload="metadata"`, `autoplay` — they begin downloading immediately on mount.
- Since Railway never serves video bytes (URLs only, confirmed: no `StreamingResponse`/`FileResponse`
  for media anywhere in `app/api/v1/`), **no hosting migration is warranted** — not YouTube, not
  Reels, not a new CDN.

---

## Audit D — Tenant capability UI (the Footlab "Services" bug)

**Confirmed from Salman's screenshot:** `/footlab/store` renders nav items **"Services | Products"**
on a store-only tenant.

**Root cause — a mislabeled catalog entry, not a missing gate:**
- Both public headers are already 100% capability-driven off `active_services`
  (`useTenantConfig.js:91` → `getNavItems()` in `config/service-catalog.js:132-163`). No hardcoded
  nav item exists anywhere.
- The backend already returns the right field (`public_service.py:227`,
  `"active_services": [...]`). **No backend contract change needed.**
- The defect: **`catalog` is a dual-purpose key.** The backend deliberately grants it to *every*
  store/restaurant tenant purely as an admin-endpoint gate — `registration_service.py:49-52`, whose
  own comment says *"catalog is always included for store/restaurant to gate admin catalog
  endpoints"*. But `service-catalog.js:97-103` maps that same key to a **public** nav link labeled
  "Services" / "الخدمات".
- **The correct precedent already exists in the same file:** `whatsapp_ordering` maps to `null`
  (`service-catalog.js:34`) precisely because it is a backend-only key with no public nav entry.

**Scope — systemic, not Footlab-specific:** every store/restaurant tenant seeded by
`registration_service.py` or backfilled by `migrate_bug08_services.py` carries `catalog` — so
`olivello`, `caracas`, `sneakers-*`, and every demo store/restaurant tenant shows the same phantom
item.

**Side finding:** on `footlab` the "Services" item is also a **dead link** — it routes to
`/footlab/catalog`, which `footlab.routes.jsx` does not define, so the `*` route bounces the user to
the homepage.

---

## Confirmed / Side Findings / Unknowns

### Confirmed
1. ~1.7s per DB round trip, proven with `SELECT 1`; 0.15s for a no-DB request. Endpoint latency
   follows `0.15 + (round trips × ~1.4s)`.
2. Identical `SELECT 1` cost from Railway and from a local machine → the latency belongs to the
   database's location, not the app host or the client.
3. The production JS bundle is not a factor: DOM interactive at 75 ms, all JS done by 321 ms.
4. RK homepage takes 20s to finish loading due to a 3-level cascade (categories → products → image).
5. Homepage → booking-ready costs ~8.75s, of which 99.6% is API latency and 0.4% is JavaScript.
6. Video is 6.13 MB, `no-cache`, autoplay, posterless — real issues, but off the critical path and
   entirely absent from ReservePage.
7. The capability-nav mechanism is correct and already used; one static mapping (`catalog` →
   "Services") is wrong, systemically, across all store/restaurant tenants.

### Side Findings
- The 30s config cache is **defeated in production**: two consecutive `/rk/config` calls cost 8.4s
  and 7.0s. With `gunicorn -w 2` and a per-process cache, the second request landed on the other,
  cold worker. This is the previously-theorized multi-worker cache defeat, now observed live.
- Every homepage CTA is a `<button>` with no `href` (JS-only navigation) — the footer's "احجز الآن"
  is the sole real `<a href="/rk/reserve">`. Affects middle-click/open-in-new-tab and SEO, not speed.
- Large unoptimized static images ship in the build: `pool.png` 426 KB, `bg3.png` 272 KB,
  `bg2.png` 208 KB (PNG where WebP would be far smaller), plus `floor-*.webp` up to 496 KB.
- Cross-origin Supabase resources report `transferSize: 0` (no `Timing-Allow-Origin` header), so
  browser-side byte totals exclude them. Sizes above were obtained separately via `curl`.

### Unknowns
- **Railway's actual deployment region was not determined** — it is a dashboard setting, absent from
  the repo. It does not change the conclusion (local and Railway measured the same `SELECT 1`), but
  it is required input for deciding *which way* to close the distance.
- **Why `SELECT 1` costs ~5× the raw TCP RTT (1.7s vs ~330ms) was not established.** Candidates not
  yet separated: per-request connection setup / handshake, pgbouncer behavior in transaction mode,
  Prisma engine round trips per logical query, or genuinely poor connection reuse. This matters: if
  connections are not being reused, that could be recoverable **without** a region migration.
- Munich-specific behavior was not reproduced from Munich; measurements were taken from this
  machine and from production. Given `connect` was 10ms and server time dominates, client geography
  is very unlikely to be material — but it was not directly tested.

---

## What this means for planning (no fix performed, no decision made)

The 12 seconds is **not** one problem. Ranked by measured contribution:

1. **~1.7s per DB round trip** — dominates everything, on every page, for every tenant. Nothing in
   the frontend can compensate for it. Requires a topology/infrastructure decision (move the DB near
   the app, or the app near the DB), and/or reducing round trips per request, and/or resolving the
   Unknown above about connection reuse.
2. **Cascading request chains** — RK's homepage costs 3 sequential levels (20s); ReservePage costs 2
   (8.75s). Each level multiplies item 1. Fixable in application code, but the payoff is bounded by
   item 1.
3. **Per-worker caching that misses in production** (`gunicorn -w 2`, in-process cache) — turns
   would-be cache hits back into item 1.
4. **Media hygiene** — 6.13 MB of `no-cache`, posterless, autoplaying video; oversized PNGs. Real,
   but off the critical path.
5. **Capability nav bug** — a correctness/UX defect, not a performance one. Smallest fix of the five
   (one static mapping), systemic impact across all store/restaurant tenants.

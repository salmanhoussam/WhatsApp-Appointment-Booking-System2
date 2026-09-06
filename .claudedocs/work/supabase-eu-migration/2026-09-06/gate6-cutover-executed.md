# Gate 6 CUTOVER — EXECUTED 2026-09-06 ✅

Production now runs on **Frankfurt** (`eu-central-1`). Sydney remains live, untouched, undeleted.

## Result

| Gate | Status |
|---|---|
| 6 — Cutover | ✅ **EXECUTED** — Salman set the 4 variables, Railway redeployed |
| 7 — Read verification | ✅ all 9 REAL tenants HTTP 200, zero Sydney references |
| 8 — Write verification | ⏸ **NOT DONE — the one remaining gate** |
| 9 — Performance | ✅ measured, below |
| 10 — Rollback | available, not needed |

## Gate 9 — real production numbers

The two uncached endpoints are the honest comparison; `/…/config` is muddied by its 30 s cache.

| endpoint | Sydney | **Frankfurt** | gain |
|---|---|---|---|
| `/health` — 1 query, **no cache** | 1.70 s | **0.178 s** | **9.6×** |
| `/reservations/barbers` — **no cache** | 2.95 s | **0.219 s** | **13.5×** |
| `/reservations/catalog-services` | 3.10 s | 0.296 s | 10.4× |
| `/rk/config` (cached) | 7.90 s | 0.135–0.46 s | 17–58× |

**Honest note: the prediction was 16–27×; the measured uncached gain is ~10–13×.** The model was
optimistic by roughly a third. Right order of magnitude, wrong precision — recorded as measured
rather than as predicted.

### Browser verification (real, on `alzabt.salmansaas.com/rk`)

```
requests to Sydney storage     0
requests to Frankfurt storage  4
DOM interactive              714 ms
page renders                 47,909 chars in #root
```

Against the 2026-09-05 audit of the same page: `store/categories` **5.39 s → 0.60 s**,
`store/products` **4.28 s → 0.23 s**, `config` ~6 s → **0.39 s**. **The 20-second homepage cascade
is gone.**

`lastResourceEnd` is still ~22 s, but that is the 6 MB `no-cache` video, not the database — the
deferred media-hygiene item, unchanged and still open.

---

## 🔴 INCIDENT — ~40 minutes of production downtime, my error

**Cause.** After rotating the Sydney password (credential-sequence Step 2), only the local `.env`
was updated. **Railway was still running on the old password**, which the rotation had just
invalidated. Prisma could not authenticate, every gunicorn worker crashed on startup, the
healthcheck failed, and the app never came up. Railway's own diagnosis said exactly this.

**Why it was mine.** I designed the rotation sequence and wrote the risk into the documentation
verbatim — *"rotating invalidates the current `DATABASE_URL`/`DIRECT_URL` values"* — but reasoned
about them only as **rollback values sitting on a shelf**, never connecting that **production was
running on that same credential right then**. I should have blocked Step 2 with: *"before you
rotate, Railway must be updated in the same moment."*

**Why the checks missed it.** Credential validation Steps 1 and 3 both ran **from the local machine
against `.env`** and returned correct ✅ results. **Railway was never probed.** The verification was
measuring the wrong place — a green check on the wrong target is worse than no check.

**Duration.** From rotation (~16:10) to fix (~16:47), roughly **35–40 minutes**. The `git push` was
unrelated; the outage began before it.

**Recovery.** Salman updated Railway's `DATABASE_URL`/`DIRECT_URL` with the new password; service
returned within one deploy cycle.

### Second defect — `?pgbouncer=true` lost in the cutover

Immediately after the cutover, production returned **intermittent 500/503 at roughly 10–20%**.
Diagnosed by reproduction rather than inspection: Frankfurt **with** the flag gave 12/12 successes;
**without** it, 9/12 — matching production's failure pattern exactly, and matching the
`prepared statement "s6" does not exist` behaviour proven back in Phase 2.

The `?pgbouncer=true` query string had been dropped when the value was copied into Railway. Salman
re-added it; production went to **30/30 successes**.

**Lesson: `?pgbouncer=true` is load-bearing AND easy to lose in a copy-paste.** It is not a tuning
hint — without it the app fails intermittently under ordinary traffic.

---

## Rules this incident earns

1. **A credential rotation must reach every consumer in the same operation.** Enumerate consumers
   first (local `.env`, Railway, any worker/cron), then rotate. Production is a consumer.
2. **Verification must target production, not a local mirror.** A check that passes locally while
   production is down is not a check.
3. **Connection strings are copied whole, including the query string**, and verified after paste —
   the `?pgbouncer=true` loss and the earlier `?`-in-password breakage are the same class of defect.

## Remaining

- **Gate 8 — write verification.** A real booking, confirmed written to Frankfurt. Deliberately not
  faked with synthetic data.
- Deferred, unchanged: `Cache-Control`, the 12 dead third-project images, 10 dead files,
  `scripts/data/hr/page_content.json`, `.claude/rules/storage-tenant.md`.
- **Sydney: still live, still not deleted.** Do not delete until Gate 8 passes and an observation
  period has run.

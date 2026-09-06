# Implementation Contract — Supabase EU Migration (Sydney → Frankfurt)

**Status:** DRAFT — awaiting approval. **This Contract does not execute.** No phase begins without
explicit approval, and each phase is a separate commit.
**Created:** 2026-09-06
**Decision owner:** Salman
**Evidence base:** `.claudedocs/work/frontend-performance-audit/2026-09-05/` (3 files) ·
`.claudedocs/evolution/infrastructure-topology.md`

> ⚠️ **Upstream document gap, stated rather than skipped.** `documentation-policy.md` requires
> `Evolution → ADR → Implementation Contract` for an architectural decision, and this is one
> (it changes where the platform's data physically lives). No ADR exists yet; the next free number
> is **ADR-0007** (0005 is deliberately unused). **Recommendation:** ratify a short ADR-0007 before
> Phase 1 executes. This Contract is written now because Salman asked for it, but the policy step is
> owed. **Decision required from Salman.**

---

## 1. Why

Measured, reproducible, and root-caused on 2026-09-05:

```
Users (Middle East) → Cloudflare → Railway AMSTERDAM 🇳🇱 → Supabase SYDNEY 🇦🇺   ~16,600 km
                                                            └─ ~330 ms per DB round trip
```

Every DB round trip costs ~330 ms of pure distance, and every customer flow makes several. Endpoint
latency follows `≈ 0.15 s + (round trips × per-query cost)`. Tuning is exhausted:

- `pgbouncer=true` costs ~4× RTT but **is load-bearing** — removing it failed 19/30 concurrent reads
  with `prepared statement "s6" does not exist` (PostgreSQL 26000). Settled, not to be reopened.
- Session mode (port 5432) would give ~3.9×, but needs ~20 connections against a **Free-tier default
  Pool Size of 15** — not viable.
- Pool Size / `connection_limit` do not affect latency at all.

**Moving the database to `eu-central-1` (Frankfurt) is the only remaining lever**, and it is the
largest: RTT ~330 ms → **~10–15 ms**, while *keeping* `pgbouncer=true` and transaction-mode
multiplexing (their overhead becomes ~60 ms instead of ~1.3 s).

| | today | projected |
|---|---|---|
| per query | 1.65 s | **~0.08 s** |
| `barbers` | 2.95 s | ~0.3 s |
| `/rk/config` | 7–8.4 s | ~0.5 s |
| reservation journey | 8.75 s | ~0.7 s |
| RK homepage | 20 s | ~2 s |

Projections from measured RTT — **not a guarantee**; Phase 7 exists to verify them against reality.

---

## 2. Scope

**In scope:** new Supabase project in `eu-central-1`; schema; data; storage objects; rewriting
absolute URLs that embed the old project ref; Railway environment variables; verification; a defined
rollback window.

**Explicitly out of scope** (do not absorb into this migration):
- The Footlab/`catalog` capability-nav bug — separate, already tracked.
- Media hygiene (`Cache-Control: no-cache`, missing `poster`/`preload`) — separate.
- Frontend waterfall work beyond what already shipped in `8b44c14`.
- Converting the 35 hardcoded frontend URLs into an env-var-driven helper. **Tempting and correct,
  but it is a refactor, not a migration step.** Phase 5 does a literal ref-for-ref replacement only;
  the refactor gets its own ticket.
- Any Supabase↔GitHub integration. This repo's schema is owned by **Prisma**
  (`prisma/schema.prisma` + `prisma db push`); there is no `supabase/` CLI directory, so the
  integration would either do nothing or create a second schema-write path.

---

## 3. Known landmines (measured, not assumed)

**A new project means a new project ref, and absolute URLs are embedded everywhere:**

| Location | Occurrences | Note |
|---|---|---|
| `app/` (backend) | **0** ✅ | clean — env-driven |
| `frontend/src/` | **35** | ~15 files: smar, olivello, beit-al-fakhar, caracas |
| `scripts/` | 11 | |
| `prisma/` | 1 | |
| **DB `clients.config`** | **3 rows** | tenant page content — hero video, section media |
| **DB `gallery_images.url`** | **6 rows** | |

- **Storage (~200 MB) does NOT move with `pg_dump`.** It requires a separate bucket-to-bucket copy.
  Missing this breaks every image and video on every tenant site.
- The database is only **32 MB** — dump/restore is minutes. This is the single biggest de-risking
  fact in the whole plan.
- **Live traffic exists**: WhatsApp reservations arrive at any time. Cutover needs a low-traffic window,
  because any write landing on Frankfurt after cutover is lost if we roll back to Sydney.

---

## 4. Gates (Salman's structure, 2026-09-06 — supersedes the phase list in §4b below)

**No gate is skipped. No gate is passed on impression — each needs a recorded artifact.** If any
gate fails, Gate 10 applies immediately.

| Gate | Name | Passes only when |
|---|---|---|
| **0** | **Source freeze** | No schema changes, no tenant edits, no ad-hoc migrations from this point until cutover. Announced and held. |
| **1** | **Backup** | `pg_dump` completes successfully; **file size and checksum recorded** in the evidence file. A dump nobody verified is not a backup. |
| **2** | **Empty EU project** | Project created in `eu-central-1`; RLS left **off** per ADR-0007; **new project ref recorded**. Immediately measure `SELECT 1` from the Railway region — if it is not ~10–20 ms, **STOP**: the premise of the migration is wrong. |
| **3** | **Schema parity** | 100 % identical Prisma schema. **Zero "improvements."** Verified by diffing `information_schema` (table and column lists) between Sydney and EU. |
| **4** | **DB data parity** | **Exact `COUNT(*)` per table on both sides, matching.** Never `pg_stat_user_tables` — it reported `units = 0` when the true count is 16. Baseline in `TENANT_INVENTORY.md`; re-take immediately before the dump. All **37** client rows migrate; nothing filtered. |
| **5** | **Storage parity** | Every bucket and object copied, paths preserved. Object count and total bytes match. Specifically covers the ~200 MB storage and the **6 `gallery_images.url`** + **3 `clients.config`** rows carrying absolute URLs. Sample-fetch an image, a video and a `.keep` from the new project → HTTP 200, right type, right size. |
| **6** | **Application wiring** | **Environment variables only.** `DATABASE_URL` (6543, `pgbouncer=true` retained), `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. **No source-code redesign** — the only code change permitted anywhere in this migration is the mechanical old-ref → new-ref replacement. |
| **7** | **Read verification — every REAL tenant, not just RK** | All 9 load correctly with media intact: `smar`, `caracas`, `footlab`, `roz`, `olivello`, `arizona`, `beit-al-fakhar`, `rk`, `mr-h`. Real browser pass per `browser-verification-protocol.md`. |
| **8** | **Write verification** | A *small, bounded* set of writes on a live tenant, each then confirmed by reading the row back **from the EU database** — including one real WhatsApp reservation end-to-end. |
| **9** | **Performance comparison** | The same endpoints measured on Sydney, re-measured and compared side by side: `/health`, config, categories, products, barbers, availability, reservation. This is where the actual gain is finally known — numbers, not projections. |
| **10** | **Rollback** | On any gate failure: revert `DATABASE_URL` (and the other three vars) to Sydney → production continues. **Sydney is never deleted.** |

**Gate 7's tenant list is exactly the 9 REAL tenants** — `alzabt-demo` and every `demo-*` /
experimental slug are explicitly **not** part of read verification, though their data is still
migrated. This ambiguity was the one blocking Salman's ratification and is now settled in
`TENANT_INVENTORY.md`.

**Rollback's one sharp edge:** any write landing on EU after Gate 6 does not exist in Sydney.
Therefore cutover happens in an agreed low-traffic window, and the rollback window is bounded and
stated explicitly before Gate 6 begins.

---

## 4b. Phases (original draft — retained for detail; the Gates above govern)

Each phase: Preconditions → Actions → Validation → Acceptance. **A phase does not start until the
previous one's Acceptance is met with real evidence.** One commit per phase where code changes.

### Phase 0 — Baseline, snapshot, and preconditions *(no changes made)*

**Preconditions:** none.
**Actions:**
- Confirm a free project slot exists (Free tier allows 2 active; `Miti-Restaurant-AI` is paused).
- `pg_dump` the current Sydney database to a local file — the rollback artifact.
- Inventory storage: object count and total bytes in the `properties` bucket.
- Record a **baseline measurement set** with the same probes used on 2026-09-05: `/health`,
  `/rk/config`, `/reservations/barbers`, availability, full reservation journey, p50/p95.
- Confirm whether any Supabase-managed schema (`auth`, `storage`) holds state this app depends on,
  or whether `public` alone is sufficient (the app uses its own `User` model and JWTs, not Supabase
  Auth — **verify, do not assume**).

**Acceptance:** a restorable dump exists on disk, storage inventory recorded, baseline numbers
written to `.claudedocs/work/supabase-eu-migration/<date>/baseline.md`.

### Phase 1 — Create the Frankfurt project *(no data)*

**Preconditions:** Phase 0 accepted.
**Actions:** create the Supabase project in **`eu-central-1`**. Record: project ref, `DATABASE_URL`
(6543, **keep `pgbouncer=true`**), `DIRECT_URL` (5432), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
Immediately measure `SELECT 1` from the Railway region against the new project.

**Validation:** `SELECT 1` from Amsterdam should be **~10–20 ms**, not ~330 ms.
**Acceptance:** if it is not, **stop** — the core premise of this migration is wrong and everything
downstream is invalid. Report before proceeding.

### Phase 2 — Schema

**Preconditions:** Phase 1 accepted.
**Actions:** apply the schema to Frankfurt via `DIRECT_URL` using the project's existing Prisma
tooling (`prisma db push`), then apply any hand-written SQL in `prisma/migrations/*.sql` that
`db push` does not cover (indexes/constraints added out-of-band).
**Validation:** table count, and per-table column count, match Sydney exactly.
**Acceptance:** a diff of `information_schema` between the two projects shows no unexpected delta.

### Phase 3 — Data

**Preconditions:** Phase 2 accepted.
**Actions:** `pg_dump --data-only --no-owner --no-privileges` from Sydney → restore into Frankfurt.
**Validation:** **row count per table, both sides, side by side.** Spot-check the tenant-critical
tables: `clients`, `users`, `reservations`, `catalog_items`, `gallery_images`, `client_services`.
**Acceptance:** every table's row count matches. Any mismatch stops the phase.

### Phase 4 — Storage objects

**Preconditions:** Phase 3 accepted.
**Actions:** copy every object in the `properties` bucket from the old project to the new one,
preserving paths exactly (`{slug}/...` structure per `rules/storage-tenant.md`). Set a sane
`Cache-Control` on upload — the current objects are served `no-cache`, which is a known defect;
fixing it *here* is free and does not expand scope, since we are re-uploading anyway.
**Validation:** object count matches; total bytes match; fetch 3 sample URLs (an image, a video, a
`.keep`) from the new project and confirm HTTP 200 with the expected content type and size.
**Acceptance:** counts and byte totals match, samples verified.

### Phase 5 — Rewrite absolute URLs

**Preconditions:** Phase 4 accepted.
**Actions:** literal old-ref → new-ref replacement in:
- **Database (on Frankfurt only):** `clients.config` (3 rows), `gallery_images.url` (6 rows).
- **Code:** `frontend/src/` (35), `scripts/` (11), `prisma/` (1).
- `.claude/` docs (7) may be updated for accuracy but are not load-bearing.

**Validation:** zero occurrences of the old ref remain in code or in the Frankfurt database
(`grep -r` returns nothing; the two SQL `LIKE '%<old-ref>%'` counts return 0).
**Acceptance:** both checks clean. **One commit**, message states it is a mechanical ref replacement.

### Phase 6 — Cutover

**Preconditions:** Phases 0–5 accepted. A low-traffic window agreed with Salman.
**Actions:** update Railway environment variables (`DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`) and redeploy. **Sydney is left running and untouched.**
**Validation:** `/health` returns 200; `/api/v1/admin/me` returns 401 (the proven deploy detector).
**Acceptance:** the app is up against Frankfurt.

### Phase 7 — Verification *(the phase that decides whether this worked)*

**Preconditions:** Phase 6 accepted.
**Actions:** re-run the **exact** Phase 0 baseline set and compare numbers directly:
`/health` · `/admin/me` · `/rk/config` · `/reservations/barbers` · availability · concurrent-request
error rate · live connection count from `pg_stat_activity` · p50/p95 · **and a real browser pass**
(`/rk` → Reserve → pick service/barber/slot → WhatsApp), per `browser-verification-protocol.md`.
Plus a real WhatsApp inbound reservation end-to-end, since that path writes to the DB.
**Acceptance:** per-query cost is materially below the 1.65 s baseline, zero new errors, reservation
journey completes, media renders on every tenant page. **Any ❌ blocks "migration complete."**

### Phase 8 — Decommission *(deliberately deferred)*

**Preconditions:** Phase 7 accepted **and** an agreed observation period has passed with real traffic.
**Actions:** only then pause the Sydney project. **Do not delete it** until Salman explicitly says so.
**Acceptance:** Salman's explicit go-ahead.

---

## 5. Rollback

**Mechanism:** revert the four Railway environment variables to the Sydney values and redeploy.
Sydney remains live and untouched throughout Phases 1–7, so it is always a valid target.

**The one thing that makes rollback lossy:** any write that lands on Frankfurt after Phase 6 (a
reservation, an order, a dashboard edit) does **not** exist in Sydney. Therefore:
- Cut over in a low-traffic window.
- Define the rollback window explicitly. Past it, rolling back means reconciling writes by hand.
- Phase 5's code changes are in git and revert cleanly; the DB URL rewrite applies to Frankfurt only,
  so Sydney's rows are never modified.

---

## 6. Success criteria

1. Every tenant page renders, with all media, on the new project.
2. A real WhatsApp reservation completes end-to-end and is verified in the Frankfurt database.
3. Measured per-query cost drops from ~1.65 s toward the projected ~0.08 s (Phase 7 numbers, not
   projections, are what count).
4. Zero increase in error rate; connection usage well inside Free-tier limits.
5. `pgbouncer=true` is **retained** — safety and multiplexing preserved.
6. Rollback remains available and tested-by-inspection until Phase 8.

---

## 7. Open questions before Phase 1

- **ADR-0007** — ratify first? (§ top of this document.) **Decision required.**
- Confirm the Free-tier active-project slot is actually available.
- Confirm whether `public` schema alone is sufficient, or whether Supabase-managed schemas hold
  needed state (Phase 0 answers this).
- Agree the low-traffic cutover window and the rollback-window duration.

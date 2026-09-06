# Supabase EU Migration — Gate 0 & Gate 2 evidence

**Date:** 2026-09-06 · **Authorised by:** Salman ("You can start", Option B)
**Deviation on record:** Salman explicitly approved running **Gate 2 before Gate 1**, because Gate 2
is the abort gate and passing it first avoids installing tooling and taking a backup for a migration
that might be cancelled. All other gate ordering stands.

---

## GATE 0 — Source freeze ✅ PASSED

```
Declared : 2026-09-06T08:47:16Z
HEAD     : 783d155
Frozen   : schema changes | tenant data edits | ad-hoc migrations | prisma db push
```

Verified at declaration: `git status` clean across `app/`, `frontend/src/`, `prisma/`, `scripts/` —
zero uncommitted code or schema changes. The freeze holds until cutover (Gate 6).

---

## GATE 1 — Backup ⛔ BLOCKED (tooling)

`pg_dump` is not installed, and no acceptable substitute exists on this machine:

| | |
|---|---|
| `pg_dump` / `psql` | not installed |
| Docker | not installed |
| Supabase CLI | not installed |
| apt offers | `postgresql-client-16` only |
| Server version | **PostgreSQL 17.6** |

`pg_dump` 16 **refuses** to dump from a 17.6 server (`server version mismatch`), and modern versions
have no override flag — so the apt default does not solve it. Fix requires the PGDG repo plus
`postgresql-client-17`, which needs `sudo` and was therefore not run.

**Deliberately not done:** hand-rolling a Python dump. With 41 tables, foreign keys, sequences and
JSON columns, a hand-written dump loses fidelity silently — which defeats the entire purpose of a
backup gate. A backup nobody can trust is not a backup.

---

## GATE 2 — EU project ⚠️ PARTIAL PASS / literal criterion NOT YET MEASURABLE

### What passed cleanly ✅

| Check | Result |
|---|---|
| Project exists, region | **`eu-central-1` (Frankfurt)** — `t3a.nano`, Healthy |
| Project ref recorded | **`qjocpqokwmlpzaftltiy`** |
| Project is empty | **0 public tables** ✅ (Sydney has 41) |
| RLS per ADR-0007 | **0 tables with RLS enabled** ✅ |
| `max_connections` | 60 — same as Sydney, consistent with planning |
| Reachable from here | yes, both 6543 and 5432 |

### The measurement (both databases, same run, same machine)

| | Sydney `ap-southeast-2` | Frankfurt `eu-central-1` |
|---|---|---|
| raw TCP connect | 0.332 – 0.404 s | **0.087 – 0.136 s** |
| connection setup (6543) | 2.092 s | **0.998 s** |
| `SELECT 1`, reused conn (6543) | 0.330 s | **0.143 s** |
| `SELECT 1`, reused conn (5432) | ~0.340 s | **0.075 s** |

**Frankfurt is ~2.3× closer than Sydney *from Lebanon*.**

### Why the probe script printed "FAILS" — and why that verdict is wrong

The script applied a hardcoded threshold (`ratio >= 2.5`) to the **Lebanon-measured** ratio. That
criterion was badly chosen by me, for a reason that matters: **it compares the wrong two distances.**

The Contract's actual Gate 2 criterion is *"measure `SELECT 1` **from the Railway region** — if it is
not ~10–20 ms, STOP."* That is a statement about **Amsterdam → Frankfurt**. This machine is in
Lebanon, so it cannot produce that number at all:

```
Beirut    → Frankfurt   ~2,900 km   (what was measured:  75–143 ms)
Amsterdam → Frankfurt     ~360 km   (what the gate asks about — NOT measured)
Amsterdam → Sydney     ~16,600 km   (the current production cost: ~330 ms)
```

Railway sits roughly **8× closer to Frankfurt** than this machine does. So the measured 143 ms is an
**upper bound** on the production figure, not an estimate of it. The script compared
`Lebanon→Sydney` against `Lebanon→Frankfurt`, which understates the production gain because it
handicaps Frankfurt with a distance production will not pay.

**Correct status: the literal Gate 2 criterion is NOT YET MEASURABLE — it is neither PASS nor FAIL.**
Recording it as a pass by rewriting the threshold after the fact would be moving the goalposts, so it
is left open.

### What the evidence does establish

1. Frankfurt is reachable, empty, correctly regioned, and RLS-free — the structural half of Gate 2
   passes outright.
2. Even from a vantage point that *disadvantages* Frankfurt by ~8×, it is already 2.3× closer than
   Sydney.
3. Raw TCP RTT (0.087–0.136 s vs 0.332–0.404 s) confirms the difference is geographic, not
   pooler-related.

The production premise — that Amsterdam→Frankfurt lands near 10–20 ms — remains an **inference**
from geography, consistent with but not proven by these numbers.

---

## 🔴 Blocking finding — the EU password breaks URI parsing

The first connection attempt failed with:

```
OperationalError: invalid integer value "…" for connection option "port"
```

**Cause: the EU database password contains a `?` character.** In a URI, `?` begins the query string,
so the parser truncates the password and misreads the host/port. Diagnosed without exposing the
secret: password length 16, special characters `['?']`, and the Sydney password is entirely
alphanumeric — which is exactly why this never surfaced before.

**This is not a probe bug. Prisma would fail at Gate 6 in precisely the same way.** The measurement
above was obtained by passing connection parameters separately, bypassing URI parsing — a workaround
valid for a probe, not for the application.

**Required before Gate 6 — one of:**
- percent-encode it in `.env` / Railway: **`?` → `%3F`**, or
- change the database password in Supabase to alphanumeric-only.

`.env` was **not modified** — it holds live secrets and the change is Salman's to make.

---

---

## GATE 2 RETEST — after Salman removed the `?` from the password ✅

Password re-verified: 16 characters, **fully alphanumeric, zero URI-unsafe characters**. All three
connections now succeed **via the URI form** — the same path Prisma and the application use, which
also demonstrates the Gate 6 cutover will parse correctly (the earlier parameter-based workaround
could not show this).

| Probe | Sydney | **Frankfurt** | gain |
|---|---|---|---|
| psycopg2 `SELECT 1`, reused conn (6543) | 0.333 s | **0.073 s** | **4.6×** |
| psycopg2, session mode (5432) | ~0.340 s | **0.076 s** | — |
| connection setup | 2.108 s | 1.376 s (6543) / 0.528 s (5432) | — |
| **Prisma + `pgbouncer=true` — the real production stack** | **1.661 s** | **0.382 s** | **4.3×** |
| public tables | 41 | **0** ✅ still empty | — |

*(An earlier reading gave Frankfurt 0.143 s where this run gives 0.073 s — ordinary network variance.
Both are far below Sydney; the conclusion is unaffected.)*

### The 5-RTT model is now validated on two independent regions

Phase 2 established that Prisma with `pgbouncer=true` costs roughly **5 network round trips** per
query. That model can now be checked against two separate datasets:

| | measured RTT | model predicts (5 × RTT) | **actually measured** | error |
|---|---|---|---|---|
| Sydney | 0.333 s | 1.67 s | **1.661 s** | **<1 %** |
| Frankfurt (from Beirut) | 0.073 s | 0.365 s | **0.382 s** | **~4 %** |

The model holds on both. Applying it to production, where Amsterdam→Frankfurt is ~360 km
(typically **10–15 ms**):

```
production per-query  ≈  5 × 12 ms  ≈  0.06 s      (vs 1.65 s today  →  ~27×)
even at a pessimistic 20 ms RTT     ≈  0.10 s      (still ~16×)
```

This is now a **prediction from a twice-validated model**, not an inference from geography alone —
a materially stronger basis than the first attempt had. The only remaining unknown is the actual
Amsterdam→Frankfurt RTT, which no measurement from Lebanon can supply.

### Recommendation on Gate 2's status

The structural half passed outright (region, empty, RLS-off, ref recorded, URI parses). The latency
criterion as literally written — *"~10–20 ms measured from the Railway region"* — remains
unmeasurable before cutover, and is **not** being marked passed by rewriting its threshold.

**Recommended:** accept Gate 2 as passed **on the strength of the validated model**, with the actual
Amsterdam figure captured at **Gate 9**. The risk this carries is bounded: Gate 6 is a single
environment variable and is instantly reversible, and Sydney stays live and untouched throughout.
**Decision is Salman's.**

---

---

## GATE 1 — Backup ✅ PASSED

`postgresql-client-17` (17.11) installed by Salman via the PGDG repo — newer than the server's 17.6.

| Artifact | Size | SHA-256 |
|---|---|---|
| `sydney_public.dump` (custom format) | 188,715 B | `d841c359b003b6680b393e080680176596c49a9a30858c1dafc266f7d4e347d2` |
| `sydney_public.sql` (plain) | 394,887 B | `c9c9a5680e3f16c30dc9fde698a1b8022c7c2040a6ff75104c924ec6d8a19226` |

Taken from Sydney via `DIRECT_URL` (session mode), `--schema=public --no-owner --no-privileges`.

**Verified, not merely produced** (the gate's own wording): `pg_restore --list` reads the archive
cleanly — 288 TOC entries, 41 TABLE DATA entries, 189 constraint/index entries — and the COPY blocks
in the plain dump were counted and matched **exactly** against the Gate 4 baseline on all 15 key
tables (`clients` 37, `users` 54, `catalog_items` 238, `client_services` 110, `catalog_categories`
95, `barber_services` 85, `catalog_services` 81, `reservations` 38, `customers` 25, `barbers` 20,
`store_order_items` 17, `units` 16, `subscriptions` 15, `store_orders` 14, `gallery_images` 6).

*(The dump is far smaller than the dashboard's "32 MB" because that figure includes indexes, bloat
and Supabase's own schemas; the `public` payload is genuinely small.)*

---

## GATE 3 + GATE 4 ✅ BOTH PASSED — after one failed attempt, recorded in full

### The failed first attempt, and why

The first attempt split the restore: `--schema-only` (Gate 3) then `--data-only` (Gate 4). Gate 3
passed, but Gate 4 **failed** — 76 `permission denied ... is a system trigger` errors and **12 FK
violations**, leaving 29/41 tables loaded and 12 empty (`users`, `catalog_items`, `client_services`,
`catalog_categories`, `barber_services`, `catalog_services`, `reservations`, `barbers`,
`store_order_items`, `store_cart_items`, `gallery_images`, `bookings`).

**Cause — a method error on my part, not a data problem.** Restoring the schema first created every
foreign-key constraint *before* any data existed, so FK checks fired during load and the table order
violated them (`barber_services` → needs `barbers` → needs `clients`). `--disable-triggers` could not
suppress them because it requires true superuser, which Supabase's `postgres` role is not.
`pg_restore` is designed to do tables → data → constraints in **one pass**; splitting the passes is
what broke it.

The schema/data split was right for Gate 3 in isolation (it gave exact parity) — the error was not
seeing that it makes Gate 4 impossible. Both must come from a single restore.

### The corrective action

With Salman's explicit green light, and behind a four-part safety guard (hostname contains
`eu-central-1`; hostname does **not** contain `ap-southeast-2`; target `catalog_items` = 0; abort
otherwise), Frankfurt's schema was reset — `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` plus
restoration of Supabase's default grants — and the **full dump restored in a single pass**.

Result: **0 FK violations, 0 COPY failures.** The only stderr line was the benign
`schema "public" already exists`.

### Acceptance — both gates verified together

| Gate 3 — schema | Sydney | Frankfurt |
|---|---|---|
| tables | 41 | **41** ✅ |
| columns | 492 | **492** ✅ |
| indexes | 125 | **125** ✅ |
| constraints | 108 | **108** ✅ |

Set-compared by name, not just counted; zero type or nullability deltas.

| Gate 4 — data | Sydney | Frankfurt |
|---|---|---|
| tables compared | 41 | 41 |
| tables holding data | 25 | 25 |
| **TOTAL ROWS** | **904** | **904** ✅ |
| mismatched tables | — | **0** ✅ |

Exact `COUNT(*)` on every table, both sides. Note `platform_services` (15), `services` (10) and
`properties` (1) held real rows despite `pg_stat_user_tables` having reported them as empty —
further vindication of the gate's insistence on exact counts over estimates.

---

## GATE 5 — Storage ✅ PASSED

Salman supplied `EU_SUPABASE_URL` / `EU_SUPABASE_SERVICE_KEY`; the `properties` bucket was created
public in Frankfurt and all objects copied with **paths preserved verbatim**.

| | Sydney | Frankfurt |
|---|---|---|
| objects | **729** | **729** ✅ |
| bytes | **199,818,368** | **199,818,368** ✅ |
| size mismatches | — | **0** ✅ |
| unexpected extras | — | **0** ✅ |

Copy took ~57 min (the Sydney-side download is the bottleneck at ~330 ms RTT). First pass: 728
copied, 1 transient `Connection reset by peer`. The script is resumable, so a re-run picked up that
object and finished **0 failed**.

### A false failure worth recording

The verification initially reported **9 objects missing**, all `.jfif` files under one deep
`caracas/catalog/<cat>/<item>/` prefix. **They were not missing.** Direct object fetches returned
HTTP 200 with byte-exact sizes for all nine — Supabase's *list* API under-reported them, most likely
a pagination/consistency artifact on a prefix with many sibling folders.

The lesson generalises: **the list index is derived, the object fetch is ground truth.** Counting via
listing alone would have produced a false FAIL here — exactly the mirror of the
`pg_stat_user_tables` problem at Gate 4, where an estimate disagreed with reality in the other
direction. The arithmetic closes exactly: 720 listed + 9 directly verified = 729 objects;
199,749,414 + 68,954 = **199,818,368 bytes**, matching Sydney to the byte.

### Live sample fetches from Frankfurt's public URL

| result | size | type | path |
|---|---|---|---|
| ✅ 200 | 5,074,013 B | video/mp4 | `RK Barbar/WhatsApp Video … 02.01.14.mp4` |
| ✅ 200 | 411,528 B | image/jpeg | `beitsmar/gallery/beitsmar1.jpg` |
| ✅ 200 | 0 B | text/plain | `assi/catalog/.keep` |
| ✅ 200 | 2,654,497 B | video/mp4 | `RK Barbar/WhatsApp Video … 02.01.24.mp4` |

**Space-bearing paths survived intact** (`RK Barbar/`), which was the specific risk flagged before
the copy.

### Known gap — the Cache-Control fix did NOT take

The copy attempted to set `Cache-Control: public, max-age=31536000, immutable`, but every sampled
object still serves **`cache-control: no-cache`**. Supabase's storage API does not honour that
request header on this upload path (it expects `cacheControl` supplied differently). So the media
defect recorded on 2026-09-05 — ~6.13 MB of RK video revalidated on every visit — **is carried
forward unchanged into Frankfurt**. It is not a Gate 5 blocker (the gate's criteria are count, bytes
and sample fetches, all met) but it remains open, and the attempted fix should not be assumed
delivered.

---

## GATE 5 — baseline used for the comparison above

**Blocker: no EU service-role key.** `.env` holds `SUPABASE_URL` / `SUPABASE_KEY` for Sydney only.
Writing to the new project's bucket requires its own key.

**Parity baseline captured from Sydney** (manifest saved to `backup/storage_manifest.json`):

| | |
|---|---|
| bucket | `properties` (public) |
| folders | **397** |
| files | **729** |
| bytes | **199,818,368 (190.56 MB)** |

| type | files | size |
|---|---|---|
| video | 18 | **107.22 MB** (56 % of the bucket) |
| image | 614 | 83.34 MB |
| text | 96 | ~0 (the `.keep` placeholders) |
| application | 1 | ~0 |

Largest object: `hr/pages/home/try3/Storyboard 1.mp4` — **29.15 MB**.

**Three path observations that matter for Gate 5's "paths preserved" requirement** — recorded, not
acted on:
- **`hr/` still holds 329 files (41.15 MB)** — `hr` is `rk`'s *old* slug. The bulk of RK's media
  lives under the historical name, while `rk/` holds only 2 files.
- **`mister-h/` (2 files) and `mr-h/` (4 files) both exist** — two folders for one tenant.
- **`RK Barbar/`** contains a space in the folder name (3 files, 10.97 MB) — this is where the two
  homepage videos measured on 2026-09-05 live. Space-bearing paths must survive the copy intact.

These are pre-existing inconsistencies in the source bucket. Gate 5 copies paths **verbatim**;
rationalising them belongs to Phase B/C, not here.

---

## Status

```
Gate 0  Source freeze   ✅ PASSED
Gate 1  Backup          ✅ PASSED   (verified: archive readable, counts match, checksums recorded)
Gate 2  EU project      ✅ PASSED   (accepted by Salman on the twice-validated 5-RTT model)
Gate 3  Schema parity   ✅ PASSED   (41 / 492 / 125 / 108 — zero delta)
Gate 4  Data parity     ✅ PASSED   (904 = 904 rows, 0 mismatches, all 41 tables)
Gate 5  Storage parity  ✅ PASSED   (729 objects / 199,818,368 bytes — exact parity)
Gate 6  Cutover         ⏸ NOT STARTED — needs Salman's go-ahead + a low-traffic window
```

**Sydney remains untouched and fully live throughout.** `DATABASE_URL` unchanged. No application
code modified. The source freeze declared at Gate 0 still holds.

**Decision required from Salman** — see the report accompanying this file. Nothing was migrated, no
data changed, `DATABASE_URL` untouched, Sydney fully live.

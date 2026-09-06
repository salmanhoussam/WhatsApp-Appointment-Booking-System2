# Phase 3 — Infrastructure Fact-Finding (Investigation → Decision)

**Type:** Investigation, read-only. Only `SHOW`/`SELECT` against catalog views, plus HTTP header
inspection. **No `DATABASE_URL` was changed. No migration performed. Production untouched.**
**Mandate:** establish the facts needed to decide whether 5432 session mode is safe for production —
and whether a topology migration is worth it at all after Phase 2's measured 3.9× improvement.

---

## The headline: the application and its database are on opposite sides of the planet

```
User (Beirut / Munich)
   └─► Cloudflare edge            cf-ray ...-BEY      (Beirut)
        └─► Railway               x-railway-edge: cdg1 (PARIS)
             └─► Supabase         aws-1-ap-southeast-2 (SYDNEY)   ~16,900 km
```

`x-railway-edge: cdg1` is returned directly by production (`curl -I https://api.salmansaas.com/health`)
— this is measured, not inferred. Paris ⇄ Sydney is close to the longest route available on earth,
and it accounts precisely for the **~330 ms** floor measured in Phase 2.

**Corroborating evidence:** production `SELECT 1` (1.58–1.84 s) and this machine in Lebanon
(1.62–1.93 s) are effectively identical. Both Beirut and Paris are ~equidistant from Sydney. Had
Railway been near Sydney, production would have been ~20× faster than local. It was not.

---

## Axis 1 — Connection budget (read directly from the database)

| Fact | Value |
|---|---|
| `max_connections` | **60** |
| `superuser_reserved_connections` | 3 |
| **Usable by the application** | **57** |
| PostgreSQL version | 17.6 |
| Connections currently in use (total rows in `pg_stat_activity`) | 13–15 |
| Of those, actual **client** connections (non-background) | **~8–10** |

Who currently holds connections (Supabase's own internals, not our app):
`supabase_admin` ×5 (incl. `pg_net 0.19.5`, `pg_cron scheduler`, `postgres_exporter`),
`authenticator` (PostgREST 14.5), `pgbouncer` (`Supavisor (auth_query)`), `postgres` (`Supavisor`).

**Headroom: roughly 45–47 connections.**

### The trade-off this exposes — and it is the crux of the decision

Today the app runs **transaction mode**, whose whole purpose is multiplexing: many client
connections share a small server pool. That is why total usage sits at 13–15 even with
`gunicorn -w 2 × connection_limit=10`.

**Session mode does not multiplex.** Each pooled client holds a dedicated server connection for its
lifetime. Expected steady-state usage after a switch:

```
2 gunicorn workers × connection_limit=10  =  20 connections
        + ~10 Supabase internal            =  ~30 of 57 used   (~53%)
```

Workable today, with ~27 spare. But note what it costs in future headroom: scaling to 4 workers
would mean 40 + 10 = **50 of 57** — and a rolling Railway restart briefly runs old and new
containers together, which could transiently exceed that. If session mode is adopted,
`connection_limit` should be lowered (e.g. to 5, giving 10 + 10 = 20 of 57) rather than left at 10.

---

## Axis 2 — What port 5432 actually is on this project

**Confirmed: Supavisor SESSION mode. It is NOT a direct PostgreSQL connection.**

| Evidence | Result |
|---|---|
| Hostname | `aws-1-ap-southeast-2.**pooler**.supabase.com` — a pooler host, not `db.<ref>.supabase.co` |
| Username | `postgres.wefjghagwpkotrrdiqyi` — the project-ref suffix Supavisor requires |
| Both ports' `inet_server_addr` | identical (`2406:da1c:4c7:f800::d810`) — both front the same Postgres |

This matches Supabase's documented convention exactly: **5432 = session mode, 6543 = transaction
mode**, both via the shared pooler. So the Phase 2 candidate is "switch pooling modes", **not**
"bypass the pooler" — which is materially safer than it would otherwise be.

### A test of mine that did NOT work, disclosed rather than quietly dropped

I ran a behavioural mode test (stable backend PID + `SET` persistence across statements). It
reported "session-like" behaviour on **both** ports — which is wrong for 6543. The cause is my own
test error: psycopg2 opens an implicit transaction and I never committed, so all six statements ran
inside **one** transaction and therefore stayed on one server backend, which is exactly what
transaction mode guarantees *within* a transaction. **The test could not distinguish the modes.**

The authoritative evidence for the mode difference remains Phase 2's concurrency result — 17–19 of
30 failures with `prepared statement "s6" does not exist` (code 26000) on 6543 without the flag,
versus 0/30 on 5432 — plus the documented port convention above.

---

## Axis 3 — Regions

| Component | Region | Source |
|---|---|---|
| Railway (app) | **Paris — `cdg1`** | `x-railway-edge` response header from production |
| Supabase (database) | **Sydney — `ap-southeast-2`** | connection hostname in `.env` |
| Users | Lebanon / Germany | Salman's Munich test; `cf-ray ...-BEY` |

**Caveat:** `x-railway-edge` names Railway's *edge* ingress. It is strong evidence of EU hosting and
is corroborated by the latency comparison above, but the deployment region setting itself is a
Railway dashboard value I cannot read. It should be confirmed there.

---

## What this means: session mode vs. moving the database

Phase 2 established per-query cost as roughly `round-trips × RTT`. With RTT now identified as
~330 ms *because Paris and Sydney are 16,900 km apart*, both levers can be projected:

| | **DB in Sydney (today)** | **DB in EU (~15 ms RTT)** |
|---|---|---|
| 6543 + `pgbouncer=true` (current config) | **1.65 s** / query | **~0.08 s** / query |
| 5432 session mode | **0.42 s** / query | ~0.02 s / query |

**The strategic point this reveals:** the region gap, not the pooling mode, is the dominant term.
Moving the database to Europe would be worth roughly **20×**, versus session mode's **3.9×** — *and*
it would make the `pgbouncer=true` overhead almost irrelevant (4 extra round trips cost ~1.3 s at
330 ms, but only ~60 ms at 15 ms), letting the app **keep** transaction mode's safety and
multiplexing rather than trading them away.

So the two options are not merely different sizes of the same win — they pull in different
directions:

- **Session mode** buys 3.9× cheaply and reversibly, but *spends* connection headroom and gives up
  multiplexing.
- **EU database** buys ~20×, keeps the current safe configuration, and *preserves* headroom — but
  Supabase project regions cannot be changed in place. It requires standing up a new project and
  migrating data: real downtime, real risk, on a system with live paying tenants.

---

## Answering the mandate's question: is topology migration still worth it after 3.9×?

**Yes — by the numbers it is worth substantially more than session mode.** But it is also the only
option here that carries migration risk on live tenant data, and this platform has a documented
absence of any staging rehearsal for data migrations.

That makes the sequencing question the real decision, not the arithmetic.

---

## Recommendation (NOT a decision, NOT executed)

**Recommended sequence:**

1. **Confirm the three dashboard-only facts below.** One of them (Supavisor pool size) can
   invalidate the session-mode option outright.
2. **Then, if the budget allows, run the session-mode canary** — one environment variable, instantly
   reversible, ~3.9× — as the immediate relief. Lower `connection_limit` to ~5 as part of it.
3. **Treat the EU database migration as a separate, properly-planned project**, not an extension of
   this work. It is worth ~20×, but it needs its own plan, a rehearsal, a maintenance window, and an
   explicit decision — exactly the class of change this project's own rules say must not be improvised.

**Explicitly still not recommended:** removing `pgbouncer=true` while on port 6543 (Phase 2: ~63%
failure rate under concurrency).

### The three facts only Salman can retrieve

1. **Supabase → Settings → Compute & Disk / Database:** the **plan tier** and, under connection
   pooling, **Supavisor "Pool Size"** and **"Max Client Connections."** Pool size caps concurrent
   *session-mode* clients independently of `max_connections=60`; if it is small (commonly 15 by
   default), 20 app connections would not fit and **the session-mode option fails on that fact
   alone.** This is the single most decision-relevant unknown.
2. **Railway → service → Settings → Region:** confirm the deployment region (header says Paris).
3. **Whether any other service holds database connections** (a second Railway service, n8n, an
   external tool) beyond what `pg_stat_activity` showed during this probe.

### If the canary proceeds later, its acceptance criteria (per Salman's own list)

`/health`, `/rk/config`, `/barbers` latency (p50/p95), concurrent-request error rate, live connection
count via `pg_stat_activity`, full booking journey, and a real browser verification pass — with
rollback being a single environment-variable revert.

---

## Confirmed / Side Findings / Unknowns

### Confirmed
1. Railway serves from **Paris (`cdg1`)**; Supabase is in **Sydney (`ap-southeast-2`)** — ~16,900 km,
   which is the physical origin of the ~330 ms floor.
2. `max_connections` = **60**, 3 superuser-reserved, **~8–10 client connections currently in use**,
   leaving ~45–47 headroom.
3. Port 5432 is **Supavisor session mode**, not a direct database connection — same underlying
   Postgres as 6543 (identical `inet_server_addr`).
4. Session mode would consume ~20 connections at the current worker/limit settings (vs 13–15 total
   today), because it does not multiplex.

### Side Findings
- The database is PostgreSQL **17.6**.
- Supabase's own internals already consume ~8–10 connections (`pg_cron`, `pg_net`, PostgREST,
  `postgres_exporter`, Supavisor auth) — worth remembering before sizing any pool.
- `api.salmansaas.com` is **Cloudflare-proxied**, so the origin IP cannot be geolocated; the
  `x-railway-edge` header was the usable signal instead.

### Unknowns
- **Supavisor Pool Size / Max Client Connections** — dashboard-only, and potentially disqualifying
  for session mode. Highest-priority open item.
- **Supabase plan tier** — dashboard-only; `max_connections=60` is consistent with a small instance.
- **Railway's configured deployment region** — the header indicates Paris; the setting itself is
  dashboard-only.
- Sustained-load behaviour of session mode remains unproven (Phase 2 tested 10-way concurrency
  briefly, from one machine).

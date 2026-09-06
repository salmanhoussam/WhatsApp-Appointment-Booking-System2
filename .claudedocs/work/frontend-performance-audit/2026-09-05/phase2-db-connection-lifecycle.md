# Phase 2 — DB Connection Lifecycle Investigation (P0)

**Type:** Investigation, read-only. Only `SELECT 1` and `find_many(take=1)` reads were issued.
No code changed, no config changed, nothing committed, nothing deployed.
**Question (Salman's P0):** why does `SELECT 1` cost ~1.7s — is the app paying an unnecessary
connection/handshake per request, or is the cost inherent to the long-haul link?
**Why it came first:** if connections were simply not being reused, a large win was available
without moving any infrastructure. That had to be settled before any topology decision.

---

## Answer

**Neither.** It is not connection setup, and it is not the network. It is the **`pgbouncer=true`
flag** on the runtime `DATABASE_URL`, which costs roughly **4× the network round-trip time on every
single query**.

### The measurements (same machine, same production database, minutes apart)

| Configuration | median per query | errors | Meaning |
|---|---|---|---|
| psycopg2, reused connection (6543) | **0.338 s** | — | the physics floor: one RTT to Sydney |
| psycopg2, fresh connection setup (6543) | 2.103 s | — | connection establishment cost |
| psycopg2, fresh connection setup (5432) | 7.921 s | — | ditto, session mode |
| **Prisma, 6543 + `pgbouncer=true` — PRODUCTION TODAY** | **1.649 s** | **0 / 30** | safe, ~4× the floor |
| Prisma, 6543 **without** the flag | 0.373 s | **17–19 / 30** | fast, but **broken** |
| **Prisma, 5432 session mode** | **0.422 s** | **0 / 30** | **fast AND safe** |

### Ruling out the obvious suspects, with evidence

- **Not connection setup / idle reaping.** Through Prisma, six back-to-back queries with no idle gap
  cost 1.61–1.90 s each. After a 10 s idle gap: 1.98 s. After a 45 s idle gap: 1.94 s. Idle time
  changes essentially nothing, so connections are not being reaped between requests.
- **Not the app's lifecycle.** `connect_db()` is called exactly once, from the FastAPI `lifespan`
  handler (`app/main.py:29-30`), and it early-returns when already connected
  (`app/db/client.py:44-45`). The Prisma engine is long-lived, as intended.
- **Not the network, and not raw Postgres.** psycopg2 on the same machine, to the same host and
  port, does the identical `SELECT 1` in **0.338 s** on a reused connection — exactly the measured
  TCP RTT to `aws-1-ap-southeast-2` (Sydney). The link is capable of ~0.34 s per query.
- **It is the flag.** Same port, same pooler, same client object, same machine — the *only*
  difference is `?pgbouncer=true`, and it moves a query from 0.34 s to 1.65–2.43 s.

### Why the flag exists — and why it must NOT simply be removed

Port 6543 is Supabase's **transaction-mode** pooler: consecutive statements from one client can be
routed to different server connections, so prepared statements break. `pgbouncer=true` tells Prisma
to stop using them.

Removing it was measured under 10-way concurrency and **failed 17–19 out of 30 reads**, with this
exact error:

```
PostgresError { code: "26000", message: "prepared statement \"s6\" does not exist" }
```

**So the flag is load-bearing.** A naive "delete the flag, get 4× speed" change would have broken
roughly two out of every three requests in production. This is the single most important guardrail
this investigation produced: the fast configuration and the safe configuration are not the same
configuration on port 6543.

---

## The candidate: port 5432, session mode

Session mode gives each pooled client a **dedicated** server connection for the life of that
connection, so prepared statements are safe by construction — the failure mode above cannot occur.

Measured: **0.422 s median, 0 errors in 30 concurrent reads** — about **3.9× faster than production
today**, achieved by changing a connection string, with no region migration and no code change.

`DIRECT_URL` (port 5432) already exists in `.env` and is currently used only for Prisma migrations.

### Projected impact, if the same ratio holds in production

Using the formula this audit established (`endpoint ≈ 0.15 s + round-trips × per-query cost`), with
per-query cost dropping from ~1.65 s to ~0.42 s:

| Surface | today (measured) | projected |
|---|---|---|
| `/health` (1 query) | 1.7 s | ~0.6 s |
| `barbers` (~2 queries) | 2.95 s | ~1.0 s |
| `/rk/config` (~5 queries) | 7–8.4 s | ~2.3 s |
| Booking journey (2 stages) | 8.75 s | ~2.5 s |
| RK homepage (3-level cascade) | 20 s | ~6–7 s |

These are **projections from a local measurement**, not production results. They are the reason to
run a staged test, not a reason to declare the problem solved.

---

## Recommendation (NOT a decision, NOT executed)

Per `investigation-protocol.md`'s separation of Investigation → Recommendation → Decision →
Execution:

**Recommended next step:** evaluate switching the app's runtime `DATABASE_URL` from
`:6543?pgbouncer=true` to `:5432` session mode, staged and reversible (it is one environment
variable, so rollback is instant).

**Before that can be approved, three things must be checked — none of them are optional:**

1. **Connection budget.** Session mode holds a dedicated server connection per pooled client.
   `gunicorn -w 2` (`Dockerfile:24`) × `connection_limit=10` (`app/db/client.py:16`) = up to **20
   connections**, plus migrations and any other consumer. This must be checked against the Supabase
   plan's actual limit before rollout. If it is tight, `connection_limit` should come down.
2. **Sustained-load behaviour.** This test was 10-way concurrency, 3 rounds, from one machine. It is
   evidence, not proof under production traffic.
3. **Whether Supabase's 5432 endpoint is a true direct connection or Supavisor session mode** on
   this project, since that affects the connection accounting in (1).

**Explicitly NOT recommended:** removing `pgbouncer=true` while staying on port 6543. Measured, it
breaks ~63% of concurrent reads.

---

## Confirmed / Side Findings / Unknowns

### Confirmed
1. `SELECT 1` costs ~1.65 s through Prisma but **0.338 s** through psycopg2 against the same
   database from the same machine — a ~1.3 s per-query penalty inside the Prisma/pgbouncer layer.
2. The penalty is caused specifically by `pgbouncer=true`; the same port without it runs at the
   network floor.
3. The flag cannot be removed on port 6543: 17–19 of 30 concurrent reads fail with
   `prepared statement "s6" does not exist` (code 26000).
4. Port 5432 session mode gives floor-level speed (0.422 s) with zero errors in the same test.
5. Connection setup and idle reaping are ruled out as causes (idle gaps of 10 s and 45 s changed
   nothing; the engine connects once at startup).

### Side Findings
- Connection *setup* differs sharply by port: 2.10 s on 6543 vs 7.92 s on 5432. Irrelevant in
  steady state (it is paid once per connection), but it means a session-mode rollout should warm its
  pool rather than establish connections lazily under first traffic.
- Latency under the current production config is also *noisier* (2.12–4.12 s spread on one run) than
  either floor-level config (rock-steady 0.32–0.42 s). Some of the "recurring pooler flakiness" this
  project has logged for months may be this same effect.
- The earlier interim verdict in this investigation — "the ~1.7 s is connection setup, pooling is the
  lever" — was produced from the psycopg2 test alone and was **wrong**. The Prisma test overturned
  it. Recorded here deliberately rather than quietly corrected.

### Unknowns
- Whether the 5432 endpoint on this Supabase project is a true direct connection or Supavisor in
  session mode, and the exact connection ceiling of the current plan. **This is the blocking
  question for the recommendation above** and is answerable only from the Supabase dashboard.
- Behaviour under sustained production concurrency, which a local 10-way test cannot establish.
- Railway's deployment region — still undetermined, still a dashboard-only fact. It now matters
  *less* for the immediate win (which is config, not geography) but still sets the 0.338 s floor:
  co-locating app and database would take that floor toward ~0.02 s, a second and independent lever.
- Exactly what the Prisma engine does per query under `pgbouncer=true` to cost ~4 extra round trips
  (deallocate/re-prepare cycle, transaction wrapping, or similar) was not established at the wire
  level. Not needed for the decision, but it is the remaining "why".

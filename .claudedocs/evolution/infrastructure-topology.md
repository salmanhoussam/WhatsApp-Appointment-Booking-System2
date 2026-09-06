# Evolution — Infrastructure Topology

Accumulating understanding of where this platform's components physically run, and what that costs.
Pre-ADR by design: the problem is now confirmed, the solution is not yet decided.

---

## 2026-09-05

### Context

Salman reported the site was slow to open, tested live from Munich, with the reservation page
sitting in a loading state for ~12 s. Prior sessions (2026-08-29, 2026-09-03) had repeatedly logged
"DB latency ~1.5–2 s per query" as a real but **never root-caused** open risk, carried forward
unresolved into 2026-09-05. This session was the first to treat it as its own investigation rather
than a background annoyance, under an explicit read-only mandate.

Full evidence: `.claudedocs/work/frontend-performance-audit/2026-09-05/` (three files: the frontend
audit, the DB connection lifecycle investigation, and the infrastructure fact-finding).

### Discovery

Two independent, compounding causes — neither of which is the frontend, and neither of which anyone
had isolated before:

**1. The application and its database are on opposite sides of the planet.**

```
Users (Middle East) → Cloudflare → Railway AMSTERDAM 🇳🇱 → Supabase SYDNEY 🇦🇺 (ap-southeast-2)
                                   [edge ingress: cdg1, Paris]        ~16,600 km
```

**Fact 2 answered by Salman from the Railway dashboard (2026-09-05): the deployment region is
AMSTERDAM.** This does not contradict the measurement taken here — production returns
`x-railway-edge: cdg1` (Paris), which is Railway's *edge ingress*, not the compute region. Phase 3
had explicitly flagged that distinction as an open caveat rather than asserting Paris as the
deployment region; the dashboard is the authority and it says Amsterdam. Both facts are true and
recorded together.

**The conclusion is unaffected**: Amsterdam ⇄ Sydney (~16,600 km) and Paris ⇄ Sydney (~16,900 km)
are within ~2% of each other, so the measured ~330 ms floor stands exactly as reported. What
changed is the label on one node, not the physics.

Salman's framing for the resulting shape — **"the Triangle of Death"** — is adopted, with one
precision worth keeping: the three legs are not equally guilty. Users (Middle East) → Amsterdam is
short (~50–80 ms, paid once per request). **Amsterdam → Sydney is the killer leg**, because it is
paid on *every DB round trip*, and every customer-facing flow makes several.

The decisive control: production (`SELECT 1` = 1.58–1.84 s) and a local machine in Lebanon
(1.62–1.93 s) pay **the same** cost. That single comparison eliminates the user's geography,
Cloudflare, Railway itself, and the frontend as candidate causes — the latency travels with the
*database*, not with the client or the host.

**2. `pgbouncer=true` costs ~4× the round-trip time on every query — and cannot simply be removed.**

Same port, same pooler, same client, same machine; the only variable is the connection-string flag:

| Config | median `SELECT 1` | errors (10-way concurrency) |
|---|---|---|
| psycopg2, reused connection | 0.338 s | — (the physical floor) |
| Prisma 6543 + `pgbouncer=true` (production) | 1.65 s | 0 / 30 |
| Prisma 6543 without the flag | 0.37 s | **17–19 / 30** |
| Prisma 5432 session mode | 0.42 s | 0 / 30 |

Removing the flag is fast **and broken**: `prepared statement "s6" does not exist` (PostgreSQL
26000), the classic transaction-mode failure. The flag is load-bearing on port 6543. This is the
most important guardrail the investigation produced — the fast configuration and the safe
configuration are not the same configuration on that port.

Ruled out with evidence: connection setup and idle reaping (10 s and 45 s idle gaps changed
nothing), the app's own lifecycle (`connect_db()` runs once from `lifespan`), and the network
itself (psycopg2 does the identical query in 0.338 s).

### Current Understanding

Endpoint latency behaves as `≈ 0.15 s + (DB round trips × per-query cost)`. That formula predicted
the observed numbers across the board (`barbers` ≈ 2 queries ≈ 2.9 s; `/rk/config` ≈ 5 queries ≈
7–8.4 s), which is why it is trusted here.

Because the cost is *per round trip* and every customer-facing flow makes several, the two available
levers are not the same kind of thing:

| | DB in Sydney (today) | DB in EU (~15 ms RTT) |
|---|---|---|
| 6543 + `pgbouncer=true` | 1.65 s / query | ~0.08 s / query |
| 5432 session mode | 0.42 s / query | ~0.02 s / query |

- **Session mode (5432)** is an *operational optimization*: ~3.9×, one environment variable,
  instantly reversible. But it does not multiplex, so it trades connection headroom for speed.
- **Moving the database to Europe** is an *architectural fix*: it shrinks every round trip in every
  flow simultaneously, and would make the `pgbouncer=true` overhead nearly irrelevant (4 extra round
  trips cost ~1.3 s at 330 ms but only ~60 ms at 15 ms) — letting the platform **keep** transaction
  mode's safety and multiplexing rather than trading them away.

Salman's own framing correction, adopted: the "~20×" figure is an **estimate derived from current
RTT, not a promise that each endpoint becomes 20× faster.** Its real significance is structural —
it is the only option that reduces the *repeated* per-round-trip penalty inside every customer
journey, rather than reducing it once.

His second correction is also adopted and corrects this investigation's own framing: at
`connection_limit=5`, session mode costs `4 workers × 5 + ~10 internal = 30 of 57` — comfortable,
not future-limiting. The report had over-stated the headroom concern by assuming `connection_limit`
stayed at 10.

**Standing conclusion:** a DB-per-step SaaS whose application runs in Paris and whose database runs
in Sydney is a topology mismatch, not a tuning problem. No amount of React or query optimization
compensates for a ~1.4 s penalty repeated inside every flow. Frontend optimization was explicitly
deprioritized on this basis.

### Open Questions

1. **Supavisor Pool Size and Max Client Connections** (Supabase dashboard) — caps concurrent
   session-mode clients independently of `max_connections=60`. If it is at the common default of
   15, the session-mode option fails on that fact alone. **Blocking, highest priority.**
2. ~~Railway's configured deployment region~~ — **ANSWERED 2026-09-05: Amsterdam** (Salman, from the
   Railway dashboard). The `cdg1` header was the edge ingress, not the compute region. Closed.
3. Whether any other service holds connections to this database beyond the ~8–10 Supabase internals
   observed.
4. What the Prisma engine actually does per query under `pgbouncer=true` to cost ~4 extra round
   trips (deallocate/re-prepare cycle, transaction wrapping?) — not needed for the decision, but it
   is the remaining "why".
5. Whether an EU migration is worth its real cost: Supabase project regions cannot be changed in
   place, so it means a new project plus a data migration, on a system with live paying tenants and
   (per `[[migration-staging-discipline]]`) no staging rehearsal set up.

### Promoted?

No — deliberately. The **problem** is confirmed with hard evidence; the **solution** is not decided.
Two candidates remain live (session-mode canary; EU migration), and one blocking fact could
eliminate the cheaper one outright. Promoting to an ADR now would jump from problem to solution
without the verification this project's own ADR discipline requires — the same reasoning
`rules/backend/architecture.md` §9 already applies to ADR-0005.

Registered instead as a named, high-priority infrastructure item: **Infrastructure Topology
Migration — Supabase EU**, tracked in `todo_list.md`, explicitly *not* an extension of frontend
performance work.

# ADR-0007 — Final Verification (Sydney → Frankfurt database relocation)

**Written:** 2026-09-08 · **Mode:** documentation/verification only — 0 DB operations, 0 code
changes, 0 deploys.
**Closes a documentation gap**, not an engineering gap: ADR-0007 had a Contract and Gate evidence
but no `verification/` document, breaking `documentation-policy.md`'s
Implementation → **Verification** → Review → Archive chain.

**Evidence discipline.** Every claim below cites a real file, a real command output already on
record, or git. Where the chain cannot be closed from existing artifacts, this document says
`UNKNOWN — evidence not available` and stops. No estimate is presented as a fact; no gap is filled
by inference.

**Sources read (this document adds no new measurements):**

| Source | Used for |
|---|---|
| `.claudedocs/adr/ADR-0007.md` | decision, cutover parameters |
| `.claudedocs/implementation/SUPABASE_EU_MIGRATION/CONTRACT.md` | gate definitions, rollback edge |
| `work/supabase-eu-migration/2026-09-06/gate0-gate2-evidence.md` | Gates 0–5 |
| `work/supabase-eu-migration/2026-09-06/gate6-preparation.md` | pre-cutover state |
| `work/supabase-eu-migration/2026-09-06/gate6-cutover-executed.md` | Gates 6, 7, 9, 10 |
| `work/supabase-eu-migration/2026-09-06/gate8-write-verification.md` | Gate 8 criterion + readiness |
| `work/supabase-eu-migration/2026-09-06/reference-conversion.md` | reference audit |
| `work/supabase-eu-migration/2026-09-06/code-reference-classification.md` | code references |
| `work/frontend-performance-audit/2026-09-07/post-migration-remeasure.md` | post-migration timing |
| `work/auth-audit-trail/2026-09-07/implementation-verification.md` | real production write rows |
| `work/rk-template/2026-09-07/seeder-verification.md` | scope limit on booking-flow exercise |

---

## A. Verification scope

### Verified here
- Gates 0–7, 9, 10 status, each against its own evidence file.
- Target architecture (which database production actually reads and writes).
- Storage parity, including the `.jfif` false negative.
- Reference conversion — code, DB-stored URLs, and what was deliberately left on Sydney.
- Post-cutover read path and performance, browser-level.
- **Whether production writes reach Frankfurt** — treated as a claim in its own right, separate
  from Gate 8's criterion.

### NOT verified here
- **Gate 8's own criterion** (two real bookings). See §G — verdict `UNKNOWN`.
- Sydney's decommissioning — deliberately not attempted; Sydney is live by decision.
- Any claim requiring a DB operation: this task forbade INSERT/UPDATE/DELETE, test bookings, and
  synthetic data. No query was run against any database while writing this document.
- Long-run stability past 2026-09-07. The measurements are point-in-time.

---

## B. Target architecture

| Element | State | Evidence |
|---|---|---|
| **Production DB** | **Frankfurt `eu-central-1`** | `gate6-cutover-executed.md` — "Production now runs on Frankfurt (`eu-central-1`)" |
| **Sydney `ap-southeast-2`** | **Live, untouched, undeleted** — rollback + observation | same file: "Sydney remains live, untouched, undeleted" |
| **Production backend** | Railway app, consumer of the Frankfurt DB | `gate8-write-verification.md` Part 1 — all checks run against `dashboard.salmansaas.com` deliberately, *not* a local connection |
| **Local `.env`** | `DATABASE_URL`/`DIRECT_URL` → Frankfurt; Sydney isolated under `SY_*` | verified 2026-09-08: `.env` resolves `aws-0-eu-central-1`; `SY_*` hold `aws-1-ap-southeast-2` |
| **Script guard** | `scripts/_db_target.py` refuses any URL matching `SY_*`, by **role not geography** | that file's own docstring |

**No Miti/Tokyo region is part of this migration.** Neither appears in any ADR-0007 artifact.

> **Note on scope carried forward, not resolved here:** 16 scripts still use the unguarded
> `DIRECT_URL` pattern (14 converted to `_db_target`), verified by grep 2026-09-08. Out of scope for
> this document; it is an open item, not a migration defect.

---

## C. Migration gates 0–10

Status column reflects **only** what the cited evidence supports.

| Gate | Definition | Status | Evidence |
|---|---|---|---|
| **0** | Source freeze | ✅ **PASSED** | `gate0-gate2-evidence.md` §Status |
| **1** | Backup | ✅ **PASSED** | same — archive readable, counts match, **checksums recorded** |
| **2** | EU project provisioned | ✅ **PASSED** | same — accepted by Salman on the twice-validated 5-RTT model |
| **3** | Schema parity | ✅ **PASSED** | same — `41 / 492 / 125 / 108`, **zero delta** |
| **4** | Data parity | ✅ **PASSED** | same — **904 = 904 rows, 0 mismatches, all 41 tables** |
| **5** | Storage parity | ✅ **PASSED** | same — **729 objects / 199,818,368 bytes**, exact parity |
| **6** | Cutover | ✅ **DONE — EXECUTED 2026-09-06** | `gate6-cutover-executed.md` — Salman set the 4 variables, Railway redeployed. **Not reopened by this document.** |
| **7** | Read verification (real tenants) | ✅ **DONE** | same — **all 9 REAL tenants HTTP 200, zero Sydney references**. Tenant list defined in `CONTRACT.md:113` (excludes `alzabt-demo` and every `demo-*`) |
| **8** | **Write verification** | ⚠️ **UNKNOWN** — see §G | `gate8-write-verification.md`: `READINESS VERIFIED / BOOKINGS PENDING` |
| **9** | Performance | ✅ **DONE** | `gate6-cutover-executed.md` §Gate 9 + `post-migration-remeasure.md` |
| **10** | Rollback | ✅ **CAPABILITY DOCUMENTED — not executed** | `gate6-cutover-executed.md`: "available, not needed". Rollback window **30 min** (ADR-0007); sharp edge stated in `CONTRACT.md:118` — any write landing on EU after Gate 6 does not exist in Sydney |

**Gate 6 is DONE and is not returned to pending by anything in this document.** Gate 8's open state
concerns the *reservation write path*, not the cutover.

---

## D. Storage verification

| Item | Value | Evidence |
|---|---|---|
| Objects | **729** | `gate0-gate2-evidence.md:273, :330` |
| Bytes | **199,818,368** | `gate0-gate2-evidence.md:363` |
| Parity | **exact** (source = target) | same |
| Frame-sequence directory | `…/properties/hr/pages/home/story/frames` — **243 frame files** | `reference-conversion.md:81` |

**`.jfif` false negative — resolved, and worth preserving.** The verification *initially reported*
**9 objects missing**, all `.jfif` files under one deep path (`gate0-gate2-evidence.md:284`). This
was a **false negative in the listing/resume behaviour, not real data loss**: the arithmetic closes
exactly — **720 listed + 9 directly verified = 729 objects** (`:292`). Recorded because a future
reader hitting the same listing gap needs to know it was investigated and closed, not waved away.

**Frankfurt storage references verified at browser level** (§F).

**Dead-project references deliberately left unconverted:** paths whose files do not exist on the
target — "converting them to Frankfurt would be wrong, since the files do not exist there"
(`reference-conversion.md:106`). Left on purpose; not drift.

---

## E. Database & reference verification

| Layer | Finding | Evidence |
|---|---|---|
| Frontend source | **35 occurrences across ~15 files** | `reference-conversion.md:54` |
| Code references | classified before conversion, not bulk-replaced | `code-reference-classification.md` |
| Production target | converted at cutover — 4 variables set by Salman (`DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_KEY`) | `gate6-cutover-executed.md`; variable list corroborated by `gate8-write-verification.md` §"one honest risk" |
| Sydney references retained | **intentional** — `SY_*` in `.env` as the rollback target; `_db_target.py` exists specifically to stop scripts reaching them by accident | `.env` (2026-09-08), `scripts/_db_target.py` docstring |
| Dead/historical references | left unmodified by decision | `reference-conversion.md:106` |

**Deliberately excluded from the migration:** converting the 35 absolute URLs into an env var —
recorded in session 2026-09-06 as *"مغرٍ ومستبعَد عمدًا — refactor لا migration."* A refactor
smuggled into a migration is exactly the risk the Contract's gate structure exists to prevent.

---

## F. Cutover / production verification

All from `gate6-cutover-executed.md` unless noted.

### Endpoint latency, Sydney → Frankfurt

| Endpoint | Sydney | **Frankfurt** | Gain |
|---|---|---|---|
| `/health` — 1 query, no cache | 1.70 s | **0.178 s** | **9.6×** |
| `/reservations/barbers` — no cache | 2.95 s | **0.219 s** | **13.5×** |
| `/reservations/catalog-services` | 3.10 s | 0.296 s | 10.4× |
| `/rk/config` (30 s cache — muddied) | 7.90 s | 0.135–0.46 s | 17–58× |

**Recorded honestly at the time and preserved here:** the prediction was 16–27×; the **measured
uncached gain is ~10–13×**. "The model was optimistic by roughly a third. Right order of magnitude,
wrong precision."

### Browser verification — real, on `alzabt.salmansaas.com/rk`

```
requests to Sydney storage     0
requests to Frankfurt storage  4
DOM interactive              714 ms
page renders                 47,909 chars in #root
```

Same-page comparison vs the 2026-09-05 audit: `store/categories` **5.39 s → 0.60 s** ·
`store/products` **4.28 s → 0.23 s** · `config` ~6 s → **0.39 s**.

### Full-page re-measure, 2026-09-07 (`post-migration-remeasure.md`)

| Run | TTFB | Total | Note |
|---|---|---|---|
| 1 | 2,933 ms | **5,546 ms** | **cold start — disclosed, not averaged away** |
| 2 | 164 ms | **1,673 ms** | warm |
| 3 | 130 ms | **1,561 ms** | warm |

**20,001 ms → ~1,600 ms warm ≈ 12.5× faster.** Content confirmed rendered (`خدماتنا` + `احجز`).

**Known residual, unchanged:** `lastResourceEnd` ~22 s is the **6 MB `no-cache` video**, not the
database — the deferred media-hygiene item, still open.

---

## G. Gate 8 — REAL WRITE VERIFICATION

### Verdict: ⚠️ **UNKNOWN — the gate's own criterion is not met**

**Gate 8's criterion, as originally recorded** (`gate8-write-verification.md`, opening line):

> *a real booking — one from the website, one from WhatsApp — confirmed written to the Frankfurt
> database. **No synthetic test data.***

**Neither booking is on record.** The evidence file's own Part 2 lists both as `_pending_`, and no
later artifact supplies them.

### What the existing evidence DOES prove — stated separately, deliberately

**Claim: production writes reach the Frankfurt database, with read-back.** — **PROVEN.**

Evidence (`auth-audit-trail/2026-09-07/implementation-verification.md`), real rows on production:

```
19:07:40  admin_login_failed   actor=anon                reason=not_found
19:07:40  admin_login_failed   actor=user:81edde7e-…     reason=bad_password
19:07:42  admin_login_success  actor=user:81edde7e-…     client_id=7ef5c8c9-…
19:07:42  client_login_failed  actor=anon                reason=not_found

users with last_login_at:  rkbarber@dev.invalid → 2026-09-07 19:07:42   (first ever)
audit table: admin_login_failed 10 · tenant_suspended 7 · admin_login_success 2 · client_login_failed 2
```

Why this is genuine Frankfurt evidence: it is dated **2026-09-07**, *after* the 2026-09-06 cutover;
it was produced by traffic through the **real production stack** (the same file records a
Cloudflare-owned IP in the `X-Forwarded-For` chain, i.e. Cloudflare → Railway → DB); the rows were
**read back** afterwards; and `users.last_login_at` moved from **0 of 31** to a real timestamp —
a state change that cannot be faked by a read.

### Why that still does not close Gate 8

Three independent reasons, each on its own evidence:

1. **Different write path.** `security_audit_log` and `users.last_login_at` are not the reservation
   path. Gate 8 was written specifically around `reservation_service.create_reservation()`, which
   both the website and WhatsApp flows call. That function has **no evidenced post-cutover
   execution**.
2. **`BF948302` is Sydney evidence, not Frankfurt evidence.** The booking repeatedly cited as the
   end-to-end WhatsApp proof is from session **2026-09-05** (`sessions/2026-09-05.md:61, :132`) —
   **before** the cutover (2026-09-06, rotation ~16:10 → fix ~16:47,
   `gate6-cutover-executed.md:65`). It was therefore written to **Sydney**. Using it as Gate 8
   evidence would be a real error, and is refused here.
3. **The booking flow was explicitly never exercised post-cutover.** The one session that created
   real tenants on Frankfurt states it plainly:
   *"the **booking flow itself was not exercised** on the fixtures — barbers/services were
   confirmed"* (`rk-template/2026-09-07/seeder-verification.md:117`).

### The one risk Gate 8 exists to catch, still unexercised

`WHATSAPP_APP_SECRET` must be set on Railway or **every** inbound webhook POST is rejected `403`
and the message is silently dropped (`webhook.py:88-93` — fails closed by design). The cutover
changed only `DATABASE_URL`/`DIRECT_URL`/`SUPABASE_URL`/`SUPABASE_KEY`, so it *should* be intact —
but "should" is not evidence, and it **cannot be proven from outside without a validly-signed
POST**. This is precisely what the Gate 8 WhatsApp booking was designed to test.

### What would close Gate 8

Exactly what its criterion says, requiring a real human action this document may not manufacture:

1. A real website booking at `alzabt.salmansaas.com/rk` → احجز موعد.
2. A real WhatsApp message `حجز rk` to **+961 79 022 398** (the Central WABA number — **not** the
   shop's own number).
3. For each: `GET /api/v1/public/reservations/{id}?customer_phone={phone}&client_slug=rk` → `200`.

**Readiness for all three was verified live on 2026-09-06** (`gate8-write-verification.md` Part 1:
`/health` `{"status":"ok","db":"ok"}` 0.215 s · barbers `200` 0.323 s · `reservations` in
`active_services` · webhook correctly rejecting a bad token with `403` · central number live). The
gate is blocked on a human booking, **not** on system readiness.

---

## H. The `todo_list.md:910` question — resolved, and a correction to this session's own review

`todo_list.md:910` reads: *"Gates 0-7 و9 ✅ · **Gate 8 (تحقق الكتابة) هو الباقي الوحيد** · سيدني حيّة
ولم تُحذف."*

**That entry is CORRECT and is NOT stale.** It agrees with this document on every point.

**Correction.** The two-week review earlier today (`sessions/2026-09-08.md` §ب, finding 3) listed
this as a contradiction against session 2026-09-06's heading *"✅ Gate 8 — الجاهزية متحقَّق منها"*.
On reading the underlying evidence file, **there is no contradiction**: that heading says
*readiness* was verified, and the file it points to states `READINESS VERIFIED / BOOKINGS PENDING`
in its own status line. The review compared a heading to a heading instead of reading the source —
the exact failure mode this documentation task exists to fix. The finding is withdrawn.

**Nothing in `todo_list.md` was modified** (out of scope by instruction). No second source of truth
is created: for ADR-0007 verification, **this document is the source of truth**, and it agrees with
the todo entry rather than competing with it.

---

## I. Result

| | |
|---|---|
| **Gates 0–7, 9, 10** | ✅ Verified against evidence |
| **Gate 8** | ⚠️ **UNKNOWN — not closed.** Blocked on two real human bookings |
| **ADR-0007 status** | **Accepted, implemented, in production, verification incomplete on one gate** |
| **Sydney** | **Must not be deleted** — Gate 8 open + observation period |

**Remaining gaps, named rather than closed:**

1. Gate 8's two bookings — a human action.
2. `WHATSAPP_APP_SECRET` on Railway post-cutover — unproven from outside.
3. 16 scripts still on the unguarded `DIRECT_URL` pattern (out of scope here).
4. The 6 MB `no-cache` video (~22 s `lastResourceEnd`) — media hygiene, not database.

**This document does not close ADR-0007.** Per `documentation-policy.md`, a Post-Implementation
Review and archiving both wait on Gate 8.

# Auth Audit Trail — live verification

**Scope shipped:** admin login + client login only, as agreed. The other five token-issuing paths
are untouched and each becomes a single `record_auth_event(...)` call later.

## Before

```
security_audit_log   7 rows · ONE event type (tenant_suspended) · actor NULL on every row
users.lastLoginAt    0 of 31
login outcomes       logger.info / logger.warning only -- ephemeral container logs
```

## After — real rows from production

```
19:07:40  admin_login_failed   actor=anon                     reason=not_found
19:07:40  admin_login_failed   actor=user:81edde7e-…          reason=bad_password   ← account known
19:07:42  admin_login_success  actor=user:81edde7e-…          client_id=7ef5c8c9-…
19:07:42  client_login_failed  actor=anon                     reason=not_found

users with last_login_at:  rkbarber@dev.invalid → 2026-09-07 19:07:42   (first ever)
audit table: admin_login_failed 10 · tenant_suspended 7 · admin_login_success 2 · client_login_failed 2
```

**The wrong-password row carries the real `user_id`.** That is the design goal: *"show me every
failed attempt against this account"* is now answerable, and it is what a future brute-force lockout
would key on.

## Two traps caught by measurement, not by reasoning

**1. BackgroundTasks are dropped when `HTTPException` is raised.** Verified with a real FastAPI app
before designing around it: the success-path task ran, the failure-path task did not — the exception
handler builds a fresh response and the tasks go with the old one. Backgrounding failures would have
silently lost every record that reveals an attack. Hence: **success backgrounded, failure awaited
inline.**

**2. FastAPI still injects `BackgroundTasks` when the parameter has a `= None` default.** Checked,
because if it did not, the success events would never have been written at all.

## 🔴 A real defect in the first shipped version, caught by its own instrumentation

The first live rows recorded:

```
ip  = 104.22.40.135
xff = "104.22.40.135, 79.127.178.81"
```

`104.22.40.135` is **Cloudflare-owned** — checked programmatically against Cloudflare's published
IPv4 list, not eyeballed. Cloudflare fronts this API, so **X-Forwarded-For's first hop is its edge,
not the visitor.** The textbook "first hop is the client" rule is wrong under this topology, and
every IP recorded in that first version was a proxy address with zero forensic value.

Fixed by checking `CF-Connecting-IP` first. Also added `detail.ip_src`, recording *which header the
address came from* — without it a future proxy change would silently poison every IP and nothing in
the data would show it.

**This was only visible because the raw XFF was being stored alongside the resolved value.** That
was a hedge against not knowing Railway's behaviour; it paid for itself within the hour.

### My first verification verdict was wrong, and the correction matters

After the fix the rows showed `185.187.131.164` / `.174` while `api.ipify.org` reported my address
as `185.187.131.151`. I initially marked those **❌ proxy**. That was a bad test.

Sampling ipify five times returns `.151, .186, .151, .151, .186` — **my own egress is a pool**, so
different requests legitimately leave on different addresses in `185.187.131.0/24`.

The correct assertion is ownership, not equality:

```
104.22.40.135    Cloudflare-owned: True     ← the broken value
185.187.131.164  Cloudflare-owned: False    ← the fixed values, in the caller's own range
185.187.131.174  Cloudflare-owned: False
```

**The fix works.** Recorded here because an equality check against a pooled egress address will
mislead the next person exactly as it misled me.

## Confirmed

1. Four event types recording, both outcomes, on both paths.
2. `actor` populated on every row — the column that had never held a value.
3. `lastLoginAt` written for the first time in the system's history.
4. Failure records survive the `HTTPException` path (they are awaited, not backgrounded).
5. The recorded IP is the caller's, not Cloudflare's, and its source header is recorded alongside it.

## Unknowns

- **Backgrounded success writes were not tested under a failing database.** `log_security_event` is
  best-effort and never raises, but that path was not exercised.
- **The five remaining auth paths are still unaudited** — magic-link, set-password, register,
  customer register/login.
- **No retention or pruning policy** exists for `security_audit_log`. Failed-login rows will grow
  without bound; nothing rotates them.
- **Nothing reads this table yet.** Recording is not detecting — there is no alerting, no lockout,
  and no admin view.

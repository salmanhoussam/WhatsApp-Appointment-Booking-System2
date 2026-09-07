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

---

# Slice 2 — self-registration closed, all seven paths audited

## Self-registration: closed, and closed *visibly*

```
POST /api/v1/public/demo/create  -> 403
POST /api/v1/public/register     -> 403
POST /api/v1/auth/register       -> 403
body: {"code":"FORBIDDEN","message":"التسجيل الذاتي مغلق حالياً. إنشاء الحسابات يتم عبر دعوة من الإدارة."}
```

**Gated, not deleted — deliberately.** All three have live frontend callers: three demo-builder
surfaces (`DemoLandingPage.jsx:508`, `DemoBuilderPage.jsx:89`, `DemoLauncher.jsx:341`) and the
canonical `/register` page (`TenantRegisterPage.jsx:207`, `SSOLoginPage.jsx:282`), which
`routing.md` §0c documents as carrying real inbound CTAs. Deleting the routes would have left those
buttons on a bare 404 — a broken surface rather than a closed door. A 403 with an explicit message
is something a CTA can actually render.

One gate (`app/core/registration_gate.py`), fails closed: `SELF_REGISTRATION_ENABLED` must be
explicitly `"true"`. Reopening is one env var, no deploy.

## All seven auth paths now record

Probed live; every one landed:

```
19:23:47  setup_login_failed        actor=anon                    reason=invalid_token
19:23:48  password_set_failed       actor=anon                    reason=invalid_token
19:23:50  customer_login_failed     actor=anon                    reason=not_found
19:23:51  customer_register_failed  actor=customer:212ac3fc-…     reason=already_registered
```

The duplicate-registration row carries the **real customer id** — same principle as the
wrong-password case: the account is known, so it is recorded.

**Vocabulary in the table:** `admin_login_failed` · `admin_login_success` · `client_login_failed` ·
`customer_login_failed` · `customer_register_failed` · `password_set_failed` · `setup_login_failed`
(+ the pre-existing `tenant_suspended`).

`magic_link_login` had **no `Request` parameter at all** and now takes one — header-derived IP is
the entire point of the record.

`customer_login` records which half failed in `detail.reason` while the response stays a single
generic 401. Distinguishing them to the caller is account enumeration.

## Unknowns — success paths not exercised

Four success events are wired but **unproven**, because each needs a credential or state this
verification could not create without writing real data:

| event | why not exercised |
|---|---|
| `setup_login_success` · `password_set_success` | need a live, unconsumed setup token |
| `tenant_register_success` | now returns 403 — unreachable by design |
| `customer_login_success` · `client_login_success` | need real customer / tenant-root credentials |

Only `admin_login_success` is confirmed end-to-end (and it is the one that also stamps
`lastLoginAt`). The other four share the identical backgrounded code path, but *share a code path*
is an argument, not evidence — recorded as unproven rather than implied.

## Also still open

- **Frontend CTAs now surface the 403.** Not handled here; a follow-up.
- **No retention policy** on `security_audit_log`.
- **Nothing reads the table yet** — recording is not detecting. Auto-ban is the next step and now
  has real data to read.

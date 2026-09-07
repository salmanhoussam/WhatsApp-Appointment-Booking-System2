# Login path — where authentication happens, and what it records

**Investigation only.** No code, schema or data was modified.

---

## 1. Where the admin JWT is issued

| | |
|---|---|
| handler | `app/api/v1/admin/auth.py:142` `user_login()` |
| route | `POST /api/v1/auth/users/login` |
| mount | `app/main.py:67` — `auth_router` at `/api/v1/auth` |

**It lives in `admin/` but is mounted under `/auth`, deliberately outside the `_protected` floor**
(`admin/__init__.py:24`). That is correct: it *is* the authentication boundary, so it cannot sit
behind an authentication dependency.

Flow, in order: `find_user_by_email` → fall back to `find_user_by_phone` → `verify_password` →
`isActive` check → `create_access_token(type=admin, user_id, client_id, slug, role, barber_id)` →
`_set_auth_cookie` → return.

**Seven token-issuing paths exist in total**, and each one is an authentication event:

| path | file:line |
|---|---|
| client login | `admin/auth.py:109` |
| **admin/staff login** | `admin/auth.py:177` |
| magic-link setup login | `admin/auth.py:255` |
| set-password (auto-login) | `admin/auth.py:381` |
| tenant self-registration | `admin/auth.py:456` |
| customer register | `public/__init__.py:146` |
| customer login | `public/__init__.py:169` |

---

## 2. Why `lastLoginAt` is skipped

**It is not skipped or bypassed — it was never wired.** There is no write to it anywhere:

```
grep lastLoginAt across app/api/ and app/repositories/user_repo.py  →  zero writes
users with last_login_at set                                        →  0 of 31
```

The column exists in `prisma/schema.prisma` under a comment block literally headed
`-- Auth lifecycle --`, alongside `resetToken`/`resetTokenExp` (themselves dead columns: no
password-reset flow exists anywhere). It was added with the model and no code ever populated it.

The success path writes **nothing** to the database: it creates a token, sets a cookie, returns.

---

## 3. Is there a dead `security_audit_log` call to revive?

**No dead call. A dead *capability*.** The service is live, correct, and pointed at the wrong half
of the problem.

`log_security_event()` (`app/services/security_audit_service.py:31`) is well built for this:
- **best-effort, never raises** — safe to call inside a login path
- `event_type` is **free-form by design** (ADR-0001 §10) so "new event types never require a schema
  change"
- its own docstring names **`"authorization_denied"`** and **`"invalid_signature"`** as intended
  examples — the design clearly anticipated authentication events

`SecurityAuditLog` already has every column needed: `eventType`, `clientId`, `endpoint`,
`detail` (Json), **`actor`**, indexed on `clientId` / `eventType` / `timestamp`.

### What it actually contains

```
event_type          rows   newest        with actor
tenant_suspended       7   2026-08-30             0
TOTAL                  7
```

**One event type. Seven rows. `actor` NULL on every one.**

All 8 call sites (`core/tenant.py` ×2, `whatsapp_flow.py`, `webhooks/samsara.py`) record tenant
status or lifecycle blocks. **`actor` is passed by zero call sites** — the "who" column has never
held a value in this system's history.

### So the table answers exactly one question

> *"was a suspended tenant refused?"*

It has never been able to answer **"who logged in, when, from where, and did it succeed?"**

---

## The blind spot, precisely

Login outcomes today exist **only in ephemeral application logs**:

```
success  logger.info("✅ User login success: %s (role=%s)")     auth.py:192
failure  logger.warning("❌ Password mismatch for user: %s")     auth.py:171
missing  logger.warning("❌ User not found: '%s'")               auth.py:166
inactive logger.warning("⚠️  Inactive user: %s")                 auth.py:175
```

Container logs, with whatever retention Railway keeps — not queryable, not joinable to a tenant,
and gone on redeploy.

**This is why "were the two security holes exploited?" had no answer today.** It is the same reason
no future incident will have one either.

---

## Confirmed

1. Admin JWT is issued at `admin/auth.py:142`, mounted `POST /api/v1/auth/users/login`.
2. `lastLoginAt` has **zero writes** platform-wide; **0 of 31** users have it set.
3. `security_audit_log` holds **7 rows of a single event type**, newest 2026-08-30.
4. **`actor` has never been populated** — 0 of 8 call sites pass it.
5. **7 token-issuing paths, none audited.** Failures reach `logger` only.
6. The audit service is capable and safe to call from a login path — free-form event type, never
   raises. **Nothing needs to be built to store this; it needs to be called.**

## Side findings

- `resetToken` / `resetTokenExp` sit in the same "Auth lifecycle" block and are **also dead** — no
  password-reset flow exists. Same pattern: columns added, flow never built.
- `user_login` accepts an email **or a phone** in the `email` field (documented, intentional). Any
  audit record should capture the **identifier as submitted**, not assume an email.

## Unknowns

- **Railway's log retention was not checked** — so "how far back could we reconstruct a login
  history from container logs" is unanswered.
- **Whether the client-side `POST /auth/login` path** (`auth.py:109`, the tenant-owner login) has
  its own equivalent of `lastLoginAt` on `Client` was not audited here; the session report notes
  `clients` has no login tracking either.
- No IP address or user-agent is currently captured anywhere in the login path; whether those
  should be recorded is a decision, not a finding.

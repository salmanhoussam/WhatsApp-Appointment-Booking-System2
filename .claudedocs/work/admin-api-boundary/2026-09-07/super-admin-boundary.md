# Super-admin authorization boundary — measured, closed (2026-09-07)

**Status:** CLOSED in code, deployed `f4c3fe1`. One residual operational risk is open (§Unknowns).
**Mode:** prove current behaviour → smallest fix → re-prove → live verification.
Order set by Salman, followed literally. `/public/demo/create`, the two registration routes and the
39 scripts were deliberately **not** touched — each needs its own provisioning decision.

Second item in the authorization/security-boundary family, after
[`failopen-webhooks.md`](./failopen-webhooks.md).

---

## Confirmed Findings

### 1. The role was read from the token alone — no database lookup

`app/core/tenant.py`'s `require_super_admin` returned the JWT payload as soon as
`payload["role"] == "SUPER_ADMIN"`. Proven by calling the dependency directly with a token whose
`user_id` is all-zeroes and exists in no table:

```
admin token, role=SUPER_ADMIN, fabricated user_id   -> ACCEPTED (payload role=SUPER_ADMIN)
admin token, role=TENANT_ADMIN (control)            -> 403 SUPER_ADMIN role required.
```

**Consequence:** demoting, deactivating or deleting a super admin changed nothing until their token
expired — tokens last 24h — with no revocation path. `get_current_admin_user`
(`tenant.py:345-393`) has always reloaded the User row; this dependency, guarding the more
privileged surface, did not.

### 2. A client token for the owner slug was accepted as super admin

```
client token, slug='smar', NO role claim   -> ACCEPTED (payload role=None)
client token, slug='rk'   (control)        -> 403 Platform owner access required.
```

That token is minted by `POST /api/v1/auth/login` against `Client.password_hash`. Checked live on
Frankfurt: **`Client 'smar'` really does have a bcrypt password set** (`$2b$12$…`), so the path was
reachable, not theoretical. One tenant's own login password was a full platform-admin credential —
and `Login.jsx:29-32` falls back to client login automatically when user login fails, so it could be
reached without intending to.

`clients` has **no login-tracking column**, so a login through that path leaves no trace. Whether it
was ever used cannot be answered from the database.

### 3. `POST /auth/create-user` could overwrite any user in any tenant

Gated only by `x_setup_key != settings.SECRET_KEY` — the **JWT signing key doubling as a bearer
credential**. One leaked value therefore gave both forged tokens (finding 1 made those sufficient on
their own) and a live account-takeover endpoint, which is what turns key exposure into persistence.

Worse than its docstring stated: `find_user_by_email` is **not tenant-scoped**, and the existing-user
branch called `update_user`. So a single unauthenticated request could take over **any** account in
**any** tenant — new password, `isActive=True`, role raised to `SUPER_ADMIN`. No rate limit.

Zero code callers (grep across `frontend/src`, `app`, `scripts`); it was only ever invoked by hand —
two real uses on record, `.claudedocs/sessions/2026-08-01.md:166` and the 2026-08-02 readiness audit.

### 4. Exposure was narrow — measured, not assumed

- **One** `SUPER_ADMIN` user exists: `salman@salmansaas.com`, active, created 2026-04-27.
- The gate itself worked for its stated purpose: `/api/v1/super/clients` → **401** with no token,
  **403** with a real `rk` `TENANT_ADMIN` token.
- `create-user` was **not** fail-open, unlike the webhooks: no key and wrong key both returned 403.
  The defect was *what the key was* and *what it could do*, not whether it was enforced.

---

## The fix (smallest that closes all three)

`require_super_admin` now: rejects any non-`admin` token type; checks the payload role as a cheap
reject; then **loads the User row and requires `role='SUPER_ADMIN'` AND `isActive`**. The lookup is
deliberately not scoped by `clientId` — a super admin is platform-wide, and scoping it would let a
stale `client_id` claim influence the outcome. The `type='client'` branch is gone.
`settings.SUPER_ADMIN_SLUG` is no longer consulted here at all: it says which Client the owner User
belongs to, which is not by itself an authorization fact.

`POST /auth/create-user` deleted, with a comment block in its place recording why.

All `require_super_admin` call sites bind it to `_admin` / `_user` / `_caller` and discard the value
(13 routes across `super/clients.py`, `super/platform_services.py`, `super/maintenance.py`), so the
return contract was left unchanged.

---

## Verification

Same four probes, before and after:

| Probe | Before | After |
|---|---|---|
| admin token, role claim, fabricated `user_id` | ACCEPTED 🔴 | **401** ✅ |
| client token, slug `smar`, no role claim | ACCEPTED 🔴 | **401** ✅ |
| real `rk` TENANT_ADMIN forging `role=SUPER_ADMIN` | n/a | **401** ✅ |
| the real super admin (`salman@salmansaas.com`, real id read from Frankfurt) | ACCEPTED | **ACCEPTED** ✅ |

Live after deploy: `POST /api/v1/auth/create-user` → **404** (route gone);
`GET /api/v1/super/clients` with a real `rk` TENANT_ADMIN token → **403**; `/health` → 200.

---

## Side Findings

- **`User.lastLoginAt` is never written.** The column exists (`schema.prisma`) and is NULL for every
  account including ones in daily use, so "who logged in, and when" cannot be answered at all. This
  is why finding 2's exploitation question is unanswerable rather than merely unanswered.
- `require_super_admin` accepting a client token meant `SUPER_ADMIN_SLUG` (an env-configurable
  string, default `"smar"`) was load-bearing for authorization. It no longer is.

---

## Unknowns

1. **Whether either hole was exploited was NOT established.** No log review, no audit-trail query.
   Absence of evidence only — the same caveat as the webhook finding, and for the same reason.
2. **Salman's own super-admin login was not verified live.** The authorization logic is proven
   against his real user row read from Frankfurt, but signing a production token requires the
   production `SECRET_KEY`, which was not used. What is unverified is whether he knows that
   account's password — not whether the code would accept him.
3. 🔴 **The remaining recovery path currently targets the wrong database.**
   `scripts/create_super_admin.py:26-29` promotes `DIRECT_URL` to `DATABASE_URL` "for writes", and
   local `.env`'s `DIRECT_URL` still points at **Sydney** (`ap-southeast-2`) while production is
   Frankfurt (`EU_DIRECT_URL`). Now that `create-user` is deleted, this script is the only
   break-glass — and as written it would succeed silently against the retired database. Same class
   as [[credential-rotation-reaches-all-consumers]]. **Not fixed here; flagged for decision.**

---

## Recommendation / Decision / Execution

- **Recommendation:** close 1 and 2 by making the DB the authority and dropping the client branch;
  on 3, keep a break-glass but move it off the JWT signing key.
- **Decision:** Salman, 2026-09-07 — do 1 and 2; **delete** `create-user` outright rather than
  re-key it. Separately: he wants a `SUPER_ADMIN` account for the bo-hussein agent to run
  pre-release verification. Finding 1's fix is what makes that grantable safely — revocation now
  takes effect on the next request instead of up to 24h later.
- **Execution:** `f4c3fe1`, pushed and deployed; live-verified above.

# Legacy `/:slug/admin/*` Route — Architecture Investigation

**Date:** 2026-08-07
**Type:** Investigation only, per Salman's explicit instruction — **not a bug fix, not a
recommendation to remove or redirect anything.** This report answers his four stated questions
with real evidence and stops there; the disposition is his call.

**Salman's four questions:**
1. هل يستخدمه أحد فعليًا؟ (Is it actually used?)
2. هل هو خاص بـ smar فقط؟ (Is it smar-specific only?)
3. هل يوجد deep links تعتمد عليه؟ (Are there deep links depending on it?)
4. هل يمكن تحويله إلى redirect؟ أم يجب أن يبقى؟ (Redirect candidate, or must it stay?)

---

## 1. Is it actually used? — Yes, confirmed, two real call sites

- **`frontend/src/pages/auth/SSOLoginPage.jsx:56-57`** — `resolveRedirect()`'s "Active / demo
  tenants" branch constructs `https://{slug}.salmansaas.com/admin?token=` (prod) /
  `http://localhost:5173/{slug}/admin?token=` (dev) directly. This is the SSO login flow served at
  `demo.salmansaas.com/login`.
- **`frontend/src/pages/showcase/pages/RegistrationPage.jsx`** — used it too, until today's fix
  (Item 1, same investigation thread) redirected new registrations here unconditionally.

Not a dead route. Not merely reachable by typing a URL by hand — real application code constructs
links to it.

## 2. Is it smar-specific only? — The route is generic; the destination component is not

`/:slug/admin/*` (`App.jsx:147`) matches **any** slug, no condition. But it always renders
`SmarAdminDashboard` (`frontend/src/pages/smar/admin/SmarAdminDashboard.jsx`), whose own nav is
built around villa/chalet operations — `الوحدات` (Units), `Housekeeping`, `Maintenance`, `Gardens`,
`Action Inbox`, `Page Builder` (confirmed via the file's own tab array, `:226-237`) — meaningless
for a barber shop, restaurant, or store tenant. So: **generic route, tenant-specific destination.**
Any non-smar tenant reaching this route gets a real, functioning admin UI for a completely different
business type.

## 3. Deep links depending on it — Yes, and the finding goes further than the route itself

`.claudedocs/architecture/routing_architecture.md:197-198` documents this as **deliberate,
historical design**, not an accident:
```
client.status = "trial"  → /{slug}/dashboard  (GenericAdminDashboard)
client.status = "active" → {slug}.salmansaas.com/admin  (SmarAdminDashboard)
```
Same doc calls the route "legacy smar admin" at line 39 while *also* prescribing it as the real
destination for "active" (graduated/paying) tenants at line 198 — a real, documented
self-contradiction, not something I'm inferring. This suggests `SmarAdminDashboard` may once have
been intended to become the universal "active tier" dashboard, before `GenericAdminDashboard` (Phase
52, per the same doc) was built as the newer, lighter "trial tier" dashboard — and the "active tier"
side of that plan was never carried forward once `GenericAdminDashboard` matured into what every
tenant actually needs.

**A deeper, currently-live bug surfaced while tracing this**, not something I went looking for —
`SSOLoginPage.jsx`'s trial-vs-active branch is broken by an unrelated schema migration:

- `resolveRedirect(slug, token, status)` (`:41-58`) branches on `status === 'trial'`.
- `handleLogin()` (`:261-263`) and `handleRegister()` (`:281-283`) get `status` straight from the
  login/register API response.
- `app/api/v1/admin/auth.py:122,182` — both `/login` and `/users/login` return
  `status=getattr(client, "status", None)` — the **raw `Client.status` field**.
- `scripts/migrate_lifecycle_state.py` (ADR-0002) already split the old overloaded `status` field
  into two: `status` now means Tenant Status only (`active`/`suspended` — is this tenant blocked or
  not), while the trial/evergreen distinction moved to a **separate field**, `lifecycle_state`. Per
  that script's own migration comment: `status="trial" -> status="active", lifecycle_state="trial"`.
- Consequence: **every tenant's `Client.status` is `"active"` post-migration, trial or not** — the
  login response never returns `"trial"` anymore. `resolveRedirect()`'s `status === 'trial'` check
  can now only ever be false for a *returning* login, so every SSO **login** (not registration)
  takes the "Active" branch → `/{slug}/admin` → `SmarAdminDashboard`, for any tenant, at any
  lifecycle stage.
- **One real path avoids this today, and only one**: `admin/auth.py:394`'s own `/auth/register`
  endpoint hardcodes `"status": "trial"` in its response (since it just created the row itself) —
  so the *immediate* auto-login right after registering via `SSOLoginPage.jsx` correctly reaches
  `GenericAdminDashboard`. Any *later* login attempt by that same tenant, through the same SSO page,
  reads the real (always-`"active"`) DB field and misroutes.
- **Confirmed unaffected**: `frontend/src/pages/admin/Login.jsx` (the plain dev login form,
  `App.jsx`'s `IS_DEMO_SUBDOMAIN ? SSOLoginPage : Login` branch — used throughout every session's
  own testing on localhost/LAN) navigates straight to `` `/dashboard/${slug}/${landing}` `` (`:43`)
  — it never calls `resolveRedirect()` at all. This is why none of this project's own extensive
  local testing has ever surfaced this bug: the SSO flow is only reachable from
  `demo.salmansaas.com`, a domain this session's testing never actually used.

## 4. Redirect candidate, or must it stay? — Not this investigation's call; evidence only

What the evidence supports, without deciding:
- The route pattern itself (`/:slug/admin/*`) is not smar-exclusive by construction — any slug
  reaches it — but its only real destination component *is* smar-exclusive by content.
- At least one currently-real code path (`SSOLoginPage.jsx`'s returning-login branch) depends on it
  and is currently broken for any non-smar tenant, for real, today — not hypothetically.
- No evidence was found of the route being referenced from outside the codebase (marketing copy,
  external docs, third-party integrations) — searched `.claudedocs/`, `.claude/`, and every `.jsx`/
  `.js` file; the only real call sites are the two named above.
- Two shapes a redirect fix could take, presented as evidence for Salman's decision, not a
  recommendation: (a) `/:slug/admin/*` could redirect to `/:slug/dashboard/*` outright, closing the
  gap for every consumer at once, including the SSO returning-login bug; or (b) `SSOLoginPage.jsx`'s
  own `resolveRedirect()` could be fixed to read `lifecycle_state` instead of `status`, leaving the
  route itself untouched for whatever `SmarAdminDashboard` still genuinely needs it for (if
  anything). These are not mutually exclusive and neither is executed here.

---

## Confirmed Findings

- `/:slug/admin/*` (`App.jsx:147`) has exactly two real call sites in this codebase:
  `SSOLoginPage.jsx:56-57` (still live) and `RegistrationPage.jsx` (fixed today, Item 1).
- `SmarAdminDashboard.jsx:226-237`'s own tab list is villa/chalet-specific — confirmed by reading
  the array directly, not inferred from the component's name alone.
- `.claudedocs/architecture/routing_architecture.md:39` calls the route "legacy" while
  `:197-198` of the same file simultaneously documents it as the real destination for "active"
  tenants — a real, self-contradictory prior design record, read directly.
- `app/api/v1/admin/auth.py:122,182` — both login endpoints return the raw `Client.status` field.
- `scripts/migrate_lifecycle_state.py` confirms `Client.status` was split from the old
  trial/demo/active/suspended overload into Tenant Status only, with `lifecycle_state` now owning
  the trial/evergreen distinction — read the script's own header comment directly.
- `admin/auth.py:394` hardcodes `"status": "trial"` in the `/register` response, which is why
  post-registration auto-login avoids the otherwise-broken check.
- `frontend/src/pages/admin/Login.jsx:43` navigates to `/dashboard/{slug}/{landing}` directly,
  never calling `resolveRedirect()` — confirmed unaffected by this bug.

## Side Findings

- `SSOLoginPage.jsx`'s `/register` posts to `/api/v1/auth/register` (`admin/auth.py`'s own
  `register_tenant()`), while `RegistrationPage.jsx`'s `/register` posts to `/public/register`
  (`registration_service.py`'s `register_new_tenant()`) — two different route wrappers, but
  confirmed (by reading `admin/auth.py:365`) that the first one calls the exact same
  `registration_service.register_new_tenant()` underneath — **not** a second independent
  registration implementation, just a thinner wrapper that also auto-issues a JWT and cookie. Worth
  knowing, not investigated further — out of this investigation's declared scope (routing, not
  registration-endpoint duplication).
- Salman's earlier redirect fix (Item 1, `RegistrationPage.jsx`) and this SSO bug are two
  **independent** real causes of the same symptom class ("new/returning tenant lands on the wrong
  dashboard") — per `investigation-protocol.md`'s "Independent Causes Are Allowed" section, neither
  explains the other, and fixing one does not fix the other.

## Unknowns

- Whether any real tenant today actually has `lifecycle_state` beyond `"trial"` (i.e., has any
  tenant genuinely reached an "evergreen"/paying stage where the *original* trial-vs-active design
  intent would even apply) was not checked against the live database — this investigation is a code
  read, not a DB query. If no tenant has ever left "trial," this bug has had zero real customer
  impact so far, only latent risk; if one has, it has already been actively misrouting that
  tenant's returning logins. Flagged rather than assumed either way.
- Whether `SmarAdminDashboard` is still genuinely needed by anyone as a smar-only surface (i.e.,
  whether smar itself should keep using it, separate from the routing question) was not evaluated —
  out of this investigation's scope, which was the route's disposition for *other* tenants, not
  smar's own admin experience.

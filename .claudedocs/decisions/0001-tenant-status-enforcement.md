# ADR-0001: Tenant Status Enforcement

**Status:** **Closed — fully implemented and verified.** All business decisions resolved (§8, including §8.4a's conflict, closed 2026-07-18). All 6 implementation items executed and verified with real database evidence: `app/core/tenant.py` (`_assert_client_active`, `is_status_blocked`, `resolve_tenant_status`, `assert_client_active`), `app/services/security_audit_service.py` (new), the 7 public endpoints in `app/api/v1/public/__init__.py`, `app/api/v1/webhooks/samsara.py`, `app/services/whatsapp_flow.py`, and `app/api/v1/ai_settings_agent.py` (§8.3, added in a follow-up pass — see correction note below). No open items remain.

**Correction (2026-07-18, post-implementation review):** this ADR was first declared closed while `ai_settings_agent.py` still had zero status enforcement, despite §8.3 explicitly deciding it should be full-stop. That was an oversight, not an intentional exclusion — the file had been correctly excluded from the *original* implementation pass only because §8.4a was unresolved at the time; once §8.4a closed, circling back to implement §8.3's already-made decision was missed. A Post-Implementation Review caught this before archiving. The fix (mirroring the same pattern used everywhere else in this ADR) is now implemented and verified — see the Decision Log entry under §8.3.

Next work (tenant lifecycle, trials, billing, self-registration) is explicitly a separate document (ADR-0002), not a continuation of this one.
**Date:** 2026-07-17 (proposed) — decided 2026-07-17 — closed 2026-07-18 — corrected/re-verified 2026-07-18
**Deciders:** Platform owner
**Supersedes:** none
**Related:** Security review Finding 4 (Broken Access Control — `.claude/plans/we-moved-on-new-hazy-barto.md`), Finding 2 (7 public endpoints bypass `get_current_tenant`)

---

## 1. Context

`Client.status` (`String`, default `"trial"`, valid values `active | trial | demo | suspended | expired`) can be set by a super admin via `PATCH /clients/{id}/status`, but **no code path anywhere in the request lifecycle reads it**. A tenant marked `"suspended"` continues to have full, unrestricted API access — the control the platform believes it has does not exist.

Investigation for this ADR surfaced additional facts not captured in the original security review:

- A **second, older field**, `Client.isActive` (`Boolean`, default `true`), already exists and is checked in exactly one place: `admin/auth.py:103`, at client login only, returning `403` if false.
- `update_client_status()` (`app/repositories/super_repo.py:13-16`) writes **only** `status` — it never touches `isActive`. The two fields are **completely unsynchronized**. Marking a tenant `"suspended"` today does not flip `isActive`, so even the one existing check (login) would not catch it.
- Cache invalidation is already correctly wired: `update_client_status()` calls `invalidate_tenant_cache(slug)`, so the 5-minute in-process TTL cache in `tenant.py` is **not** a blocker to real-time enforcement once a check is added.
- Tenant/auth resolution is not a single function today. Four independent paths exist:
  1. `get_current_tenant()` / `_verify_tenant()` — used by 16 files spanning most of `public/` and `admin/`.
  2. `get_current_admin_user()` — used by 6 admin files; already loads the related `Client` via `include={"client": True}`.
  3. `get_current_client()` — a thin wrapper delegating to `get_current_tenant()`; used only by `public/__init__.py`'s `/catalog/...` routes.
  4. Ad hoc, webhook-specific auth in `ai_settings_agent.py` (shared-secret header) and `webhooks/samsara.py` (HMAC signature) — both resolve the client via their own raw Prisma lookups and **do not** go through any of the above.
- Separately, 7 endpoints in `public/__init__.py` (`get_tenant_config_by_slug`, `get_listings_by_slug`, `create_booking_by_slug`, `get_price_by_slug`, `get_services_by_slug`, `get_unit_gallery`, `get_unit_calendar`) resolve the tenant via `find_active_client_by_slug()` (`app/repositories/public_repo.py:9-13`), a fifth path that filters on `isActive` — not `status`, and not through `_verify_tenant()` either.

The goal of this ADR is to freeze where and how tenant lifecycle state gets enforced, before any implementation begins.

---

## 2. Decision Drivers

- Must not require duplicating a status check into every individual route handler (that's the failure mode that produced today's gap in the first place).
- Must not introduce a new architectural layer (no new middleware framework, no new caching system) beyond composing functions that already exist.
- Must account for the fact that not all traffic is a user session — server-to-server webhooks have a fundamentally different trust model and must be a deliberate, separate decision, not silently swept into a blanket rule.
- Must not silently paper over the `isActive`/`status` desync — an ADR that fixes enforcement but leaves two disagreeing "is this tenant OK" fields in place would reproduce the same class of bug later.
- Real-time effect matters: a suspension should take effect on the next request, not after up to 24h (current JWT lifetime) or up to 5 minutes (cache TTL) — both are addressable, see §5.

---

## 3. Options Considered

### Option A — Global middleware
Add a `CORSMiddleware`-style global middleware that inspects every incoming request, extracts tenant identity, and blocks suspended/expired tenants before routing.

- **Pros:** Runs before every route, no per-router wiring.
- **Cons:** FastAPI/Starlette middleware runs *before* dependency injection and path-param resolution; it would need to reimplement `tenant.py`'s JWT/header/query/subdomain resolution logic independently, creating a second, parallel implementation of tenant resolution that can drift from the first. It also has no natural way to distinguish "this route is a public/admin tenant route" from "this route is super-admin" or "this route is a server-to-server webhook" — applying one blanket policy risks incorrectly blocking the platform-owner's own super-admin tenant or a webhook that was deliberately designed with different auth semantics.
- **Verdict: Rejected.** Wrong layer for a request type that isn't uniform.

### Option B — Service-layer enforcement
Add the status check inside each service function (`booking_service`, `catalog_service`, etc.) before it performs its work.

- **Pros:** Very close to the actual business operation being protected.
- **Cons:** There are dozens of service functions; this is the direct duplication problem the review already flagged as the root cause of Finding 4 (a control that's supposed to exist but doesn't, because it was never centralized). Guarantees future drift — a new service added later will only be protected if its author remembers to add the check.
- **Verdict: Rejected.**

### Option C — Per-route dependency declaration
Add `Depends(require_active_tenant)` explicitly to each route function's signature, one by one.

- **Pros:** Explicit, visible per-route.
- **Cons:** Same duplication risk as Option B, just one layer up — every existing and future route must remember to add it. This is effectively what already happened with `require_service()` (a real, working pattern in this codebase) — but that pattern is enforced by convention and code review, not by construction, and Finding 2 already shows 7 real endpoints where a supposedly-standard dependency was skipped in practice.
- **Verdict: Rejected as the primary mechanism** — not because it's unsafe in principle, but because Finding 2 is itself evidence that "remember to add it per route" doesn't hold up in this codebase over time.

### Option D — Centralized enforcement inside existing tenant-resolution dependencies
Add the check inside the small number of functions that already sit on the request path for the vast majority of traffic: `_verify_tenant()` (covers `get_current_tenant` + `get_current_client`) and `get_current_admin_user()`.

- **Pros:** No new layer. Piggybacks on functions that already run on every request for 16+ admin/public files and 6 additional admin files respectively, with `get_current_admin_user()` needing zero extra DB query (the client is already loaded). Closes at the two highest-leverage points with the smallest change surface. Cache invalidation already works.
- **Cons:** Does **not** automatically cover the 7 `find_active_client_by_slug`-based public endpoints, or the two webhook files — these need explicit, separate handling either way, under every option above too.
- **Verdict: Selected.**

### Option E — Database-level enforcement (e.g., PostgreSQL row-level security / trigger)
Push the check into the database itself — e.g., a `BEFORE` trigger or RLS policy that rejects reads/writes for rows tied to a suspended `clientId`.

- **Pros:** Impossible to bypass from application code, even by a future direct-Prisma call (relevant given Finding 3's layering violations).
- **Cons:** Prisma's connection is a single pooled service-role connection (per `rules/backend/architecture.md`'s `DATABASE_URL`/pooled-connection design) — RLS as commonly implemented depends on a per-request/per-role DB session identity, which this architecture does not currently have. Would require a substantial connection-architecture change, is invisible to application-level error handling (harder to return a clean, tenant-friendly 403 with a helpful message), and represents exactly the kind of new architectural layer this ADR's decision drivers rule out.
- **Verdict: Rejected** — real technique, wrong fit for this stack as currently built. Worth reconsidering only if Finding 3's direct-Prisma layering violations are judged to need a defense-in-depth backstop later.

### Option F — Embed status in the JWT at issuance
Add a `status` claim to the JWT payload at login time; check the claim instead of hitting the DB on every request.

- **Pros:** No per-request DB lookup at all.
- **Cons:** Defeats the purpose. A JWT is a signed, stateless credential — once issued, its claims cannot be revoked short of full token invalidation. A tenant suspended *after* their token was issued would keep a token claiming `status="active"` for up to 24h (the current token lifetime), which is the exact staleness problem this ADR exists to close.
- **Verdict: Rejected.**

### Comparison summary

| Option | New layer? | Duplication risk | Real-time? | Covers webhooks? | Verdict |
|---|---|---|---|---|---|
| A — Middleware | Yes | Low | Yes | No (would need bespoke logic anyway) | Rejected |
| B — Service layer | No | High | Yes | No | Rejected |
| C — Per-route Depends | No | High | Yes | No | Rejected (primary) |
| D — Centralized dependency | No | Low | Yes | No (explicit separate decision) | **Selected** |
| E — DB-level (RLS/trigger) | Yes | None | Yes | Yes (if applied uniformly) | Rejected (stack mismatch) |
| F — JWT claim | No | Low | **No — stale by design** | No | Rejected |

---

## 4. Decision

**Adopt Option D.** Add a single shared check — a function such as `_assert_client_active(client) -> None`, raising `HTTPException(403)` for `status in {"suspended", "expired"}` — defined once in `app/core/tenant.py`, and call it from exactly two places:

1. Inside `_verify_tenant()`, immediately after the existing `find_unique` lookup and before the result is cached. Covers `get_current_tenant()` and, transitively, `get_current_client()`.
2. Inside `get_current_admin_user()`, using the `client` relation already loaded via `include={"client": True}` — no additional query.

This is not literally "one function" but a small, closed, already-well-understood set of two call sites — the closest realistic approximation of a Single Source of Truth given that tenant resolution in this codebase is not itself unified into one function today (see §5 for what "SSOT" means precisely here).

Two further actions are **required for this decision to be complete**, not optional follow-ups:

- The 7 `find_active_client_by_slug`-based endpoints (Finding 2) must be migrated onto `get_current_client()` (or gain the same explicit check after their existing lookup) — otherwise they remain permanently unprotected regardless of this decision.
- The `isActive`/`status` desync (§1) must be resolved — see §5.

---

## 5. Single Source of Truth

**`Client.status` is the sole source of truth for tenant lifecycle/access state going forward.**

`Client.isActive` is **not** part of the enforcement SSOT. It is a legacy field whose original intent is unclear from the code alone (possibly a soft-delete flag, possibly an earlier, simpler version of what `status` now models) and it has already drifted out of sync with `status` in practice. Two paths forward, **requiring a human decision** (see §8):

- **(a) Recommended:** Deprecate `isActive` as an independently-writable field; either remove it or make it a computed/derived property (`isActive := status in {"active", "trial", "demo"}`) so it can never diverge from `status` again. Existing readers (`admin/auth.py`'s login check, `whatsapp_flow.py`, the migrated public endpoints) then implicitly get correct behavior for free.
- **(b)** If `isActive` in fact represents a genuinely distinct concept product wants to keep (e.g., "onboarding completed" vs. "billing status"), keep both fields but document the distinction explicitly and audit every current reader to confirm it's reading the field it actually means to.

This ADR does not decide between (a) and (b) — that requires confirming original intent, which is a product/business question, not something inferable from the code.

---

## 6. Behavior by Traffic Category

| Category | Resolution path today | Enforcement after this ADR | Notes |
|---|---|---|---|
| **Public (unauthenticated, slug/subdomain-based)** | Mostly `get_current_tenant()`; 7 endpoints via `find_active_client_by_slug()` | Covered via `_verify_tenant()`, **after** the 7 endpoints are migrated (§4) | A suspended tenant's public booking/listing pages should stop working too — this is customer-facing, revenue-generating traffic; arguably the most important surface to actually block. |
| **Authenticated (admin dashboard)** | `get_current_tenant()` (16 files) or `get_current_admin_user()` (6 files) | Covered by both call sites in §4 | No extra query cost via `get_current_admin_user()`. |
| **Super admin** | `require_super_admin()` — does not call `_verify_tenant()` or `get_current_admin_user()` | **Explicitly exempt** | The platform-owner tenant (matching `settings.SUPER_ADMIN_SLUG`) must never be locked out by its own status field — this must be a deliberate, documented exemption, not an accidental gap. |
| **AI endpoints** (`ai_settings_agent.py`, WhatsApp-driven settings changes via n8n) | Shared-secret header; raw `prisma_client.client.find_first()` | **Full stop** for `suspended`/`expired` — decided §8.3, **implemented and verified 2026-07-18** (`assert_client_active()` call right after the client lookup, before `_run_claude_agent`). | Treated as interactive use of a paid feature relayed through n8n, not passive external data — §8.4a resolved the apparent conflict with the general webhook test by refining that test (see §8.4a), not by exempting this file. |
| **Server-to-server webhooks** (`webhooks/samsara.py`, fleet tracking) | HMAC signature; raw client lookup | **Two-tier — decided §8.4:** the HTTP endpoint still accepts/acknowledges and stores the incoming event regardless of tenant status; only the *downstream processing* that would change the tenant's application data or trigger policy-gated actions is blocked for `suspended`/`expired`. | Prevents data loss/retry storms from the external system (Samsara's hardware keeps generating events regardless of the tenant's subscription state) while still stopping suspended tenants from deriving live functionality from the platform. |
| **WhatsApp inbound webhook** (`app/api/v1/webhook.py` → `whatsapp_flow.handle_incoming_message`) | No auth dependency shown in this ADR's investigation; separate from `ai_settings_agent.py` | **Decided 2026-07-17 (§8.4a): follows the same two-tier webhook policy as Samsara.** | Resolved via the general test in §8.4a: **who initiates the connection?** WhatsApp/Meta → this server, no live user session involved — Webhook. |

For the rows above with a defined policy: implementation calls the same shared check from §4 (or, for the two-tier webhook case, calls it at the point where an event would trigger a data-changing action, not at the initial ingestion point) — technically small either way; the substance was the business decision, not the mechanism.

---

## 7. Backward Compatibility Risks

- **Existing valid sessions for already-suspended/expired tenants (if any exist in current data) will start being rejected immediately** once deployed, thanks to the cache-invalidation path already working correctly (§1) — this is the intended effect, but should be treated as a real behavior change to communicate, not a silent side effect. **Recommend auditing current production data for any existing `status IN ('suspended','expired')` rows before deploying**, so there are no surprised legitimate tenants.
- **No confirmed frontend handling exists (unverified) for a suspension-specific error response.** A previously-working authenticated session suddenly receiving a new `403` needs a coherent user-facing message (e.g., "your subscription has expired — contact billing" vs. a generic error page). This should be verified/built before shipping, not discovered after.
- **The `isActive` deprecation path (§5) touches existing readers** — `admin/auth.py`'s login check, `whatsapp_flow.py`'s `find_many(where={"isActive": True})` calls — these need to be migrated in the same change or explicitly scheduled, or the codebase ends up with three inconsistent notions of "active" instead of two.
- **Token lifetime (24h) means a tenant suspended mid-session keeps their existing token's *signature* valid**, but the fix in §4 checks the live DB record on every request via `_verify_tenant()`/`get_current_admin_user()` — not the JWT's embedded claims — so this is not actually a residual gap. Confirmed by design (see Option F's rejection).

---

## 8. Decisions (resolved 2026-07-17, platform owner)

### 8.1 — Suspended tenant
**Decision:** Blocks all interactive use of the system. No exceptions.
**Reason:** This is the definition of "suspended" — a partial block would make the status meaningless.

### 8.2 — Expired tenant
**Decision:** Blocks usage, with reactivation possible after payment.
**Reason:** Standard SaaS lifecycle behavior. **Implication for §7:** since the path back to `active` differs (billing/payment-driven) from a suspended tenant's path back (presumably support-mediated), the user-facing error message should likely differ between the two statuses even though the underlying block mechanism is identical — e.g., an `expired` response should point toward billing/renewal, a `suspended` response toward support. The exact copy is a follow-up UX task, not decided here, but the *mechanism* must be able to carry a status-specific message (see §9).

### 8.3 — AI Endpoints
**Decision:** Stop entirely if the client is `suspended` or `expired`.
**Reason:** This is part of the paid service — a suspended/expired tenant should not be able to keep using a feature (WhatsApp-driven settings changes) that's gated behind an active subscription. Updates §6's AI-endpoints row from "not covered" to "full stop."
**Implementation status:** Decided 2026-07-17; **implementation was missed** in the original pass (excluded pending §8.4a, then not circled back to once §8.4a closed) — caught by a Post-Implementation Review, implemented and verified 2026-07-18. `app/api/v1/ai_settings_agent.py` now calls the new public `assert_client_active(client, endpoint=...)` (a thin raising alias for `_assert_client_active`, added specifically for synchronous request handlers that already hold a fetched `Client` object) immediately after the client lookup, before any Claude call or DB write. Verified: active tenant reaches `_run_claude_agent` unchanged (0 audit rows); suspended tenant is rejected with a real `403` before `_run_claude_agent` is ever called (exactly 1 audit row, `event_type=tenant_suspended`, correct `endpoint`).

### 8.4 — Webhooks
**Decision:** Continue receiving/accepting events, but do not execute operations that change the tenant's data except per policy.
**Reason:** Losing external events (e.g., Samsara fleet telemetry) risks losing data the tenant may need later once reactivated; the hardware/external system doesn't know or care about the tenant's billing state. Updates §6's webhooks row to the two-tier model already reflected there.

### 8.4a — General test for "is this a Webhook?" (resolved 2026-07-17, refined and closed 2026-07-18)
**Original decision rule:** *who initiates the connection?* External system calling in (WhatsApp, Meta, n8n, Samsara) → Webhook, §8.4's two-tier policy. A user clicking something inside the system, or an AI agent acting on the user's behalf → Application Endpoint, interactive-use policy.

**Applied to `app/api/v1/webhook.py`** (WhatsApp inbound, Meta → server): classifies cleanly as a Webhook under this rule. **Decided: follows §8.4 (two-tier).**

**Applied to `ai_settings_agent.py` — conflict identified 2026-07-17, resolved 2026-07-18:** the literal connection-initiator test (n8n calls in) would place this file under §8.4's two-tier policy too, conflicting with §8.3's explicit full-stop decision for the same file.

**Resolution: §8.3 stands, and the general rule is refined rather than overridden.** The connection-initiator test alone is insufficient — it conflates two genuinely different things: *who makes the HTTP call* and *whose intent the payload represents*. Samsara's hardware and Meta's WhatsApp platform are autonomous external systems generating their own data; n8n calling `ai_settings_agent.py` is purely a transport/routing layer relaying a live tenant's own direct request to change their own paid-feature settings — n8n has no data of its own here, it is not the source of intent, the tenant is. The refined rule:

> A request is a **Webhook** (§8.4, two-tier: always accept/log, gate only the data-mutating step) when the external caller is the *origin* of the data or event. A request is an **Application Endpoint** (interactive-use policy, e.g. §8.3's full stop) when the external caller is merely *relaying* a live tenant's own direct, intentional request to use a paid feature — regardless of which system technically makes the HTTP call.

Under this refined rule, `ai_settings_agent.py` correctly and non-arbitrarily stays full-stop (§8.3 reaffirmed, not a special-cased exception) — this matches the platform owner's own original reasoning for §8.3 ("هي جزء من الخدمة المدفوعة" — it's part of the paid service) more precisely than the original literal test did. **§8.4a is now closed — no remaining conflict.**

### 8.4b — `whatsapp_flow.py` finding (discovered 2026-07-18 during Step 4 verification, folded into §8.4's scope per platform owner's explicit direction)
`_resolve_client()` (called from `handle_incoming_message()`, the actual body of the `webhook.py` flow already decided as two-tier in §8.4a) filters `Client.isActive` when matching an inbound WhatsApp message's phone number to a tenant — completely independent of `status`. Two distinct problems, not one:
1. **Under the two-tier policy's "always accept" half**, filtering the lookup by `isActive` at all is wrong in principle — a client with `isActive=False` wouldn't even be *found*, meaning the message is silently unrouted, not "accepted but gated." **Fix:** drop the `isActive` filter from this lookup entirely — find the client by phone number alone.
2. **Nothing currently gates the mutating half** of the conversation flow (`_dispatch()` → the stateful `_step_*` handlers, which can create bookings/customers) for suspended/expired tenants. **Fix:** add the same centralized status check immediately after `_resolve_client()` succeeds in `_dispatch()`; if blocked, log the security event and return before entering the state machine — the webhook's outer HTTP layer still always returns 200 to Meta, unaffected (already true today, per `handle_incoming_message`'s own docstring).

This is implementation work for Step 5 (§8.4's execution), not a new architectural decision — the policy (two-tier for webhook.py) was already decided in §8.4a; this just applies it correctly to a call site that was missed in the original Finding-2-scoped review.

### 8.5 — Super Admin
**Decision:** Always exempt.
**Reason:** The platform must never be able to lock out its own owner. Confirms the exemption already documented in §6 — no change needed there, now formally decided rather than just recommended.

### 8.6 — `isActive`
**Decision:** Begin a gradual phase-out; `status` becomes the sole source of truth.
**Reason:** Prevents recurrence of the exact desync bug that motivated this ADR (§1). "Gradual" implies a migration path — e.g., first make `isActive` a computed property mirroring `status` (removing it as an independently-writable field, per Option (a) in §5) while leaving the column in place for any external readers, then remove the column entirely once nothing depends on it being physically present. This resolves §5's open (a)/(b) question in favor of (a).

### 8.7 — Grace Period / Alerts
**Decision:** Add a grace period and notifications before a tenant is converted to `expired`.
**Reason:** Better user experience, fewer support tickets from tenants surprised by a sudden cutoff.
**Scope note:** This describes a grace period **upstream of this ADR** — in whatever process decides to transition a tenant's status to `expired` in the first place (a billing/subscription-lifecycle concern not yet built, per this investigation's evidence — no such automation was found in the codebase). It does **not** mean enforcement should be delayed once `status` already reads `expired`; consistent with §8.1/§8.2, once the status is set, blocking is immediate (the grace period already happened before that point). Flagged as a related, separate future need — not part of this ADR's implementation scope.

### 8.8 — Audit Log (expanded 2026-07-17: general Security Audit Log, not tenant-status-only)
**Decision:** Yes, and broader than originally proposed. Not a `TenantAccessDenial` log — a general **Security Audit Log** covering (non-exhaustive, extensible): authorization denied, tenant suspended, invalid signature, login failures, admin actions, security policy violations.
**Reason:** A single security-event trail is more useful for investigations than a narrow one that would need a sibling table for every other denial type discovered later.
**Retention:** 90 days online (queryable), then archive or delete per future project needs — not "forever." **Not decided here:** the exact archive mechanism (separate cold-storage table? export to file? just delete?) — implementation-level detail.
**Deduplication:** **Explicitly rejected.** Every event gets its own row, including a malfunctioning integration sending 50,000 requests — that volume is itself a security signal worth preserving, not noise to suppress at the write layer. Any noise reduction (rate-limited alerting, rollups, etc.) belongs in a reporting/monitoring layer read from the raw log, never by dropping or merging raw rows at write time.
**Technical note (verified, not yet implemented):** No existing general-purpose audit-log table exists in the schema — `SamsaraEvent` is fleet-specific and not reusable. Requires a **new** Prisma model. Given the broadened scope, the originally-specified field set (`clientId`, `status`, `endpoint`, `reason`, `requestId`) is tenant-status-denial-specific and needs generalizing for other event types (e.g., a login failure has no `status`; an invalid-signature event may have no resolvable `clientId` yet) — see §10 for a revised field sketch.

---

## 9. Consequences

- **Positive:** Closed Finding 4 with a small, closed change surface, consistent with how the codebase already centralizes tenant resolution rather than duplicating it. Established `status` as the unambiguous SSOT (§8.6) across every code path touched by this ADR. All business questions resolved (§8.1-§8.8, including §8.4a's conflict). One new database table (§10), no new framework/middleware. Every decision made was actually implemented and verified with real database evidence — including one gap (§8.3/`ai_settings_agent.py`) caught by a Post-Implementation Review and closed before archiving, rather than silently left as a decided-but-undone item.
- **Negative / follow-up work (technical debt, not blocking archive):** `Client.isActive` phase-out (§8.6) has not started — `admin/auth.py`'s login check still reads it live; `find_active_client_by_slug()` is now dead code; status-specific user-facing error message copy (§8.2) is generic, not UX-reviewed; `SecurityAuditLog` retention/archival (§8.8's 90-day policy) and a `requestId` convention (§10) are both undesigned; frontend handling for the new `403` responses is unverified. None of these contradict or undo what this ADR decided — they're scoped-out follow-ups.
- **Explicitly out of scope for this ADR, deferred to future work:** the upstream grace-period/notification mechanism (§8.7 — belongs to a not-yet-built subscription-lifecycle system, natural fit for ADR-0002); Option E (DB-level RLS enforcement) as defense-in-depth for Finding 3's layering issues, a possible future security ADR; Finding 3's broader review of ~17 direct-Prisma call sites, unrelated to tenant status specifically.

---

## 10. Security Audit Log — Design Note (not implementation)

Per §8.8 (general scope, 90-day retention, no dedup), a new table is needed. Sketch only — exact schema/migration is implementation work, not part of this ADR:

- **New Prisma model**, tentatively `SecurityAuditLog`, generalized beyond the original tenant-status-only field set:
  - `id`, `timestamp` (`@default(now())`)
  - `eventType` (enum/string — e.g., `tenant_suspended`, `authorization_denied`, `invalid_signature`, `login_failed`, `admin_action`, `policy_violation`; extensible without a schema change if stored as `String`)
  - `clientId` (**nullable** — some event types, e.g. an invalid-signature webhook call, may not resolve to a known tenant at all; FK **not** cascade-deleted with the tenant, so history outlives the tenant record)
  - `endpoint` (route/path)
  - `detail` (free-text or JSON — replaces the narrower `status`/`reason` pair from the original spec, since different event types carry different relevant detail — e.g. `{"status": "suspended"}` for a tenant-status denial, `{"reason": "bad_hmac"}` for a webhook signature failure)
  - `requestId` (**not yet confirmed whether a request-ID convention already exists anywhere in this codebase** — needs checking before implementation; if none exists, this field either needs one introduced or should be dropped from v1)
  - `actor` (nullable — a `userId`/`clientId`/`"system"` distinction, since admin actions have a human actor and webhook denials don't)
- **Write point:** for the tenant-status case specifically, the shared check introduced in §4 (`_assert_client_active`) is the natural place to emit a row before raising `403` — centralizes the audit trail the same way enforcement itself is centralized. Other event types (login failures, invalid signatures) would write from their own existing check points; this ADR only mandates centralizing the *tenant-status* case, since that's its scope — wiring every other listed event type into this table is follow-up work, not blocking this ADR's closure.
- **Retention mechanism** (90-day online + archive/delete, per §8.8): not designed here — implementation-level detail (a scheduled job, a Postgres partition/TTL approach, etc.).
- **No deduplication at write time** (§8.8) — confirmed, carried into this design.

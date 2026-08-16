# P0 — Provisioning Domain-Objects Wipe Guard — Proposal

**Status:** Proposal only. **No code changed. No endpoint run. No tenant re-provisioned. No data
deleted or modified. No migration. No commit.** Per Salman's explicit instruction, 2026-08-16.

---

## 1. The current destructive path — exact route, and why `None` bypasses the guard

**Full path, API → Service:**

```
POST /api/v1/admin/provisioning/domain-objects           (app/api/v1/admin/provisioning.py:47-76)
  → provisioning_service.provision_vertical_domain_objects()   (app/services/provisioning_service.py:137-206)
      → barber_repo.delete_barbers_by_client(client_id)         (line 191)
      → admin_catalog_repo.delete_categories_by_client(client_id) (line 192, app/repositories/admin_catalog_repo.py:75)
      → provision_barber_domain(client_id, staff_name, services)  -- recreates from REQUEST BODY data
```

**The exact guard today** (`provisioning_service.py:160-164`):

```python
if client.provisioningStatus == "complete":
    return await _current_domain_state(client_id)   # idempotent no-op
```

This is the **only** check standing between a call and the destructive path. It is an
**equality check against one specific value** (`"complete"`) — everything else, including
`None`, falls through. `RK`, `Ali`, and `alzabt-demo` all have `provisioningStatus = None`
(confirmed live this session) — `None != "complete"` is true, so execution proceeds straight into
`claim_provisioning()`, which **also** passes for `None` (its own WHERE clause is
`provisioningStatus: {"not_in": ["provisioning", "complete"]}` — `None` is not in that list
either), and then into the delete-then-recreate path.

**Why this is different from the retry-safe provisioning the Contract actually intends**: the
delete-then-recreate design (`ALZABT_UNIFIED_PROVISIONING_CONTRACT_FINAL.md`,
`ALZABT_PHASE3_FINAL_CONTRACT.md`) was built for exactly one real caller shape — a tenant created
*through* `registration_service.register_new_tenant()`, which **always** sets
`provisioningStatus = "pending"` at creation for any tenant with a resolved vertical
(`registration_service.py:143-148`, confirmed by direct read). `None` was never a state that
flow produces. It only exists today because three tenants were backfilled with `vertical='barber'`
*without* ever passing through this mechanism (`bb27ebc`, 2026-08-14, explicit, deliberate,
`service_type`/`provisioningStatus` left untouched by design) — and, independently, because Demo
Builder's own tenants (`alzabt-demo` and any future one) get their Barber domain objects from a
**different, lower-level function** (`provision_barber_domain()`, called directly by
`demo_service.py`) that never touches `provisioningStatus` at all (documented in
`provisioning_service.py`'s own module docstring: "Demo Builder remains Demo Builder's own direct,
non-orchestrated call"). `None` is not an oversight in one place — it is the natural resting state
of *every* tenant that has real Barber domain objects but reached them through a path other than
this one orchestration function.

---

## 2. The safety invariant this proposal establishes

> **No call to `provision_vertical_domain_objects()` may enter the destructive
> delete-then-recreate path for a tenant unless that tenant's own `provisioningStatus` explicitly
> and currently records an active, orchestration-owned, incomplete provisioning attempt.**
>
> Absence of that explicit state (`None`) — no matter how plausible-looking the request — is
> never read as permission. It is read as "this tenant's real state, with respect to *this*
> mechanism, is unknown," which must resolve to refusal, not to the most destructive available
> action.

This reframes the bug precisely: it was never "we forgot to handle `None`" — it is that the guard
was written as a **blocklist** (reject one known-bad value, `"complete"`) instead of an
**allowlist** (accept only known-good values). A blocklist is safe only until a new unaccounted-for
state appears — which is exactly what happened, twice, independently (legacy backfill and Demo
Builder). An allowlist is safe against any state it wasn't explicitly told to trust, by
construction — including states that don't exist yet.

---

## 3. The four real tenant states, named explicitly (not assumed)

| State | `provisioningStatus` | Real example | Should the destructive path run? |
|---|---|---|---|
| New tenant, provisioning not yet attempted | `"pending"` | Any tenant self-registered through `registration_service.py` with a resolved vertical, before Step 1.5 succeeds | **Yes** — this is the mechanism's own real, intended case |
| Provisioning attempted, failed | `"failed"` | Same flow, after a genuine transient failure (set by `provisioning_service.py`'s own `except` block) | **Yes** — this is the documented retry case |
| Provisioning complete | `"complete"` | Same flow, after success | **No** — already handled, unchanged by this proposal |
| **Legacy / out-of-band tenant with real production data** | `None` | **RK**, **Ali**, **`alzabt-demo`** — real `Barber`/`CatalogService`/`BarberService` rows exist, created either by direct historical seeding (RK) or by Demo Builder's own separate `provision_barber_domain()` call (`alzabt-demo`, and any future Demo Builder tenant) | **No — this is the gap.** `None` here does not mean "safe to provision," it means "this tenant's relationship to *this specific mechanism* was never established, while its relationship to real domain data very much was." |

Note the fourth row is not "RK specifically" — it is a **structural category**: any tenant whose
Barber domain objects were created by `provision_barber_domain()` directly (Demo Builder's path)
rather than through `provision_vertical_domain_objects()` (the orchestration this endpoint calls)
lands in exactly the same `None` state, indistinguishable from RK's. This is why the fix must be a
state-based invariant, not a special case for three hardcoded tenant IDs.

---

## 4. Recommended fix — smallest safe change, allowlist at both layers

**Two coordinated, minimal edits — no new files, no schema change, no migration:**

### 4a. `app/services/provisioning_service.py` — explicit eligibility check (clarity + early exit)

Insert immediately after the existing `"complete"` check (after line 164), before
`claim_provisioning()` is ever called:

```python
if client.provisioningStatus not in ("pending", "failed"):
    raise BusinessLogicError(
        f"Client '{client_id}' is not in a provisioning-eligible state "
        f"(provisioningStatus={client.provisioningStatus!r}). Domain-object provisioning only "
        f"applies to a tenant created through the Unified Provisioning Contract's own "
        f"registration flow, in a pending or previously-failed state -- not a tenant whose "
        f"domain objects already exist through a different path."
    )
```

A tenant reaching this line with `provisioningStatus=None` (or any other unexpected future value)
gets a clean, explicit `4xx` error instead of silent destruction — same response shape every other
`BusinessLogicError` in this codebase already produces, no new error-handling pattern introduced.

### 4b. `app/repositories/admin_client_repo.py` — tighten `claim_provisioning()`'s own WHERE clause (real enforcement, same atomicity)

Change the conditional `UPDATE`'s condition from a blocklist to an allowlist — same single
statement, same atomicity guarantee Phase 3.6 already proved closes the concurrency race, now
also closing the state gap in the identical operation (no new read-then-write window introduced):

```python
# Before:
"provisioningStatus": {"not_in": ["provisioning", "complete"]},
# After:
"provisioningStatus": {"in": ["pending", "failed"]},
```

**Why both layers, not just one**: 4a gives a clear, specific error message the moment the real
cause is state-ineligibility (good UX for whoever calls this next, including future you). 4b is
the actual enforcement boundary — even if 4a were ever bypassed, edited incorrectly, or a future
caller skipped it somehow, the atomic claim itself would still refuse to transition a `None`-status
row. Defense at both the readable-error layer and the atomic-correctness layer, matching how this
codebase already treats `require_service()` (clear error) plus DB-level `clientId` scoping (real
enforcement) as two layers of the same protection, not redundant.

**Why not just "if `None`: return"** (explicitly rejected, per your instruction): a bare `None`
check is a blocklist of exactly one more value — it "solves" today's three known tenants and stays
fragile against the next unaccounted-for state (e.g., if a future migration or a new onboarding
door ever produces a `provisioningStatus` value nobody anticipated, a blocklist trusts it by
default; an allowlist refuses it by default). The allowlist form is the same size, same number of
lines, and closes the actual category of risk, not just today's instance of it.

---

## 5. Alternatives considered, with trade-offs

| Option | Trade-off | Verdict |
|---|---|---|
| **Recommended: allowlist at service + repository layers (§4)** | Zero schema change, zero migration, closes the real category of risk, preserves every existing legitimate caller | ✅ Preferred |
| Bare `if provisioningStatus is None: return` in the service only | Smaller diff, but blocklist-shaped (fragile to future unknown states) and single-layer (no atomic enforcement, a TOCTOU-style gap re-opens under concurrency — the exact class of bug Phase 3.6 already fixed once) | ❌ Rejected |
| New explicit field (e.g. `Client.isLegacyProvisioned` boolean) to mark backfilled tenants | Requires a schema change + a migration/backfill decision for RK/Ali/alzabt-demo — exactly what you asked not to propose unless proven necessary. The allowlist achieves the same safety with zero data change, so this isn't necessary | ❌ Rejected (not needed) |
| Move the check into the route layer (`provisioning.py`) instead of the service | Violates this project's own Routes-have-zero-business-logic rule (`api-rules.md`); also leaves the service function itself unsafe if ever called from anywhere else in the future | ❌ Rejected |

---

## 6. Tenant isolation — explicitly unaffected

`get_current_tenant()`, JWT tenant scoping, `require_roles()`, and the route's own
`client = await admin_client_repo.find_client_by_id(tenant["id"])` (always the JWT's own tenant,
never a request-supplied ID) are **not touched by either edit**. This fix operates entirely on the
already-resolved `client_id`'s own `provisioningStatus` value — it adds a new *reason* to refuse a
request, not a new way to resolve *which* tenant a request applies to. No cross-tenant surface is
created or changed.

---

## 7. Legacy tenants — RK, Ali, alzabt-demo — explicitly addressed, zero data change

All three currently have `provisioningStatus = None` and real domain data. **This proposal does
not write anything to any of them.** Its effect on them is purely behavioral: a call against any
of the three would now be refused with a clear `BusinessLogicError` instead of silently wiping
their real `Barber`/`CatalogService` rows. No backfill, no status assignment, no migration is
proposed here — if `provisioningStatus` for these three is ever deliberately set to something
(e.g., a future decision to mark them `"complete"` for consistency with self-registered tenants),
that is explicitly a **separate, later decision**, same posture the original `service_type`/
`vertical` reconciliation was already given.

---

## 8. Verification plan (after approval + implementation — not run now)

All destructive-path tests below use only throwaway tenants created and deleted for the check,
same convention already established this session (P0.1/P0.2/P1.1's own throwaway-tenant tests) —
**RK/Ali/alzabt-demo are read from, never written to, during verification.**

1. **RK cannot enter the destructive path**: call the endpoint with RK's real JWT and a plausible
   body. Expect a clean `4xx`/`BusinessLogicError`, not `201`. Confirm via direct before/after row
   counts (`Barber`, `CatalogCategory`, `CatalogService` for `clientId=rk`) that **zero** rows
   changed.
2. **A genuinely new, correctly-lifecycled tenant can still provision**: create a throwaway
   self-registered tenant (real `POST /auth/register` with a resolved vertical — `provisioningStatus`
   will be real `"pending"`, not forced), call the endpoint, confirm `201` and real `Barber`/
   `CatalogService` rows created — same evidence shape as Phase 3's own original verification.
3. **Retry of a completed provisioning stays idempotent**: call the endpoint twice for the same
   throwaway tenant; confirm the second call returns the same real state without a second
   delete-then-recreate cycle (row IDs unchanged between calls).
4. **`provisioningStatus=None` alone is no longer sufficient**: on a throwaway test tenant only,
   directly set `provisioningStatus=None` after it already has real domain objects (simulating the
   legacy shape), call the endpoint, confirm refusal — proves the fix by direct construction, not
   only by RK's own coincidental state.
5. **No cross-tenant access**: confirm calling the endpoint with tenant A's JWT never touches
   tenant B's rows — unchanged code path, re-confirmed by inspection, not expected to need a new
   test since nothing in `get_current_tenant()`/`find_client_by_id(tenant["id"])` changes.
6. **No deletion during verification** and **no change to existing Barber data**: explicit
   before/after snapshot of RK/Ali/alzabt-demo's real `Barber`/`CatalogService`/`BarberService`
   row counts and field values, taken immediately before and after the whole verification pass,
   asserted identical.

---

## 9. Regression scope — what this touches, what it explicitly does not

| Path | Affected? | Why |
|---|---|---|
| **Self-Registration** (`registration_service.py`) | No behavior change | Always sets `"pending"` for a resolved vertical today — remains eligible under the new allowlist, unconditionally |
| **Demo Builder** (`demo_service.py`) | No behavior change | Never calls `provision_vertical_domain_objects()` at all — calls `provision_barber_domain()` directly, a function this proposal does not touch |
| **WhatsApp/n8n provisioning** | No behavior change (already unreachable) | `ClientExtract` still has no `vertical` field (known, separate, lower-priority gap) — any tenant from this door has `vertical=None`, so `provisioning.py`'s own existing check (`if not vertical: raise`) already refuses it *before* reaching any code this proposal touches |
| **Unified Provisioning Contract, Phase 1–3.6** | Behavior preserved exactly for its real intended callers (`pending`/`failed`); newly refuses a category of caller (`None`) the Contract's own design was never meant to serve | The retry-safety, atomic-claim, and delete-then-recreate mechanics themselves are unchanged — only the eligibility gate around them is tightened |

---

## 10. Summary

| | |
|---|---|
| **Proposal path** | `.claudedocs/architecture/ALZABT_PROVISIONING_DOMAIN_OBJECTS_P0_WIPE_GUARD_PROPOSAL.md` (this file) |
| **Root cause** | The retry-safety guard is a blocklist (`== "complete"`) instead of an allowlist — `provisioningStatus=None` (the real, structural resting state of any tenant provisioned outside this one orchestration function — legacy-backfilled or Demo-Builder-provisioned) falls through into the destructive delete-then-recreate path unguarded |
| **Safety invariant** | The destructive path may only run when `provisioningStatus` explicitly and currently records an active, orchestration-owned, incomplete attempt (`"pending"` or `"failed"`) — absence of that record is refusal, never permission |
| **Recommended fix** | Allowlist check in `provisioning_service.py` (clear error) + allowlist WHERE clause in `admin_client_repo.claim_provisioning()` (atomic enforcement) — §4 |
| **Alternatives** | Bare `None` check (rejected — blocklist-shaped, fragile, reopens a TOCTOU gap); new schema field (rejected — unnecessary, avoids a data/migration decision this proposal doesn't need to make); route-layer check (rejected — violates Routes-have-zero-logic) |
| **Exact files/lines expected to change** | `app/services/provisioning_service.py` (insert ~6 lines after line 164); `app/repositories/admin_client_repo.py` (change one WHERE-clause value, lines 59-61) |
| **Verification plan** | §8, six checks, all on throwaway tenants except read-only before/after snapshots of RK/Ali/alzabt-demo |
| **Data impact at proposal stage** | **Zero** — no code changed, no endpoint called, no tenant re-provisioned, no data deleted, modified, or migrated |
| **Security impact** | Closes a real P0 data-destruction path reachable by legitimate, correctly-scoped admin credentials against a live production tenant; does not alter authentication, authorization, or tenant-isolation boundaries in any way |
| **Regression impact** | None for Self-Registration, Demo Builder, or WhatsApp/n8n (§9) — the Unified Provisioning Contract's real intended behavior is preserved exactly |
| **Needs explicit approval before implementation?** | **Yes.** |

**Stopping here. No implementation without your explicit go-ahead.**

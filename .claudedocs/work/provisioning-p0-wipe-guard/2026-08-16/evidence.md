# P0 Provisioning Wipe Guard — Evidence

Proposal: `.claudedocs/architecture/ALZABT_PROVISIONING_DOMAIN_OBJECTS_P0_WIPE_GUARD_PROPOSAL.md`
(approved 2026-08-16, with framing correction: **RK and Ali are the real production tenants**;
`alzabt-demo` is Demo Builder / out-of-band, used below only as an architectural data point
confirming the same `provisioningStatus=None` shape exists there too — never treated as a
production tenant in this evidence).

## What changed

Two files, exactly as proposed:
- `app/services/provisioning_service.py` — new eligibility check (allowlist: `"pending"`/`"failed"`
  only), inserted between the existing "complete" no-op and the atomic claim.
- `app/repositories/admin_client_repo.py` — `claim_provisioning()`'s own WHERE clause tightened
  from `not_in: ["provisioning","complete"]` to `in: ["pending","failed"]`.

## Read-only before-snapshot — RK, Ali, alzabt-demo

Taken before any verification call. Real `Barber`/`CatalogService`/`CatalogCategory` rows and
`BarberService` counts, per tenant, `provisioningStatus` confirmed `None` for all three (the exact
condition this fix addresses).

## Live verification — all 6 checks from the proposal

| # | Check | Result |
|---|---|---|
| 1 | RK cannot enter the destructive path | `POST /admin/provisioning/domain-objects` with RK's real JWT → **`400 BUSINESS_RULE_VIOLATION`**: `"Client '...' is not in a provisioning-eligible state (provisioningStatus=None)..."` — not `201` |
| 1b | Same for Ali (also a real production tenant per the correction) | Same `400`, same message, own client ID |
| 2 | A genuinely new, correctly-lifecycled tenant can still provision | Real `POST /auth/register` (`vertical: "barber"`) → real `provisioningStatus="pending"` at creation → `POST /admin/provisioning/domain-objects` → **`201`**, real `barber_id`/`service_ids` created |
| 3 | Retry of a completed provisioning stays idempotent | Same tenant, called again with **deliberately different** `staff_name`/`services` in the body → same `barber_id` returned, new data silently ignored — proves no second delete-then-recreate cycle ran |
| 4 | `provisioningStatus=None` alone is no longer sufficient, proven by direct construction | Same throwaway tenant (already had real domain objects from check #2), `provisioningStatus` force-set to `None` directly in the DB (simulating the legacy/Demo-Builder shape) → called again → **`400`**, same rejection as RK/Ali — not dependent on RK/Ali's own coincidental state |
| 5 | No cross-tenant access | Unchanged code path (`get_current_tenant()`/`find_client_by_id(tenant["id"])` untouched by this fix) — re-confirmed by inspection, consistent with every other route audited this session |
| 6 | No deletion during verification, no change to existing Barber data | After-snapshot of RK/Ali/alzabt-demo taken post-verification, **diffed byte-identical** against the before-snapshot — zero rows changed |

## Data impact

**Zero** on RK, Ali, or alzabt-demo — confirmed by the identical before/after snapshot diff. The
only data created and destroyed during this verification was one throwaway tenant
(`p0wipetest0995`), created via the real `/auth/register` endpoint and fully deleted (Client, User,
ClientService, Barber, CatalogService, CatalogCategory, BarberService — all cascaded/explicitly
removed) immediately after verification completed.

## Regression check

Re-confirmed after implementing: Ali's `GET /admin/catalog/categories` fix (`6a08dec`) and RK's
public config both still return `200` unaffected — this change did not touch either path.

## Result

All 6 verification checks pass. The P0 wipe path is closed for RK and Ali (the real production
tenants) and for alzabt-demo (the architectural data point that proved this isn't a
3-hardcoded-tenants problem), while the real, correctly-lifecycled self-registration flow
(`pending` → `complete`, and `failed` → retry) is proven unaffected by direct, live test — not
only by code inspection.

# Phase 3.6 — Closing the Audit Findings — Evidence

**Scope**: closes exactly Phase 3.5's findings #2 (frontend stuck-state) and #3 (concurrency gap),
plus the two smaller, explicitly-authorized items (TENANT_LIFECYCLE reconciliation, the
page-repertoire no-op hook). P0.1, Section System, and any architecture redesign untouched.

## Impact map (before any edit)

- `POST /auth/register`: exactly one real caller anywhere in the frontend, `TenantRegisterPage.jsx`
  (re-confirmed, unchanged since Phase 3).
- `POST /catalog/seed-from-template`: exactly one real caller, same file (re-confirmed).
- `update_many()` in this Prisma version (0.15.0) returns a plain `int` row count, not an object
  with `.count` — confirmed directly against `reservation_repo.py`'s own already-documented fix for
  the identical behavior, applied correctly to the new `claim_provisioning()` function before it
  was ever run, not discovered by a failing test.

## What was built — the least fix that closes each finding

**#2 (frontend stuck-state)**: `registeredToken` component state (not localStorage — a stale token
from an unrelated session must never be reused for a new registration) — Step 1 is skipped on a
resubmit within the same page load if it already succeeded. `seed-from-template`'s own
`clear_existing` flag flipped `false → true` (Step 3 is this call's one and only real caller,
confirmed by the impact map, so this is a fully isolated, safe change) so a retried Step 3 replaces
rather than duplicates. Step 2 (`PATCH /settings`) needed no change — already a pure overwrite,
naturally safe to repeat.

**#3 (concurrency)**: `admin_client_repo.claim_provisioning()` — one atomic conditional
`UPDATE ... WHERE provisioning_status NOT IN ('provisioning','complete')`, not a read-then-write.
Wired into `provision_vertical_domain_objects()` before any delete/create; a lost claim is resolved
honestly (already-complete → real no-op result; genuinely in-progress → `409 ConflictError`, not a
silent retry into a duplicate).

**Reconciliation with TENANT_LIFECYCLE**: documented directly in `provisioning_service.py`, at the
exact place a future reader would look — `provisioning_status` is stated explicitly as scoped only
to domain-object creation, never a substitute for `tenant-onboarding.md`'s own Completion Gate, and
not silently mergeable into TENANT_LIFECYCLE_PLAN.md's still-unbuilt Onboarding Status without a
real, later, explicit decision.

**Page-repertoire hook**: `apply_page_repertoire()` — a real function, wired into the orchestration
sequence, that reads `VERTICAL_REGISTRY[vertical]["page_template"]` and no-ops (logged) today since
it's always `None`; raises `NotImplementedError` rather than silently doing nothing if a real
template path is ever set before Section System P3 defines what "applying" one means. No template
built — matches the explicit instruction not to.

## Live evidence, this round

**Registration success** (real browser, `beauty-barber`, one staff member + one real service):
unchanged, 201 → `provisioning_status='complete'` → redirect. No regression from any Phase 3.6
change.

**Failure before provisioning completed**: registered a real tenant via the API (Step 1) —
confirmed real state `provisioningStatus='pending'`, zero Barber rows (the honest state after Step
1 alone, no simulation needed). Called `/provisioning/domain-objects` with the **same Step-1
JWT** — succeeded, real Barber + Service created, `provisioning_status='complete'` — **no
`/auth/register` call was ever repeated**, proving the exact resume path Finding #2 required.

**Step 3 retry-safety**: called `/catalog/seed-from-template` twice in a row for the same tenant
with `clear_existing: true`. DB confirmed **exactly 2 categories after both calls**, not 4 — the
second call replaced, not duplicated.

**Concurrent provisioning** — two genuinely simultaneous `curl` requests, same tenant, same JWT,
different data, fired via real shell backgrounding:
```
Request A: 201 Created — real Barber "طلب أ متزامن" + service created
Request B: 409 Conflict — "Provisioning for client '...' is already in progress. Please wait and retry."
```
DB confirmed **exactly 1 Barber, exactly 1 CatalogService** — A's data only, B left zero trace. A
third call (B retrying afterward) correctly returned **A's real result** as an honest no-op, not an
error and not a second attempt.

**No regressions, all re-verified live this round**:
- Demo Builder: unaffected, same 6 placeholder services as every prior round.
- WhatsApp/n8n path: unaffected, `vertical=None`, `provisioning_status=None` (never claimed, since
  the endpoint requires a truthy `vertical` before touching anything).
- RK / Ali / `alzabt-demo`: confirmed untouched — `provisioningStatus=None` (predates this
  mechanism), `vertical='barber'`, real Barber/CatalogService counts identical to every earlier
  round this session.

All test tenants created this round were cleaned up immediately after verification.

## Result

All 8 requested live-test scenarios verified: registration success, failure after Step 1, failure
after provisioning (Step 3's own retry path), resume/retry (both cases), duplicate/concurrent
provisioning, Demo Builder, WhatsApp/n8n, RK/Ali/`alzabt-demo`. Findings #2 and #3 from the Phase
3.5 audit are closed, verified live, not just by code review.

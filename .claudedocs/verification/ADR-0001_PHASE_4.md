# ADR-0001 — Verification: Phase 4 — 7 Public Endpoints Consolidated (Finding 2)

Extracted from `.claudedocs/sessions/2026-07-17.md` ("الخطوة 4" + the later isActive-claim correction), reformatted for permanent reference.

## Files changed
- `app/core/tenant.py` — added `resolve_tenant_status(slug, endpoint)`: a clean public wrapper around `_verify_tenant()` (same cache, same status check, same audit logging) — no new logic, just a public entry point for callers that already have the slug from the URL path.
- `app/api/v1/public/__init__.py` — modified 7 functions + added a shared `_resolve_tenant_or_404()` helper used by 4 of them.

## ⚠️ Real compatibility risk found and avoided before implementation (not after)
The original Implementation Contract plan proposed using `Depends(get_current_client)` directly — but `get_current_tenant`/`get_current_client` **never read the slug from the URL path** (only JWT, header, query param, or subdomain). These 7 endpoints have always relied solely on the path slug (`/{slug}/config`, etc.). Using `Depends(get_current_client)` as originally planned would have broken every caller using the existing path-only calling convention with a silent `401` — a real, silent backward-compatibility break. **Fix:** use `resolve_tenant_status(slug)` directly, same centralized logic as `_verify_tenant()`, while preserving the existing path-based slug extraction exactly as it was.

## Behavior after the change
All 7 endpoints now go through the same centralized status-enforcement function (`_verify_tenant` via `resolve_tenant_status`) instead of the duplicated `find_active_client_by_slug()` (built on `isActive`). Active tenants (`active`/`trial`) keep byte-identical behavior, including exact existing error messages for "chalet not found" / "booking creation failed" cases. Suspended/expired tenants are rejected with `403` plus one audit row, **before any business logic runs** (confirmed: zero bookings were ever created for them).

## Direct evidence (5 endpoints, real HTTP server, 4 isolated test tenants)

| Endpoint | active/trial | suspended/expired |
|---|---|---|
| `GET /{slug}/config` | 200, real full data (unchanged) | 403 + one audit row |
| `GET /{slug}/listings` | 200, real data (unchanged) | 403 + one audit row |
| `GET /{slug}/price` | 404 "الشاليه غير موجود" (unchanged — same original Arabic message) | 403 + one audit row, **before** unit lookup |
| `GET /{slug}/services` | 404 "الشاليه غير موجود" (unchanged) | 403 + one audit row |
| `POST /{slug}/bookings` | 400 "فشل إنشاء الحجز..." (unchanged) | 403 + one audit row, **zero Customer/Booking rows created** |

Confirmed via full-project `grep`: zero remaining calls to `find_active_client_by_slug` in `public/__init__.py` (was 4 call sites, all removed).

## Cleanup after testing
4 test tenants + orphaned customers created by the active/trial booking tests (confirmed: **zero customers created** for the suspended/expired cases — further evidence the block happens before any side effect) + audit rows — all deleted. `clients` back to 15 (original), `security_audit_log` back to 0.

## Documented as out of scope for this phase (not fixed, does not block completion)
1. `find_active_client_by_slug()` remains in the codebase but is now completely unused (confirmed by a full-project `grep`) — dead code, a candidate for a later cleanup pass, not removed here.
2. 3 of the 7 endpoints (`/config`, `/listings`, `/bookings`) still contain separate internal `isActive` queries — but inside `public_service.get_tenant_config`/`get_client_catalog`/`create_public_booking`, for an entirely different purpose (data fetching, auto-provisioning for `smar`), unrelated to the allow/deny decision (which now fully lives in the new centralized gate that runs *before* them). Touching this would require changing internal business logic (auto-create `smar`, etc.) outside the scope of "consolidate tenant status checking" — documented as a separate future item.
3. A minor error-message wording difference for a completely nonexistent slug on `/listings` ("Client not found" originally vs. "Tenant 'x' not found." from the centralized function) — did not surface in actual testing (all test tenants existed), but is a theoretical difference worth noting.
4. Webhook/AI routes (`ai_settings_agent.py`, `webhooks/samsara.py`, `webhook.py`) are entirely out of scope for this phase — those relate to Finding 3/§8.4, not Finding 2/the 7 public endpoints. §8.4a (whether `ai_settings_agent.py` counts as a webhook or an application endpoint) remained unresolved at this point, untouched in this phase.
5. The dead `public.py` file (discovered during the security review, never loaded by the app) still exists and is still dead — unrelated to this phase.

`app.main` imports successfully after all changes (16 routes, no error) — final confirmation after every step.

## Correction: precise wording for the "no remaining isActive dependency" claim

The requested sentence "No remaining authorization decisions depend on isActive" was verified before being added — and turned out to be **false** in its general form. A full-project `grep` on `Client.isActive` usage (excluding unrelated models like Unit/Product/Service) found:

**✅ True within Phase 4's specific scope:** none of the 7 consolidated endpoints depend on `isActive` for the allow/deny decision anymore — all go through `resolve_tenant_status()` (built on `status`).

**❌ Not true project-wide** — two live security decisions still depend on `Client.isActive`:
1. `app/api/v1/admin/auth.py:103` — the Client login gate (`POST /api/v1/auth/login`): `if not client.isActive: raise 403`. Live, actively used, out of scope for Phase 4 (this is an auth route, not one of the 7 public endpoints).
2. `app/services/whatsapp_flow.py:511` (`_resolve_client`) — **a new discovery not mentioned in the earlier security report.** This function determines *which* tenant an inbound WhatsApp message belongs to (by phone-number match), via `prisma_client.client.find_many(where={"isActive": True})` — meaning a tenant suspended via `status="suspended"` but still `isActive=True` (since the two fields are not synchronized, per ADR-0001 §5) **continues to receive and process its WhatsApp messages entirely normally**. This function is called from `handle_incoming_message()` — the same webhook path already tied to the open §8.4a discussion — strengthening the case for resolving §8.4a soon, since it surfaces one more technical detail: the entire WhatsApp tenant-identification step still depends on `isActive`, fully separate from any `status` check.

**Correct precise wording:** *"No authorization decision within Phase 4's scope (the 7 public endpoints) depends on isActive. Project-wide, however, two live security decisions (Client login, WhatsApp tenant identification) still depend on isActive — both out of scope for this phase, both tied to ADR-0001 §5/§8.6 (the isActive/status duplication) and §8.4a (whatsapp_flow.py's webhook status), both already open."*

Nothing was fixed as a result of this correction at the time — wording/documentation accuracy only, no code change, per an explicit user request to double-check the phrasing before it was written down.

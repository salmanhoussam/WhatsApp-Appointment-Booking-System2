# SUPER_ADMIN_DASHBOARD_PLAN.md — Super Admin Operations Center: Architecture Roadmap

**Status:** Design only. No code, UI, or schema in this document — a strategic architecture roadmap, per `.claude/rules/documentation-policy.md`.

---

## 1. Introduction & Relationship to TENANT_LIFECYCLE_PLAN.md

This document designs the **interface and operations layer** for managing the platform — it does not design a new Domain. `TENANT_LIFECYCLE_PLAN.md` (`.claudedocs/architecture/TENANT_LIFECYCLE_PLAN.md`) is the single source of truth for every domain entity referenced here — Subscription, Plan, Payment, Account Lifecycle State, Tenant Status. This document **consumes** those entities; it never redefines them. Any naming conflict between the two documents resolves in favor of `TENANT_LIFECYCLE_PLAN.md`.

---

## 2. Dashboard Design Principles

1. **Dashboard is an Operations Center, not a CRUD application.**
2. **Every screen must expose measurable business value** — no screen exists just because it can.
3. **Prefer existing backend capabilities over creating parallel services.**
4. **Operational actions must be auditable** — every state-changing action gets logged (built on `SecurityAuditLog`).
5. **Configuration before hardcoding.**
6. **Progressive disclosure** — don't surface every detail at once.
7. **One module owns one business capability** — no overlapping responsibility between modules.

---

## 3. Current State

### Backend (`app/api/v1/super/`) — 3 files, 12 endpoints, all gated by `require_super_admin` only (no `require_roles`, no service gates)

**`clients.py`**
| Endpoint | Purpose |
|---|---|
| `GET /clients` | List all tenants with lifecycle metadata (status, days_left, page_type) |
| `PATCH /clients/{id}/settings` | Set page_type/template_key/primary_color |
| `PATCH /clients/{id}/status` | Change tenant status (active/trial/demo/suspended/expired) |
| `POST /admins` | Create a new SUPER_ADMIN User account |
| `POST /clients/{id}/seed-categories` | Bulk-create CatalogCategory rows |

**`maintenance.py`**
| Endpoint | Purpose |
|---|---|
| `POST /maintenance/cleanup-date-pages` | Cron-triggered (Railway, `0 3 * * *`) DatePage cleanup — no dashboard UI consumes this |

**`platform_services.py`**
| Endpoint | Purpose |
|---|---|
| `GET/POST/PATCH /platform-services` | Platform service catalog CRUD (pricing, metadata) |
| `PATCH/GET /clients/{id}/services` | Toggle a `ClientService` on/off per tenant |

### Frontend
Exactly one file: `frontend/src/pages/super-admin/ClientsManager.jsx` (503 lines) — no sub-folders, no tabs. Displays KPI cards + a filterable tenant table (status, days_left, page_type) + a status-change dropdown. Calls only 3 of the 12 backend endpoints above (`GET /clients`, `PATCH /status`, `PATCH /settings`). **Zero UI exists** for platform-services CRUD, client-services toggles, category seeding, admin creation, or the maintenance endpoint.

For comparison, `frontend/src/pages/smar/admin/SmarAdminDashboard.jsx` (2218 lines) is a full multi-tab per-tenant admin app — an existing architectural precedent for what a real modular dashboard shell looks like, not a pattern to invent from scratch.

### Permissions
`require_super_admin` is the only guard used anywhere under `super/` — either an Admin JWT with `role=SUPER_ADMIN`, or a Client JWT where `slug == SUPER_ADMIN_SLUG` (default `smar`). No finer-grained role distinctions exist within super-admin access today.

### Strengths
Backend is clean and layer-compliant (routes → services → repositories); the existing endpoint surface is broader than what the UI exposes, meaning several modules below require zero new backend work to reach a first usable UI.

### Limitations
No permission tiers within super-admin; several already-built backend capabilities have no consumer; no monitoring beyond a bare liveness check; the entire admin experience lives in one flat, unstructured file.

---

## 4. Can This Evolve Into a Full Operations Center? — and the Mandatory Shell Structure

Yes, architecturally — the existing 4-layer backend supports this kind of expansion without rework. The frontend, however, must not be allowed to repeat its own current mistake (`ClientsManager.jsx`) or the per-tenant dashboard's mistake (`SmarAdminDashboard.jsx` at 2218 lines) of becoming one enormous file. The future structure is **modular, non-negotiable**:

```
Operations Shell
├── Overview
├── Tenant
├── Subscription
├── Billing
├── Security
├── Monitoring
├── Integrations
└── Settings
```

Each item is an independent module with its own file/folder — never a section bolted onto one giant file.

---

## 5. Gaps (Priority-Ordered)

| Gap | Backend exists? | Frontend exists? | What's needed |
|---|---|---|---|
| Audit Log viewer | ❌ (write-only, no read endpoint) | ❌ | New `GET` endpoint on `security_audit_log` + UI |
| Client-services toggle UI | ✅ (`super/platform_services.py`, `admin/client_services.py`) | ❌ | UI only |
| Platform-services catalog UI | ✅ (`super/platform_services.py`) | ❌ | UI only |
| System monitoring beyond liveness | ⚠️ (`GET /health` only, no history) | ❌ | New monitoring service + storage + UI |
| Integration status (Samsara/WhatsApp/Resend/Anthropic) | ❌ (env vars only) | ❌ | New service + UI |
| Category seeding / admin creation UI | ✅ | ❌ | UI only |

---

## 6. Proposed Modules

For each: Purpose, Target Users, Business Value, Required Backend Services, Dependencies, Future Expansion.

### Overview
- **Purpose:** platform-wide at-a-glance state.
- **Target users:** Salman (super admin).
- **Business value:** fast situational awareness without querying the DB directly.
- **Backend:** `GET /api/v1/super/clients` (existing) + KPI aggregation (see §9).
- **Dependencies:** none beyond existing endpoint.
- **Future:** real-time refresh via Dashboard Events (§10).

### Tenant
- **Purpose:** manage the tenant roster.
- **Business value:** direct evolution of `ClientsManager.jsx` — the one thing that already works today.
- **Backend:** `super/clients.py` (existing, all 5 endpoints).
- **Scope boundary:** manages **Tenant Status only** (`active`/`suspended`, per ADR-0001) — Account Lifecycle State (`trial`/`paid`/etc.) belongs to the Subscription module, not here. This split is deliberate, matching the "No Status Mixing" principle from `TENANT_LIFECYCLE_PLAN.md` Phase 0.
- **Future:** bulk actions, tenant search/filter (§8).

### Subscription
- **Purpose:** manage trial/subscription lifecycle, plan assignment, renewal.
- **Business value:** direct implementation surface for `TENANT_LIFECYCLE_PLAN.md` §Phase 4 (Subscription Dashboard, Billing Dashboard, Trial Extension, Suspend/Reactivate) — **no design is repeated here**, this module is a straight consumer of that document.
- **Backend:** none exists yet — depends entirely on ADR-0002's eventual implementation (`subscription_service`).
- **Dependencies:** `TENANT_LIFECYCLE_PLAN.md` must reach an approved Implementation Contract first.
- **Future:** plan changes, coupon application (ties into `TENANT_LIFECYCLE_PLAN.md` Phase 5).

### Security
- **Purpose:** review security-relevant events (tenant suspensions, denied requests, etc.).
- **Business value:** turns the currently write-only `SecurityAuditLog` into something a human can actually use.
- **Backend:** `app/services/security_audit_service.py` — needs a new read path (currently only `log_security_event()` exists, no `find_many`/`find_first` anywhere in the codebase).
- **Dependencies:** none beyond the new read endpoint.
- **Future:** filtering/export (§8), real-time updates via Dashboard Events (§10).

### Billing
- **Purpose:** payment/invoice visibility.
- **Business value:** direct consumer of `TENANT_LIFECYCLE_PLAN.md` Phase 1/5 (`Payment`, `Invoice` entities) — nothing exists in the codebase today; this module description is intentionally thin because there is no backend to describe yet.
- **Backend:** none — future `billing_service`.
- **Dependencies:** a chosen payment provider (`TENANT_LIFECYCLE_PLAN.md` Phase 5 — explicitly a separate human business decision, not decided here).

### Monitoring
- **Purpose:** operational health of the platform.
- **Business value:** today limited to "is the server up," which understates what this module should eventually mean.
- **Backend today:** `GET /health` (`app/main.py`) — a bare liveness probe (`SELECT 1`), no history, no UI consumer.
- **Full vision (not implemented now, stated so it isn't later reduced to "server is up"):** Queue Status, Scheduled Jobs, Background Tasks, Webhook Failures (Samsara/WhatsApp), AI Requests (`ai_settings_agent.py` usage), Email Queue, WhatsApp Queue.
- **Dependencies:** a new `monitoring_service` with actual state storage — does not exist today.

### Integrations
- **Purpose:** visibility into external system status (Samsara, WhatsApp Cloud API, Resend, Anthropic).
- **Business value:** today these are invisible env-var configurations with no admin-facing status.
- **Backend:** none — future `integration_service`.
- **Future:** webhook health, credential rotation status.

### Settings
- **Purpose:** platform-wide configuration (e.g. `SUPER_ADMIN_SLUG` and similar values).
- **Business value:** conceptual only — lowest priority of the eight modules.

**Note on scope consolidation:** the original request's "Activity Timeline," "Incident Center," "AI Operations," and "Developer Tools" categories are deliberately folded into Security/Monitoring/Integrations above rather than kept as separate top-level modules, to avoid an unbounded shell item count. This is a deliberate design decision, not an omission.

---

## 7. Domain Ownership

Maps each module to a future owning service — not because it exists today, but so a future developer knows where the logic should live:

| Module | Future owning service | Today's actual state |
|---|---|---|
| Tenant | `tenant_service` (built on `super/clients.py`) | Partially exists |
| Subscription | `subscription_service` (from `TENANT_LIFECYCLE_PLAN.md`) | Does not exist |
| Billing | `billing_service` (from `TENANT_LIFECYCLE_PLAN.md`) | Does not exist |
| Security | `security_audit_service` (read path added to existing) | Write-only today |
| Monitoring | `monitoring_service` (entirely new) | `GET /health` only |
| Integrations | `integration_service` (new) | Env vars only |

---

## 8. Cross-Cutting Capabilities

Shared capabilities most modules will need — stated once here instead of repeated per module: Search, Filtering, Pagination, Export CSV, Audit History, Permission Checks, Notifications.

---

## 9. KPI Definition

The Dashboard is built on KPIs, not just tables — stated here without implementation:
- Active Tenants, Trial Tenants, Expired Tenants
- MRR, ARR *(depend on `TENANT_LIFECYCLE_PLAN.md` Phase 1/5 — Payment/Subscription entities that don't exist yet)*
- Active AI Sessions
- WhatsApp Messages Today
- Failed Integrations

---

## 10. Dashboard Events

Operational Events — designing the dashboard to eventually be event-driven, not purely polling-based. Illustrative example (no implementation):

```
Tenant Suspended
   ↓
Dashboard KPIs refresh
   ↓
Audit entry written
   ↓
Notification sent
   ↓
Timeline updated
```

This maps conceptually onto the same events defined in `TENANT_LIFECYCLE_PLAN.md` Phase 1 (`TenantSuspended`, etc.) — same events, different consumer (UI/notification instead of enforcement).

---

## 11. Reuse Existing Capabilities Instead of Duplicating

Every module above is designed to consume an endpoint/service that already exists by name, rather than inventing a parallel system: `super/clients.py`, `super/platform_services.py`, `admin/client_services.py`, `app/services/security_audit_service.py`, `GET /health`.

---

## 12. Long-Term Roadmap

- **Stage 1** — close gaps that already have backend support (Client-services UI, Platform-services UI) — lowest effort, immediate value.
- **Stage 2** — Security module (one new read endpoint + UI).
- **Stage 3** — restructure the frontend into the modular Operations Shell (§4) — not another single-file page.
- **Stage 4** — Subscription module (after ADR-0002 reaches an implemented state).
- **Stage 5** — Monitoring/Integrations (furthest out, least existing foundation today).

---

## 13. Success Criteria

This plan is considered successful when the Super Admin can: manage all tenants, track their lifecycle, view subscriptions, monitor the system, review security logs, manage integrations, and perform day-to-day operations — without needing direct database access.

---

## 14. Non-Goals

This document does **not**:
- Build any actual UI or frontend code.
- Design any new database schema — that belongs to `TENANT_LIFECYCLE_PLAN.md`/ADR-0002 where applicable.
- Choose specific monitoring tooling (Datadog, Grafana, etc.) — conceptual only.

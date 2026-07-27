# TOS-001 — Tenant OS: Positioning, Problem, and Anatomy

**Status:** Decided. Extracted from `TENANT_OS_PLAN.md` §1, §2, §3 (index only), §5 during the
ADR-0003 migration (Phase 3) — the original prose's real decisions preserved, not copy-pasted
verbatim.

**Scope note:** This is a Tenant-OS-scoped decision (`TOS-XXX` sequence), not a platform-wide one
— it lives in the same `adr/` folder as `ADR-000X` (per `ADR-0003.md` §4), distinguished by prefix,
not by nesting.

---

## 1. Context / Problem Statement

Two real, live admin dashboards already existed in this codebase before this decision
(`GenericAdminDashboard.jsx`, tenant-agnostic, driven by `config.active_services`; and
`SmarAdminDashboard.jsx`, the booking module's own, older, role-gated dashboard), plus a working
Content-vs-Structure authoring mechanism (`scripts/data/page_templates/*.json` →
`scripts/data/{slug}/page_content.json` → `Client.config.content`, edited via
`CanvasPageEditor.jsx`). None of this was invented by Tenant OS — the real problem was that these
pieces had no shared architecture governing how they converge into one coherent tenant product.

The deeper problem, named directly by Beit Al-Fakhar's Store Experience Review
(`reviews/store-experience-review.md`): that review closed with two real, named content gaps
(generic numbered product titles, an unfilled hero) that a developer would otherwise have to keep
fixing by hand, tenant by tenant, forever. The reframing this forces: **the project is not
building a Store — it is building the product every client will use to run their own store.** A
Product Page only a developer can populate is not finished, regardless of how it looks.

## 2. Decision Drivers

- **Don't re-invent** — two real dashboards and a real content mechanism already exist; the job is
  convergence, not a green-field rebuild.
- **Don't duplicate other domains' ownership** — `SUPER_ADMIN_DASHBOARD_PLAN.md` (Salman's own
  Operations Center) and `TENANT_LIFECYCLE_PLAN.md` (subscription/billing/lifecycle state) already
  own their own surfaces; Tenant OS is strictly the tenant-facing counterpart, never redefining
  what those two already own.
- **Every future feature must have a real answer to "how does the client edit this without a
  developer"** — not a nice-to-have, the actual definition of "done" going forward.

## 3. Options Considered

Not applicable in the usual sense — this decision is a positioning and anatomy statement, not a
choice between competing designs. The one real alternative implicitly rejected was to keep treating
each dashboard/content mechanism as an independent, uncoordinated feature, which is exactly the
status quo this decision replaces.

## 4. Decision

### 4.1 Positioning

Tenant OS is the tenant-facing counterpart to `SUPER_ADMIN_DASHBOARD_PLAN.md`'s operator-facing
plan. `AI_OPERATIONS_PLATFORM_VISION.md` is unrelated (internal agent tooling, not a tenant
feature) and must not be confused with Tenant OS's own, much narrower, future AI-assistant-inside-
the-dashboard idea (see `TOS-002`).

Three documents form this project's architectural backbone: `service-execution-constitution.md`
(how Services/Agents operate), `backend/architecture.md` (how the system is technically written,
including its platform-wide §9 rule), and Tenant OS itself (how any idea becomes a Capability
usable across Dashboard, AI, API, and Mobile).

### 4.2 The Problem This Solves

Remove the recurring cost of developer-populated tenant content, by making every real Content
value (§4's Three Layers, extracted separately to `principles/P-002-content-vs-structure.md`)
editable by the tenant through a real, shared mechanism — not by re-deriving one-off fixes per
tenant.

### 4.3 Anatomy — Capability / Interface / Governance

Capability is not the top of the system; it is one of three siblings:

```
Tenant OS
  │
  ├── Capability
  │      ├── Contract        (what the capability can do — see TOS-003, capabilities/*.md)
  │      ├── Service          (the one canonical write path — backend/architecture.md §9)
  │      ├── Repository       (Prisma queries only, no logic)
  │      └── Database         (the real Prisma model — the actual source of truth)
  │      [ one branch per domain: Catalog, Category, Media, Site Configuration,
  │        Content, Orders, Customers — see capabilities/*.md ]
  │
  ├── Interface
  │      ├── Dashboard   — real, two implementations exist today
  │      ├── AI           — reserved, not built
  │      ├── Mobile       — not built, a real Gap, not designed here
  │      └── API          — a tenant-authoring API, distinct from the existing
  │                         shopper-facing /api/v1/public/* — not built, a real Gap
  │
  └── Governance
         ├── Permissions    — who may invoke a Capability
         ├── Draft/Publish  — staged edits before going live (see TOS-002)
         ├── Audit          — who changed what, when (real Gap)
         ├── Versioning     — content history / undo (real Gap)
         └── Activity       — a human-readable feed of recent changes (real Gap)
```

Two things sit outside this tree deliberately, not as a fourth branch: the **Capability Proposal**
gate (`TOS-003`) precedes the whole anatomy as Product Governance, not Architecture; the **Editing
Engine** (`TOS-002`) is the connective mechanism between Capability and Interface, not a sibling of
either.

Draft/Publish, Audit, Versioning, and Activity are cross-cutting Governance concerns, built once
and inherited by every Capability automatically — no Capability gets its own separate audit log or
draft/publish mechanism.

### 4.4 Design Principles (index only — full text in `principles/`)

Five standing principles measure every future Content/Template/Platform decision:

1. Content vs Structure stays a real, enforced boundary — `principles/P-002-content-vs-structure.md`.
2. Prefer existing capability over new infrastructure — applied throughout this decision itself.
3. The tenant never sees the platform's internals (no PUT/PATCH/schema vocabulary) —
   `principles/P-003-no-api-thinking.md`.
4. Dashboard-First Principle — `principles/P-001-dashboard-first.md`.
5. One Capability, One Contract, One Service, One Source of Truth, Many Interfaces — **not owned
   here**; canonical home is `.claude/rules/backend/architecture.md` §9, a platform-wide rule. If
   this document and that rule ever disagree, the rule wins.

## 5. Single Source of Truth

This ADR for Tenant OS's positioning and anatomy. `principles/*.md` for the individual Design
Principles' full text. `capabilities/*.md` for each Capability's real Contract. `TOS-002`/`TOS-003`
for the Editing Engine and Capability Proposal gate respectively.

## 6. Consequences

- Every future Capability is measured against this anatomy before any code is written.
- Any feature request that doesn't fit Capability/Interface/Governance is a signal to re-examine
  the request, not to bend the anatomy.
- `SUPER_ADMIN_DASHBOARD_PLAN.md` and `TENANT_LIFECYCLE_PLAN.md` remain independent, unaffected —
  this decision does not redefine anything they already own.

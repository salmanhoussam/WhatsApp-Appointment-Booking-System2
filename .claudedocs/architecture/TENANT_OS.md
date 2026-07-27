# Tenant OS

The tenant-facing counterpart to `SUPER_ADMIN_DASHBOARD_PLAN.md` (Salman's own Operations Center):
what the *client* (a restaurant/store/booking owner) can do for themselves, not what Salman does to
manage the platform. Built on two real dashboards and a real Content-vs-Structure mechanism that
already existed (`adr/TOS-001-tenant-os.md` §4.1) — not a green-field rebuild.

**The problem it solves**: without this, every future feature needs a developer to keep populating
tenant content by hand, forever. The reframing this forces: the project is not building a Store —
it is building the product every client will use to run their own store. See
`adr/TOS-001-tenant-os.md` §4.2 for the full context.

## The Model

```
Tenant OS
  │
  ├── Capability   (Catalog, Category, Media, Site Configuration, Content, Orders, Customers —
  │                 each: Contract → Service → Repository → Database; see capabilities/*.md)
  │
  ├── Interface     (Dashboard — real today; AI, Mobile, tenant-authoring API — reserved/Gap)
  │
  └── Governance    (Permissions, Draft/Publish, Audit, Versioning, Activity — built once,
                     inherited by every Capability automatically)
```

Two things sit outside this tree, not as a fourth branch:

- **Capability Proposal** (`adr/TOS-003-capability-contract-model.md`) — the Product Governance
  gate every future Capability must pass *before* a Contract is written.
- **Editing Engine** (`adr/TOS-002-editing-engine.md`) — the connective mechanism between
  Capability and Interface: `Capability → Operation → Schema → Renderer`, never a bespoke editor
  per Interface. This is also where Live Preview (Draft/Publish) and the Admin/Public Contract
  split live.

Full anatomy, rationale, and the five Design Principles this model is measured against:
`adr/TOS-001-tenant-os.md`.

## Design Principles

Genuinely Tenant-OS-specific principles live in `principles/`; the one platform-wide principle
(Single Source of Truth, applied here as "One Capability, One Contract, One Service, Many
Interfaces") is **not** duplicated here — see `INDEX.md`'s Platform Principles table for its
canonical home.

- `principles/P-001-dashboard-first.md` — every feature must answer "how does the client edit this
  without a developer."
- `principles/P-002-content-vs-structure.md` — the Platform/Template/Content ownership layers.
- `principles/P-003-no-api-thinking.md` — a tenant never sees PUT/PATCH/schema vocabulary.
- `principles/P-004-direct-manipulation.md` — the Dashboard's own felt experience (Notion/Shopify/
  Framer-like), not a form-filling exercise.

## Architecture Boundaries — where the code that renders a Capability lives

A different question than the Design Principles' *ownership* axis: this is about *where the
rendering code lives*, orthogonal to who owns the data.

| Boundary | Meaning | Real example |
|---|---|---|
| **Generic** | Shared frontend/backend code, used by every tenant identically | `CatalogItemCard.jsx`, `upload.py`'s `FOLDER_MAP` |
| **Tenant-specific** | Lives under a tenant's own `pages/{slug}/` folder (`.claude/rules/frontend/scaffolding.md`) | beit-al-fakhar's `ProductPage.jsx` — a developer-built Template for one tenant's brief; no Interface touches these files, only the data they render |
| **Plugin** | A future `client_services` serviceKey's self-contained Capability, reachable only when active | `ReservationsTab` (`activeServices.includes('reservations')`) |
| **Never in the Tenant OS** | Platform/Template by the Content-vs-Structure test, plus anything already owned by `SUPER_ADMIN_DASHBOARD_PLAN.md`/`TENANT_LIFECYCLE_PLAN.md` (billing, lifecycle state, cross-tenant data, service activation/deactivation itself) | Tenant status, trial/expiry, service-key activation |

**Open, unresolved by design**: `GenericAdminDashboard.jsx` gates tabs by `client_services`;
`SmarAdminDashboard.jsx` gates tabs by JWT role. A single unified interface needs one answer, not
both bolted together — left for whichever future Implementation Contract does the actual
Dashboard unification, per the Abstraction Rule (`.claude/rules/team-roles.md`).

## Capability Lifecycle

Every Capability moves through the same sequence, never invented per case:

```
Idea → Contract → Implementation → Interface → Governance → AI Access → Review
```

- **Idea** — passed the Capability Proposal gate (`adr/TOS-003-...md`).
- **Contract** — sub-capabilities listed, real vs. Gap (`capabilities/*.md`'s own format).
- **Implementation** — a single canonical Service owns its writes — clean, not merely present.
- **Interface** — at least one Interface can invoke it end-to-end through the Editing Engine.
- **Governance** — Permissions, Draft/Publish, ideally Audit/Activity, are wired in.
- **AI Access** — reachable from the AI Interface, within the tenant's own permission ceiling.
- **Review** — a real, deliberate check — a distinct closing step, not implied by earlier stages.

Even Catalog, the most built-out Capability, is roughly a third of the way through this pipeline
(Idea ✅, Contract ✅, Implementation ⚠️ not yet clean, Interface ⚠️ Dashboard-only, Governance ⚠️
partial, AI Access ❌, Review ❌) — see `capabilities/catalog.md` for the current detail. This table
exists precisely so "is Catalog done?" has a specific, checkable answer instead of a vague one.

## Future AI Integration — where it plugs in, not how it works yet

Explicitly not built. AI is an Interface sibling, never a separate privileged codepath: "create a
new category" from a chat prompt must resolve to the exact same Category Capability the dashboard's
own "+ Add Category" button triggers. Its action-vocabulary is not something separate to design for
AI — it *is* the Editing Engine's Discovery mechanism (`adr/TOS-002-editing-engine.md`), read
directly: the same Schema a human's Dashboard renders as a form is what an AI reads to know what an
instruction needs, calling the identical Operation-execution endpoint a click would. Its permission
ceiling is the Capability Matrix (Governance: Permissions), read directly, not a new decision.

## Capabilities

See `INDEX.md`'s Capabilities table for the current Maturity/Open-Findings rollup, or go straight
to a file: `capabilities/{catalog,category,media,content,site-configuration,theme,orders,
customers}.md`.

**Two real Architecture Integrity Findings from this system's history are not represented in the 8
Capability files above** — Units (`units.py`) and Team/Staff (`team.py`) — because neither has
passed the Capability Proposal gate as a ratified Tenant OS Capability yet. Not silently dropped;
see `implementation/ADR-0003/PHASE_5.md` for where this gap is tracked.

## Scope / What This System Deliberately Does Not Do

No new API endpoints, Prisma models, or migrations are designed by the architecture docs
themselves — Gaps are named, not built, until a real Implementation Contract picks one up. No UI
components or visual design. No resolution of the `client_services`-vs-role tab-gating conflict
above. No fix to any Capability's own Open Findings — named, evidenced, categorized, left for a
future Implementation Contract, one at a time.

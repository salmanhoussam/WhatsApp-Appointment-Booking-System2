# Architecture Index

Per `.claudedocs/adr/ADR-0003.md`. The one navigation page — every real decision, principle, and
Capability should be reachable from here in one link. **As of Phase 4** — `adr/TOS-*` and
`principles/` are now real and populated; `capabilities/` still fills in during Phase 5. Do not
treat the Capabilities table below as "doesn't exist," only as "not migrated yet."

## Decisions

| Decision | Location | Status |
|---|---|---|
| Tenant Status Enforcement | `../adr/ADR-0001.md` | Closed |
| Tenant Lifecycle & Subscription Domain | `../adr/ADR-0002.md` | Partially implemented |
| Architecture Documentation System | `../adr/ADR-0003.md` | Decided — this migration is its implementation |
| Tenant OS (why it exists) | `../adr/TOS-001-tenant-os.md` | Decided — Phase 3 |
| Editing Engine | `../adr/TOS-002-editing-engine.md` | Decided — Phase 3 |
| Capability Contract Model | `../adr/TOS-003-capability-contract-model.md` | Decided — Phase 3 |

## Platform Principles

*(always-loaded, canonical home — never duplicated into `principles/`)*

| Principle | Location |
|---|---|
| One Capability, One Service, Many Interfaces | `.claude/rules/backend/architecture.md` §9 |
| Every Capability Exposes Two Contracts (Admin/Public) | `.claude/rules/backend/architecture.md` §10 |
| Abstraction Rule | `.claude/rules/team-roles.md` |

## Tenant OS Principles

*(genuinely new, Tenant-OS-specific, no other home)*

| Principle | Location |
|---|---|
| Dashboard-First Principle | `principles/P-001-dashboard-first.md` |
| Content vs Structure (The Three Layers) | `principles/P-002-content-vs-structure.md` |
| No API Thinking | `principles/P-003-no-api-thinking.md` |
| Direct Manipulation, Not Forms | `principles/P-004-direct-manipulation.md` |

## Capabilities

*(filled in Phase 5)*

| Capability | Maturity | Location | Open Findings |
|---|---|---|---|
| Content | Stable | `capabilities/content.md` | — |
| Media | Experimental | `capabilities/media.md` | 1 (ReplaceMedia Processing Pipeline, see `TOS-002`) |
| Site Configuration | Developing | `capabilities/site-configuration.md` | 3 (Known Boundary Debt — Hero Copy/Video/Cover Image) |
| Catalog | Developing | `capabilities/catalog.md` | 1 (Duplicate Architecture) |
| Category | Developing | `capabilities/category.md` | shares Catalog's finding |
| Theme | Developing | `capabilities/theme.md` | — |
| Orders | Developing | `capabilities/orders.md` | 1 (Missing Architecture) |
| Customers | Experimental | `capabilities/customers.md` | 1 (unmounted route) |

*(Table content above reflects real state as known at Phase 1 time, from the retired
`TENANT_OS_PLAN.md` §19/§20 — re-verified, not just copied, when Phase 5 actually creates each
Capability's own file.)*

## Reviews

See `../reviews/` — flat, one file per review/verification, no further index needed here.

## Roadmap

See `../roadmap/`.

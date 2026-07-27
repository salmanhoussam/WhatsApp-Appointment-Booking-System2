# SalmanSaaS Services Catalog (Platform-Level Services) — Evolution Log

Accumulating understanding of how *Platform-Level Services* — the SaaS modules SalmanSaaS itself
sells to tenants (booking, restaurant, store, reservations, immersive_3d, etc.) — should be
represented as a real, single-source-of-truth entity, distinct from the tenant-facing Catalog
Capability (`.claudedocs/architecture/capabilities/catalog.md`) and from Booking's own
tenant-level add-on Services (`Service` model, `services.py`). See
`.claude/rules/documentation-policy.md`'s "Architecture Evolution Log" section for what this file
is and isn't — entries accumulate here across sessions; promotion to a real ADR only happens once
the understanding has stabilized through multiple independent real implementations.

## 2026-07-27

### Context

Immediately after closing out ADR-0003 (all 8 phases, `TENANT_OS_PLAN.md` retired). Salman asked
"ماذا عن الخدمات" (what about the Services) — first read as a follow-up to the Units/Team-Staff
exclusion just named in the migration, which surfaced a real Broken-Architecture bug in Booking's
tenant-level add-on `Service` model (`services.py` bypassing the existing `service_service.py`).
Salman corrected the terminology collision immediately: he meant **Platform-Level Services** — the
SaaS modules/offerings SalmanSaaS itself sells to tenants — not Booking's tenant-facing add-ons,
and asked for a targeted architectural investigation before any finding got logged.

### Discovery

A real, already-built entity for exactly this concept already exists and was nearly missed:
**`PlatformService`** (`prisma/schema.prisma:374`) — `key`, `moduleKey`, `name_ar/en`,
`description_ar/en`, `icon`, `monthlyPrice`, `isActive`, `sortOrder`, deliberately **no `clientId`
field at all** (global by design, not tenant-scoped). A full CRUD API exists and is genuinely
mounted — `app/api/v1/super/platform_services.py`, registered in `main.py:72`, gated by
`require_super_admin` — plus a seed script (`scripts/seed_platform_services.py`, 17 rows).

But it is functionally inert. Confirmed by direct grep, not assumed:
- **Zero frontend consumer** — no file under `frontend/src` references `platform-services` or
  `platformService` anywhere. `SUPER_ADMIN_DASHBOARD_PLAN.md` itself already names this: "Zero UI
  exists for platform-services CRUD."
- **Three other independent, hardcoded copies of the same taxonomy exist, none of which reads from
  `PlatformService`**: `.claude/rules/backend/service-system.md`'s "Valid Service Keys" markdown
  table (human documentation); `app/core/services.py`'s `SERVICE_TYPE_MAP`/`DEFAULT_SERVICES`
  (keyed by onboarding `service_type`, a different dimension than template); and
  `frontend/src/config/template-registry.js`'s per-template `services: []` arrays (keyed by
  `template_key`, 20 templates).
- **The four copies actively disagree.** `seed_platform_services.py`'s 17 keys don't even match
  `service-system.md`'s own documented list — most concretely, `reservations` is **entirely
  absent** from the `PlatformService` seed data, despite being a real, critical key
  (`service-system.md` itself documents a real 2026-07-23 production bug — RK Barber Shop's
  Reservations tab silently unreachable — caused by exactly this key being missing from a seed).
- **No `Plan`↔`PlatformService` relationship exists at all** — no join table, no field. Pricing
  tiers (`immersive_3d 🔒 Ultra tier only ($35/mo)`, per `service-system.md`) are asserted only as a
  markdown comment, enforced by zero code or schema constraint.

### Current Understanding

`PlatformService` is the architecturally correct entity — whoever built it already made the right
call keeping it entirely separate from Catalog. Confirmed why that separation is correct, not just
stylistic: `CatalogItem`/`CatalogCategory` both require a non-nullable `clientId`
(`rules/global.md`'s multi-tenancy rule, enforced everywhere) — a Catalog row cannot exist without
belonging to a real tenant. Platform Services are the opposite of that by nature: owned by
SalmanSaaS, not any tenant. Forcing them into Catalog would mean either a fake/reserved platform
`clientId` (a direct multi-tenancy violation) or making `clientId` nullable (breaking an invariant
relied on everywhere). So the real problem isn't a missing model — it's that a correctly-designed
model was left unconnected to everything else that needed it, becoming a fourth/fifth silent copy
instead of the Single Source of Truth it was clearly built to be.

**Confirmed direction, not yet executed**: `PlatformService` should become the actual SSOT for
"what platform services exist" — `service-system.md`'s table becomes documentation *derived from*
live data rather than an independent hand-maintained list; `SERVICE_TYPE_MAP` resolves against real
`PlatformService` rows instead of a hardcoded Python dict; `template-registry.js`'s `services[]`
arrays are validated (at minimum) or fetched (ideally) against the same real data instead of a
third hand-maintained copy. The missing `Plan`↔`PlatformService` relationship is the one piece that
needs real design work, not just wiring — everything else is connecting what already exists
correctly, not inventing something new.

### Open Questions

- Exact shape of the `Plan`↔`PlatformService` relationship — a join table (`PlanService`,
  supporting many-to-many with per-plan overrides) vs. a simple `included_in_plans: string[]` field
  on `PlatformService` — not decided; only one real case (`immersive_3d`/Ultra) exists so far to
  reason from.
- Whether `template-registry.js` should keep a local `services[]` array validated at build/lint
  time against `PlatformService`, or fetch the real list at runtime from a (new) public/admin
  endpoint — a real tradeoff (frontend simplicity vs. genuine single source of truth) not yet
  decided.
- Whether `SERVICE_TYPE_MAP`'s onboarding-`service_type` keying should be retired entirely in favor
  of the `template_key`-driven `services[]` list once both would otherwise say the same thing, or
  whether the two genuinely serve different onboarding paths (conversation-extraction vs.
  template-picker) and should both keep existing, each resolving against `PlatformService` rather
  than each other.
- Whether `seed_platform_services.py` has ever actually been run against the live database —
  unverified in this pass (a runtime/DB state question, not a code question).

### Promoted?

No — one real investigation so far, not yet multiple independent implementations proving the
fix's exact shape. Per this project's Abstraction Rule (`rules/team-roles.md`), the `Plan`↔
`PlatformService` join shape specifically should wait for the fix to actually happen once, for
real, before being locked into an ADR.

### Escalation Watch

This finding touches the platform-wide Single Source of Truth principle
(`.claude/rules/backend/architecture.md` §9) directly — four independent definitions of the same
taxonomy, three of which don't even agree with each other, is the exact shape that principle exists
to prevent, the same class of violation already confirmed for Site Configuration's
`settings.py`/`client_service.py` split (`capabilities/site-configuration.md`'s Open Findings). Not
escalated to a real ADR/Implementation Contract yet — per the sequencing Salman set explicitly this
session (ADR-0003 first, then Restaurant sign-off, then Store template; Super Admin work stays
queued behind all three per the 2026-07-20 decision). Should escalate the moment either: (a) a real
onboarding breaks the same way RK Barber's `reservations` gap did, now traceable to this exact
four-way drift; or (b) Salman decides to actually build the Super Admin Platform Services UI
(already scoped as Stage 1 in `SUPER_ADMIN_DASHBOARD_PLAN.md`) — at that point this stops being
speculative and becomes real Implementation Contract work.

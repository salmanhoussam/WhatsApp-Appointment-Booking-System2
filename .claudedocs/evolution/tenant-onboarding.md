# Tenant Onboarding — Evolution Log

## 2026-08-01

### Context

Salman personally tried to log into `hr`'s (RK Barber Shop) admin dashboard during Pilot prep and
got lost. Traced as part of a Dashboard UX Audit
(`.claudedocs/work/dashboard-ux-audit/2026-08-01/summary.md`), not assumed from his report alone.

### Discovery

The lockout wasn't a one-off — it's a structural gap in the onboarding flow itself:

- `registration_service.py` generates a one-time magic setup link (`setup_url`) with a **7-day
  expiry**, but that link is **only ever returned in the registration API's JSON response** —
  grepped the whole codebase: never emailed, never sent via WhatsApp, never persisted anywhere a
  tenant could retrieve it again later.
- **No resend-setup-link endpoint or UI exists anywhere.**
- **No password-reset flow exists anywhere** (frontend or backend — zero matches for "forgot
  password"/"reset password").
- The only real recovery path today is the platform-owner-only `POST /create-user` endpoint
  (protected by `SECRET_KEY`) — which is exactly what unblocked `hr` this session, but that's a
  manual, Salman-only intervention, not something the system does for itself.

### Current Understanding

Any tenant who doesn't act on their setup link within 7 days — or loses it — ends up exactly where
`hr` did: a real account, a real business, permanently locked out with no self-service way back in.
This isn't specific to `hr` or to this Pilot; it will recur for tenant #2, #10, #100 unless
addressed. `.claude/rules/tenant-onboarding.md`'s existing "Completion Gate" section defines what
"Onboarding Completed" means up through the dashboard rendering — it does not yet cover what happens
*after* completion if the owner needs back in later (password lost, link expired, staff turnover).

### Open Questions

- Should the setup link actually be delivered automatically (email via the already-integrated
  Resend provider, or WhatsApp) at registration time, instead of only appearing in an API response?
- Should there be a self-service "resend my setup link" or "forgot password" flow, or is a
  Super-Admin-mediated reset (extending today's manual `create-user` path into a real admin-UI
  action) sufficient at this project's current scale?
- What should the setup link's expiry actually be, and should it be configurable per registration
  method (self-service sign-up vs. onboarding-pipeline-created tenants)?

None of these are decided here — this entry records that the gap is real and dated, not what the
fix should be.

### Promoted?

No — a real, single confirmed instance, not yet a second independent case. Per this project's own
Abstraction Rule, stays as an Evolution entry (a real, logged gap awaiting a decision) rather than
being promoted to an ADR or ticketed for immediate work. Explicitly not fixed this session per
Salman's own staged process (Audit → compare → decide → build).

## 2026-08-08

### Context

Following the dashboard-routing fix (`.claudedocs/work/dashboard-flash-investigation/2026-08-08/`)
and the `ali` customer-readiness comparison against `rk`
(`.claudedocs/work/ali-customer-readiness/2026-08-08/summary.md` — which found `ali` was built as a
backend-only isolation test fixture, not a real onboarded customer), Salman stated the governing
rollout decision for `ali` as RK's follow-on customer, and for tenant rollout generally.

### Discovery

Not a new architectural insight so much as an explicit confirmation, at the rollout-sequencing
level, of a principle already stated platform-wide (`backend/architecture.md §9`, "One Capability,
One Contract, One Service, One Source of Truth, Many Interfaces"):

- **RK and Ali run the same system — no per-tenant architecture branch.** Catalog and Store are
  shared capabilities available to any tenant; whether a given tenant activates them
  (`client_services`) is configuration/business data, not a different codepath. This directly
  answers the earlier dashboard-flash investigation's open "two page-scaffolding systems" finding
  for new tenants going forward: new tenants use the shared capability system, not a bespoke branch.
- **Rollout order, stated explicitly**: finish backend + dashboard capabilities first (Services,
  Staff↔Services, Orders, Catalog/Store) → only then build the tenant's initial Home/Public Page.
  Building the page is downstream of the capabilities being real, not built in parallel or first.
- **A future experiment, explicitly deferred, not part of current work**: once Services and Orders
  are finished (platform-wide, not just for `ali`), try building/configuring the Home Page *from the
  dashboard itself* — a dashboard-driven page builder — as the next tenant/page cycle's approach,
  rather than the current hardcoded-registry (System B) or template-JSON-seeded (System A) patterns
  found in the dashboard-flash investigation. Named here so it isn't lost, but explicitly not
  something to reopen inside the current Services/Orders work.
- **Ali is not a special implementation.** It's the same system as `rk`; it only needs its own real
  tenant data/configuration filled in (branding, WhatsApp number, page copy, the catalog/store
  activation decision) — none of which should be copied from `rk`'s actual data, per the same
  instruction that shaped the dashboard-flash fix's own commit-scope discipline.

### Current Understanding

The Ali customer-readiness recommendation written earlier the same day (`ali-customer-readiness/
2026-08-08/summary.md`, step 1: "run the page-content pipeline") is superseded in ordering, not in
content — page/content work for `ali` now explicitly waits until the backend/dashboard capabilities
(Services, Staff↔Services, Orders, Catalog/Store) are actually finished, not attempted first. The
dashboard-driven page-builder idea is a real future direction for the *next* tenant/page cycle after
that, not a near-term deliverable.

### Open Questions

- What exactly does "finish Services/Orders" mean as a concrete, scoped deliverable — a defined set
  of Implementation Contracts, or an open-ended capability maturity bar? Not defined in this
  conversation.
- Whether the dashboard-driven page-builder experiment gets its own Capability Investigation (same
  discipline as Staff↔Service got) once its turn comes, or starts more informally as a prototype —
  not decided, and explicitly not urgent right now.

### Promoted?

No — this is a rollout/sequencing decision, not itself a new Capability or ADR candidate. The
underlying "one system, shared capabilities" part reinforces an already-ratified platform Principle
(`backend/architecture.md §9`) rather than introducing a new one. The dashboard-driven page-builder
idea stays here as a named future direction until it's actually attempted once, per this project's
own Abstraction Rule (extract/promote only after real evidence, not a stated intention).

## 2026-08-20

### Context

Pre-removal audit for Tenant OS Section Editor Phase 6 ("Remove Legacy Settings" —
`page_type`/`catalog_layout`/`font`), triggered by Salman's explicit "verify before you remove"
instruction rather than executing the phase as originally written.

### Discovery

A real, separate, still-live tenant rendering system exists that the entire Tenant OS Section
Editor effort (TOS-005 + its own 6 phases) never touched or audited: the **auto-onboarded/Demo
path** (`frontend/src/router/DynamicTenantResolver.jsx` → `DynamicPage.jsx`'s `DefaultFallback` for
`page_type`, chaining into `DemoCatalogPage.jsx`/`DemoPublicPage.jsx` for `catalog_layout`) — this
is the real mechanism a brand-new tenant (not yet in `tenantRegistry`, not yet with real Section
content) uses to show *something* other than a blank "coming soon" page. `page_type`'s real value
lives in a dedicated Prisma column (`Client.pageType`), not the JSON `config` blob most other
per-tenant settings use — a real, separate storage decision from everything the Section Editor work
touched. A real, currently-live tenant (`assi`) depends on this today, confirmed in a real browser.
Full evidence: `.claudedocs/work/legacy-page-settings-audit/2026-08-20/summary.md`.

### Current Understanding

This project now has (at least) **three distinct real tenant-rendering systems**, not one:
1. **Bespoke, hand-built pages** (`tenantRegistry` — `smar`, `caracas`, `arizona`, `footlab`,
   `olivello`, `moments`, `beit-al-fakhar`, `sneakers-lb`, `sneakers-beirut`,
   `store-pilot-20260731`) — each its own dedicated route tree, never touches `DynamicPage.jsx`.
2. **Tenant OS Section Editor / Section System** (`DynamicPage.jsx` + `SECTION_MAP`, real
   `content.sections[]` content) — `mr-h`/`rk`, the two tenants this whole session's work (TOS-005,
   Phases 1-6, Customer Registry, Products/Services Separation) actually concerns.
3. **Auto-onboarded/Demo** (`DynamicTenantResolver.jsx`'s `DefaultFallback` + `page_type` +
   `DemoCatalogPage.jsx`/`DemoPublicPage.jsx` + `catalog_layout`) — for a tenant with `sections: []`
   and not in the registry; this is effectively the real **Menu/Restaurant/Store application
   foundation** for brand-new onboarding, named explicitly here for the first time as its own
   system rather than assumed-dead legacy code.

Nothing in today's work merges or plans to merge these three systems — Phase 6 was narrowed to
`font` removal specifically *because* systems 1 and 3 are real and untouched by the Section Editor
work, not because they're deprecated.

### Open Questions

- Does system 3 (auto-onboarded/Demo) get its own real audit/Capability treatment eventually — the
  same rigor TOS-005/the Section Editor gave system 2 — or does it get folded into system 2 once a
  tenant "graduates" past `sections: []`? Not decided, not even proposed yet.
- Is the `page_type` UI's dead `"landing"` option (real bug, found during the same audit — selecting
  it produces no different behavior than the default) worth a standalone fix, or does it wait for
  whatever decision eventually touches system 3 as a whole?

### Promoted?

No — real, freshly-confirmed evidence about existing system boundaries, not yet a decision about
what to do with system 3. Worth a real Capability Investigation of its own if/when Salman decides
to open that track — named here so the boundary isn't rediscovered from scratch next time.

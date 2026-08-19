# AGENT_COLLABORATION_MAP.md — What's Actually in `.claude/agent/`

**Status:** Factual inventory, not a proposal. `ENGINEERING_ORGANIZATION.md` (v1.0, locked) is the
conceptual role chart — this document is the literal file-level ground truth underneath it: what's
really in `.claude/agent/`, what each file really does (read directly, not assumed from its
filename), and how they really hand off to each other. **Adds no new role, process, or layer** —
consistent with the v1.0 freeze just declared. Where this document finds a real inconsistency, it
names it as a finding, not a fix — same Recommendation/Decision separation this project already
practices everywhere else.

---

## The real inventory — 13 agents + 1 reference doc, not the 7 CLAUDE.md currently lists

`CLAUDE.md`'s own `## Agents` section names 7: `bo-hussein`, `memory-keeper`, `system-auditor`,
`code-reviewer`, `backend-architect`, `Frontend-Architect-Agent`, `cyber-sentinel`. The folder
actually has 14 files. **6 real agents aren't in that index at all**: `dashboard-builder`,
`frontend-architect` (lowercase — see Finding 1), `generic-page-builder`, `page-builder-polish`,
`tenant-seeder`, `المحقق كونان`. Not fixed here — flagged as Finding 4 below, your call whether it's
worth updating.

| File | Real scope (from reading it, not its name) | Maps to `ENGINEERING_ORGANIZATION.md` role |
|---|---|---|
| `bo-hussein.md` | Strategic planning, priority/phase ordering, delegates, no code | bo-hussein |
| `backend-architect.md` | 4-Layer enforcement, Prisma schema, `require_service()`, Phase 54 catalog, Reservation model, endpoint map | Backend |
| `Frontend-Architect-Agent.md` | Older frontend builder — DESIGN.md/PRODUCT.md-driven, GS MAR aesthetic rules | Frontend (see Finding 1) |
| `frontend-architect.md` | Newer, more detailed frontend builder — Build Protocol, Decision Tree, catalog contract, Design Laboratory Protocol (dated 2026-07-24) | Frontend (see Finding 1) |
| `generic-page-builder.md` | Built Phase 57's `CatalogPage.jsx`/`CartPage.jsx`/`ReservePage.jsx` — the exact files central to this session's Store/Restaurant/Reservation Capability extraction | Frontend (mission likely complete — see Finding 2) |
| `dashboard-builder.md` | Built Phase 56's `GenericAdminDashboard` (sidebar, Kanban, stats, Reservations tab) | Frontend (mission likely complete — see Finding 2) |
| `page-builder-polish.md` | Seeds + polishes a new tenant's `page_content.json` (copy, CTAs, offers) | Frontend/Onboarding |
| `code-reviewer.md` | Audits: multi-tenant leaks, `require_service()` compliance, 4-layer breaches, Phase 54 contract, FM12 — blocks on 🔴 | Architecture |
| `cyber-sentinel.md` | Security-specific: 10 threat classes (T1–T10), scan→rank→**fix**→verify, standardized report | Architecture (security-focused) |
| `system-auditor.md` | Full codebase scan (security + architecture + schema + FM12), writes a dated report, updates memory | Architecture (automation of `/audit`) |
| `tenant-seeder.md` | Onboarding executor — JSON → registered tenant → seeded catalog → live demo link. **The most maturely documented file** — already has a real Service Contract (Mission/Context Investigation/Inputs/Outputs/Dependencies/Evidence) | Backend + Frontend (orchestrates both) |
| `المحقق كونان.md` | Parses a WhatsApp conversation into the tenant-onboarding JSON, schema v2.1 | Upstream of `tenant-seeder` |
| `konaan-onboarding-schema.md` | **Not an agent** — no `name`/`tools` header, pure reference doc. `كونان.md` tells you to read it first, but see Finding 3 | (reference only) |
| `memory-keeper.md` | Reads session + `MEMORY.md`, writes only new entries, no duplicates | Memory (see Finding 5) |

---

## Real collaboration chains — grounded in each file's own stated handoffs, not inferred

**1. Onboarding chain** (the most fully-specified one — `tenant-seeder.md` already writes this out
as a real Service Contract):
```
المحقق كونان  (WhatsApp text → JSON, schema v2.1)
      │
      ▼
tenant-seeder  (6 steps: parse → register+JWT → design settings → seed catalog →
                mandatory scripts/data/{slug}/ files → verify+deliver link)
      │
      ▼ [informal, same-thread handoff — not a dispatch, per tenant-seeder.md's own Dependencies]
Frontend Architect  (only for custom-built tenants; template-based tenants need nothing —
                     DynamicTenantResolver handles it automatically)
      │
      ▼
page-builder-polish  (copy/CTA polish pass on page_content.json)
```

**2. Build chain**: `backend-architect` (APIs/Services/Prisma) and one of the two frontend agents
(Finding 1) build in parallel, same as this session's own Capability Decisions Pipeline describes.
Three separate audit agents then look at the result from three different angles — not redundant,
genuinely different scopes: `code-reviewer` (architecture/multi-tenancy compliance, blocks on 🔴),
`cyber-sentinel` (security threats specifically, fixes in place rather than just reporting),
`system-auditor` (full scan + dated report + memory update, the one wired to `/audit`).

**3. Capability-specific builders, real current status**: `generic-page-builder.md` and
`dashboard-builder.md` read like completed-mission blueprints, not standing roles — the exact
`CatalogPage.jsx`/`CartPage.jsx`/`GenericAdminDashboard.jsx` files they were built to produce are
already live and were directly investigated this session (Capability Reference Extraction). Same
shape as `Capability Extraction`'s own status in `ENGINEERING_ORGANIZATION.md`: real, done, kept for
reference, not actively re-invoked unless a new Phase-56/57-shaped mission shows up.

---

## Findings — real, not fixed here

1. **Two Frontend Architect files, not one.** `Frontend-Architect-Agent.md` (capitalized, older,
   DESIGN.md/PRODUCT.md-driven) and `frontend-architect.md` (lowercase, newer — has a whole
   "Design Laboratory Protocol" section dated 2026-07-24 that the capitalized file doesn't).
   `CLAUDE.md`'s own index only names the capitalized one. Real drift, unresolved — this document
   doesn't pick a winner, just states the fact.
2. **`generic-page-builder.md` and `dashboard-builder.md` are almost certainly finished missions**,
   still sitting as if standing agents. Consistent with the pattern already established for
   `Capability Extraction` — worth the same "transitional, not permanent" label if you want it
   applied here too, not applied unilaterally in this pass.
3. **`konaan-onboarding-schema.md` is stale relative to what's actually enforced.** `tenant-seeder.md`
   already caught this in its own Context Investigation: the real, enforced schema is v2.1 (per
   `.claude/skills/seeding/demo/01-parse-tenant-json.md`'s actual validation code), but
   `konaan-onboarding-schema.md` — the file `المحقق كونان.md` tells you to read *first* — shows a
   different, older v1.0 structure. Not new, just worth surfacing here since it directly affects how
   these two files collaborate.
4. **`CLAUDE.md`'s Agents index lists 7 of 13 real agents.** Missing: `dashboard-builder`,
   `frontend-architect` (lowercase), `generic-page-builder`, `page-builder-polish`, `tenant-seeder`,
   `المحقق كونان`.
5. **`memory-keeper.md`'s own Step 1 points to a Windows path** —
   `C:\Users\Lenovo\Desktop\WhatsApp-Appointment-Booking-System\memory\MEMORY.md` — that doesn't
   exist on this Ubuntu machine. Every real memory write this entire session has gone to
   `/home/musicmaster/.claude/projects/-home-musicmaster-Downloads-WhatsApp-Appointment-Booking-System2-main/memory/`
   instead. If `memory-keeper` is ever actually invoked by name rather than the pattern being
   followed manually (as has happened all session), it would be pointed at a path that doesn't exist.

None of these five are fixed in this pass — named so they're visible, not because they need action
right now. Whether any of them is worth a real fix is your call, separate from this document
existing.

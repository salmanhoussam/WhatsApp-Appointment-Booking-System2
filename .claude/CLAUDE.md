CLAUDE.md -- SalmanSaaS Platform

## Vision
منصة SaaS عربية موحدة — سيرفر واحد، DB واحد، 3 modules:
  booking   → حجز شاليهات/فلل/فنادق  (smar — Live ✅)
  restaurant → قوائم مطاعم + طلبات   (caracas, arizona — Live ✅)
  store      → متجر إلكتروني          (footlab, olivello, anas — Live ✅)

## Stack
FastAPI (Python) · Prisma + Supabase (PostgreSQL) · React/Vite · Framer Motion · GS MAR Glassmorphism

## Folder Structure
app/
  api/v1/
    public/       -- Public endpoints (no auth): booking, restaurant, store
    admin/        -- Tenant admin endpoints (JWT required)
    super/        -- Super Admin only (Salman)
    auth.py       -- Login + Register + SSO
  services/       -- Business logic per module
  repositories/   -- Prisma queries ONLY
  core/           -- config, security, tenant resolver
frontend/src/
  pages/[slug]/   -- Per-tenant pages
  router/tenants/ -- Registry-based lazy routing
prisma/
  schema.prisma   -- Single source of truth — ALL modules here

### Tenants — measured against production, 2026-09-27

The table this replaces was written 2026-07-18 and had drifted into a wrong shape, not just stale
rows: it used **one** "Status" column for **two independent facts** — whether a DB `clients` row
exists, and whether a frontend page/registry entry exists. Those two sets barely overlap today, so
they are now separate columns. Every value below is a real read (`SELECT` on production via the
sealed read-only reader) plus a real read of `frontend/src/router/tenants/index.js`, not a memory
claim. It listed five slugs (`olivello`, `moments`, `anas`, `sneakers-lb`, `sneakers-beirut`) as
"Live ✅" that have **no `clients` row at all**, and omitted every tenant that actually carries
traffic.

**`clients` rows in production: 9. Total.**

| Slug | `vertical` | Reservations | Barbers | Services | Frontend | Note |
| :--- | :--- | ---: | ---: | ---: | :--- | :--- |
| **rk** | barber | 32 | 2 | 7 | generic | Real paying tenant · reference Barber template |
| **barberlab-test** | barber | 22 | 2 | 11 | generic | The ONLY tenant for live WhatsApp/bot testing |
| **mr-h** | barber | 11 | 2 | 7 | generic | Real tenant (Mister H) |
| **alzabt-demo** | barber | 1 | 2 | 6 | generic | Demo · excluded from tenant-population decisions |
| smar | — | 0 | 0 | 7 | `pages/smar/` + registry | Legacy · zero activity |
| caracas | — | 0 | 0 | 0 | `pages/caracas/` + registry | Legacy · zero activity |
| arizona | — | 0 | 0 | 0 | `pages/arizona/` + registry | Legacy · zero activity |
| footlab | — | 0 | 0 | 0 | `pages/footlab/` + registry | Legacy · zero activity |
| beit-al-fakhar | — | 0 | 0 | 0 | `pages/beit-al-fakhar/` | Legacy · never in the old table |

**Frontend without a DB row** (registry entry and/or `pages/` folder, no `clients` row):
`olivello` · `moments` · `alzabt` (`pages/alzabt/` is the platform's own site, not a tenant).
**`anas` · `sneakers-lb` · `sneakers-beirut` exist in neither** — no row, no registry entry, no
page folder.

**The four live tenants have no `pages/{slug}/` folder by design** — they render through
`pages/generic/` driven by `client.config.content.sections`. A missing page folder is therefore
*not* evidence a tenant is unbuilt; for a generic tenant it is the expected state.

`vertical` is set on exactly the four barber tenants; the five legacy rows carry `NULL`. The
`clinic` vertical is code-complete through P4/P5-B but has **zero** tenants — `cliniclab-test` does
not exist, and creating it needs its own explicit production-write authorization.

Rule: `/demo/{slug}` auto-redirects to `/{slug}/{defaultRedirect}` for registry tenants. Only auto-onboarded (generic) tenants use `/demo/{slug}` directly.

## Commands
start_dev.bat              -- Start FastAPI + Prisma + React locally
/team-onboarding           -- START of session: readiness health check, read-only — prints the
                              PRODUCTION GATE state and its source, how many agents exist vs how
                              many the harness actually sees (a mismatch is printed 🔴, never
                              silenced — that mismatch went unnoticed for three months), the
                              targeted tenant or "none", and only the constraints relevant today.
                              Built 2026-09-27; it did not exist before.
/session-open              -- START of session: reload context, git status, last report
/session-close             -- END of session: strict executor of the mandatory five-step Session
                              Closure Checklist below. Rewritten 2026-09-27 — it no longer writes
                              to the deprecated .claude/memory.md, no longer updates the stale
                              todo_list.md, and no longer asks for estimates (count, never
                              estimate). It refuses to close on uncommitted app/frontend/prisma/
                              scripts changes or a missing/future-dated session file.
/scaffold-tenant [slug]    -- Scaffold new tenant (Frontend + Backend + DB seed)
/deploy                    -- Pre-flight checks + git push → Railway auto-deploy
/audit                     -- Full audit: security, architecture, schema, frontend
/audit --pre-deploy        -- Strict — blocks deploy on any 🔴
/audit --quick             -- Security scan only
/memory-sync               -- Sync memory after schema changes or long sessions
/bo-hussein [idea/goal]    -- CEO Orchestrator: analyzes idea, searches web, delegates to agents
/architecture-review [topic] [--window N] -- Recurring maturity review of a Capability/Interface/
                           System (default window: last 14 sessions) — evidence-only, appends to
                           .claudedocs/maturity/[topic].md
/fix [ISSUE-ID]            -- Looks up a known issue by ID, assigns the right specialist agent, fixes it
/polish                    -- Syncs memory, todos, session report, schema docs in one command
/seed [slug]                -- Seeds catalog data for a tenant from a local JSON file

## Rules (Path-Scoped — auto-loaded)
rules/global.md                  -- Always: multi-tenancy, 4-layer, session protocol
rules/engineering-manager-mode.md -- Always: EM/Tech-Lead persona — minimal changes, ask before redesigns, structured after-task reports
rules/team-roles.md              -- Always: internal Architecture Guardian/Documentation Manager/QA/Code Reviewer roles, coordinated by the EM
rules/documentation-policy.md    -- Always: ADR → Evolution Log → Architecture Plan → Implementation Contract → Implementation → Verification → Architecture Review → Post-Implementation Review → Archive; folder structure per ADR-0003 (adr/, evolution/, maturity/, architecture/ — itself six layers: README/INDEX/TENANT_OS.md, principles/, capabilities/, plus other domain plans — implementation/, verification/, reviews/, decisions/, sessions/, archive/)
rules/service-execution-constitution.md -- Always: how every independent Service investigates context, leaves evidence, and handles missing input, before any Service Contract
rules/repository-hygiene.md      -- Always: Drift Categories (Forgotten/Deferred/Experimental/External), Reference Validation Rule, repo audit evidence convention; Bo Hussein's repo-trustworthiness AND architecture-review-due checks
rules/text-context-rule.md       -- Always: every message belongs to the operation the user is in
                           NOW; a text written for another one is never reused because it is "close",
                           silence is a missing text (not neutral behaviour), and a key's NAME is part
                           of the contract. Ratified 2026-09-24 after 13 real, dated instances
rules/investigation-protocol.md  -- Always: bug/root-cause investigations write evidence files, report in Confirmed/Side Findings/Unknowns, separate Recommendation from Decision from Execution
rules/architecture-review-loop.md -- Always: recurring maturity review per Capability/Interface/System (.claudedocs/maturity/<topic>.md), distinct from the one-shot Post-Implementation Review; pattern-escalation rule (2nd independent finding → ADR/Review candidate)
rules/context-recovery-protocol.md -- Always: after a Compact/"Continue"/new session/long pause, run
                           Automatic Context Recovery (planning docs, latest evidence, capability
                           refs, implementation plan, memory, git branch/commit/status) and produce
                           a short recovery report BEFORE any implementation work — repository always
                           wins over memory on conflict; wait for explicit approval before resuming
rules/backend/architecture.md    -- 4-Layer strict, Supabase ports, JWT roles
rules/backend/api-rules.md       -- Routes: zero DB, zero logic, Pydantic only
rules/backend/service-system.md  -- client_services table + require_service() pattern
rules/frontend/architecture.md      -- @data/@domain/@presentation layers
rules/frontend/routing.md           -- Registry lazy routing, FM12 rule
rules/frontend/animations.md        -- Awwwards springs, parallax, video pivot
rules/frontend/scaffolding.md       -- New tenant folder structure
rules/frontend/feature-structure.md -- Bulletproof React: hooks/ layer, useQuery, no fetch in sections/
rules/frontend/browser-verification-protocol.md -- Real Playwright MCP browser evidence required
                           before frontend conclusions; what to always collect, what never to assume
                           from console/network/curl alone (established 2026-08-01)
rules/smar-tenant.md                -- Smar-specific complete reference
rules/phone-numbers.md           -- Always: storage WITH the country code, entry WITHOUT it
                           (country selector defaulting to +961 in front of every phone field);
                           app/core/phone.py is the one implementation; a send is not "sent" until
                           it succeeded. Established 2026-09-08 from a real silent invite failure
rules/backend/security.md        -- Route protection matrix, JWT token types, multi-tenancy
                           isolation, the owner/admin/barber vocabulary (2026-09-12), rate limits,
                           secret management, CORS
rules/storage-tenant.md          -- Supabase Storage: one `properties` bucket, isolation by
                           `{slug}/` prefix only, the full folder tree, upload path logic
rules/tenant-onboarding.md       -- Mandatory per-tenant file checklist AND §7's Completion Gate:
                           Client → User → Services → Settings → Page Content → Media → public
                           page renders → dashboard renders. Anything less is Partially Completed

*The four rules above were auto-loading and governing the repo while absent from this list —
found 2026-09-27 by the `code-reviewer` subagent reviewing this very file. The list under-reported
what actually binds; that is the opposite failure mode from the stale tenant table above, in the
same document.*

## Agents (.claude/agents/) — migrated and verified 2026-09-27

🔴 **Why this path changed.** Until 2026-09-27 these files lived in `.claude/agent/` — **singular** —
and every one of them began with a bare `name:` line, with **no `---` frontmatter fences**. Claude
Code reads `.claude/agents/` and requires the fences, so for roughly three months **not one of these
agents was ever registered with the harness**: the available subagent types in every session were
only the built-ins. `/bo-hussein` saying "delegating to backend-architect" meant the main session
read that markdown file as instructions to itself and did the work alone — which is exactly why no
agent report was ever seen, and why `documentation-policy.md` rule 6 (name the agent that executed
each phase) had never once fired. Both defects were fixed by migration + two `---` lines per file,
and the fix was proven by spawning `code-reviewer` in an isolated git worktree from a fresh nested
session; it loaded its own definition and quoted it verbatim.

**A new or edited agent file does not hot-load into a running session** — same as the Playwright MCP
(`rules/frontend/browser-verification-protocol.md`). It registers when the next session starts.

bo-hussein             -- CEO Orchestrator: strategic planning, web search, delegates to all agents
memory-keeper          -- Updates the auto-memory system (~/.claude/projects/<project>/memory/)
                           without duplication (called by /session-close); .claude/memory.md is
                           legacy/deprecated — see its own header
system-auditor         -- Full codebase scan (called by /audit)
code-reviewer          -- Architecture + multi-tenancy compliance
backend-architect      -- FastAPI / Prisma / module design
frontend-architect     -- React 19 / Framer Motion / GS MAR builder (the deprecated duplicate
                           `Frontend-Architect-Agent.md` was moved out of the agents folder
                           2026-09-27 → `.claudedocs/archive/`, so it can no longer be mistaken
                           for a second agent)
cyber-sentinel         -- Security engineer: multi-tenancy leaks, auth, race conditions, secrets (10 threat classes)
dashboard-builder      -- Admin dashboard v2: sidebar layout, stats, orders kanban, reservations tab
generic-page-builder   -- Generic frontend pages (CatalogPage/CartPage/ReservePage) driven by module_key
page-builder-polish    -- Builds a new tenant's page content, then applies visual polish for production
tenant-seeder          -- Creates new tenants from one JSON: ordered API calls, catalog seed, demo link
كونان (المحقق كونان.md) -- Extracts onboarding data from WhatsApp conversations into tenant-ready
                           JSON for tenant-seeder; its schema reference moved 2026-09-27 to
                           `.claude/reference/konaan-onboarding-schema.md` (it is a schema document,
                           not an agent — no frontmatter — so it does not belong in `agents/`), and
                           the two hard paths inside the agent file were updated to match.
                           ✅ Its Arabic `name:` (`كونان — محقق الأونبوردينغ`) DOES register as a
                           callable subagent type — verified 2026-09-27 when all 12 appeared in the
                           harness's own available-agents list. Arabic names with spaces and an
                           em-dash are accepted; no rename needed.
                           ⚠️ Salman, 2026-09-27: "كونان is an older version of Lia" — whether any
                           of it still serves demo creation is an OPEN question, not settled here.
                           It predates Lia and overlaps her extraction role; see the note below.

## Skills (.claude/skills/)
backend/  -- database-architecture, supabase-prisma, n8n-automation
frontend/ -- gs-mar-design-system, admin-dashboard-builder, awwwards-animations,
             webgl-awwwards, frontend-component-builder, ai-agent-canvas,
             ui-ux-pro-max, frontend-design, frame-sequence-canvas,
             tanstack-query (React Query v5 — multi-tenant cache layer),
             mobile-viewport-quirks (svh/dvh, sticky pin-release, iOS safe areas),
             browser-verification-capability (real Playwright MCP browser proof — not yet an
             Agent, see architecture/ENGINEERING_ORGANIZATION.md)
shared/   -- auto-reporting, project-health, motion-design (Higgsfield video ads — /motion-design)
general/  -- docx, pdf, pptx, xlsx, design-sprint, hooked-ux, refactoring-ui, mcp-builder,
             safe-refactor (behavior-preserving structural cleanup only — moves logic between
             layers, dedups, simplifies; any behavior/authorization/data-model/architecture change
             found along the way escalates to an Implementation Contract/ADR instead, never
             absorbed silently — established 2026-08-09), + more
top-level: impeccable/ (craft/polish/animate — referenced directly by frontend-architect.md),
seeding/, supabase-ref/, ui-ux-pro-max/.

**`.claude/skills/` now holds 8 real directories and zero symlinks (2026-09-27).** The note that
stood here was wrong on both of its claims, and how it was wrong is worth keeping: it said ~20
top-level skill folders "exist on disk … but are untracked in git", and they were in fact **tracked**
— all 21 of them — as *symlinks* pointing out of this repo's own skills folder into a second tree,
`.agents/skills/`, installed by an external skills package manager (`skills-lock.json`). So
`.claude/skills/` was not one folder with stray extras; **two thirds of it lived somewhere else.**

That tree was removed on Salman's explicit instruction, after measuring that nothing in this project
depended on any of the 21: zero references from any agent, rule, or command — the only mention of
four of them was the stale note above, and `shared/motion-design` reaches Higgsfield through the
`mcp__higgsfield__*` MCP tools, not through the `higgsfield-*` skill folders. `impeccable` was the
one real dependency and it was already self-sufficient (its own `scripts/`, including an untracked
`scripts/lib/` proven byte-identical to the copy in the deleted tree); its 19 hard paths into
`.agents/` across `SKILL.md`, `reference/*.md` and `scripts/hook-admin.mjs` were repointed at
`.claude/skills/impeccable/`, and it was smoke-tested before and after deletion.

Everything deleted is recoverable from history (`git show <commit>^:<path>`) — it was committed, so
this is reversible, not lost. The 21 removed were third-party design/image skills: animation-
vocabulary, apple-design, brandkit, design-taste-frontend(+v1), emil-design-eng,
full-output-enforcement, gpt-taste, the five higgsfield-*, high-end-visual-design,
imagegen-frontend-mobile/web, image-to-code, improve-animations, redesign-existing-projects,
review-animations, stitch-design-taste.

## Critical Rules (always in mind)
1. كل DB query فيها clientId — لا استثناء
2. client_services يُفحص قبل كل module endpoint
3. لا business logic في Routes — Services فقط
4. لا Prisma calls خارج Repositories
5. SUPER_ADMIN = سلمان فقط — User record منفصل عن smar client

## Auto-Reporting
"done" / "خلصنا"           → write session report to .claudedocs/sessions/YYYY-MM-DD.md
prisma/schema.prisma edit  → append to .claudedocs/architecture/database_report.md
"deploy" / "ارفع"          → run /audit --pre-deploy
"what's left?" / "شو باقي" → print inline roadmap status
context compacted (auto OR manual /compact) → BEFORE continuing any other work, write the
  received compact summary verbatim (lightly reformatted, all 8 summary sections kept) into
  today's .claudedocs/sessions/YYYY-MM-DD.md under a "## Compact Summary" heading (create the
  file from the usual session template first if it doesn't exist yet for today). This is a
  standing rule (established 2026-07-23, Salman's explicit instruction) — a compact must never
  silently drop session history that only lived in ephemeral context; the session log is its
  permanent home. Do this silently, without asking, every single time a compact summary appears
  at the start of a turn.
before saying "Compact" or "Ready for Compact" (self-initiated OR about to run /compact) →
  Session Closure Checklist, mandatory, in order (established 2026-08-01, Salman's explicit
  instruction — this must never require him to remind you again):
  1. Update .claudedocs/sessions/YYYY-MM-DD.md — what was accomplished, what didn't start, the
     exact resume point.
  2. Update any open Investigation/Evidence work (.claudedocs/work/.../summary.md) — close it out
     or state its real current status, never leave it silently stale.
  3. Update Evolution/Rules if a new rule or Capability actually emerged this session (per the
     Abstraction Rule — only if real, not speculative).
  4. Update Memory — only for a genuine long-term decision or a real change in how work gets done,
     not routine progress.
  5. Write a Report inside the session file: Completed / Open Risks / Next Milestone /
     START HERE NEXT SESSION.
  Only after all five does the turn end with "Ready for Compact."

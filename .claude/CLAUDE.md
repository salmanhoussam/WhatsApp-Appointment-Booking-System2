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

### Active Clients & Canonical Demo URLs (Updated 2026-07-18)

*Note: The status below reflects the codebase tenant registry and build state. The manual Cloudflare DNS binding for `demo.salmansaas.com` is pending, so live resolution may vary.*

| Slug | Module | Status | Verification Source |
| :--- | :--- | :--- | :--- |
| **smar** | booking | Live ✅ | Original baseline |
| **caracas** | restaurant | Live ✅ | `memory.md` (Phase 63: Done 2026-05-15) |
| **footlab** | store | Live ✅ | `memory.md` (Phase 62: Done 2026-05-15) |
| **arizona** | restaurant | Live ✅ | `memory.md` (Phase 70) + `tenantRegistry` |
| **olivello** | store/showcase | Live ✅ | `tenantRegistry` + Canonical URLs |
| **moments** | occasion pages | Live ✅ | `memory.md` (Commit b9448f3) |
| **anas** | store (ceramics) | Live (Placeholder) | `memory.md` (2026-07-13/14) |
| **sneakers-lb** | store | Registered (Unverified) | In registry, lacks standalone `pages/` |
| **sneakers-beirut** | store | Registered (Unverified) | In registry, lacks standalone `pages/` |

Rule: `/demo/{slug}` auto-redirects to `/{slug}/{defaultRedirect}` for registry tenants. Only auto-onboarded (generic) tenants use `/demo/{slug}` directly.

## Commands
start_dev.bat              -- Start FastAPI + Prisma + React locally
/session-open              -- START of session: reload context, git status, last report
/session-close             -- END of session: write report, update memory, todo list
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

## Rules (Path-Scoped — auto-loaded)
rules/global.md                  -- Always: multi-tenancy, 4-layer, session protocol
rules/engineering-manager-mode.md -- Always: EM/Tech-Lead persona — minimal changes, ask before redesigns, structured after-task reports
rules/team-roles.md              -- Always: internal Architecture Guardian/Documentation Manager/QA/Code Reviewer roles, coordinated by the EM
rules/documentation-policy.md    -- Always: ADR → Evolution Log → Architecture Plan → Implementation Contract → Implementation → Verification → Architecture Review → Post-Implementation Review → Archive; folder structure per ADR-0003 (adr/, evolution/, maturity/, architecture/ — itself six layers: README/INDEX/TENANT_OS.md, principles/, capabilities/, plus other domain plans — implementation/, verification/, reviews/, decisions/, sessions/, archive/)
rules/service-execution-constitution.md -- Always: how every independent Service investigates context, leaves evidence, and handles missing input, before any Service Contract
rules/repository-hygiene.md      -- Always: Drift Categories (Forgotten/Deferred/Experimental/External), Reference Validation Rule, repo audit evidence convention; Bo Hussein's repo-trustworthiness AND architecture-review-due checks
rules/investigation-protocol.md  -- Always: bug/root-cause investigations write evidence files, report in Confirmed/Side Findings/Unknowns, separate Recommendation from Decision from Execution
rules/architecture-review-loop.md -- Always: recurring maturity review per Capability/Interface/System (.claudedocs/maturity/<topic>.md), distinct from the one-shot Post-Implementation Review; pattern-escalation rule (2nd independent finding → ADR/Review candidate)
rules/backend/architecture.md    -- 4-Layer strict, Supabase ports, JWT roles
rules/backend/api-rules.md       -- Routes: zero DB, zero logic, Pydantic only
rules/backend/service-system.md  -- client_services table + require_service() pattern
rules/frontend/architecture.md      -- @data/@domain/@presentation layers
rules/frontend/routing.md           -- Registry lazy routing, FM12 rule
rules/frontend/animations.md        -- Awwwards springs, parallax, video pivot
rules/frontend/scaffolding.md       -- New tenant folder structure
rules/frontend/feature-structure.md -- Bulletproof React: hooks/ layer, useQuery, no fetch in sections/
rules/smar-tenant.md                -- Smar-specific complete reference

## Agents (.claude/agent/)
bo-hussein             -- CEO Orchestrator: strategic planning, web search, delegates to all agents
memory-keeper          -- Updates memory.md without duplication (called by /session-close)
system-auditor         -- Full codebase scan (called by /audit)
code-reviewer          -- Architecture + multi-tenancy compliance
backend-architect      -- FastAPI / Prisma / module design
Frontend-Architect-Agent -- React 19 / Framer Motion / GS MAR
cyber-sentinel         -- Security engineer: multi-tenancy leaks, auth, race conditions, secrets (10 threat classes)

## Skills (.claude/skills/)
backend/  -- database-architecture, supabase-prisma, n8n-automation
frontend/ -- gs-mar-design-system, admin-dashboard-builder, awwwards-animations,
             webgl-awwwards, frontend-component-builder, ai-agent-canvas,
             ui-ux-pro-max, frontend-design, frame-sequence-canvas,
             tanstack-query (React Query v5 — multi-tenant cache layer),
             mobile-viewport-quirks (svh/dvh, sticky pin-release, iOS safe areas)
shared/   -- auto-reporting, project-health, motion-design (Higgsfield video ads — /motion-design)
general/  -- docx, pdf, pptx, xlsx, design-sprint, hooked-ux, refactoring-ui, + more

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

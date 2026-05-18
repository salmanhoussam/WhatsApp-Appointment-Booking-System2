CLAUDE.md -- SalmanSaaS Platform

## Vision
منصة SaaS عربية موحدة — سيرفر واحد، DB واحد، 3 modules:
  booking   → حجز شاليهات/فلل/فنادق  (smar — Live ✅)
  restaurant → قوائم مطاعم + طلبات   (caracas — migration pending)
  store      → متجر إلكتروني          (footlab — migration pending)

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

## Active Clients
smar      → booking    → smar.salmansaas.com     ✅ Live
caracas   → restaurant → caracas.salmansaas.com  🔄 Migration pending
footlab   → store      → footlab.salmansaas.com  🔄 Migration pending

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

## Rules (Path-Scoped — auto-loaded)
rules/global.md                  -- Always: multi-tenancy, 4-layer, session protocol
rules/backend/architecture.md    -- 4-Layer strict, Supabase ports, JWT roles
rules/backend/api-rules.md       -- Routes: zero DB, zero logic, Pydantic only
rules/backend/service-system.md  -- client_services table + require_service() pattern
rules/frontend/architecture.md   -- @data/@domain/@presentation layers
rules/frontend/routing.md        -- Registry lazy routing, FM12 rule
rules/frontend/animations.md     -- Awwwards springs, parallax, video pivot
rules/frontend/scaffolding.md    -- New tenant folder structure
rules/smar-tenant.md             -- Smar-specific complete reference

## Agents (.claude/agent/)
bo-hussein             -- CEO Orchestrator: strategic planning, web search, delegates to all agents
memory-keeper          -- Updates memory.md without duplication (called by /session-close)
system-auditor         -- Full codebase scan (called by /audit)
code-reviewer          -- Architecture + multi-tenancy compliance
backend-architect      -- FastAPI / Prisma / module design
Frontend-Architect-Agent -- React 19 / Framer Motion / GS MAR

## Skills (.claude/skills/)
backend/  -- database-architecture, supabase-prisma, n8n-automation
frontend/ -- gs-mar-design-system, admin-dashboard-builder, awwwards-animations,
             webgl-awwwards, frontend-component-builder, ai-agent-canvas,
             ui-ux-pro-max, frontend-design
shared/   -- auto-reporting, project-health
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

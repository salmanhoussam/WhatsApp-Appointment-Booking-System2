CLAUDE.md -- Project BrainTech

## Stack
FastAPI (Python) · Prisma + Supabase (PostgreSQL) · React/Vite · Framer Motion · GS MAR Glassmorphism

## Folder Structure
app/           -- FastAPI routes, services, repositories
frontend/src/  -- React components and pages
prisma/        -- Database schema

## Commands
start_dev.bat              -- Start FastAPI + Prisma + React locally
/session-open              -- START of session: reload context, git status, last report
/session-close             -- END of session: write report, update memory, todo list
/scaffold-tenant [slug]    -- Scaffold new tenant (Frontend + Backend)
/deploy                    -- Pre-flight checks + deploy
/audit                     -- Full audit: security, architecture, schema, frontend
/audit --pre-deploy        -- Strict audit — blocks deploy on any 🔴
/audit --quick             -- Security scan only
/memory-sync               -- Sync memory.md after schema changes or long sessions

## Rules (Path-Scoped — auto-loaded)
rules/global.md            -- Always active: multi-tenancy, 4-layer, session protocol
rules/backend/             -- Active on: app/**, prisma/**, scripts/**
rules/frontend/            -- Active on: frontend/src/**, frontend/public/**

## Agents (.claude/agent/)
memory-keeper              -- Updates memory.md without duplication (called by /session-close)
system-auditor             -- Full codebase scan (called by /audit)
code-reviewer              -- Architecture compliance reviews
backend-architect          -- FastAPI / Prisma / multi-tenancy guidance
Frontend-Architect-Agent   -- React 19 / Framer Motion / GS MAR guidance

## Skills (.claude/skills/)
skills/backend/            -- database-architecture, supabase-prisma, n8n-automation
skills/frontend/           -- gs-mar-design-system, admin-dashboard-builder, awwwards-animations, webgl-awwwards, frontend-component-builder, ai-agent-canvas, ui-ux-pro-max, frontend-design
skills/shared/             -- auto-reporting, project-health
skills/general/            -- docx, pdf, pptx, xlsx, design-sprint, hooked-ux, refactoring-ui, + more

## Auto-Reporting (skills/shared/auto-reporting/SKILL.md)
"done" / "خلصنا"           → write session report to .claudedocs/sessions/YYYY-MM-DD.md
prisma/schema.prisma edit  → append to .claudedocs/database_report.md
"deploy" / "ارفع"          → run /audit --pre-deploy
"what's left?" / "شو باقي" → print inline roadmap status

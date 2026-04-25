# Company Operations Skills Framework
## Salman SaaS (Beit Smar) — Lean 2-3 Person Team

**Goal:** Build the operational, technical, and business skills needed to run a profitable SaaS with minimal overhead.

**Current State:** MVP ready (frontend ✅, backend ✅, admin dashboard ✅), launching with 1-2 initial tenants.

**Team Structure (Recommended):**
- **You (Owner):** Product + Operations + Business Development
- **Person #2 (Generalist Dev):** Full-Stack (can own backend OR frontend depending on strength)
- **Person #3 (Optional):** Customer Success + Admin Operations (can start part-time)

---

# TIER 1: FOUNDATIONAL OPERATIONS (Critical to Revenue)

These skills directly impact whether bookings happen and revenue flows.

## 1.1 — Revenue & Payment Operations

### What You Must Know (Owner)
- [ ] **Payment Flow End-to-End** (Whish, OMT, Card, Cash, WhatsApp)
  - *Why:* Payment failures = lost revenue. You need to diagnose why a booking didn't convert.
  - *Skills:*
    - Read Stripe/Whish API logs and identify failed transactions
    - Understand payment method routing (which tenant uses which method?)
    - Manual refund/chargeback process (when & why)
  - *Time to Learn:* 4-6 hours
  - *Resources:* Your code: `app/services/payment_service.py`, Stripe/Whish dashboards
  - *Exercise:* Simulate a failed payment → trace it through logs → fix it

- [ ] **Pricing Strategy & Currency Handling**
  - *Why:* Wrong pricing = tenant complaints or revenue leakage.
  - *Skills:*
    - How currency conversion works (USD vs SAR vs AED)
    - Dynamic vs static pricing per unit
    - Seasonal pricing adjustments
  - *Time to Learn:* 2-3 hours
  - *Resources:* `schema_refactor_plan.md` (currency field), `Price` table schema
  - *Exercise:* Add a summer pricing surge for Beit Smar villas

- [ ] **Booking Confirmation & WhatsApp Automation**
  - *Why:* Customer confirms booking via WhatsApp. If this breaks, bookings hang.
  - *Skills:*
    - How WhatsApp message flows work (n8n triggers → backend → customer)
    - Reading WhatsApp webhook logs
    - Resendig confirmation messages manually (backup plan)
  - *Time to Learn:* 3-4 hours
  - *Resources:* `database_pooler_plan.md` (error handling), `app/services/whatsapp_service.py`
  - *Exercise:* Manually trigger a WhatsApp confirmation for a test booking

---

## 1.2 — Tenant Onboarding & Multi-Tenancy Operations

### What You Must Know (Owner)
- [ ] **Onboarding a New Tenant (End-to-End Checklist)**
  - *Why:* Each new tenant (e.g., "demo.salmansaas.com") requires 5 coordinated steps. Missing one breaks that tenant.
  - *Skills:*
    - Running the `new_tenant_checklist.md` from memory
    - CORS configuration (why `https://demo.salmansaas.com` needs to be whitelisted)
    - Database seeding (creating the Client + Unit rows)
    - Testing: can the tenant actually book?
  - *Time to Learn:* 3-4 hours (hands-on)
  - *Resources:* `new_tenant_checklist.md`, `app/core/config.py` (CORS_ORIGINS)
  - *Exercise:* Onboard a test tenant from scratch without looking at the checklist

- [ ] **Tenant Configuration Management**
  - *Why:* Each tenant has unique branding, WhatsApp number, currency, features.
  - *Skills:*
    - Updating tenant config via Admin Dashboard (or SQL if needed)
    - Understanding feature flags (which tenant has `spatial`, `listings`, `payment`?)
    - Debugging a tenant that "sees wrong colors" or "wrong WhatsApp number"
  - *Time to Learn:* 2-3 hours
  - *Resources:* `schema_refactor_plan.md` (Client table fields)
  - *Exercise:* Change Beit Smar's primary color from gold to blue, verify on live site

---

## 1.3 — Customer Support & Troubleshooting (Critical Path)

### What You Must Know (Owner)
- [ ] **Diagnosing a Broken Booking**
  - *Why:* "My booking button doesn't work!" = you need to find the root cause in 15 minutes.
  - *Skills:*
    - Check: Is it a frontend bug? Backend API error? Database issue? CORS problem?
    - Reading browser console (F12) + network tab (XHR requests)
    - Reading backend logs on Railway
    - Identifying if it's "widespread" (all tenants) vs "tenant-specific"
  - *Time to Learn:* 4-5 hours
  - *Resources:* `database_pooler_plan.md` (error handling patterns), your FastAPI logs
  - *Exercise:* Introduce a bug (e.g., break CORS), find it within 10 minutes

- [ ] **Handling Booking Disputes & Cancellations**
  - *Why:* Customer books but wants to cancel. You need to know refund policy, cancellation logic, and how to execute it.
  - *Skills:*
    - Reading booking status in database (CONFIRMED, CANCELLED, PENDING_PAYMENT)
    - Manual refund process (who receives it, how long it takes)
    - Communicating clearly to customer via WhatsApp
  - *Time to Learn:* 2-3 hours
  - *Resources:* `Booking` model in schema, `booking_status` enum values
  - *Exercise:* Simulate: customer books, changes mind after 6 hours, requests refund. What do you do?

- [ ] **Database Access & Querying (Read-Only for Diagnostics)**
  - *Why:* Sometimes "the answer is in the database." You need to extract it without breaking production.
  - *Skills:*
    - Supabase dashboard: find a specific customer's bookings
    - Writing simple SELECT queries (no UPDATE/DELETE without approval)
    - Exporting booking data for accountant/tax filing
  - *Time to Learn:* 3-4 hours
  - *Resources:* Supabase SQL editor, Prisma Studio
  - *Exercise:* Find all bookings for Q1 2026, export to CSV, calculate total revenue

---

# TIER 2: TECHNICAL OPERATIONS (Essential for Scaling)

These skills let you maintain the platform without paying for external devs on every issue.

## 2.1 — Deployment & DevOps Basics

### What You Must Know (Owner + Dev #2)
- [ ] **Understanding the Deployment Pipeline**
  - *Why:* Code changes → staging → production. You need to know who's responsible and how to rollback if broken.
  - *Skills:*
    - How Railway (backend) and Vercel/similar (frontend) work
    - Environment variables (DATABASE_URL, WHATSAPP_TOKEN, etc.) and secrets management
    - "What happens when I push to main?" flow
    - Rollback: revert a bad deploy in < 5 minutes
  - *Time to Learn:* 5-6 hours
  - *Resources:* Railway dashboard, Vercel dashboard, `.env` files, `start_dev.bat`
  - *Exercise:* Deploy a typo fix to production, then rollback

- [ ] **Monitoring & Alerts (Uptime, Errors, Logs)**
  - *Why:* If your platform is down, you find out from customers (bad). Alerts find out first (good).
  - *Skills:*
    - Setting up basic monitoring: Uptime Robot (free), Railway logs
    - Reading error logs: "500 Database connection failed" vs "404 Not Found"
    - Setting Slack/email alerts for critical errors
  - *Time to Learn:* 3-4 hours
  - *Resources:* Railway logs, Uptime Robot, Sentry (optional)
  - *Exercise:* Simulate a backend crash → get alert → read logs → identify cause

- [ ] **Database Backups & Disaster Recovery**
  - *Why:* Supabase auto-backs up, but you need to know the restore process.
  - *Skills:*
    - How Supabase point-in-time recovery works
    - Testing a backup restore (to staging, not production!)
    - Identifying what data loss is acceptable (last 1 hour? 1 day?)
  - *Time to Learn:* 2-3 hours
  - *Resources:* Supabase documentation, backup schedule
  - *Exercise:* Intentionally delete a test booking → restore from backup

---

## 2.2 — Code Understanding (Not Coding, Understanding)

### What You Must Know (Owner + Dev #2)
- [ ] **Frontend Architecture (React/Vite)**
  - *Why:* 60% of bugs are frontend. You need to know the structure to brief a dev or fix simple issues.
  - *Skills:*
    - Folder structure: `src/pages/`, `src/design-system/`, `src/router/`
    - How tenants are loaded (lazy routing, registry)
    - Atomic design: Atoms (buttons) → Molecules (cards) → Organisms (pages)
    - Identifying where a bug lives: "Is it in UnitCard.jsx or BookingDrawer.jsx?"
  - *Time to Learn:* 6-8 hours (reading code + architecture docs)
  - *Resources:* `routing_architecture.md`, `frontend_structure.md`, your `src/` folder
  - *Exercise:* Trace a button click from user action → network request → API response

- [ ] **Backend Architecture (FastAPI/Python)**
  - *Why:* Understand service layers, error handling, API contracts.
  - *Skills:*
    - 4-layer architecture: Routes → Services → Repositories → Database
    - Common FastAPI patterns: `@app.get()`, `@app.post()`, error handling
    - Database queries: Prisma Client (Python), filters, relationships
    - Identifying bottlenecks: "Is the API slow or is Supabase slow?"
  - *Time to Learn:* 6-8 hours
  - *Resources:* `app/` folder structure, `database_pooler_plan.md`, `CLAUDE.md`
  - *Exercise:* Trace the `/smar/listings` API call end-to-end: route → service → repo → Supabase → response

- [ ] **Database Schema & Relationships**
  - *Why:* Data is your business. Understanding schema helps diagnose data issues.
  - *Skills:*
    - Core tables: `Client`, `Unit`, `Booking`, `Customer`, `Price`
    - Foreign keys: how tables relate (1:N, N:M)
    - Understanding multi-tenancy: every query filters by `clientId`
  - *Time to Learn:* 4-5 hours
  - *Resources:* `schema_refactor_plan.md`, Prisma schema file, Supabase schema viewer
  - *Exercise:* Draw the ER diagram from memory (Client → Unit → Booking → Customer)

---

## 2.3 — Testing & Quality Assurance

### What You Must Know (Owner + Dev #2)
- [ ] **Manual Testing Checklist (Pre-Launch)**
  - *Why:* Before launching a new tenant or feature, you need to verify it works end-to-end.
  - *Skills:*
    - Testing user flows: booking start → finish
    - Cross-browser testing (Chrome, Safari, mobile)
    - Testing edge cases: no availability, wrong dates, invalid email
    - Writing test steps clearly for QA/external testers
  - *Time to Learn:* 3-4 hours
  - *Resources:* Your staging environment, test data script
  - *Exercise:* Create a 10-step test checklist for "New Unit Upload Feature"

- [ ] **Automated Testing Basics (Understanding)**
  - *Why:* You won't write tests, but knowing they exist prevents regressions.
  - *Skills:*
    - Unit tests: testing individual functions (backend)
    - Integration tests: testing API endpoints end-to-end
    - Why tests matter: "Did this change break bookings?"
  - *Time to Learn:* 2-3 hours (conceptual, not hands-on)
  - *Resources:* Python `pytest`, Jest for React

---

# TIER 3: BUSINESS & GROWTH OPERATIONS (Revenue Multiplier)

These skills let you scale revenue without proportionally scaling costs.

## 3.1 — Customer Success & Retention

### What You Must Know (Owner)
- [ ] **Tenant Onboarding & Success Plan**
  - *Why:* First 2 weeks determine if tenant stays or churns.
  - *Skills:*
    - Day 1: Set up their branding, upload their first units
    - Day 3: Their first booking (manually simulate if needed)
    - Day 7: Check-in: are they using the admin dashboard? Any questions?
    - KPIs to monitor: bookings/week, revenue/week, support tickets
  - *Time to Learn:* 3-4 hours (process design)
  - *Resources:* Create a "Tenant Success Playbook" doc
  - *Exercise:* Design a 30-day success plan for a new property manager

- [ ] **Support Ticket Triage & Priority**
  - *Why:* Not all issues are equal. "My color is wrong" vs "Bookings aren't processing."
  - *Skills:*
    - P0 (Critical): Bookings broken, no revenue flowing
    - P1 (High): Admin can't upload units, tenants can't log in
    - P2 (Medium): UI bugs, missing features, performance issues
    - P3 (Low): Feature requests, documentation, polish
  - *Time to Learn:* 2-3 hours
  - *Resources:* Create a ticket template with priority levels
  - *Exercise:* Classify 10 real support tickets by priority

- [ ] **Analytics & Dashboards (Understanding)**
  - *Why:* Data tells you where to focus. "Are we getting more bookings? Why?"
  - *Skills:*
    - Daily/weekly metrics to track: active tenants, bookings, revenue, churn
    - Reading your own admin dashboard KPI strip
    - Identifying trends: "Bookings dipped in week 3, why?"
    - Using simple tools: Google Sheets, Metabase (if set up)
  - *Time to Learn:* 4-5 hours
  - *Resources:* Create a simple metrics dashboard
  - *Exercise:* Build a weekly report: # tenants, # bookings, revenue, churn rate

---

## 3.2 — Marketing & Positioning

### What You Must Know (Owner)
- [ ] **Positioning Your SaaS (For Property Managers)**
  - *Why:* Why should a property manager use Beit Smar vs Booking.com or Airbnb?
  - *Skills:*
    - Your unique value: WhatsApp-first, Arabic-native, no transaction fees
    - Pricing strategy: per-booking? Monthly? Hybrid?
    - Target customer: boutique properties in MENA, not mass-market
  - *Time to Learn:* 4-5 hours (strategic thinking)
  - *Resources:* Competitive analysis, customer interviews
  - *Exercise:* Write a 1-page positioning statement

- [ ] **Sales & Tenant Acquisition**
  - *Why:* More tenants = more revenue. You need to close deals.
  - *Skills:*
    - Identifying leads: hotel managers, Airbnb hosts, property investors
    - Demo flow: show them WhatsApp booking in 2 minutes
    - Objection handling: "Why should I switch from Airbnb?"
    - Pricing negotiation: when to discount, when to hold firm
  - *Time to Learn:* 5-6 hours (ongoing practice)
  - *Resources:* Sales scripts, demo property (Beit Smar itself)
  - *Exercise:* Do a mock sales call with a colleague

---

## 3.3 — Finance & Operations

### What You Must Know (Owner)
- [ ] **Unit Economics (Profitability per Tenant)**
  - *Why:* Not all tenants are profitable. You need to know margins.
  - *Skills:*
    - Revenue per tenant: average booking value × bookings/month
    - Cost per tenant: hosting (Supabase, Railway), customer support, payment fees
    - Break-even: how many tenants to cover fixed costs?
    - Pricing: if tenant does $50k/month revenue, what commission? (5-10%?)
  - *Time to Learn:* 4-5 hours
  - *Resources:* Spreadsheet template, your actual cost data
  - *Exercise:* Calculate break-even: if Supabase is $100/mo + team salary, need X bookings/mo

- [ ] **Tax & Compliance (Basic Understanding)**
  - *Why:* SaaS has tax obligations. You need to know what's due.
  - *Skills:*
    - VAT/GST: if operating in multiple countries (Saudi, UAE, etc.)
    - Transaction tax: who pays Stripe/Whish fees?
    - Tenant withholding: if you take commission, are there taxes?
    - Record-keeping: booking data, payment reconciliation
  - *Time to Learn:* 3-4 hours (plus accountant consultation)
  - *Resources:* Hire a local accountant (essential), keep detailed records
  - *Exercise:* Set up a monthly reconciliation: bookings vs payments vs revenue

---

# TIER 4: TEAM SKILLS (For Person #2 & #3)

## Developer (Person #2) Must Know

- [ ] Full-stack capability: can own either backend OR frontend
- [ ] Git workflow: branching, PRs, code review standards
- [ ] Local dev setup: can run the entire stack locally (FastAPI + React + Supabase)
- [ ] Debugging: browser DevTools, backend logs, database queries
- [ ] Deployment: how to push code to staging/production safely

**Onboarding Checklist:**
- [ ] Local dev environment working (2-3 hours)
- [ ] Architecture walk-through (4-5 hours)
- [ ] First 3 bug fixes (owner supervision)
- [ ] Deploy first feature to staging (with owner approval)
- [ ] Contribute to 1 end-to-end feature (owner guidance)

## Operations/Customer Success (Person #3) Must Know

- [ ] Admin dashboard: can manage bookings, units, tenants
- [ ] Tenant onboarding process (copy from owner's playbook)
- [ ] Support ticket system (Slack, email, or ticketing tool)
- [ ] Basic troubleshooting: can diagnose simple issues
- [ ] Data entry: can populate initial tenant data, upload images

**Onboarding Checklist:**
- [ ] Admin dashboard basics (2-3 hours)
- [ ] Tenant onboarding walkthrough (3-4 hours)
- [ ] First tenant support (owner supervision)
- [ ] Can handle 90% of support tickets independently (ongoing)

---

# IMPLEMENTATION ROADMAP: 16-Week Learning Plan

### Week 1-2: Foundations (You + Dev #2)
- [ ] **Day 1-2:** Read all docs (memory.md takes time, skim aggressively)
- [ ] **Day 3-4:** Local dev setup: run backend + frontend locally
- [ ] **Day 5-6:** Trace a booking end-to-end (UI → API → DB → WhatsApp)
- [ ] **Week 2:** Deploy a tiny change (typo fix) to staging

### Week 3-4: Revenue & Operations (Owner Focus)
- [ ] **Day 1-2:** Understand payment flow (Stripe/Whish integration)
- [ ] **Day 3-4:** Onboard a test tenant from scratch
- [ ] **Day 5-6:** Create booking dispute resolution playbook
- [ ] **Day 7:** Simulate a production issue + resolve it

### Week 5-6: Scaling Operations (Whole Team)
- [ ] **Day 1-2:** Create monitoring setup (Uptime Robot + Railway alerts)
- [ ] **Day 3-4:** Design manual testing checklist
- [ ] **Day 5-6:** Build 30-day tenant success playbook
- [ ] **Day 7:** Run a mock sales call

### Week 7-8: Deep Dives (Dev #2 Focus)
- [ ] Frontend architecture masterclass (routing, components, state)
- [ ] Backend architecture masterclass (routes, services, repos)
- [ ] First independent feature development

### Week 9-12: Feature Development Cycle (Whole Team)
- [ ] Execute 2-3 features from roadmap (with owner approval)
- [ ] Each feature: plan → code → test → deploy → monitor
- [ ] Owner learns by doing, not by reading

### Week 13-14: Sales & Growth (Owner + Optional Person #3)
- [ ] Nail positioning statement
- [ ] Create sales deck (1-2 slides, maximum)
- [ ] Reach out to 10 property managers
- [ ] Close first paid tenant (target: 30 days)

### Week 15-16: Playbook & Documentation (Owner)
- [ ] Finalize all playbooks: onboarding, support, troubleshooting
- [ ] Create runbook: "What to do if X breaks?"
- [ ] Hand off to Person #2 & #3 for independent operation

---

# Quick Reference: "Help! What Do I Do?" Scenarios

| Scenario | Skill (TIER) | Time to Resolve | Owner Action |
|----------|--------------|-----------------|--------------|
| Customer can't book | 1.3 (Troubleshooting) | 15 min | Check browser console → API logs → identify root cause |
| New tenant wants to go live | 1.2 (Onboarding) | 30 min | Run 5-step checklist, test booking, confirm go-live |
| Revenue dropped 50% | 3.1 (Analytics) | 1 hour | Check # bookings, # active tenants, look for churn |
| Backend server is down | 2.1 (Deployment) | 10 min | Check Railway dashboard, read error logs, rollback if needed |
| Tenant's color is wrong | 1.2 (Config) | 5 min | Update Client.primary_color in admin, refresh site |
| Dev asks "Should we use Redis?" | 2.1 (Architecture) | 30 min discussion | Evaluate: is performance actually a bottleneck? |
| Accountant asks "How much revenue?" | 3.3 (Finance) | 30 min | Query bookings table, export CSV, sum by month |

---

# Success Metrics (For This Learning Plan)

By Week 16, you should be able to:

- ✅ **Independently** onboard a new tenant from 0 → live in 1 hour
- ✅ **Diagnose** 90% of support tickets within 30 minutes
- ✅ **Deploy** a code change to production without developer handholding
- ✅ **Understand** the full technical architecture (frontend + backend + DB)
- ✅ **Close** your first paying tenant through sales
- ✅ **Track** KPIs and make data-driven decisions
- ✅ **Run** the company with Dev #2 (and eventually Person #3) as a true team

---

# Resources You Already Have

| Document | Use For |
|----------|---------|
| `roadmap_audit_april.md` | Understanding current MVP status + gaps |
| `routing_architecture.md` | Frontend routing deep dive |
| `database_pooler_plan.md` | Backend error handling patterns |
| `new_tenant_checklist.md` | Tenant onboarding (memorize this!) |
| `frontend_structure.md` | React component hierarchy rules |
| `memory.md` | Historical decisions (skim, don't read all) |
| `phases_roadmap.yaml` | Feature roadmap (reference, not action plan) |

---

# Next Steps (Pick One)

1. **"I want a playbook template"** → I'll create onboarding/support/troubleshooting playbooks
2. **"I want a training plan for my dev"** → I'll create dev onboarding checklist + exercises
3. **"I want to trace a booking end-to-end"** → I'll walk you through with code snippets
4. **"I want a sales script"** → I'll create positioning + demo script for property managers
5. **"I want financial projections"** → I'll create unit economics spreadsheet template

What's your top priority right now?

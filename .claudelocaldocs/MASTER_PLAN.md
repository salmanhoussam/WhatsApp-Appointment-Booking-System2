# SalmanSaaS — Master Project Plan 2026-07-18

**Status:** Active Development  
**Last Updated:** 2026-07-18  
**Owner:** Architecture Team  

---

## 🎯 Executive Summary

SalmanSaaS is a **unified multi-tenant SaaS platform** running three independent service modules (Booking, Restaurant, Store) on a single backend infrastructure, with a companion local AI agent for standalone use.

**Core Vision:**
- One server, one database, infinite tenants
- Clean 4-layer architecture (Routes → Services → Repositories → DB)
- Strict multi-tenancy isolation (clientId on every query)
- Framer Motion + GS MAR for premium UI/UX
- Local AI agent that operates independently or integrates with the platform

---

## 📊 Project Structure

```
WhatsApp-Appointment-Booking-System2-main/
├── app/                          # Main SalmanSaaS Backend (FastAPI)
│   ├── api/v1/
│   │   ├── public/               # Public endpoints (no auth)
│   │   ├── admin/                # Tenant admin (JWT required)
│   │   └── super/                # Super admin only (Salman)
│   ├── services/                 # Business logic layer
│   ├── repositories/             # Prisma queries (DB access)
│   ├── core/                     # Security, config, tenant resolver
│   └── main.py                   # FastAPI entrypoint
│
├── frontend/                     # React 19 + Vite
│   ├── src/
│   │   ├── pages/[slug]/         # Per-tenant pages (smar, olivello, caracas, footlab...)
│   │   ├── router/tenants/       # Registry-based lazy routing
│   │   ├── hooks/                # Data layer (useQuery, useMutation)
│   │   ├── components/           # Shared UI (presentational only)
│   │   └── design-system/        # Atoms/Molecules/Organisms
│   └── [config files]
│
├── local-agent/                  # Standalone AI Agent (RC1)
│   ├── main.py                   # FastAPI server (port 8010)
│   ├── agents/                   # LLM orchestration
│   ├── ai/tools/                 # Tool schemas + registry
│   ├── services/                 # Business logic
│   ├── plugins/                  # Database abstraction
│   ├── database/                 # Models + repositories
│   └── docs/                     # Architecture + guides
│
├── prisma/                       # ORM Schema + Migrations
│   ├── schema.prisma             # Single source of truth
│   └── migrations/               # DB versioning
│
├── scripts/                      # Seeding + Admin scripts
│   ├── seed_unified_clients.py   # Create tenants
│   ├── seed_page_content.py      # Populate pages
│   ├── seed_catalog.py           # Restaurant/Store items
│   └── [other scripts]
│
├── .agents/skills/               # Agent skill packs
│   ├── my-app-server/            # ← NEW: Integration skill
│   └── [other skills]
│
├── .claude/rules/                # Architecture rules
│   ├── backend/
│   │   ├── api-rules.md          # Route constraints
│   │   ├── architecture.md       # 4-layer system
│   │   ├── security.md           # Multi-tenancy guard
│   │   └── service-system.md     # client_services pattern
│   ├── frontend/
│   │   ├── architecture.md
│   │   ├── routing.md
│   │   ├── feature-structure.md
│   │   └── scaffolding.md
│   └── global.md                 # Cross-cutting rules
│
├── .claudelocaldocs/             # Strategic documentation (this folder)
│   ├── MASTER_PLAN.md            # ← You are here
│   └── [other docs]
│
└── [root config files]
```

---

## 🏗️ Architecture Layers

### Backend (app/)
```
Routes (api/v1/)
    ↓
    Dependency: get_current_tenant
    Dependency: require_service(module_key)
    Dependency: require_admin_user (admin routes only)
    ↓
Services (app/services/)
    ↓ Business logic only
    Dependency: plugin_manager.execute()
    ↓
Repositories (app/repositories/)
    ↓ Prisma queries with clientId filter
    ↓
Database (Supabase/PostgreSQL)
```

**Key Rule:** Zero business logic in routes. Zero Prisma calls outside repositories.

### Frontend (frontend/)
```
Pages ([slug]/pages/)
    ↓ Presentational JSX
    ↓
Hooks ([slug]/hooks/)
    ↓ useQuery/useMutation + data fetching
    ↓
Services (hooks/ layer)
    ↓ publicApi axios instance
    ↓
Backend REST API
```

**Key Rule:** No API calls inside components. No useState for server state. Use hooks.

### Local Agent (local-agent/)
```
Command Input
    ↓
Ollama LLM (qwen2.5:7b)
    ↓
Tool Selection (ai/tools/schemas.py)
    ↓
Tool Execution (ai/tools/registry.py → services/)
    ↓
Plugin Manager (plugins/plugin_manager.py)
    ↓
Active Plugin (SQLite/Postgres)
    ↓
Response
```

**Key Rule:** Layering is strictly enforced. Agents never touch plugins or repositories directly.

---

## 👥 Active Tenants

| Tenant | Module | Status | URL | Notes |
|--------|--------|--------|-----|-------|
| **smar** (بيت سمار) | booking | ✅ Live | smar.salmansaas.com | 3 villas, 12 chalets, restaurant, pool |
| **olivello** | booking | 🔄 Setup | olivello.salmansaas.com | Luxury estate showcase |
| **caracas** | restaurant | 🔄 Migration | caracas.salmansaas.com | Menu + orders (from standalone) |
| **footlab** | store | 🔄 Migration | footlab.salmansaas.com | Fashion e-commerce (from standalone) |

Each tenant has:
- Unique Client row in DB
- Service activation flags (client_services table)
- Dedicated Supabase storage folder
- Tenant-specific React components + pages
- Independent brand/styling

---

## 🔧 Core Systems

### 1. Multi-Tenancy (CRITICAL)

**Every query MUST include clientId filter at the DB level.**

```python
# ✅ CORRECT
await prisma.booking.find_many(where={"clientId": tenant["id"]})

# ❌ WRONG
all_bookings = await prisma.booking.find_many()
return [b for b in all_bookings if b.clientId == tenant["id"]]
```

**Tenant Resolution Priority:**
1. JWT token payload["slug"]
2. X-Tenant-Slug header
3. ?client_slug= query param
4. Subdomain ([slug].salmansaas.com)

Cached 5 minutes in-process to reduce DB queries.

### 2. Service Activation (client_services table)

**Every module endpoint checks this gate.**

```python
@router.get("/menu")
async def get_menu(
    tenant = Depends(get_current_tenant),
    _svc   = Depends(require_service("restaurant")),  # ← MANDATORY
):
    return await restaurant_service.get_menu(tenant["id"])
```

Valid service_key values:
- `booking` (live)
- `gallery` (live)
- `whatsapp_ordering` (live)
- `restaurant` (live, migration pending)
- `store` (live, migration pending)
- `delivery_zones`, `loyalty`, `analytics` (planned)
- `immersive_3d` (ultra tier only, $35/mo)

### 3. JWT Token System

**Client Token** (issued by POST /auth/login):
```json
{
  "type": "client",
  "client_id": "<uuid>",
  "slug": "<tenant-slug>",
  "phone": "<phone>",
  "exp": "<unix-timestamp>"
}
```

**Admin Token** (issued by POST /auth/users/login):
```json
{
  "type": "admin",
  "user_id": "<uuid>",
  "client_id": "<uuid>",
  "slug": "<tenant-slug>",
  "role": "SUPER_ADMIN | TENANT_ADMIN | MANAGER_RESERVATIONS | MANAGER_UNITS",
  "exp": "<unix-timestamp>"
}
```

Both expire in 24 hours. Issued as HttpOnly cookies + Bearer token.

### 4. Plugin System (Local Agent Only)

**Abstraction layer between agents and databases.**

```python
class Plugin(ABC):
    def execute(self, action: str, payload: dict) -> dict:
        """Dispatch action to concrete implementation."""
        ...
```

Active plugins:
- `sqlite` (default, phase 1)
- `postgres` (phase 1, parity with sqlite)
- `mysql`, `sqlserver`, `pos` (phase 3+ placeholders)

Adding a new plugin = implement Plugin interface + register in plugin_manager.py.

---

## 📅 Development Phases

### Phase 1 ✅ (2026-Q1-Q2)
- [x] Multi-tenant architecture foundation
- [x] JWT authentication system
- [x] 4-layer backend structure (routes → services → repositories → DB)
- [x] Booking module (smar tenant)
- [x] Basic React frontend with per-tenant pages
- [x] Local AI agent core (Ollama integration)
- [x] SQLite + Postgres plugins

**Status:** Booking live on smar.salmansaas.com; Local Agent RC1 in dogfooding.

### Phase 2 (2026-Q3)
- [ ] Restaurant module (caracas migration)
- [ ] Store module (footlab migration)
- [ ] Catalog import feature (Excel → DB)
- [ ] Payment gateway integration (card, WhatsApp, Wish, OMT)
- [ ] Analytics dashboard
- [ ] Local Agent Phase 2 LLM integration hardened

### Phase 3 (2026-Q4)
- [ ] Vision/OCR agent (read invoice images)
- [ ] REST-API plugins (Odoo, Square POS)
- [ ] Delivery zones module
- [ ] Loyalty program
- [ ] Immersive 3D showcase (villa tours)

### Phase 4+ (2027+)
- [ ] WhatsApp Blast marketing
- [ ] AI Bot for customer service
- [ ] Marketplace listing (own platform)
- [ ] Mobile apps (native iOS/Android)

---

## 🔐 Security Model

### Access Control

| Route Prefix | Tenant Res. | Service Gate | Auth Guard |
|---|---|---|---|
| `/api/v1/public/*` | `get_current_tenant` ✅ | `require_service()` ✅ | ❌ None |
| `/api/v1/admin/*` | via JWT | `require_service()` ✅ | `get_current_admin_user` |
| `/api/v1/super/*` | ❌ N/A | ❌ N/A | `require_super_admin` |
| `/api/v1/auth/*` | ❌ N/A | ❌ N/A | ❌ None |

### Data Isolation

- No cross-tenant queries
- Service activation gates prevent unauthorized access
- JWT roles enforce permission boundaries
- Supabase storage scoped per tenant slug

### Secret Management

Enforced at startup:
- `SECRET_KEY` (JWT signing, no default)
- `WHATSAPP_VERIFY_TOKEN` (no default)
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (required)
- `RESEND_API_KEY`, `ANTHROPIC_API_KEY` (optional)

Swagger UI disabled in production.

---

## 📦 Database Schema (Prisma)

### Core Tables

| Table | Purpose | Owner |
|-------|---------|-------|
| `Client` | Tenant records | Super Admin |
| `ClientService` | Feature flags | Super Admin |
| `User` | Admin/staff accounts | Tenant Admin |
| `Unit` | Properties (villas, chalets) | Tenant (booking module) |
| `CatalogCategory` | Menu/product categories | Tenant (restaurant/store) |
| `CatalogItem` | Menu items / products | Tenant (restaurant/store) |
| `Booking` | Reservations | Tenant (booking module) |
| `Order` | Restaurant orders | Tenant (restaurant module) |
| `CartItem` | Store cart state | Tenant (store module) |
| `ImportBatch` | Catalog import history | Tenant |

**Critical:** Every table includes `clientId` (not slug) for partition isolation.

---

## 🎨 Frontend Tenant Map

### Smar (بيت سمار) — Live
**Pages:**
- `/smar/showcase` — Z-axis kinetic cinema hero
- `/smar/listings` — Villa/chalet grid
- `/smar/spatial` — 2.5D parallax sections
- `/smar/spatial/property/:id` — Cinematic video + booking
- `/smar/gallery` — Image lightbox
- `/smar/admin` — Tenant dashboard (JWT gated)

**Features:**
- 3 luxury villas + 12 chalets
- Cinematic video player with chapter timestamps
- GS MAR glassmorphism design system
- Floating WhatsApp CTA button
- Book Now drawer (RTL-aware)

**Deployment:** smar.salmansaas.com (subdomain routing auto-resolves)

### Olivello (planned)
**Type:** Luxury estate booking  
**Status:** 🔄 Scaffolding in progress  
**Features:** 3D olive grove showcase, seasonal pricing, concierge booking

### Caracas (migration)
**Type:** Restaurant + ordering  
**From:** Standalone app (2024)  
**Status:** 🔄 Needs unified catalog + payment integration  

### Footlab (migration)
**Type:** Fashion e-commerce  
**From:** Standalone app (2024)  
**Status:** 🔄 Needs unified store module + checkout flow  

---

## 🤖 Local Agent Integration (Phase 3.5 — Planned)

**Goal:** Bridge the standalone Local Agent to the SalmanSaaS platform.

### Current State (RC1)
- Fully standalone: SQLite/Postgres, Ollama on localhost:11434
- Independent tools: create_customer, create_product, create_invoice, import_catalog
- Event logging: every command traced in logs/events.log
- No connection to main platform

### Planned Integration

#### Option A — Server as Plugin
Local agent talks to SalmanSaaS backend as a "plugin":

```python
# local-agent/plugins/salmansaas_plugin.py
class SalmanSaaSPlugin(Plugin):
    def execute(self, action: str, payload: dict) -> dict:
        # POST to /api/v1/internal/plugin/execute
        response = requests.post(
            f"{settings.SALMANSAAS_HOST}/api/v1/internal/plugin/execute",
            json={"action": action, "payload": payload, "auth": settings.INTERNAL_API_KEY}
        )
        return response.json()
```

#### Option B — Skills Framework (RECOMMENDED)
Implement agent capability as a `.agents/skills/` entry:

```
.agents/skills/salmansaas-server/
├── SKILL.md                      # Agent instructions
├── references/
│   ├── action-map.md             # Supported actions
│   ├── auth-contract.md          # How to authenticate
│   └── examples.md               # Real workflows
```

**Skill teaches agents:**
- Which actions are available (create_booking, list_units, etc.)
- How to build payloads
- How to interpret responses
- When to use which endpoint

#### Implementation Contract

**Phase 3.5 Requirements:**
1. SalmanSaaS backend exposes `/api/v1/internal/plugin/execute`
2. local-agent can POST to this endpoint with valid INTERNAL_API_KEY
3. Backend routes actions to appropriate services
4. Telemetry unified (events logged in both systems)

**Success Criteria:**
- Local agent can create bookings on smar tenant via platform
- Bookings appear in smar admin dashboard
- Event log shows full chain (agent → platform → DB)

---

## 🛠️ Developer Workflow

### Adding a New Tenant

**1. Create tenant record:**
```bash
python scripts/seed_unified_clients.py --slug [slug] --module [booking|restaurant|store]
```

**2. Create frontend scaffold:**
```bash
# Copy from template or existing tenant
cp -r frontend/src/pages/smar frontend/src/pages/[slug]
# Update imports, hooks, styling
```

**3. Register routes:**
```
frontend/src/router/tenants/[slug].routes.jsx
frontend/src/router/tenants/index.js → add to registry
```

**4. Seed content:**
```bash
python scripts/seed_page_content.py [slug]
python scripts/seed_catalog.py [slug]  # if restaurant/store
```

**5. Deploy:**
```bash
# Railway auto-deploys on git push
git add . && git commit -m "feat: add [slug] tenant" && git push
```

### Adding a New API Endpoint

**Follow the 4-layer pattern:**

```python
# 1. Route (api/v1/public/booking.py)
@router.get("/available-units")
async def get_available(
    tenant = Depends(get_current_tenant),
    _svc   = Depends(require_service("booking")),
    dates: DateFilter = Query(...),
):
    result = await booking_service.get_available_units(tenant["id"], dates)
    return {"success": True, "data": result}

# 2. Service (services/booking_service.py)
async def get_available_units(client_id: str, dates: DateFilter) -> list[Unit]:
    return await unit_repository.find_available(client_id, dates)

# 3. Repository (repositories/unit_repository.py)
async def find_available(self, client_id: str, dates: DateFilter) -> list[Unit]:
    return await prisma.unit.find_many(
        where={
            "clientId": client_id,
            "bookings": {"none": {"check_in": {"lte": dates.check_out}, ...}}
        }
    )

# 4. Database queries via Prisma ✅
```

### Adding a New Local Agent Tool

**1. Schema (ai/tools/schemas.py):**
```python
{
    "type": "function",
    "function": {
        "name": "create_booking",
        "description": "Book a unit on SalmanSaaS via the plugin",
        "parameters": {...}
    }
}
```

**2. Handler (ai/tools/registry.py):**
```python
def _create_booking(tenant_slug: str, unit_id: str, ...):
    return booking_service.create(tenant_slug, unit_id, ...)
```

**3. Service (services/booking_service.py):**
```python
def create(tenant_slug: str, unit_id: str, ...):
    result = plugin_manager.execute(
        "create_booking",
        {"tenant_slug": tenant_slug, "unit_id": unit_id, ...}
    )
    return result
```

**4. Plugin (plugins/sqlite/plugin.py or postgres/):**
```python
def _create_booking(self, tenant_slug, unit_id, ...):
    # Actually create the booking in DB
    ...
```

---

## 📊 Current Status (2026-07-18)

### Backend
- ✅ 4-layer architecture implemented
- ✅ Multi-tenancy isolation verified
- ✅ JWT auth (client + admin tokens)
- ✅ Booking module live
- ✅ Restaurant module foundation (migration in progress)
- ✅ Store module foundation (migration in progress)
- ⏳ Payment gateway (planned)

### Frontend
- ✅ Per-tenant routing (registry-based lazy)
- ✅ Smar tenant live with premium UI
- ✅ Framer Motion animations
- ✅ GS MAR glassmorphism system
- ✅ RTL-aware components (Arabic/English)
- 🔄 Catalog management UI (in progress)
- ⏳ Admin dashboard (phase 2)

### Local Agent
- ✅ Phase 1 core architecture
- ✅ Ollama integration
- ✅ SQLite + Postgres plugins
- ✅ Catalog import capability
- ✅ Event logging (telemetry)
- 🔄 RC1 dogfooding (running live)
- ⏳ Phase 2 hardening (planned)
- ⏳ SalmanSaaS plugin (phase 3.5)

### Documentation
- ✅ Architecture rules (.claude/rules/)
- ✅ Local agent docs (docs/)
- ✅ Per-tenant references (smar-tenant.md, etc.)
- 🔄 Integration documentation (in progress)
- ⏳ Skills framework docs (planned)

---

## 📋 Next Immediate Steps (Week of 2026-07-18)

### 1. Build SalmanSaaS Skills Framework (HIGH PRIORITY)
**Owner:** Architecture Team  
**Files:**
- `.agents/skills/salmansaas-server/SKILL.md` — Agent instructions
- `.agents/skills/salmansaas-server/references/` — Implementation guides
- `app/api/v1/internal/plugin_execute.py` — Backend endpoint

**Success:** Agent can route requests to SalmanSaaS backend with proper auth.

### 2. Caracas Restaurant Migration (MEDIUM)
**Owner:** Restaurant Module Lead  
**Work:**
- Unified menu using CatalogItem model
- Restaurant orders API (POST /orders)
- Admin order management
- Payment integration hook

### 3. Footlab Store Migration (MEDIUM)
**Owner:** Store Module Lead  
**Work:**
- Unified catalog using CatalogItem model
- Shopping cart state management
- Checkout flow
- Payment integration hook

### 4. Payment Gateway (LOW)
**Owner:** DevOps/Backend  
**Options:** Stripe, Square, local processors  
**Timeline:** Phase 2

---

## 🎯 Success Metrics

### Backend
- [ ] All endpoints follow 4-layer pattern (verified by import inspection)
- [ ] Every query includes clientId filter (verified by grep + audit)
- [ ] 100% uptime on smar tenant (Week 1)
- [ ] Sub-100ms response time (p95)
- [ ] Zero cross-tenant data leaks (security audit pass)

### Frontend
- [ ] Smar tenant loads < 3s (lighthouse)
- [ ] All animations 60fps (DevTools profiler)
- [ ] Mobile responsive (iPad + iPhone)
- [ ] Accessibility score 90+ (axe-core)

### Local Agent
- [ ] RC1 dogfooding: 10+ real commands
- [ ] Event log 100% traceability (Job # → Result)
- [ ] Phase 2 entry gate: real usage with no core crashes

### Project
- [ ] Caracas live (restaurant module)
- [ ] Footlab live (store module)
- [ ] 5+ tenants active
- [ ] Agent integration started (phase 3.5)

---

## 📚 Documentation Index

### Architecture
- [`.claude/rules/global.md`](../.claude/rules/global.md) — Cross-cutting rules
- [`.claude/rules/backend/architecture.md`](../.claude/rules/backend/architecture.md) — 4-layer system
- [`.claude/rules/backend/security.md`](../.claude/rules/backend/security.md) — Multi-tenancy + JWT
- [`.claude/rules/backend/service-system.md`](../.claude/rules/backend/service-system.md) — client_services pattern

### Frontend
- [`.claude/rules/frontend/architecture.md`](../.claude/rules/frontend/architecture.md) — @data/@domain/@presentation
- [`.claude/rules/frontend/routing.md`](../.claude/rules/frontend/routing.md) — Registry-based lazy routing
- [`.claude/rules/frontend/feature-structure.md`](../.claude/rules/frontend/feature-structure.md) — Bulletproof React

### Tenants
- [`.claude/rules/smar-tenant.md`](../.claude/rules/smar-tenant.md) — Smar complete reference
- [`.claude/rules/tenant-onboarding.md`](../.claude/rules/tenant-onboarding.md) — Add new tenant checklist

### Local Agent
- [`local-agent/docs/llms.txt`](../local-agent/docs/llms.txt) — Start here
- [`local-agent/docs/architecture/overview.md`](../local-agent/docs/architecture/overview.md) — Layer diagram
- [`local-agent/docs/STATUS.md`](../local-agent/docs/STATUS.md) — Current state + exit criteria
- [`local-agent/docs/guides/`](../local-agent/docs/guides/) — How-to guides

---

## 🤝 Contact & Escalation

| Role | Responsibility | Contact |
|------|---|---|
| **Tech Lead** | Architecture decisions, rules, escalations | `.claude/rules/engineering-manager-mode.md` |
| **Backend Lead** | FastAPI, Prisma, services, security | `app/` folder |
| **Frontend Lead** | React, routing, tenant pages | `frontend/src/` folder |
| **Local Agent Lead** | AI agent, plugins, Ollama integration | `local-agent/` folder |

---

## 📝 Revision History

| Date | Author | Change |
|------|--------|--------|
| 2026-07-18 | Architecture Team | Initial master plan created |
| TBD | Team | Phase 2 updates |

---

**Last Review:** 2026-07-18  
**Next Review:** 2026-08-15

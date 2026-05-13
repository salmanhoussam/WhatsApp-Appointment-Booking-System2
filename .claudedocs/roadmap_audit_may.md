# Roadmap Audit — May 2026
**Last updated:** 2026-05-13 (Multi-Agent System Plan added)
**Author:** Claude

---

# Multi-Agent System — Tenant Page Builder
## نظام بناء صفحات العملاء — الخطة الكاملة
## تاريخ: 2026-05-13

---

## SECTION A — لماذا فشل tenant-seeder الحالي

| # | المشكلة | الملف | الخطورة |
|---|---------|-------|---------|
| BUG-01 | **Schema mismatch** — كونان يُخرج `template.template_key` لكن tenant-seeder يقرأ `design.template_key` | `konaan.md` vs `01-parse-tenant-json.md` | 🔴 مانع كامل |
| BUG-02 | **`module_key` غائب** عن body الـ `seed-from-template` في `04-seed-catalog.md` | `04-seed-catalog.md` | 🔴 categories تُزرع بـ module_key=null |
| BUG-03 | **Base URL خطأ** — الـ skills تقول `localhost:8000` والـ backend على `8080` | كل ملفات `demo/` | 🟠 كل الـ API calls تفشل locally |
| BUG-04 | **لا frontend scaffold** — بعد الـ seed ما في agent يبني أو يختار الـ pages | الـ pipeline كلها | 🟠 demo يُزرع لكن ما يُبنى |
| BUG-05 | **`## 0. Skills` غائب** عن `tenant-seeder.md` | `tenant-seeder.md` | 🟡 قراءة Skills غير مضمونة |
| BUG-06 | **Verification endpoint خطأ** — store يحتاج `/store/categories` لا `/catalog/categories` | `05-verify-live.md` | 🟡 false negative |
| BUG-07 | **لا feedback loop** — إذا فشل step ما في retry أو escalation | الـ pipeline كلها | 🟡 يتوقف صامت |
| BUG-08 | **لا migration script** — tenants قديمة مزروعة بـ schema قديم (template.template_key) ستحتاج تنظيف يدوي | DB + JSON files في scripts/data/ | 🟡 بيانات قديمة تتعارض |

---

## SECTION B — الـ Architecture المطلوبة

```
                    ┌─────────────────────────────────────────────────┐
                    │         TENANT ONBOARDING PIPELINE               │
                    └─────────────────────────────────────────────────┘

  [WhatsApp/Manual]
        │
        ▼
  ┌───────────┐     confidence < medium
  │  KONAAN   │──────────────────────────► [SALMAN REVIEW] ──► STOP
  │ Extractor │
  └─────┬─────┘
        │ JSON v2.1 (unified schema)
        ▼
  ┌─────────────┐    validation fails
  │  VALIDATOR  │──────────────────────────► [ALERT] ──► STOP
  └──────┬──────┘
         │ clean payload
         │
         │
         │ (SEQUENTIAL — Backend أولاً، Frontend بعده)
         ▼
  ┌──────────────┐
  │   BACKEND    │
  │   SEEDER     │
  │   (Steps 1-4)│
  └──────┬───────┘
         │ نجح → slug + token متاح
         ▼
  ┌──────────────────┐
  │    FRONTEND      │
  │    ARCHITECT     │
  │                  │
  │ 1. Read registry │
  │ 2. Check routes  │
  │ 3. Wire/create   │
  │ 4. Fix index.js  │
  └────────┬─────────┘
           │ نجح
                                    │ (SEQUENTIAL DONE)
                                    ▼
                             ┌─────────────┐    any failure
                             │  QA AGENT   │──────────────► [RETRY or ALERT]
                             └──────┬──────┘
                                    │ all green
                                    ▼
                             ┌─────────────┐
                             │   MEMORY    │
                             │   KEEPER    │
                             └──────┬──────┘
                                    │
                                    ▼
                             ✅ DEMO LIVE
                             🔗 /demo/{slug}
```

---

## SECTION C — الـ Unified JSON Schema v2.1

> هذا هو الـ schema الوحيد — كونان يُخرجه، tenant-seeder يقرأه.

```json
{
  "_schema_version": "2.1",
  "meta": {
    "extracted_by":   "konaan | manual",
    "extracted_at":   "ISO timestamp",
    "confidence":     "high | medium | low",
    "needs_review":   false,
    "missing_fields": []
  },
  "client": {
    "slug":         "sneakers-lb",
    "name_ar":      "سنيكرز",
    "name_en":      "Sneakers LB",
    "service_type": "store",
    "status":       "trial",
    "currency":     "USD",
    "country_code": "LB"
  },
  "owner": {
    "name":          "أحمد",
    "whatsapp":      "+96170000000",
    "email":         "owner@sneakers.com",
    "password_temp": "Temp@1234"
  },
  "design": {
    "template_key":  "fashion-grid",
    "module_key":    "store",
    "services":      ["store"],
    "primary_color": "#E8E8E8",
    "page_type":     "showcase"
  },
  "catalog": {
    "seed_from_template": true,
    "clear_existing":     false,
    "categories":         []
  }
}
```

**التغييرات عن v2.0:**
- `template.template_key` → نُقل إلى `design.template_key`
- `design.services` جديد (كان في `services_config.active_services`)
- `services_config` محذوف

---

## SECTION D — Agent Specs

### D1. KONAAN — محقق الأونبوردينغ
| | |
|---|---|
| **المدخل** | نص محادثة WhatsApp |
| **المخرج** | JSON v2.1 |
| **الملف** | `.claude/agent/المحقق كونان.md` |

**منطق القرار:**
```
نص → استخرج client + owner + design
→ map نوع النشاط → template_key من template-registry.js
→ confidence: high (كل الأساسيات موجودة) | medium (حقل ناقص) | low (غير واضح)
→ low أو needs_review → توقف + أبلغ سلمان
```

### D2. VALIDATOR — حارس الـ Schema
| | |
|---|---|
| **المدخل** | JSON v2.1 |
| **المخرج** | `{valid: true, payload}` أو `{valid: false, errors[]}` |

**تحقق من:**
```
client.slug          → ^[a-z0-9-]{3,50}$
owner.email          → valid email
owner.password_temp  → >= 8 chars
design.template_key  → موجود في template-registry.js
design.module_key    → يطابق getModuleKey(template_key)
design.page_type     → normal | showcase
```

### D3. BACKEND SEEDER
| | |
|---|---|
| **المدخل** | Validated payload |
| **المخرج** | `{slug, adminToken, clientId, categoriesCreated}` |
| **Base URL** | `localhost:8080` (dev) / `api.salmansaas.com` (prod) |

**Steps (Sequential):**
```
Step 1: POST /api/v1/auth/register
Step 2: PATCH /api/v1/admin/settings  (primary_color, page_type, template_key)
Step 3: POST /api/v1/admin/catalog/seed-from-template
  Body: { template_key, module_key ← إلزامي!, categories, clear_existing: false }
Step 4: GET /{slug}/config → تأكد active_services صحيح
```

**Failure:** أي step يفشل → أوقف + أرسل {step, status_code, response_body}

### D4. FRONTEND ARCHITECT
| | |
|---|---|
| **يعمل** | بالتوازي مع Backend Seeder |
| **المدخل** | `{slug, template_key, module_key, page_type}` |
| **المخرج** | Routes مسجلة + pages مؤكدة |

**شجرة القرار:**
```
هل /{slug}.routes.jsx موجود؟
  YES → تحقق فقط (slug في index.js؟)
  NO  → أنشئ من _template.routes.jsx (ملف template جديد)

هل هو slug خاص (smar/footlab/caracas)?
  YES → custom pages موجودة → تحقق فقط
  NO  → generic pages كافية (CatalogPage/CartPage/ReservePage)
```

### D5. QA AGENT
```
QA-01: GET /{slug}/config → 200 + active_services صحيح
QA-02: GET /public/{module}/categories?client_slug={slug} → ≥1 category
QA-03: items endpoint → success
QA-04: /demo/{slug} → accessible
QA-05: /{slug}/store → accessible
QA-06: tenants/index.js → يحتوي على slug

فشل → retry once → فشل مرة ثانية → escalate لسلمان
```

### D6. MEMORY KEEPER
```
يكتب في platform_saas_merge.md:
  ## {slug} — {name_ar} ✅ ({date})
  - template: {template_key}
  - Demo: /demo/{slug}
  - Categories: {count}
```

---

## SECTION E — Detailed Flowchart

```
INPUT: WhatsApp text OR manual JSON
            │
            ▼
    ┌───────────────┐
    │   KONAAN      │
    └───────┬───────┘
    confidence?
    ├─ low ──────────────────────► [SALMAN ALERT] STOP
    └─ medium/high ──────────────► continue
            │
            ▼
    ┌───────────────┐
    │   VALIDATOR   │
    └───────┬───────┘
    valid?
    ├─ NO ───────────────────────► [ERROR + missing fields] STOP
    └─ YES
            │
            ├──────────────────────────────────────────────
            │ PARALLEL                                      │ PARALLEL
            ▼                                               ▼
    ┌──────────────┐                             ┌──────────────────┐
    │   BACKEND    │                             │  FRONTEND        │
    │   SEEDER     │                             │  ARCHITECT       │
    └──────┬───────┘                             └────────┬─────────┘
           │                                              │
    Step 1 register?                             Routes exist?
    ├─ 409 → slug exists → rename or skip        ├─ YES → verify only
    ├─ 422 → fix + retry once                    └─ NO  → create from template
    └─ 201 ✅
                                                 index.js registered?
    Step 2 settings?                             ├─ YES → skip
    ├─ 401 → re-auth                             └─ NO  → add lazy() entry
    └─ 200 ✅

    Step 3 seed-from-template?
    ├─ 403 → catalog service missing → fix registration_service
    ├─ 400 → bad display_template → fallback to 'grid'
    └─ 201 ✅
           │                                              │
           └──────────────────┬───────────────────────────┘
                              │ BOTH DONE
                              ▼
                       ┌─────────────┐
                       │  QA AGENT   │
                       └──────┬──────┘
                       all 6 checks:
                       all pass?
                       ├─ NO (retry 1) → re-trigger failed agent
                       ├─ NO (retry 2) → SALMAN ESCALATION
                       └─ YES ✅
                              │
                              ▼
                       ┌─────────────┐
                       │   MEMORY    │
                       └──────┬──────┘
                              ▼
                       ✅ DEMO LIVE
                       🔗 /demo/{slug}
```

---

## SECTION F — Implementation Roadmap

### Phase A — Schema Fix ✅ DONE (2026-05-13)

| # | الإصلاح | الملف | الحالة |
|---|---------|-------|--------|
| A1 | كونان: output → schema v2.1 (`design.template_key`) + whatsapp→needs_review rule | `.claude/agent/المحقق كونان.md` | ✅ |
| A2 | Validator: اقرأ `design.template_key` + `validateModuleServicesConsistency()` + page_type fallback | `.claude/skills/seeding/demo/01-parse-tenant-json.md` | ✅ |
| A3 | أضف `module_key` إلزامي في seed-from-template body | `.claude/skills/seeding/demo/04-seed-catalog.md` | ✅ |
| A4 | Base URL: `8000` → `8080` | `.claude/agent/tenant-seeder.md` | ✅ |
| A5 | Verification: endpoint صحيح per module_key + items=200 (لا يشترط وجود عناصر) | `.claude/skills/seeding/demo/05-verify-live.md` | ✅ |
| A6 | 409 logic: نفس المالك → skip | مختلف → escalate | `.claude/skills/seeding/demo/02-register-and-auth.md` | ✅ |

### Phase B — Agent Wiring ✅ DONE (2026-05-13)

| # | الإصلاح | الملف | الحالة |
|---|---------|-------|--------|
| B1 | `## 0. Skills` لـ tenant-seeder | `.claude/agent/tenant-seeder.md` | ✅ |
| B2 | Step 5 (Frontend Architect) + Step 6 في pipeline | `.claude/agent/tenant-seeder.md` | ✅ |
| B3 | Sequential flow documented (Backend → Frontend ليس parallel) | `.claude/agent/tenant-seeder.md` | ✅ |

### Phase C — QA Skill ✅ DONE (2026-05-13)

| # | الإضافة | الملف | الحالة |
|---|---------|-------|--------|
| C1 | `06-qa-verify.md` — 6 checks + retry(3s) + escalation report format | `.claude/skills/seeding/demo/06-qa-verify.md` | ✅ |

### Phase D — Still Needed

| # | الإضافة | الملف | الحالة |
|---|---------|-------|--------|
| D1 | `_template.routes.jsx` — للـ slugs الجديدة | `frontend/src/router/tenants/` | ⏳ |
| D2 | BUG-08: migration script لـ JSON files القديمة في `scripts/data/` | `scripts/migrate_json_schema.py` | ⏳ |
| D3 | Integration test — tenant جديد من الصفر | test script | ⏳ |

---

## SECTION G — Scalability

```
كل tenant مستقل تماماً:
  ✅ Generic pages = 17/20 template — لا كود جديد
  ✅ slug جديد = routes file + index.js فقط
  ✅ clientId isolation في كل DB query
  ✅ Storage: properties/{slug}/ منفصل

Custom pages (للـ 3/20 الخاصة):
  → footlab: SpatialHomePage + CatalogPage
  → caracas: CatalogPage
  → smar: SpatialHomePage + booking
```

**الهدف:** من WhatsApp message → demo page حية في أقل من 5 دقائق تلقائياً.

---

---

## API Map الكاملة (2026-05-06)

```
app/main.py
│
├── /api/v1/auth
│   ├── POST /login              → Client JWT
│   ├── POST /users/login        → User JWT (TENANT_ADMIN | SUPER_ADMIN | MANAGER_*)
│   └── POST /register           → New tenant + TENANT_ADMIN user
│
├── /api/v1/public/
│   ├── /{slug}/config           → tenant branding + active_services + page_type
│   ├── /{slug}/listings         → units catalog
│   ├── /{slug}/bookings         → create booking
│   ├── /{slug}/price            → price range
│   ├── /{slug}/services         → add-on services
│   ├── /{slug}/units/{id}/calendar
│   └── /{slug}/gallery          → Supabase Storage images
│   │
│   ├── /catalog/                → require_service("catalog")
│   │   ├── GET /categories?client_slug=
│   │   ├── GET /categories/{id}/items
│   │   ├── GET /items/{id}
│   │   └── GET /featured
│   │
│   ├── /restaurant/             → require_service("restaurant") ✅ Phase 54
│   │   ├── GET /menu
│   │   └── POST /orders
│   │
│   ├── /store/                  → require_service("store") ✅ Phase 54
│   │   ├── GET /products
│   │   ├── POST/GET /cart
│   │   └── POST /orders
│   │
│   └── /reservations/           → require_service("reservations") ✅ Phase 55
│       ├── POST /
│       ├── GET  /{id}?customer_phone=
│       └── PATCH /{id}/cancel
│
├── /api/v1/admin/               → TENANT_ADMIN JWT required
│   ├── settings                 GET / PATCH
│   ├── catalog/categories       GET / POST / PATCH / DELETE
│   ├── catalog/items            GET / POST / PATCH / DELETE
│   ├── catalog/seed-from-template POST
│   ├── upload                   POST (Supabase Storage) ✅ Phase 53
│   ├── restaurant/              categories + items + orders (CatalogItem-based) ✅ Phase 54
│   ├── store/                   categories + items + orders (CatalogItem-based) ✅ Phase 54
│   ├── reservations/            GET list + stats + PATCH status ✅ Phase 55
│   └── units, bookings, properties, gallery, team, services, dashboard
│
└── /api/v1/super/               → SUPER_ADMIN only
    ├── clients                  GET / POST / PATCH status / settings / services
    ├── clients/{id}/seed-categories  POST
    └── platform-services        GET / POST / PATCH / toggle
```

---

## ترتيب الملفات الحالي في main.py

```
app/main.py
│
├── /api/v1/auth          ← auth_router
├── /api/v1/webhook       ← webhook_router
│
├── /api/v1/public        ← public_v1_router
│   ├── /properties, /units, /bookings, /listings
│   ├── /catalog          ✅ Phase 48
│   ├── /restaurant       ✅ Phase 54 (CatalogItem-based)
│   ├── /store            ✅ Phase 54 (CatalogItem-based)
│   └── /reservations     ✅ Phase 55
│
├── /api/v1/admin         ← admin_v1_router
│   ├── /properties, /bookings, /units, /services, /gallery
│   ├── /dashboard, /settings, /team
│   ├── /catalog          ✅ Phase 48
│   ├── /upload           ✅ Phase 53
│   ├── /restaurant       ✅ Phase 54
│   ├── /store            ✅ Phase 54
│   └── /reservations     ✅ Phase 55
│
└── /api/v1/super
    ├── /clients
    └── /platform-services ✅ Phase 48
```

---

## ✅ Phase 48 — مكتملة (2026-05-03)

| المهمة | الملف | الحالة |
|--------|-------|--------|
| Public Catalog API | `app/api/v1/public/catalog.py` | ✅ |
| Admin Catalog API | `app/api/v1/admin/catalog.py` | ✅ |
| Super Admin Platform Services | `app/api/v1/super/platform_services.py` | ✅ |
| CatalogPage frontend | `pages/catalog/CatalogPage.jsx` | ✅ |

---

## ✅ Phase 49 — مكتملة (2026-05-03)

- `display_template` على CatalogCategory (`grid` | `list` | `showcase`)
- `page_type` + `template_key` على Client
- Template components: `CatalogGrid`, `CatalogList`, `CatalogShowcase`
- Resolver في `CatalogPage.jsx` يقرأ `display_template` per category

---

## ✅ Phase 52 — Self-Service Onboarding (2026-05-04)

| المهمة | الملف | الحالة |
|--------|-------|--------|
| TenantRegisterPage | `pages/auth/TenantRegisterPage.jsx` | ✅ |
| GenericAdminDashboard | `pages/generic-admin/GenericAdminDashboard.jsx` | ✅ (v1 — 2 tabs) |
| CatalogTab | `pages/generic-admin/tabs/CatalogTab.jsx` | ✅ |
| SettingsTab | `pages/generic-admin/tabs/SettingsTab.jsx` | ✅ |
| Route `/:slug/dashboard` | `App.jsx` | ✅ |
| Image Upload hook (52.5) | `hooks/useImageUpload.js` | ⏳ |

---

## ✅ Phase 53 — Image Upload Endpoint (2026-05-05)

| المهمة | الحالة |
|--------|--------|
| `POST /admin/upload` → Supabase Storage | ✅ |
| `_init_tenant_storage()` في registration_service | ✅ |
| Storage namespacing rules | ✅ (`.claude/rules/storage-tenant.md`) |

---

## ✅ Phase 54 — DB Unification (2026-05-05)

**القرار:** حذف 7 جداول منفصلة → كل شيء في CatalogCategory + CatalogItem (moduleKey-based).

### الجداول المحذوفة
`MenuCategory`, `MenuItem`, `StoreCategory`, `StoreProduct`, `StoreBrand`, `StoreReview`, `StoreWishlist`

### التغييرات
- `RestaurantOrderItem`: `menuItemId` → `catalogItemId`
- `StoreCartItem`: `productId` → `catalogItemId`, unique key updated
- `StoreOrderItem`: `productId` → `catalogItemId`

### الملفات المُعاد بناؤها
| الملف | الوظيفة |
|-------|---------|
| `app/api/v1/admin/restaurant.py` | Categories + items + orders via CatalogItem |
| `app/api/v1/public/restaurant.py` | Menu + orders (`catalog_item_id` in payload) |
| `app/api/v1/admin/store.py` | Products via CatalogItem + metadata JSON |
| `app/api/v1/public/store.py` | Cart upsert key: `cartId_catalogItemId` |

### Frontend Fixes
| الملف | الإصلاح |
|-------|---------|
| `useCaracasStore.js` | `menuItemId` → `catalogItemId` |
| `useFootlabStore.js` | `product_id` → `catalog_item_id` |
| `MenuPage.jsx` | API payload: `menu_item_id` → `catalog_item_id` |
| `CartPage.jsx` (footlab) | `item.product_id` → `item.catalog_item_id` |

**توثيق:** `.claude/rules/frontend/catalog-contract.md` ← قاعدة دائمة

---

## ✅ Phase 55 — Generic Reservations (2026-05-05)

**الهدف:** نظام حجز مواعيد موحّد لأي module (مطعم، خدمات، عقارات).

### Schema
```prisma
model Reservation {
  clientId, moduleKey, customerName, customerPhone,
  reservedAt, durationMin (default 60), status, notes, metadata JSON
}
```

### الملفات الجديدة
| الملف | الوظيفة |
|-------|---------|
| `app/repositories/reservation_repo.py` | CRUD + ±4h conflict window query |
| `app/services/reservation_service.py` | Conflict check (Python overlap logic) |
| `app/api/v1/public/reservations.py` | POST + GET + PATCH cancel |
| `app/api/v1/admin/reservations.py` | GET list + stats + PATCH status |

### serviceKey
`"reservations"` في `client_services` — منفصل عن `"booking"` (booking = multi-night Unit-based)

---

## 🔵 Phase 56 — Tenant Admin Dashboard v2 (مخطط — 2026-05-06)

**الهدف:** إعادة بناء `GenericAdminDashboard.jsx` → dashboard احترافي (Linear/Notion-inspired).

### Layout
```
[Sidebar: Overview | Orders | Reservations* | Catalog | Settings]
[Main: Stats cards | Orders Kanban | Activity Feed | Top Items]
* تظهر فقط إذا "reservations" في active_services
```

### Dependencies المطلوبة
```bash
npm install recharts @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### الملفات
```
frontend/src/pages/generic-admin/
├── GenericAdminDashboard.jsx   ← REBUILD
├── tabs/OverviewTab.jsx        ← NEW (stats + kanban + activity)
├── tabs/OrdersTab.jsx          ← NEW
├── tabs/ReservationsTab.jsx    ← NEW (conditional)
├── tabs/CatalogTab.jsx         ← NO CHANGE ✅
├── tabs/SettingsTab.jsx        ← NO CHANGE ✅
└── components/
    ├── KanbanBoard.jsx, StatCard.jsx
    ├── ActivityFeed.jsx, TopItemsWidget.jsx
```

### خطة الجلسات
| الجلسة | المهمة | الحالة |
|--------|--------|--------|
| A | Layout + Sidebar + Stats cards | ⏳ |
| B | Orders Kanban (drag & drop) | ⏳ |
| C | Activity Feed + Top Items | ⏳ |
| D | Reservations calendar + conditional nav | ⏳ |
| E | Polish + RTL + responsive | ⏳ |

**Checklist التحقق الكامل:** `.claudedocs/sessions/2026-05-06.md`

---

## ⏳ Backlog — ما لم يُنفَّذ بعد

| المهمة | الأولوية | الـ Phase |
|--------|---------|---------|
| Generic Pages (`src/pages/generic/`) — CatalogPage + CartPage + ReservePage | 🔴 | 57 |
| ربط `.claude/hooks/` في `settings.json` كـ PostToolUse events | 🔴 | — |
| `TenantRegisterPage` — إضافة `module_key` + `services[]` عند seed | 🟠 | 52.8 |
| `POST /admin/services/activate` — تفعيل services عند التسجيل | 🟠 | 52.9 |
| `useImageUpload.js` (52.5) | 🟠 | 52 |
| `ConfigurableHero.jsx` (Phase 50.4) | 🟠 | 50 |
| `SSOLoginPage` redirect للـ trial tenants | 🟠 | 50 |
| Google Sheets CRM setup | 🟡 | 43 |
| n8n + Konaan WhatsApp flow | 🟡 | 51 |
| Playwright skill (E2E testing قبل deploy) | 🟡 | — |

---

## template-registry.js — حالة الـ 20 Template (v3 — 2026-05-06)

| Template | module_key | services | الحالة |
|----------|------------|----------|--------|
| fashion-grid, -menswear, -kids, -abayas | store | store | ✅ v3 |
| food-restaurant, -cafe | restaurant | restaurant + reservations | ✅ v3 |
| food-bakery, -fastfood | restaurant | restaurant | ✅ v3 |
| food-grocery | store | store | ✅ v3 |
| beauty-barber, -salon, -spa | catalog | reservations | ✅ v3 |
| beauty-cosmetics | store | store | ✅ v3 |
| health-clinic, -nutrition | catalog | reservations | ✅ v3 |
| health-pharmacy | store | store | ✅ v3 |
| health-gym | catalog | store + reservations | ✅ v3 |
| services-photography, -maintenance, -design | catalog | reservations | ✅ v3 |

**Helper functions:** `getServicesForTemplate()` + `getModuleKey()` + `getSeedPayload()`

---

## Architecture Gaps — ما يحتاج انتباه

### 🔴 حرجة
| # | المشكلة | الأثر |
|---|---------|-------|
| 1 | Hooks في `.claude/hooks/` غير مربوطة في `settings.json` | لا تشتغل تلقائياً |
| 2 | `TenantRegisterPage` لا تمرر `module_key` للـ seed | Categories تُنشأ بـ moduleKey خاطئ |
| 3 | لا endpoint لتفعيل `services[]` تلقائياً عند التسجيل | يحتاج تدخل Super Admin يدوي |

### 🟠 متوسطة
| # | المشكلة |
|---|---------|
| 4 | `database_report.md` متوقف عند أبريل — missing Phase 54/55 models |
| 5 | `routing_architecture.md` لا يعكس Phase 52-55 |
| 6 | `service-catalog.js` فيه `store.wishlist` — الجدول محذوف في Phase 54 (non-critical) |

### 🟢 منخفضة
| # | المشكلة |
|---|---------|
| 7 | `bookingRef` لا يُولَّد تلقائياً في DB |
| 8 | لا audit log لتتبع تغييرات الأدمن |

---

## Active Clients — الحالة الحالية

| Client | Module | URL | الحالة |
|--------|--------|-----|--------|
| smar | booking | smar.salmansaas.com | ✅ Live |
| caracas | restaurant | caracas.salmansaas.com | 🔄 Migration pending (Phase 54 done في الكود) |
| footlab | store | footlab.salmansaas.com | 🔄 Migration pending (Phase 54 done في الكود) |

---

*آخر تحديث: 2026-05-06 — Phase 56 planned, Phases 53-55 complete*

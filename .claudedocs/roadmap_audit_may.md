# Roadmap Audit — May 2026
**Last updated:** 2026-05-06 (Phase 56 planned)
**Author:** Claude

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

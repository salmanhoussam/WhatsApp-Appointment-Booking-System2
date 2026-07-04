# Fleet Management SaaS — خطة التنفيذ الكاملة
# تاريخ: 2026-07-03 | المشروع: SalmanSaaS — Phase 76 Vicale Fleet
# الحالة: بانتظار موافقة العميل

---

## السياق

**ما لدينا (Phase 76 — مكتمل):**
- 6 نماذج Prisma: FleetVehicle, FleetDriver, FleetTrip, SamsaraEvent, DriverAlert, DriverConsent
- 3 Services: fleet_dashboard_service, samsara_service, uber_import_service
- 3 Repositories: fleet_repo, trip_repo, samsara_event_repo
- 2 Adapters: samsara_adapter, uber_adapter
- 2 Route files: admin/fleet.py (5 endpoints), webhooks/samsara.py
- Frontend: 0% — لا توجد صفحة واحدة

**ما يطلبه العميل:**
Fleet Management SaaS لأصحاب أساطيل Mietwagen (ألمانيا)
مع: وثائق، مواعيد صيانة، تكاليف، تقويم، تحذيرات انتهاء

**القرار:** نبني على ما لدينا — لا نبدأ من صفر.

---

## مقارنة متطلبات العميل مع ما لدينا

### Stack التقني

| طلب العميل | ما لدينا | الحالة |
|-----------|----------|--------|
| React (frontend) | React + Vite | ✅ متطابق |
| TypeScript | JavaScript (JSX) | 🟡 نضيف types تدريجياً |
| FastAPI (Python) | FastAPI | ✅ متطابق |
| PostgreSQL (Supabase) | Supabase PostgreSQL | ✅ متطابق |
| Supabase Auth + JWT | JWT مخصص (bcrypt) | 🟡 نظامنا أقوى — نبقيه |
| Supabase Storage | Supabase Storage | ✅ متطابق |
| Recharts | نضيفها | ✅ |
| Railway (backend) | Railway | ✅ متطابق |
| Cloudflare Pages | Cloudflare Pages | ✅ متطابق |

### نماذج البيانات

| جدول العميل | ما عندنا | الفجوة |
|-------------|----------|--------|
| Tenants | `Client` table | ✅ موجود — متطابق |
| Vehicles | `FleetVehicle` | 🟡 ينقص: `mileage`, status `"rented"` |
| Drivers | `FleetDriver` | 🟡 ينقص: `license_number`, `pschein` |
| Documents | ❌ لا يوجد | ❌ نموذج جديد |
| Events (Termine) | ❌ لا يوجد | ❌ نموذج جديد |
| Costs | ❌ لا يوجد | ❌ نموذج جديد |

---

## PHASE 1 — تحديث قاعدة البيانات

### الملف: `prisma/schema.prisma`

**تعديلات على نماذج موجودة:**

```prisma
// FleetVehicle — يضاف:
mileage Int?   // Kilometerstand الحالي
// status: يضاف "rented"

// FleetDriver — يضاف:
licenseNumber String?   // Führerschein-Nummer
pschein       String?   // Taxi P-Schein
isActive      Boolean   @default(true)
```

**نماذج جديدة:**

```prisma
model FleetDocument {
  id         String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  clientId   String    @db.Uuid
  vehicleId  String?   @db.Uuid
  driverId   String?   @db.Uuid
  docType    String    // tüv | insurance | maintenance | license | pschein | other
  fileUrl    String
  fileName   String?
  expiryDate DateTime?
  notes      String?
  uploadedAt DateTime  @default(now())
  @@map("fleet_documents")
}

model FleetEvent {
  id            String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  clientId      String    @db.Uuid
  vehicleId     String    @db.Uuid
  type          String    // tüv | service | oil_change | tire_change | insurance | brake | fuel_filter | custom
  scheduledDate DateTime
  completedDate DateTime?
  status        String    @default("planned")  // planned | done | overdue
  estimatedCost Float?
  actualCost    Float?
  notes         String?
  createdAt     DateTime  @default(now())
  @@map("fleet_events")
}

model FleetCost {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  clientId  String   @db.Uuid
  vehicleId String   @db.Uuid
  category  String   // fuel | service | insurance | repair | other
  amount    Float
  date      DateTime
  notes     String?
  createdAt DateTime @default(now())
  @@map("fleet_costs")
}
```

---

## PHASE 2 — Repositories الجديدة (3 ملفات)

### `app/repositories/fleet_document_repo.py`
```python
create_document(client_id, data)
get_documents(client_id, vehicle_id, driver_id, doc_type)
delete_document(client_id, document_id)
get_expiring_soon(client_id, days=30)   # expiryDate < now + 30d
get_expired(client_id)                  # expiryDate < now
```

### `app/repositories/fleet_event_repo.py`
```python
create_event(client_id, data)
get_events(client_id, vehicle_id, month, year, status)
update_event_status(client_id, event_id, status)
mark_overdue_events(client_id)          # returns count updated
get_upcoming_events(client_id, days=30)
```

### `app/repositories/fleet_cost_repo.py`
```python
create_cost(client_id, data)
get_costs(client_id, vehicle_id, category, month, year)
get_monthly_totals(client_id, months=8)  # {month: {fuel, service, insurance}}
get_totals_by_category(client_id)        # {fuel: X, service: Y, insurance: Z}
```

---

## PHASE 3 — Services الجديدة (3 ملفات)

### `app/services/fleet_document_service.py`
```python
upload_document(client_id, file, doc_type, vehicle_id, driver_id, expiry_date, notes)
  # → رفع إلى Supabase Storage: properties/{slug}/fleet/documents/{uuid}/{filename}
  # → حفظ URL في fleet_documents

list_documents(client_id, vehicle_id, driver_id, doc_type)
delete_document(client_id, document_id)  # يحذف من Storage + DB
```

### `app/services/fleet_event_service.py`
```python
create_event(client_id, vehicle_id, type, scheduled_date, notes, estimated_cost)
update_event(client_id, event_id, status, completed_date, actual_cost)
get_calendar_events(client_id, month, year)
run_overdue_check(client_id=None)
  # → status=overdue إذا scheduledDate < today AND status=planned
```

### `app/services/fleet_cost_service.py`
```python
log_cost(client_id, vehicle_id, category, amount, date, notes)
get_monthly_chart_data(client_id, months=8)  # للـ Recharts BarChart
get_kpi_totals(client_id)  # {total_fuel, total_service, total_insurance}
```

---

## PHASE 4 — تحديث fleet_dashboard_service.py

```python
# يضاف لـ get_fleet_dashboard():
"warnings": {
    "overdue_events": [...],
    "expiring_docs_30d": [...],
    "expired_docs": [...],
}

# دوال جديدة:
get_cost_chart_data(client_id, months=8)
get_kpi_totals(client_id)
get_maintenance_feed(client_id, limit=10)  # right panel
```

---

## PHASE 5 — API Routes الجديدة (توسعة fleet.py)

```python
# DOCUMENTS
POST   /fleet/documents/upload      # multipart/form-data
GET    /fleet/documents             # ?vehicle_id=&driver_id=&doc_type=
DELETE /fleet/documents/{id}

# EVENTS (TERMINE)
GET    /fleet/events                # ?vehicle_id=&month=&year=&status=
POST   /fleet/events
PATCH  /fleet/events/{id}          # status: planned|done|overdue

# COSTS
GET    /fleet/costs                 # ?vehicle_id=&category=&month=&year=
POST   /fleet/costs

# DASHBOARD ADDITIONS
GET    /fleet/dashboard/costs       # monthly breakdown → Recharts
GET    /fleet/dashboard/warnings    # TÜV/insurance overdue + expiring
GET    /fleet/dashboard/feed        # next 10 upcoming events (right panel)
```

### Pydantic Schemas: `app/schemas/fleet.py`
```python
class FleetEventCreate(BaseModel):
    vehicle_id: UUID
    type: str   # tüv | service | oil_change | tire_change | insurance | brake | fuel_filter
    scheduled_date: date
    estimated_cost: Optional[float] = None
    notes: Optional[str] = None

class FleetEventUpdate(BaseModel):
    status: Optional[str] = None
    completed_date: Optional[date] = None
    actual_cost: Optional[float] = None

class FleetCostCreate(BaseModel):
    vehicle_id: UUID
    category: str   # fuel | service | insurance | repair | other
    amount: float = Field(gt=0)
    date: date
    notes: Optional[str] = None
```

---

## PHASE 6 — Background Job (Daily Cron)

```python
# app/api/v1/super/maintenance.py — يُضاف:
POST /super/maintenance/run-fleet-checks
  # يُشغَّل: 0 3 * * * (Railway Cron — 3:00 AM)
  # 1. يُحدّث fleet_events.status=overdue إذا date < today AND status=planned
  # 2. يُرسل WhatsApp للمدير إذا وثائق تنتهي خلال 7 أيام
```

---

## PHASE 7 — Frontend (5 صفحات)

### هيكلية الملفات
```
frontend/src/pages/fleet/
├── hooks/
│   ├── useFleetDashboard.js     # useQuery → /fleet/dashboard
│   ├── useFleetVehicles.js      # useQuery → /fleet/vehicles
│   ├── useFleetDrivers.js       # useQuery → /fleet/drivers
│   ├── useFleetEvents.js        # useQuery → /fleet/events
│   ├── useFleetDocuments.js     # useQuery → /fleet/documents
│   ├── useFleetCosts.js         # useQuery → /fleet/dashboard/costs
│   └── useFleetWarnings.js      # useQuery → /fleet/dashboard/warnings
│
├── sections/
│   ├── FleetOverviewCards.jsx   # 4 cards: available/service/rented/offline
│   ├── CostsBarChart.jsx        # Recharts StackedBar: Insurance+Service+Fuel
│   ├── TravelsAreaChart.jsx     # Recharts Area: km/month
│   ├── CostKPIs.jsx             # 3 tiles: Total Fuel/Service/Insurance
│   ├── MaintenanceFeed.jsx      # Right panel: chronological events
│   └── WarningAlerts.jsx        # Banner: TÜV/expiry alerts
│
├── components/
│   ├── VehicleForm.jsx          # Add/Edit vehicle modal
│   ├── DriverForm.jsx           # Add/Edit driver modal
│   ├── EventForm.jsx            # Add maintenance event modal
│   ├── CostForm.jsx             # Log cost modal
│   ├── DocumentUpload.jsx       # Upload + expiry date
│   ├── StatusBadge.jsx          # available/service/rented/offline
│   ├── ExpiryBadge.jsx          # 🔴 Expired / 🟠 <30d / ✅ Valid
│   └── FleetNavigation.jsx      # Sidebar navigation
│
├── pages/
│   ├── FleetDashboardPage.jsx   # Main dashboard (matches reference design)
│   ├── VehiclesPage.jsx         # Vehicle list + CRUD
│   ├── DriversPage.jsx          # Driver list + CRUD
│   ├── MaintenancePage.jsx      # Monthly calendar view
│   └── DocumentsPage.jsx        # Documents grid + upload
│
└── fleet.css
```

### Design Tokens
```css
body[data-slug="fleet"] {
  --fleet-bg:      #0a2535;   /* dark navy */
  --fleet-surface: #0d3347;   /* card bg */
  --fleet-accent:  #00bcd4;   /* cyan */
  --fleet-text:    #e0f7fa;
  --fleet-danger:  #ef5350;   /* overdue/expired */
  --fleet-warning: #ffa726;   /* expiring soon */
  --fleet-success: #66bb6a;   /* done/valid */
}
```

### Calendar Colors
```
🟢 done     → #66bb6a
🟡 planned  → #00bcd4
🔴 overdue  → #ef5350
```

### Chart Colors (Recharts)
```js
const COLORS = {
  insurance: '#4dd0e1',   // light teal
  service:   '#00acc1',   // medium teal
  fuel:      '#006064',   // dark teal
  repair:    '#ff8a65',   // orange
};
```

---

## PHASE 8 — Router Registration

### `frontend/src/router/tenants/fleet.routes.jsx`
```jsx
// Lazy-loaded routes for fleet tenant
// Paths: dashboard, vehicles, drivers, maintenance, documents
// Default redirect: dashboard
```

### `frontend/src/router/tenants/index.js`
```js
fleet: {
  routes: lazy(() => import('./fleet.routes')),
  defaultRedirect: 'dashboard',
  theme: 'fleet-dark',
},
```

**URL:** `demo.salmansaas.com/fleet/dashboard`

---

## PHASE 9 — Seed Script

### `scripts/seed_fleet.py`
```
python scripts/seed_fleet.py vicale

يُنشئ:
- 5 vehicles (BMW X5, Mercedes Vito, Ford Transit, Toyota Corolla, VW Passat)
- 3 drivers (مع license + P-Schein)
- 8 events (TÜV, Service, Oil Change, Insurance — mix of planned/done/overdue)
- 6 documents (TÜV cert, insurance, licenses — mix of valid/expiring/expired)
- 24 costs (3 months × fuel + service + insurance + repair)
```

---

## PHASE 10 — Testing Checklist

```
Backend:
□ POST /fleet/documents/upload (multipart) → URL في Supabase Storage
□ GET  /fleet/documents?vehicle_id=... → list
□ POST /fleet/events (type: tüv, date: ماضية) → overdue في /warnings
□ GET  /fleet/events?month=7&year=2026 → calendar data
□ PATCH /fleet/events/{id} (status: done) → يختفي من warnings
□ POST /fleet/costs (category: fuel) → يظهر في /dashboard/costs
□ GET  /fleet/dashboard/warnings → overdue + expiring docs
□ POST /super/maintenance/run-fleet-checks → يُحدّث events

Frontend:
□ /fleet/dashboard → 4 cards + 2 charts + KPIs + feed
□ أضف سيارة → تظهر فوراً
□ TÜV event (date قديمة) → ظهر بالأحمر في Calendar
□ ارفع وثيقة → ExpiryBadge صحيح
□ Calendar navigation: prev/next month

Deploy:
□ python -m prisma db push → Railway DB
□ Railway deploy → health check
□ Cloudflare Pages → /fleet/dashboard يفتح
```

---

## ملخص الملفات الكاملة

### تُعدَّل (5 ملفات):
| الملف | التعديل |
|-------|---------|
| `prisma/schema.prisma` | +3 نماذج + 5 حقول |
| `app/services/fleet_dashboard_service.py` | +warnings + cost chart + feed |
| `app/api/v1/admin/fleet.py` | +9 endpoints |
| `app/api/v1/super/maintenance.py` | +run-fleet-checks |
| `frontend/src/router/tenants/index.js` | +fleet entry |

### تُنشأ (36 ملف):
```
Backend (7):
  app/repositories/fleet_document_repo.py
  app/repositories/fleet_event_repo.py
  app/repositories/fleet_cost_repo.py
  app/services/fleet_document_service.py
  app/services/fleet_event_service.py
  app/services/fleet_cost_service.py
  app/schemas/fleet.py

Scripts (1):
  scripts/seed_fleet.py

Frontend (28):
  hooks/  × 7
  sections/ × 6
  components/ × 8
  pages/ × 5
  fleet.routes.jsx + fleet.css = 2
```

---

## الجدول الزمني

| الأيام | المرحلة |
|--------|---------|
| يوم 1 | Schema + prisma push |
| يوم 2-3 | 3 Repositories |
| يوم 4-5 | 3 Services + Schemas |
| يوم 6-7 | 9 API endpoints + Cron |
| يوم 8-9 | Frontend hooks + sections |
| يوم 10-11 | Frontend components |
| يوم 12-13 | Frontend pages (5) |
| يوم 14 | Routes + CSS + Seed |
| يوم 15-16 | Testing + Deploy |

**المجموع: 16 يوم ≈ 3 أسابيع**

---

*ملاحظة: عند موافقة العميل، أخبرني لأبدأ من PHASE 1 مباشرة.*

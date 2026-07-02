خطة: نظام إدارة أسطول Uber + Samsara (Vicale Fleet Platform)
تاريخ البحث: 2026-06-30 | مبني على: بيانات API حقيقية

Context — لماذا هذه الخدمة؟
صاحب أسطول سيارات (9 سيارات تعمل على Uber) يريد لوحة تحكم مركزية تجمع:

بيانات GPS والسلوك من Samsara (أجهزة في السيارات)
بيانات الأرباح والرحلات من Uber
تنبيهات آلية للمديرين (سرعة زائدة، توقف طويل، إلخ)
الهدف: بناء هذا كـ SaaS قابل للبيع لأصحاب أساطيل Uber الآخرين.

الحقائق الحقيقية عن الـ APIs (نتائج البحث)
Samsara API — متاح وقوي ✅
الميزة	التفاصيل
Auth	OAuth 2.0 أو API Token (per-customer)
GPS	كل ثانية — real-time
Webhooks	SpeedingEventStarted/Ended, SevereSpeedingEnded, AlertIncident, GeofenceEntry/Exit, RouteStopArrival/Departure, DriverCreated/Updated, EngineOn/Off, FormSubmitted
REST Endpoints	GET /fleet/drivers, GET /assets, GET /fleet/vehicle/stats, Safety API (safety scores), Vehicle Stats API
Driver Behavior	Acceleration, braking, cornering, speeding — per driver
Engine/Fuel	Fault codes, idle time, fuel consumption
تنبيه مهم	كل عميل عنده webhook endpoint منفصل (مو global handler)
Uber API — محدود وصعب ⚠️
الخيار	التفاصيل	الواقع
Driver API	Trip history, earnings, ratings per driver	ACCESS IS LIMITED — يحتاج موافقة Uber
Supplier/Fleet API	Performance reports: أرباح، رحلات، ساعات لكل driver ولكل سيارة	"Privileged and Confidential" — يحتاج تسجيل كـ "vehicle supplier"
Uber Fleet App	نفس البيانات — تطبيق رسمي من Uber	موجود لكنه منفصل
CSV Export	تصدير يدوي من حساب Uber Fleet	متاح دائماً، لا يحتاج API
الخلاصة الحقيقية: لا يمكنك فتح Uber API بشكل مباشر — يجب إما:

التسجيل كـ "vehicle supplier" رسمي مع Uber والتقديم للـ Supplier API (أسابيع/أشهر)
البدء بـ CSV import + driver OAuth consent (الأسرع والأضمن للـ MVP)
معمارية المشروع المقترحة
3 مراحل تطوير
Phase 1 (MVP — 2-3 أسابيع):
  ✅ Samsara webhooks — real-time fleet data
  ✅ Uber CSV import — يدوي أو scheduled upload
  ✅ Dashboard: GPS map + earnings + alerts

Phase 2 (Month 2):
  🔄 Uber Driver OAuth — كل سائق يوافق مرة واحدة → نجلب بياناته تلقائياً
  🔄 Automated reports + WhatsApp notifications

Phase 3 (Month 3+):
  📋 Uber Supplier API — بعد الحصول على الموافقة
  📋 Multi-tenant: بيع الخدمة لأساطيل أخرى
  📋 AI coaching للسائقين
Schema — نماذج قاعدة البيانات الجديدة
يضاف إلى prisma/schema.prisma:

model FleetVehicle {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  clientId       String   @db.Uuid
  samsaraId      String?  @unique  // ID في Samsara
  uberVehicleId  String?            // ID في Uber
  plateNumber    String
  make           String?
  model          String?
  year           Int?
  status         String   @default("active") // active | idle | maintenance | offline
  lastLat        Float?
  lastLng        Float?
  lastSeenAt     DateTime?
  createdAt      DateTime @default(now())

  driver         FleetDriver?
  trips          FleetTrip[]
  samsaraEvents  SamsaraEvent[]
  client         Client   @relation(fields: [clientId], references: [id])

  @@map("fleet_vehicles")
}

model FleetDriver {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  clientId      String   @db.Uuid
  vehicleId     String?  @unique @db.Uuid
  samsaraId     String?
  uberDriverId  String?
  name          String
  phone         String?
  safetyScore   Float?   // 0-100 من Samsara
  totalTrips    Int      @default(0)
  totalEarnings Float    @default(0)
  uberToken     String?  // OAuth token مشفّر

  vehicle       FleetVehicle? @relation(fields: [vehicleId], references: [id])
  trips         FleetTrip[]
  alerts        DriverAlert[]
  client        Client        @relation(fields: [clientId], references: [id])

  @@map("fleet_drivers")
}

model FleetTrip {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  clientId    String    @db.Uuid
  vehicleId   String    @db.Uuid
  driverId    String?   @db.Uuid
  uberTripRef String?
  startTime   DateTime
  endTime     DateTime?
  revenue     Float?
  distanceKm  Float?
  city        String?
  status      String    // started | completed | cancelled
  source      String    @default("csv") // csv | api | manual

  vehicle     FleetVehicle @relation(fields: [vehicleId], references: [id])
  driver      FleetDriver? @relation(fields: [driverId], references: [id])
  client      Client       @relation(fields: [clientId], references: [id])

  @@map("fleet_trips")
}

model SamsaraEvent {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  clientId    String   @db.Uuid
  vehicleId   String?  @db.Uuid
  eventType   String   // SpeedingEventStarted | GeofenceEntry | AlertIncident | ...
  severity    String?  // low | medium | high
  lat         Float?
  lng         Float?
  speed       Float?
  rawPayload  Json
  isRead      Boolean  @default(false)
  occurredAt  DateTime

  vehicle     FleetVehicle? @relation(fields: [vehicleId], references: [id])
  client      Client        @relation(fields: [clientId], references: [id])

  @@map("samsara_events")
}

model DriverAlert {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  clientId    String   @db.Uuid
  driverId    String   @db.Uuid
  type        String   // speeding | harsh_brake | idling | geofence | engine_fault
  message     String
  severity    String   // info | warning | critical
  isRead      Boolean  @default(false)
  sentWhatsApp Boolean @default(false)
  createdAt   DateTime @default(now())

  driver      FleetDriver @relation(fields: [driverId], references: [id])
  client      Client      @relation(fields: [clientId], references: [id])

  @@map("driver_alerts")
}
Backend — الملفات الجديدة
Layer 1: Adapters (خارج الـ 4-layer — للـ external APIs)
app/adapters/
├── samsara_adapter.py     # Samsara REST client (httpx async)
└── uber_adapter.py        # Uber OAuth + CSV parser
samsara_adapter.py — الوظائف:

get_vehicles() → GET /fleet/vehicles
get_vehicle_stats(vehicle_id) → GPS + fuel + engine
get_driver_safety_score(driver_id) → Safety API
get_active_trips() → GET /fleet/routes
verify_webhook_secret(payload, signature) → HMAC validation
uber_adapter.py — الوظائف:

parse_trips_csv(file_bytes) → List[TripData] — يحلل CSV تصدير Uber
get_driver_trips_oauth(token, start_date, end_date) → Driver API (Phase 2)
get_fleet_report(org_id) → Supplier API (Phase 3)
Layer 2: Repositories
app/repositories/
├── fleet_repo.py          # CRUD للـ FleetVehicle, FleetDriver
├── trip_repo.py           # CRUD للـ FleetTrip
└── samsara_event_repo.py  # CRUD للـ SamsaraEvent + DriverAlert
Layer 3: Services
app/services/
├── samsara_service.py         # معالجة webhooks + polling Samsara
├── uber_import_service.py     # استيراد CSV + OAuth trips
└── fleet_dashboard_service.py # تجميع البيانات للداشبورد
fleet_dashboard_service.py — يرجع:

{
  "total_vehicles": 9,
  "active_now": 4,
  "idle": 3,
  "offline": 2,
  "today_revenue": 1240.50,
  "today_trips": 47,
  "unread_alerts": 3,
  "fleet_health": 87,
  "top_driver": { "name": "Ahmed", "revenue": 320 },
  "alerts": [
    { "driver": "Khalid", "type": "speeding", "severity": "critical", "time": "..." }
  ],
  "vehicles": [
    { "id": "...", "plate": "M-XY 1234", "driver": "Ali", "status": "active", "lat": 48.13, "lng": 11.57 }
  ]
}
Layer 4: Routes
app/api/v1/
├── webhooks/
│   └── samsara.py           # POST /webhooks/samsara (public, no auth)
└── admin/
    └── fleet.py             # GET /admin/fleet/dashboard
                              # GET /admin/fleet/vehicles
                              # GET /admin/fleet/alerts
                              # POST /admin/fleet/trips/import (CSV upload)
                              # PATCH /admin/fleet/alerts/{id}/read
الـ Webhook Flow (Samsara → Platform)
Samsara Server
    │
    │  POST /webhooks/samsara
    │  Header: X-Samsara-Signature: HMAC-SHA256(secret, body)
    ▼
app/api/v1/webhooks/samsara.py
    │
    ├── verify_webhook_secret()  ← adapter
    ├── parse event type
    │
    ├── SpeedingEventStarted → samsara_service.handle_speeding()
    │       → samsara_event_repo.create()
    │       → driver_alert_repo.create(severity="warning")
    │       → [if 3+ today] → notification_service.send_whatsapp()
    │
    ├── GeofenceExit → samsara_service.handle_geofence()
    ├── AlertIncident → samsara_service.handle_alert()
    └── EngineOn/Off  → fleet_repo.update_vehicle_status()
خطة التنفيذ خطوة بخطوة
الخطوة 1 — Samsara Setup (يوم 1-2)
اشتري subscription من Samsara للأسطول (يبدأ بـ ~$27/سيارة/شهر)
احصل على API Token من Samsara Dashboard
ابنِ samsara_adapter.py مع verify_webhook_secret()
سجّل webhook URL في Samsara Dashboard: https://yourdomain.com/webhooks/samsara
اختبر مع SpeedingEvent حقيقي
الخطوة 2 — DB Models (يوم 2-3)
أضف النماذج أعلاه لـ prisma/schema.prisma
شغّل npx prisma db push
ابنِ fleet_repo.py + samsara_event_repo.py
الخطوة 3 — Uber CSV Import (يوم 3-4)
من Uber Fleet Portal: export trip history كـ CSV
ابنِ uber_import_service.py يحلل الـ CSV
أضف POST /admin/fleet/trips/import endpoint
ارفع الـ CSV → يُحوّل إلى FleetTrip records
الخطوة 4 — Dashboard API (يوم 4-5)
ابنِ fleet_dashboard_service.py
أضف GET /admin/fleet/dashboard
اختبر بـ cURL
الخطوة 5 — Frontend Dashboard (يوم 5-7)
صفحة React Admin جديدة: /fleet
مكونات: FleetMap (GPS markers) + EarningsCard + AlertFeed + VehicleTable
useQuery لجلب dashboard data كل 30 ثانية
قرارات تقنية مهمة
القرار	الاختيار	السبب
Uber data source (MVP)	CSV import	Driver API محدود الوصول — لا تنتظر موافقة Uber للبدء
Samsara auth	API Token (not OAuth)	أبسط للبداية، OAuth للـ multi-tenant
Webhook processing	Sync (FastAPI BackgroundTasks)	9 سيارات = volume منخفض، لا يحتاج Celery
GPS storage	آخر موقع فقط في FleetVehicle	لا تخزن كل ثانية — غالٍ على DB
GPS history	SamsaraEvent table	فقط عند وجود event (geofence, speeding)
Notifications	WhatsApp (wa.me) + ntfy.sh	بدون WhatsApp Business API
Fleet map	React + Leaflet.js	مجاني، يعمل مع GPS coordinates
GDPR (ميونخ — ألمانيا)
⚠️ بما أن المشروع في ألمانيا:

بيانات GPS لكل سائق = "personenbezogene Daten" تحت DSGVO
يجب: موافقة مكتوبة من كل سائق قبل تفعيل Samsara
يجب: Data Processing Agreement مع Samsara
لا تخزن GPS history لأكثر من ما يحتاجه العمل (عادة 90 يوم)
أضف DELETE /admin/fleet/drivers/{id}/data endpoint للحذف الكامل
التكلفة التقديرية
الخدمة	التكلفة
Samsara (9 سيارات)	~$243/شهر
Supabase (existing)	$0-25
Railway (existing)	$0-20
المجموع	~$270/شهر
إذا بعت الخدمة لأساطيل أخرى: كل عميل يحتاج Samsara subscription خاص به.

ملفات تُنشأ/تُعدّل
الملف	الإجراء
prisma/schema.prisma	إضافة 5 نماذج جديدة
app/adapters/samsara_adapter.py	جديد
app/adapters/uber_adapter.py	جديد
app/repositories/fleet_repo.py	جديد
app/repositories/trip_repo.py	جديد
app/repositories/samsara_event_repo.py	جديد
app/services/samsara_service.py	جديد
app/services/uber_import_service.py	جديد
app/services/fleet_dashboard_service.py	جديد
app/api/v1/webhooks/samsara.py	جديد
app/api/v1/admin/fleet.py	جديد
app/main.py	تسجيل الـ routers الجديدة
frontend/src/pages/showcase/admin/FleetDashboard.jsx	جديد
Verification (كيف تتأكد إنه شغّال)
POST /webhooks/samsara مع payload يدوي → يُنشئ SamsaraEvent في DB
POST /admin/fleet/trips/import مع CSV من Uber → يُنشئ FleetTrip records
GET /admin/fleet/dashboard → يرجع JSON بالـ vehicles + alerts + revenue
Samsara Dashboard → أرسل test webhook → تأكد إنه وصل
Frontend map يعرض markers للسيارات المفعّلة
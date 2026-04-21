# تقرير قاعدة البيانات — Beit Smar PMS
**تاريخ التحديث:** 21 أبريل 2026
**التقنيات:** PostgreSQL (Supabase) + Prisma ORM (Python Client) + FastAPI
**الملفات المُفحوصة:** `prisma/schema.prisma` + 8 repositories + 15 services + 20 API routes

---

## البنية المعمارية (4-Layer Architecture)

```
HTTP Request
    ↓
Routes (app/api/v1/)          ← HTTP transport only. Zero business logic.
    ↓
Services (app/services/)      ← Business logic, orchestration, calculations.
    ↓
Repositories (app/repositories/) ← The ONLY layer allowed to call prisma.*
    ↓
DB (PostgreSQL / Supabase)    ← Managed via Prisma schema
```

**Multi-Tenancy:** كل استعلام في الـ Repository يحتوي على `clientId` داخل الـ `where` clause — لا استثناءات.

**اتصال قاعدة البيانات (`app/db/client.py`):**
```
DATABASE_URL  → Transaction Pooler (port 6543 + pgbouncer=true)  — Runtime queries
DIRECT_URL    → Direct Connection  (port 5432)                   — prisma migrate / db push
```
Client Singleton: `prisma_client = Prisma()` — يتصل عند startup ويقطع عند shutdown.

---

## الجداول (9 Models)

### 1. `Client` — جدول الجذر (Multi-Tenancy Root)

| الحقل | النوع | ملاحظة |
|---|---|---|
| `id` | UUID PK | auto-generated |
| `slug` | String UNIQUE | معرف URL مثل `smar` |
| `phone` | String UNIQUE | رقم الهاتف |
| `name` / `name_ar` / `name_en` | String | الاسم ثلاثي |
| `email` / `password_hash` | String? | للـ SSO login |
| `isActive` | Boolean | default true |
| `primary_color` | String? | `#d4a853` |
| `hero_video_url` | String? | فيديو الهيرو |
| `whatsapp_number` | String? | للإشعارات |
| `instagram_url` / `maps_url` | String? | روابط خارجية |
| `currency` | String | default `"USD"` ⚠️ |
| `features` | Json? | `{spatial, listings, booking, payment}` |
| `unit_types` | String[] | `["villa","chalet"]` |
| `payment_methods` | String[] | `["cash","card","whish","omt"]` |

> **Auto-Seed:** عند أول طلب `/{slug}/config` إذا كان `slug == "smar"` ولا يوجد row → يُنشئ تلقائياً عبر `public_service.get_tenant_config()`.

**العلاقات:** `Client → has many → [User, Property, Unit, Customer, Booking, Price, Service]`

---

### 2. `User` — مستخدمو النظام الإداري

| الحقل | النوع | ملاحظة |
|---|---|---|
| `id` | UUID PK | |
| `clientId` | UUID FK → Client | Cascade delete |
| `email` | String UNIQUE | |
| `password_hash` | String | bcrypt |
| `fullName` | String | |
| `role` | Enum UserRole | |
| `isActive` | Boolean | default true |

**Enum UserRole:** `SUPER_ADMIN | TENANT_ADMIN | MANAGER_RESERVATIONS | MANAGER_UNITS`

---

### 3. `Property` — المنشآت العقارية

| الحقل | النوع | ملاحظة |
|---|---|---|
| `id` | UUID PK | |
| `clientId` | UUID FK → Client | Cascade delete |
| `managerId` | UUID? FK → User | اختياري |
| `name` / `description` / `image_url` | String? | |
| `max_guests` / `bedrooms` / `bathrooms` | Int | |
| `isActive` | Boolean | default true |

**العلاقات:** `Property → has many → [Unit, Service]`

---

### 4. `Unit` — الوحدات السكنية ⭐

| الحقل | النوع | ملاحظة |
|---|---|---|
| `id` | UUID PK | |
| `propertyId` | UUID FK → Property | Cascade delete |
| `clientId` | UUID FK → Client | |
| `unitNumber` | String? | رقم تعريفي اختياري |
| `unit_type` | String? | `villa / chalet / restaurant / pool` — default `"chalet"` |
| `name_ar` / `name_en` | String? | ثنائي اللغة |
| `description` | String? | حقل legacy |
| `description_ar` / `description_en` | String? | **الحقول الجديدة** — ثنائي اللغة |
| `category` | String? | **حقل جديد** — فلترة مستقلة عن `unit_type` |
| `image_url` | String? | الصورة الرئيسية (= `images[0]`) |
| `images` | String[] | مصفوفة Supabase URLs — default `[]` |
| `capacity` | Int | عدد الضيوف |
| `bedrooms` / `bathrooms` | Int? | |
| `price` | Decimal(10,2)? | السعر الأساسي |
| `price_label` | String? | مثل "يبدأ من" |
| `isActive` / `isAvailable` | Boolean | default true |
| `sort_order` | Int? | ترتيب العرض — default 0 |
| `position_x` / `position_y` | Float? | موقع على خريطة الـ canvas |
| `content_blocks` | Json? | **Block Builder** — مصفوفة `{type, content, style?, icon?, title?}` |
| `amenities` | Json? | **مصفوفة المرافق** — `{icon, label, label_ar?}` |
| `rules_policies` | Json? | **القواعد والسياسات** — `{checkIn, checkOut, cancellation, rules[]}` |

**JSON Schemas:**

```json
// content_blocks
[
  {"type": "section_title", "content": "الطبيعة والهدوء", "style": {"size": "large", "color": "gold", "bold": true}},
  {"type": "highlight_item", "icon": "mountain", "title": "إطلالة جبلية", "content": "من 800م فوق سطح البحر"},
  {"type": "paragraph", "content": "نص وصفي...", "style": {"color": "gray"}}
]

// amenities
[{"icon": "wifi", "label": "Free WiFi", "label_ar": "واي فاي مجاني"}, {"icon": "pool", "label": "Private Pool"}]

// rules_policies
{"checkIn": "15:00", "checkOut": "12:00", "cancellation": "استرداد 50%...", "rules": ["ممنوع التدخين", "ممنوع الحيوانات"]}
```

> **تمرير Json لـ Prisma:** يجب دائماً استخدام `from prisma import Json` ثم `Json(value)` — بدونها تعطي `DataError: Unable to match input value`.

**العلاقات:** `Unit → has many → [Booking, Price]`

---

### 5. `Price` — التسعير الديناميكي

| الحقل | النوع | ملاحظة |
|---|---|---|
| `id` | UUID PK | |
| `unitId` | UUID FK → Unit | Cascade delete |
| `clientId` | UUID FK → Client | |
| `date` | DateTime `@db.Date` | تاريخ اليوم |
| `price` | Decimal(10,2) | |
| `currency` | String | default `"SAR"` |
| `minStay` | Int | default 1 |
| `available` | Boolean | default true |

**Constraints:** `@@unique([unitId, date])` — سعر واحد فقط لكل وحدة في كل يوم.

**Indexes:** `date`, `clientId`

> **تحويل التاريخ:** الحقل من نوع `@db.Date` لكن Prisma يتوقع `datetime` — دائماً استخدم `to_datetime_start(d)` من `price_service.py`.

**استخدامات:**
- `available=False` → يوم محجوب من قِبَل الأدمن
- `available=True + price > 0` → تسعير مخصص
- حذف+إعادة إنشاء عبر `date_overrides` endpoint (delete_many → create_many)

---

### 6. `Service` — الخدمات الإضافية

| الحقل | النوع | ملاحظة |
|---|---|---|
| `id` | UUID PK | |
| `clientId` | UUID FK → Client | |
| `propertyId` | UUID? FK → Property | اختياري |
| `name_ar` / `name_en` | String | إلزامي |
| `description` / `image_url` | String? | |
| `duration` | Int? | بالدقائق |
| `basePrice` | Decimal(10,2) | |
| `currency` | String | default `"SAR"` |
| `isActive` / `sort_order` | Boolean / Int? | |

---

### 7. `Customer` — العملاء

| الحقل | النوع | ملاحظة |
|---|---|---|
| `id` | UUID PK | |
| `clientId` | UUID FK → Client | |
| `phone` | String UNIQUE | مفتاح التعرف |
| `name` | String? | |
| `email` | String? UNIQUE | |

**Auto-create:** يُنشأ تلقائياً عند `create_public_booking()` إذا لم يكن موجوداً.

**Customer النظامي:** `phone = "__block__{clientId}"` — يُنشأ عبر `upsert` لتلبية قيد `NOT NULL customerId` عند حجب التواريخ.

---

### 8. `Booking` — الحجوزات ⭐

| الحقل | النوع | ملاحظة |
|---|---|---|
| `id` | UUID PK | |
| `clientId` | UUID FK → Client | |
| `unitId` | UUID FK → Unit | |
| `customerId` | UUID FK → Customer | |
| `checkIn` / `checkOut` | DateTime `@db.Date` | |
| `guests` | Int | |
| `totalPrice` | Decimal(10,2) | |
| `currency` | String | default `"SAR"` |
| `status` | String | `pending / confirmed / cancelled / blocked / rejected` |
| `source` | String? | `website / admin / whatsapp` |
| `bookingRef` | String? UNIQUE | |
| `notes` | String? | |
| `paymentMethod` | String? | default `"cash"` |
| `paymentReference` | String? | |
| `arrivalTime` | String? | |

**Indexes:** `clientId`, `unitId`, `customerId`, `status`, `(checkIn, checkOut)`

**تحقق التداخل (Overlap Check) في `booking_repo.check_availability()`:**
```python
# 3 حالات تداخل:
# 1. الحجز الجديد يبدأ أثناء حجز قائم
# 2. الحجز الجديد ينتهي أثناء حجز قائم
# 3. الحجز الجديد يُغطي حجزاً قائماً بالكامل
# يفحص فقط status IN ["pending", "confirmed"]
# ⚠️ "blocked" لا يُفحص هنا — لكنه يُستبعد في get_client_catalog
```

---

### 9. `BookingService` — Pivot Table (حجز ↔ خدمة)

| الحقل | النوع | ملاحظة |
|---|---|---|
| `bookingId` | UUID FK → Booking | Cascade delete |
| `serviceId` | UUID FK → Service | |
| `quantity` | Int | default 1 |
| `price` | Decimal(10,2) | السعر وقت الحجز |
| `notes` | String? | |

**PK:** `@@id([bookingId, serviceId])` — مفتاح مركب.

---

## مخطط العلاقات الكامل (ERD)

```
Client ──────────────────────────────────────────────────────┐
  │                                                           │
  ├──● User (RBAC: SUPER_ADMIN, TENANT_ADMIN,                │
  │         MANAGER_RESERVATIONS, MANAGER_UNITS)             │
  │          │                                               │
  ├──● Property ←── managed by User (optional)              │
  │    │                                                      │
  │    ├──● Unit ──────● Price (@@unique unitId+date)        │
  │    │    │                                                 │
  │    │    └──────────● Booking ──● BookingService          │
  │    │                    │             │                   │
  │    └──● Service ────────┘─────────────┘                  │
  │                                                           │
  └──● Customer ──● Booking                                  │
                                                              │
  ←── Multi-Tenancy: clientId on EVERY model ───────────────┘
```

---

## طبقة الـ Services — منطق الأعمال

### `public_service.py`
| الدالة | الوصف |
|---|---|
| `get_tenant_config(slug)` | Config + auto-seed للـ smar client |
| `get_client_catalog(slug, check_in, check_out, guests, unit_type)` | كتالوج الوحدات المتاحة مع استبعاد المحجوزة |
| `create_public_booking(slug, data)` | Customer upsert → price calc → booking create → WhatsApp notification |
| `get_unit_calendar_data(slug, unit_id)` | Disabled dates (bookings + price rows) + price overrides |
| `get_tenant_gallery_images(slug)` | قائمة صور من Supabase Storage |

### `price_service.py`
| الدالة | الوصف |
|---|---|
| `get_prices(client_id, unit_id, date_from, date_to)` | جلب سجلات الأسعار |
| `set_bulk_prices(unit_id, start, end, price, weekend_price)` | delete_many ثم create_many لنطاق تواريخ |
| `to_datetime_start(d)` / `to_datetime_end(d)` | تحويل `date` → `datetime` لتوافق Prisma `@db.Date` |

### `booking_service.py`
```
create_booking():
  1. customer_repo.get_by_phone() → إنشاء إذا لم يكن موجوداً
  2. booking_repo.check_availability() → 3-case overlap check
  3. booking_repo.create()

get_client_bookings(): paginated, filterable (status, date range)
update_booking_status(): valid statuses: pending/confirmed/cancelled/completed
```

### `availability_service.py`
```
get_monthly_availability():
  - يجري استعلامين بالتوازي: get_prices_for_range + get_overlapping_bookings
  - أولوية الحالات: booked > blocked > available > no_price
  - يُرجع قائمة بكل أيام الشهر مع: status, price, min_stay, currency
```

### `storage_service.py`
- `upload_unit_image(slug, unit_id, bytes, content_type)` → Supabase Storage → public URL
- `delete_unit_image(url)` → Supabase Storage delete
- المسار: `properties/{slug}/{unit_id}/{uuid}.{ext}`

---

## طبقة الـ Repositories

| الـ Repository | الاستعلامات |
|---|---|
| `UnitRepository` | get_all_by_property, get_all_by_client (type/capacity filter), get_by_id, create, update |
| `BookingRepository` | count_by_client, get_all_by_client (paginated), get_by_unit, create, check_availability (3-case), update_status |
| `DashboardRepository` | get_monthly_booking_stats (revenue by status), get_upcoming_checkins (next N days), get_occupancy_data (overlapping bookings), get_properties_with_units |
| `AvailabilityRepository` | get_prices_for_range, get_overlapping_bookings |
| `ClientRepository` | CRUD على جدول clients |
| `CustomerRepository` | get_by_phone, create |
| `PropertyRepository` | CRUD على جدول properties |

---

## API Endpoints الكاملة

### Public API (`/api/v1/public/{slug}/`)

| Endpoint | Method | الوصف |
|---|---|---|
| `/config` | GET | إعدادات المستأجر + برندنغ |
| `/listings` | GET | كتالوج الوحدات (مع date/guests/type filter) |
| `/bookings` | POST | إنشاء حجز جديد |
| `/price` | GET | حساب سعر نطاق تواريخ |
| `/services` | GET | الخدمات الإضافية |
| `/units/{id}/calendar` | GET | تقويم التوفر + price overrides |
| `/gallery` | GET | صور المعرض من Supabase Storage |

### Admin API (`/api/v1/admin/`)

| Endpoint | Method | الوصف |
|---|---|---|
| `/units/` | GET, POST | قائمة الوحدات + إنشاء |
| `/units/{id}` | PATCH | تحديث (name, type, capacity, images, amenities, blocks, rules) |
| `/units/{id}/images` | POST, DELETE | رفع/حذف صورة |
| `/units/{id}/block-dates` | POST | حجب نطاق تواريخ (booking status=blocked) |
| `/units/{id}/date-overrides` | POST | تسعير مخصص أو حجب عبر Price table |
| `/bookings/` | GET, POST | قائمة + إنشاء حجوزات |
| `/bookings/{id}/status` | PATCH | تحديث الحالة |
| `/dashboard` | GET | إحصائيات شهرية + قادمين + إشغال |
| `/dashboard/stats` | GET | KPI سريع (4 أرقام) |
| `/settings` | GET, PATCH | إعدادات المستأجر |
| `/team` | GET, POST, DELETE | إدارة المستخدمين |
| `/auth/login` | POST | تسجيل دخول + JWT |

---

## إحصائيات النظام

| المقياس | القيمة |
|---|---|
| عدد الجداول | 9 models + 1 Enum |
| عدد الـ Indexes | 14 |
| عدد الـ Unique Constraints | 5 (`slug`, `phone` على Customer, `email` على Customer, `bookingRef`, `unitId+date`) |
| نوع المفاتيح | UUID v4 (`gen_random_uuid()` في PostgreSQL) |
| حالات الحجز | 5: `pending`, `confirmed`, `cancelled`, `blocked`, `rejected` |
| أنواع الوحدات | `villa`, `chalet`, `restaurant`, `pool` |
| طرق الدفع | `cash`, `card`, `whatsapp`, `whish`, `omt` |
| أدوار المستخدمين | 4: `SUPER_ADMIN`, `TENANT_ADMIN`, `MANAGER_RESERVATIONS`, `MANAGER_UNITS` |
| Supabase Storage Bucket | `properties/{slug}/{unit_id}/` |

---

## مشاكل قائمة وتحذيرات

### حرجة

| # | المشكلة | الملف | الحل |
|---|---|---|---|
| 1 | `set_bulk_prices` يكتب `"currency": "USD"` بدلاً من `"SAR"` | `price_service.py:71` | تغيير إلى `"SAR"` أو أخذها من إعدادات الـ Client |
| 2 | `UnitRepository.update()` يستخدم `update_many` بدلاً من `update` — فشل صامت إذا لم يتطابق | `unit_repo.py:68` | تغيير لـ `update` مع `findFirst` أولاً للـ 404 |
| 3 | `check_availability()` يفحص فقط `["pending", "confirmed"]` — لا يشمل `"blocked"` | `booking_repo.py:79` | صحيح من الناحية الوظيفية لأن `get_client_catalog` يستبعد الـ blocked — لكن يجب توثيقه |

### متوسطة

| # | المشكلة | الملف | الحل |
|---|---|---|---|
| 4 | `Client.currency` default هو `"USD"` لكن `Price.currency` default هو `"SAR"` — تناقض | `schema.prisma:32,153` | توحيد إلى `"SAR"` |
| 5 | `public_service.get_unit_services_data()` يستخدم `find_unique` بدون `clientId` — فجوة أمنية نظرية | `public_service.py:91` | إضافة `clientId` للـ where |
| 6 | `get_client_catalog` يسترجع كل الخدمات بـ `include` ثم يُضمّنها في كل response — N+1 محتمل عند الـ cache miss | `public_service.py:263` | تُعاد مرة واحدة فقط per request — مقبول |

### منخفضة (بعد الإطلاق)

| # | المشكلة |
|---|---|
| 7 | لا يوجد Full-text search على الحجوزات |
| 8 | لا يوجد CSV/Excel export |
| 9 | لا يوجد Audit log لتتبع تغييرات الأدمن |
| 10 | `bookingRef` يُعاد فارغاً — لا يُولَّد تلقائياً |

---

## نمط إضافة حقل جديد للـ Schema (5 خطوات)

```bash
# 1. أضف الحقل لـ prisma/schema.prisma
# 2. شغّل:
npx prisma generate

# 3. نفّذ SQL مباشرة في Supabase SQL Editor:
ALTER TABLE units ADD COLUMN new_field TEXT;

# 4. حدّث الـ Pydantic schema (UnitCreate + UnitUpdate في units.py)
# 5. حدّث _fmt() في units.py لإرجاع الحقل الجديد
```

> ⚠️ لا تستخدم `prisma migrate deploy` على production — استخدم Supabase SQL Editor مباشرة.

---

## ملاحظات تقنية مهمة

1. **تحويل التاريخ:** `checkIn/checkOut` و `Price.date` من نوع `@db.Date` — Prisma يتوقع `datetime` objects. الحل الموحد: `to_datetime_start(d)` في `price_service.py`.

2. **حجب التواريخ — طريقتان:**
   - عبر Booking بحالة `"blocked"` (endpoint: `/block-dates`) → يظهر في تقرير الحجوزات
   - عبر Price record بـ `available=False` (endpoint: `/date-overrides`) → تحكم دقيق يومي

3. **WhatsApp Notification:** Fire-and-forget في `create_public_booking()` — إذا فشل لا يُلغي الحجز.

4. **Gallery Images:** تُجلب من Supabase Storage مباشرة (ليست في DB) — الـ category تُستنتج من اسم الملف (`beitsmar1-3` → chalet, `4-6` → nature, `7-9` → pool, `10-12` → chalet).

5. **Availability Priority:** `booked > blocked > available > no_price` — إذا كان يوم محجوزاً AND له Price row بـ available=False، يُعاد كـ "booked".

6. **Prisma Json() Wrapper:** حقول `content_blocks`, `amenities`, `rules_policies` تتطلب `from prisma import Json` ثم `Json(value)` عند الكتابة. القراءة تُرجع Python objects مباشرة.

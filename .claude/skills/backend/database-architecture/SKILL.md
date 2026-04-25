# Database Architecture & Schema Evolution Plan

**Stack:** PostgreSQL (Supabase) + Prisma ORM (prisma-client-py) + FastAPI
**Schema file:** `prisma/schema.prisma`
**Connection strategy:**
- `DATABASE_URL` (port 6543, pgbouncer=true) — runtime queries
- `DIRECT_URL` (port 5432) — migrations and `prisma db push`

---

## 1. The 4-Layer Architecture — Immutable Rule

```
Routes (app/api/)         → HTTP transport only. Zero Prisma imports.
Services (app/services/)  → Business logic. Orchestrates repositories.
Repositories (app/repo/)  → The ONLY place for prisma.* calls. CRUD only.
DB (Supabase/Postgres)    → Managed via Prisma.
```

**Multi-Tenancy Rule (CRITICAL):** Every single DB query must include `clientId` inside the `where` clause. Never filter in Python after fetching. No cross-tenant data leakage is permitted.

---

## 2. Current Schema — 8 Models

```
Client          → root tenant row (branding + config — merged from old TenantConfig)
User            → staff/admin accounts (UserRole enum: SUPER_ADMIN, TENANT_ADMIN, MANAGER_RESERVATIONS, MANAGER_UNITS)
Property        → physical estate/resort (parent of Units)
Unit            → bookable unit — villa, chalet, restaurant, pool
Price           → per-day dynamic pricing (@@unique unitId+date)
Customer        → guest/client (auto-created on first booking)
Booking         → reservation record
BookingService  → pivot: Booking ↔ Service (quantity, price)
Service         → add-on services (breakfast, cleaning, etc.)
```

### ERD (simplified)
```
Client ──< User
Client ──< Property ──< Unit ──< Booking ──< BookingService >── Service
                         └──< Price
Client ──< Customer ──< Booking
```

---

## 3. Unit Model — Full Field Inventory (current as of 2026-04-21)

```prisma
model Unit {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  propertyId  String   @db.Uuid
  clientId    String   @db.Uuid
  unitNumber  String?
  unit_type   String?  @default("chalet")   // villa | chalet | restaurant | pool
  name_ar     String?
  name_en     String?
  description String?
  image_url   String?                        // first image (always synced from images[0])
  images      String[] @default([])         // Supabase public URLs
  capacity    Int
  bedrooms    Int?
  bathrooms   Int?
  price       Decimal? @db.Decimal(10,2)
  price_label String?
  isActive    Boolean  @default(true)
  isAvailable Boolean  @default(true)
  sort_order  Int?     @default(0)
  position_x  Float?                         // map pin X
  position_y  Float?                         // map pin Y

  // ── Dynamic Content Block Builder (added 2026-04-21) ────────────────────
  category       String?   // villa | chalet | studio — filterable classification
  description_ar String?
  description_en String?
  content_blocks Json?     // Array<{type, content, style?, icon?, title?}>
  amenities      Json?     // Array<{icon, label, label_ar?}>
  rules_policies Json?     // {checkIn, checkOut, cancellation, rules[]}
}
```

---

## 4. Dynamic Content Block Builder — JSON Schemas

### `content_blocks` — Array of typed blocks
```json
[
  {
    "type": "section_title",
    "content": "Connection, Nature & Serenity 🌿",
    "style": { "size": "large", "color": "gold", "bold": true }
  },
  {
    "type": "highlight_item",
    "icon": "sparkles",
    "title": "Luxurious Accommodation",
    "content": "King-size beds with fine linens..."
  },
  {
    "type": "paragraph",
    "content": "Discover Zayin Patio Cottage at Beit Smar...",
    "style": { "size": "normal", "color": "gray" }
  }
]
```
**Block types:** `section_title` | `highlight_item` | `paragraph`

### `amenities` — Array of icon+label pairs
```json
[
  { "icon": "wifi",  "label": "Free WiFi",    "label_ar": "واي فاي مجاني" },
  { "icon": "pool",  "label": "Private Pool", "label_ar": "مسبح خاص" }
]
```
**Icon set (lucide-react names):** wifi, pool, mountain, car, flame, snowflake, tv, utensils, bath, bed-double, tree-pine, sun, moon, coffee, music, shield, sparkles, star, heart, baby, wind, dumbbell, parking-circle

### `rules_policies` — Object
```json
{
  "checkIn":      "15:00",
  "checkOut":     "12:00",
  "cancellation": "50% refund if cancelled 48h before check-in",
  "rules": ["No Smoking", "No Pets", "Quiet hours after 22:00"]
}
```

---

## 5. How to Add Fields to the Schema — 5-Step Checklist

When adding new fields to **any** model, follow all 5 steps in order:

### Step 1 — `prisma/schema.prisma`
Add the field with correct type, default, and `@map("snake_case_column")`.
```prisma
new_field Json? @map("new_field")
```

### Step 2 — Push to DB (use DIRECT_URL)
```bash
npx prisma db push   # uses DIRECT_URL (port 5432) — bypasses pgbouncer
prisma generate      # regenerate Python client
```

### Step 3 — Pydantic schema (`app/schemas/unit.py`)
Add to `UnitBase`:
```python
new_field: Optional[Any] = None
```

### Step 4 — Admin API route (`app/api/v1/admin/units.py`)
- Add to `UnitCreate` and `UnitUpdate` Pydantic models
- Add to `_fmt()` serializer: `"new_field": getattr(unit, "new_field", None)`
- Add to `create_unit()` data dict
- Add guard in `update_unit()`: `if body.new_field is not None: patch["new_field"] = body.new_field`

### Step 5 — Public catalog (`app/services/public_service.py`)
Add to the unit dict in `get_client_catalog()`:
```python
"new_field": getattr(unit, 'new_field', None),
```

---

## 6. Image Management — Unit Images

**Storage path:** `properties/{client_slug}/units/{unit_id}/{uuid}.{ext}`
**Bucket:** `properties` (Supabase Storage, public read)

**Endpoints (both in `app/api/v1/admin/units.py`):**
```
POST   /api/v1/admin/units/{unit_id}/images   → UploadFile → Supabase → append to images[], sync image_url
DELETE /api/v1/admin/units/{unit_id}/images   → body {url} → remove from Supabase + filter from images[]
```

**Service layer:** `app/services/storage_service.py`
- `upload_unit_image(client_slug, unit_id, file_bytes, content_type, original_filename) → str`
- `delete_unit_image(public_url) → None`
- Uses `asyncio.to_thread()` to wrap the sync Supabase SDK
- 8 MB max, allowed types: jpeg/png/webp/gif

**Invariant:** `image_url` always equals `images[0]`. Never set `image_url` independently — always derive from `images[]`.

---

## 7. Date Handling — Critical Pattern

`checkIn` / `checkOut` are `@db.Date` fields. Prisma expects `datetime` objects, not bare `date`.
Always convert before writing to Prisma:

```python
from datetime import date, datetime

if isinstance(dt, date) and not isinstance(dt, datetime):
    dt = datetime.combine(dt, datetime.min.time())
```

---

## 8. Admin Date Blocking Pattern

Blocked date ranges are stored as Booking records with `status="blocked"` and a deterministic system customer per tenant:

```python
system_phone = f"__block__{tenant['id']}"
system_customer = await prisma_client.customer.upsert(
    where={"phone": system_phone},
    data={
        "create": {"clientId": tenant["id"], "phone": system_phone, "name": "Admin Block"},
        "update": {},
    },
)
```

This satisfies the non-null `customerId` FK without polluting the real customers table.

---

## 9. Tenant Auto-Seed (smar)

`public_service.get_tenant_config()` auto-creates the `smar` Client row with full branding defaults on first request if it doesn't exist — no manual seed needed on first deploy.

`_SMAR_STYLING` in `public_service.py` holds defaults: `primary_color`, `hero_video_url`, `whatsapp_number`, `currency`, `features`, `unit_types`, `payment_methods`.

---

## 10. RBAC — UserRole Enum

```prisma
enum UserRole {
  SUPER_ADMIN
  TENANT_ADMIN
  MANAGER_RESERVATIONS
  MANAGER_UNITS
}
```

Route-level enforcement: `app/core/tenant.py` → `require_roles(*allowed_roles)` dependency factory.
Example: Settings PATCH only allows `SUPER_ADMIN` and `TENANT_ADMIN`.

Frontend enforcement: `src/utils/useAdminRole.js` — `canAccessTab(role, tabId)` gates sidebar tabs.

---

## 11. Known DB Gaps (post-launch backlog)

| # | Gap | Impact |
|---|-----|--------|
| 5 | No `GalleryImage` table | Gallery relies on Supabase Storage listing — no captions/ordering |
| 6 | No `homepage_assets` on Client | Asset URLs hardcoded in ShowcaseTemplate |
| 8 | No full-text search on Booking | Client-side search only |
| 9 | No CSV export | No accounting data export |
| 10 | No Audit log | No admin change tracking |

**Gaps 1–3** (missing `category`, `description_ar/en`, dynamic JSON fields on Unit) — **RESOLVED 2026-04-21** via Block Builder schema migration.

---

## 12. Connection URL Reference

```
DATABASE_URL=postgresql://postgres.[ref]:[pw]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[ref]:[pw]@aws-0-[region].pooler.supabase.com:5432/postgres
```

**Rule:** `DIRECT_URL` is only for `prisma db push` / `prisma migrate`. Never import it in runtime code.
Removing `connection_limit=1` from DATABASE_URL is required — it starves Prisma on Railway.

# Database Report — SalmanSaaS Platform
**Last updated:** 2026-05-05 (auto-generated from `prisma/schema.prisma`)
**Models:** 29 | **Schema:** `public` | **DB:** Supabase / PostgreSQL

---

## Multi-Tenancy Rule
Every table with tenant-owned data has a `client_id UUID FK → clients.id`.
All queries MUST include `clientId` in the `where` clause. No exceptions.

---

## Model Index

| # | Model | Table | Module | Notes |
|---|-------|-------|--------|-------|
| 1 | `Client` | `clients` | Core | Main tenant row |
| 2 | `User` | `users` | Auth | TENANT_ADMIN, SUPER_ADMIN, managers |
| 3 | `Property` | `properties` | Booking | Container for Units |
| 4 | `Unit` | `units` | Booking | Bookable unit (chalet/villa/room) |
| 5 | `Price` | `prices` | Booking | Daily price calendar |
| 6 | `Service` | `services` | Booking | Add-on services (pool, breakfast...) |
| 7 | `Customer` | `customers` | Booking | End-customers who make bookings |
| 8 | `Booking` | `bookings` | Booking | Reservation |
| 9 | `BookingService` | `booking_services` | Booking | Join: Booking ↔ Service |
| 10 | `GalleryImage` | `gallery_images` | Shared | Images for units & catalog items |
| 11 | `ClientService` | `client_services` | Platform | Module activation gate |
| 12 | `PlatformService` | `platform_services` | Platform | SalmanSaaS product catalog |
| 13 | `CatalogCategory` | `catalog_categories` | Catalog | Generic category tree |
| 14 | `CatalogItem` | `catalog_items` | Catalog | Item inside a category |
| 15 | `RestaurantConfig` | `restaurant_configs` | Restaurant | Per-tenant restaurant settings |
| 16 | `MenuCategory` | `menu_categories` | Restaurant | Menu category |
| 17 | `MenuItem` | `menu_items` | Restaurant | Menu item with price |
| 18 | `RestaurantOrder` | `restaurant_orders` | Restaurant | Customer order |
| 19 | `RestaurantOrderItem` | `restaurant_order_items` | Restaurant | Line item in order |
| 20 | `StoreCustomer` | `store_customers` | Store | Store-specific customer account |
| 21 | `StoreBrand` | `store_brands` | Store | Product brand |
| 22 | `StoreCategory` | `store_categories` | Store | Product category (tree) |
| 23 | `StoreProduct` | `store_products` | Store | Product with variants |
| 24 | `StoreCart` | `store_carts` | Store | Session-based cart |
| 25 | `StoreCartItem` | `store_cart_items` | Store | Cart line item |
| 26 | `StoreOrder` | `store_orders` | Store | Completed order |
| 27 | `StoreOrderItem` | `store_order_items` | Store | Order line item |
| 28 | `StoreReview` | `store_reviews` | Store | Product review |
| 29 | `StoreWishlist` | `store_wishlists` | Store | Saved product |

---

## Core Models

### `Client` → `clients`
Main tenant record. One row per business.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID PK | |
| `name` | String | Display name |
| `name_ar` / `name_en` | String? | Localized names |
| `slug` | String UNIQUE | URL identifier |
| `phone` | String UNIQUE | Global unique (unlike Customer.phone) |
| `email` / `password_hash` | String? | |
| `primary_color` | String? | Hex color |
| `hero_video_url` | String? | |
| `whatsapp_number` | String? | |
| `currency` | String DEFAULT "SAR" | |
| `features` | Json? | Feature flags |
| `config` | Json DEFAULT "{}" | Misc config |
| `unit_types` | String[] | villa/chalet/restaurant/pool |
| `payment_methods` | String[] | cash/card/whatsapp/whish/omt |
| `status` | String DEFAULT "trial" | **trial** \| **active** |
| `trial_ends_at` | DateTime? | |
| `service_type` | String? DEFAULT "real_estate" | real_estate\|restaurant\|store\|services |
| `pageType` | String DEFAULT "normal" | normal \| showcase |
| `templateKey` | String? | maps to TEMPLATE_REGISTRY |
| `selected_services` | Json DEFAULT "[]" | Denormalized active service keys |

### `User` → `users`
Admin/staff accounts. Separate from `Customer`.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID PK | |
| `clientId` | UUID FK → clients | |
| `email` | String UNIQUE | Global unique |
| `password_hash` | String | |
| `fullName` | String | |
| `role` | UserRole | SUPER_ADMIN \| TENANT_ADMIN \| MANAGER_RESERVATIONS \| MANAGER_UNITS |
| `isActive` | Boolean | |
| `lastLoginAt` / `resetToken` | | Auth lifecycle |

**JWT type:** `type=admin` — required for all `/admin/*` endpoints.

---

## Booking Module

### `Property` → `properties`
Container for units. One property can have many units.

| Field | Notes |
|-------|-------|
| `clientId` | FK → clients |
| `managerId` | FK → users (optional manager) |
| `property_type` | "Bed & Breakfast" \| "Chalet" \| "Villa" |
| `location` | Json: {area, region, distance_info} |
| `facilities` | Json: String[] |

### `Unit` → `units`
The bookable entity. 4 types for smar: villa, chalet, restaurant, pool.

| Field | Notes |
|-------|-------|
| `unit_type` | villa \| chalet \| restaurant \| pool |
| `category` | filterable classification |
| `description_ar` / `description_en` | localized |
| `content_blocks` | Json: Block Builder [{type, content, style?, icon?}] |
| `amenities` | Json: [{icon, label, label_ar?}] |
| `rules_policies` | Json: {checkIn, checkOut, cancellation, rules[]} |
| `images` | String[] | direct image URLs |
| `position_x/y` | Float? | spatial map coordinates |

### `Price` → `prices`
Daily price calendar per unit.

| Field | Notes |
|-------|-------|
| `@@unique([unitId, date])` | one price per unit per day |
| `price` | Decimal(10,2) |
| `available` | Boolean — marks blackout dates |
| `minStay` | minimum nights |

### `Customer` → `customers`
End-customers (guests). NOT the same as `User`.

| Field | Notes |
|-------|-------|
| `@@unique([clientId, phone])` | phone unique per tenant only |
| `phone` | required |

### `Booking` → `bookings`
| Field | Notes |
|-------|-------|
| `status` | pending\|confirmed\|cancelled\|completed |
| `bookingRef` | UNIQUE across system |
| `paymentMethod` | cash\|card\|whatsapp\|whish\|omt |
| `services` | via `BookingService` join |

### `BookingService` → `booking_services`
Join table: Booking ↔ Service. PK = `[bookingId, serviceId]`.

---

## Shared

### `GalleryImage` → `gallery_images`
Multi-module image store. One table for booking units AND catalog items.

| Field | Notes |
|-------|-------|
| `clientId` | FK → clients |
| `unitId` | FK → units (nullable — booking module) |
| `catalogItemId` | FK → catalog_items (nullable — catalog module) ← **added 2026-05-05** |
| `imageType` | DEFAULT "gallery" — gallery\|cover\|catalog\|page_hero\|page_logo ← **added 2026-05-05** |
| `url` | Full Supabase storage URL |
| `span_size` | small\|medium\|large (masonry grid) |
| `sort_order` | Int |
| `caption_ar` / `caption_en` | optional captions |

---

## Platform

### `ClientService` → `client_services`
**The module gate.** Every feature a tenant has = one row here.
`require_service(key)` checks this before serving any module endpoint.

| Field | Notes |
|-------|-------|
| `serviceKey` | booking\|gallery\|whatsapp_ordering\|restaurant\|store\|... |
| `isActive` | Boolean — toggle without deleting |
| `config` | Json — per-service overrides |
| `@@unique([clientId, serviceKey])` | one row per tenant per feature |

### `PlatformService` → `platform_services`
SalmanSaaS product catalog (Salman manages this, not tenants).

| Field | Notes |
|-------|-------|
| `key` | UNIQUE — matches `ClientService.serviceKey` |
| `moduleKey` | booking\|restaurant\|store |
| `monthlyPrice` | Decimal? |

---

## Catalog Module

### `CatalogCategory` → `catalog_categories`
Generic category tree. Works for any `service_type`.

| Field | Notes |
|-------|-------|
| `moduleKey` | DEFAULT "catalog" — scopes to module within tenant |
| `parentId` | FK → self (tree structure) |
| `displayTemplate` | DEFAULT "grid" — **grid\|list\|showcase** |
| `@@index([clientId, moduleKey])` | fast per-module queries |

### `CatalogItem` → `catalog_items`
| Field | Notes |
|-------|-------|
| `categoryId` | FK → catalog_categories |
| `nameAr` / `nameEn` | localized |
| `price` | Decimal? |
| `metadata` | Json? — module-specific extras (duration, sku, weight...) |
| `isFeatured` | Boolean |
| `galleryImages` | relation → GalleryImage (via catalogItemId) |

---

## Restaurant Module

### `RestaurantConfig` → `restaurant_configs`
One row per restaurant tenant.

### `MenuCategory` → `menu_categories`
FK → `RestaurantConfig`. Holds menu sections.

### `MenuItem` → `menu_items`
FK → `RestaurantConfig` + `MenuCategory`. Has price, availability.

### `RestaurantOrder` → `restaurant_orders`
| Field | Notes |
|-------|-------|
| `status` | pending\|preparing\|ready\|delivered\|cancelled |
| `tableNumber` | String? |

### `RestaurantOrderItem` → `restaurant_order_items`
Join: Order ↔ MenuItem with quantity + unit price.

---

## Store Module

### `StoreCustomer` → `store_customers`
Store-specific customer (email-based auth, separate from booking `Customer`).
`@@unique([clientId, email])` — email unique per tenant.

### `StoreBrand` / `StoreCategory` → brands / categories
`StoreCategory` supports tree (self-referential `parentId`).

### `StoreProduct` → `store_products`
| Field | Notes |
|-------|-------|
| `name` / `description` | Json: {ar, en} — multilingual |
| `variants` | Json DEFAULT "[]" |
| `images` | Json (String[]) |
| `compareAtPrice` | Float? — strike-through price |
| `discount` | Int (percentage) |

### `StoreCart` → `store_carts`
Session-based (no login required). `sessionId` UNIQUE. `expiresAt` for 7-day TTL.

### `StoreOrder` → `store_orders`
Guest checkout supported (`customerId` nullable).

### `StoreReview` → `store_reviews`
`@@unique([customerId, productId])` — one review per customer per product.

### `StoreWishlist` → `store_wishlists`
`@@unique([customerId, productId])` — one entry per customer per product.

---

## Key Constraints Summary

| Constraint | Model | Note |
|-----------|-------|------|
| `Customer.@@unique([clientId, phone])` | Customer | Phone unique per tenant only |
| `StoreCustomer.@@unique([clientId, email])` | StoreCustomer | Email unique per tenant only |
| `User.email UNIQUE` | User | Global unique across all tenants |
| `Client.slug UNIQUE` | Client | Global unique — URL identifier |
| `Client.phone UNIQUE` | Client | Global unique — tenant phone |
| `Price.@@unique([unitId, date])` | Price | One price per unit per day |
| `ClientService.@@unique([clientId, serviceKey])` | ClientService | One activation per feature per tenant |
| `PlatformService.key UNIQUE` | PlatformService | One entry per feature in master catalog |

---

## Schema Changes Log

| Date | Change | Impact |
|------|--------|--------|
| 2026-04-21 | Initial 9-model schema | Booking module only |
| 2026-04-24 | Added restaurant + store modules | +10 models |
| 2026-04-27 | Added CatalogCategory, CatalogItem, PlatformService, ClientService | +4 models |
| 2026-04-30 | Client gains: status, trial_ends_at, service_type, pageType, templateKey | Field additions |
| 2026-05-05 | GalleryImage: +catalogItemId FK + imageType field | `npx prisma db push` ✅ |

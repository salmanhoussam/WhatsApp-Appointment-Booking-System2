# Beit Smar — System Audit & Roadmap
**Date:** 19 April 2026  
**Status:** Frontend Public MVP ✅ COMPLETE — Backend wiring & Admin polish pending

---

## ✅ Section 1 — Completed MVP Features

### Frontend — Public Experience
| Feature | File | Notes |
|---|---|---|
| Cinematic Showcase (6 GSAP stations) | `ShowcaseTemplate.jsx` | S1 forest billboard + billboard video overlay, S2-S6 intact |
| Billboard video overlay | `ShowcaseTemplate.jsx` | `BILLBOARD` constant tuned, aspect-ratio wrapper preserves % positions |
| S2 Cafeteria section | `ShowcaseTemplate.jsx` | `beitsmar7.jpg` bg, bold Arabic text, no video |
| Unified sticky nav | `TenantHeader.jsx` | Scroll elevation, lang toggle, WhatsApp CTA, mobile hamburger |
| Listings page | `ListingsTemplate.jsx` | `TenantHeader` + `UnitGrid` + `BookingDrawer` |
| Unit grid | `UnitGrid.jsx` | 1→2→3 responsive columns, skeleton loader, error/empty states |
| Category filter pills | `UnitGrid.jsx` | الكل / شاليهات / فيلات / ستوديوهات — client-side filter by `unit.type` |
| Unit card | `UnitCard.jsx` | Image, type badge, availability badge, description, capacity, price, CTA |
| WhatsApp booking drawer | `BookingDrawer.jsx` | Bottom sheet (mobile) / right sidebar (desktop), glass3d tokens, adults+children counters, WhatsApp deep link |
| Gallery page | `SmarGalleryPage.jsx` | CSS columns masonry (1→2→3), live API + fallback images, filter tabs, Villas "قريباً" overlay |
| Gallery lightbox | `SmarGalleryPage.jsx` | Full-screen, keyboard nav (ESC/arrows), body scroll lock, caption bar |
| Tenant config hook | `useTenantConfig.js` | Live `/{slug}/config` API + in-memory cache + `DEFAULT_CONFIG` fallback |
| Unit data hook | `useUnits.js` | Live `/{slug}/listings` API, loading/error states |
| FM12 + React 19 compliance | All components | No `useScroll`/`useTransform` in `style={}` — passive DOM scroll listeners only |
| Routing architecture | `smar.routes.jsx` | All heavy pages lazy-loaded, catch-all → showcase |

### Backend — Public API (all live)
| Endpoint | File | Notes |
|---|---|---|
| `GET /{slug}/config` | `public.py` | Returns branding, WhatsApp number, payment methods. Auto-creates smar Client row if missing. |
| `GET /{slug}/listings` | `public.py` | Availability filtering by date range + guests + unit_type |
| `POST /{slug}/bookings` | `public.py` | Creates customer, booking, sends WhatsApp confirmation |
| `GET /{slug}/gallery` | `public.py` | Lists Supabase Storage `{folder}/gallery/` with category inference |
| `GET /{slug}/price` | `public.py` | Per-night price calculation from `Price` table |
| `GET /{slug}/units/{id}/calendar` | `public.py` | Returns `disabled_dates` + `price_overrides` |

### Database (Prisma Schema)
| Model | Status |
|---|---|
| `Client` | ✅ — has `whatsapp_number`, `currency`, `features`, `payment_methods`, `primary_color` |
| `Unit` | ✅ — has `unit_type`, `name_ar/en`, `capacity`, `bedrooms`, `bathrooms`, `image_url`, `images[]` |
| `Booking` | ✅ — has `status`, `paymentMethod`, `arrivalTime`, `bookingRef`, `source` |
| `Customer` | ✅ — `phone` unique, auto-created on booking |
| `Price` | ✅ — per-date pricing + `available` flag, unique `(unitId, date)` |
| `Service` + `BookingService` | ✅ — add-on services linked to bookings |
| `Property` | ✅ — container for units |
| `User` | ✅ — admin/staff roles |

### Admin Dashboard (`/smar/admin`)
| Tab | Status |
|---|---|
| Reservations | ✅ Fully working — pagination, status filter, date range, confirm/cancel actions, expandable detail rows, KPI strip |
| الوحدات (Units) | ✅ Fully working — CRUD, availability/active toggles, `CalendarManagerModal` (drag to set price/block dates), `UnitFormModal` |
| Action Inbox | ✅ — pending bookings that need action |
| Overview | ✅ — KPI cards, upcoming check-ins |
| Settings | ✅ — `SettingsTab.jsx` |
| Team | ✅ — `TeamTab.jsx` |
| Housekeeping / Maintenance / Gardens | 🔲 UI scaffold exists (ComingSoonTab) — no backend |

---

## 🚧 Section 2 — Backend / Database Sync Needed

### 2.1 — `Unit` model missing `price` (base nightly rate)
The `Unit` model has no `price` field. `UnitCard` displays `unit.price` but `get_client_catalog()` never returns it — the response only includes `capacity`, `image_url`, etc. The `Price` table stores per-date overrides, but there is no default base price on the unit itself.

**Fix needed:**
```prisma
model Unit {
  price       Decimal?  @map("price") @db.Decimal(10, 2)   // ← ADD
  price_label String?   @map("price_label")                 // e.g. "يبدأ من"
}
```
Then include `price` in `get_client_catalog()` response.

### 2.2 — `Unit` missing `description_ar` / `description_en`
`UnitCard` renders `unit.description_ar` and `unit.description_en`, but the Prisma schema only has a single `description` field (no AR/EN split). The API returns `description` as a plain string.

**Fix needed:** Either add `description_ar/en` to schema, or map `description` → `description_ar` in the API response as a short-term fix.

### 2.3 — Gallery managed purely via Supabase Storage — no DB table
There is no `GalleryImage` or `MediaAsset` model. The gallery endpoint lists files from Supabase Storage directly. This means:
- Admin cannot reorder images
- Admin cannot add captions/categories from the dashboard
- Category is inferred from filename only (fragile)

**Fix needed (Phase 30.3):**
```prisma
model GalleryImage {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  clientId   String   @map("client_id") @db.Uuid
  url        String
  category   String   @default("general")
  caption_ar String?
  caption_en String?
  sort_order Int      @default(0)
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())
  client     Client   @relation(fields: [clientId], references: [id])
}
```

### 2.4 — No `homepage_assets` config on `Client`
`ShowcaseTemplate` hardcodes all Supabase URLs in the component file. If assets change, code must be re-deployed.

**Fix needed:**
```prisma
model Client {
  homepage_assets  Json?  @map("homepage_assets")
  // Shape: { heroVideo, forest, cafeImg, villa, chalet, pool, sunset }
}
```
Then `GET /{slug}/config` should return `homepage_assets` and the frontend reads from config.

### 2.5 — `BookingFlow.jsx` (3-step API wizard) not wired to listings
`ListingsTemplate` now uses `BookingDrawer` (WhatsApp-first). `BookingFlow` is only used in `SpatialPropertyDetails`. Decision needed: keep both flows, or retire one.

### 2.6 — WhatsApp confirmation in `create_public_booking` is fire-and-forget but not tested
`public_service.py` calls `WhatsAppService().send_text()` on every booking. If `WHATSAPP_TOKEN` is not set in Railway env vars, this silently fails (logged but not surfaced). The actual phone number `96178727986` is hardcoded in `_SMAR_STYLING` — this is fine for now but should be configurable via `Client.whatsapp_number`.

### 2.7 — `SpatialHomePage` is a stub
`/smar/spatial` returns `null`. If any user navigates there it's a blank page with no feedback. Needs either a redirect to `/smar/showcase` or a real page.

---

## 👑 Section 3 — Admin Dashboard Status

### What's Working
- ✅ Reservations table (full CRUD on status)
- ✅ Units table (add / edit / toggle availability / toggle active)
- ✅ Calendar manager — drag to block dates or set custom price per day
- ✅ KPI strip (today check-ins, pending count, monthly revenue, available units)
- ✅ Action Inbox
- ✅ Settings tab
- ✅ Team tab
- ✅ Auth guard (redirects to `/login` if no `admin_access_token`)

### What's Missing

| Gap | Priority |
|---|---|
| **Unit image upload** — AddUnitModal and UnitFormModal accept an image URL but have no file picker / Supabase upload button. Admin must paste raw URLs manually. | 🔴 High |
| **Gallery management tab** — No tab in admin to upload/reorder/delete gallery images. All gallery management is done by dropping files into Supabase Storage manually. | 🔴 High |
| **Tenant branding editor** — SettingsTab exists but needs to be verified. Admin should be able to edit `whatsapp_number`, `currency`, `primary_color`, `payment_methods` directly from the UI without touching the DB. | 🟡 Medium |
| **Housekeeping / Maintenance / Gardens** — Three tabs are ComingSoonTab placeholders. Backend services and DB models don't exist yet. | 🟢 Low (post-launch) |
| **Unit price field** — Units tab shows no base price. Admin cannot set a nightly rate from the UI (only per-date overrides via calendar). | 🔴 High — needed before listings are useful |
| **Booking search** — client-side search only (name/phone). No full-text search on server. Works for small volumes, becomes slow at 500+ bookings. | 🟢 Low |
| **Export** — No CSV/Excel export for bookings. Property owner cannot extract data for accounting. | 🟡 Medium |

---

## 🎨 Section 4 — Polish & Launch Prep

### SEO & Meta
- [ ] `index.html` has no `<meta name="description">`, no `<meta property="og:*">`, no Twitter card tags
- [ ] No `<title>` per-route — all routes share the Vite default title
- [ ] No `robots.txt` or `sitemap.xml`
- [ ] No `lang="ar"` on `<html>` (important for Arabic SEO and screen readers)

### Performance
- [ ] No image optimization — all Supabase images are full-resolution JPGs loaded without `srcset` or size hints
- [ ] No lazy loading beyond `loading="lazy"` — no blur-up placeholder or LQIP
- [ ] `ShowcaseTemplate` registers 6 GSAP ScrollTriggers — verify `ctx.revert()` on unmount is working (critical for React StrictMode double-mount)
- [ ] Bundle size audit not done — framer-motion + gsap + lucide-react are heavy

### Language & RTL
- [ ] Language toggle in `TenantHeader` sets local state only — not persisted to `localStorage` or context
- [ ] `BookingDrawer` is hard-coded Arabic — no EN mode
- [ ] `ShowcaseTemplate` text is hard-coded Arabic — no EN toggle
- [ ] `SmarGalleryPage` has a `lang` state but it's local — doesn't sync with `TenantHeader` language

### Error Handling
- [ ] No global error boundary — an uncaught render error in any component crashes the full app
- [ ] `publicApi` has no global 401/500 interceptor shown in the audit
- [ ] No offline detection / "you are offline" banner

### Analytics
- [ ] No event tracking (no GA4, no Posthog, no custom events)
- [ ] No Sentry or error reporting service configured

---

## 🗺️ Recommended Priority Order for Next Sessions

### 🔴 Tier 1 — Launch Blockers
1. **Add `price` field to `Unit` schema + surface in API** — without this, UnitCard shows no price and BookingDrawer total is always $0
2. **Gallery admin tab** — property owner needs to manage photos without touching Supabase Storage manually
3. **Unit image upload UI** — AddUnitModal needs a Supabase file picker, not a raw URL input

### 🟡 Tier 2 — Launch Quality
4. `description_ar/en` split on Unit (schema + API + UnitCard already ready)
5. Language state persistence (`localStorage`) + sync across components
6. Global `<ErrorBoundary>` wrapper + `<meta>` tags in `index.html`
7. `SpatialHomePage` — redirect to showcase instead of blank null render

### 🟢 Tier 3 — Post-Launch
8. `GalleryImage` DB model + gallery admin CRUD
9. `homepage_assets` JSON on Client + frontend reads from config
10. Housekeeping / Maintenance / Gardens backend
11. Booking CSV export
12. Analytics setup (Posthog recommended for MENA market)

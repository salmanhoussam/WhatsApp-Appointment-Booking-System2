# PRODUCT.md — SalmanSaaS Platform
# Read by /impeccable before any design work — do not remove.
# Last updated: 2026-07-01

---

## What is SalmanSaaS?

Arabic-first multi-tenant SaaS that gives small Arabic businesses a complete digital presence — bookings, restaurant menus, and e-commerce stores — all managed through WhatsApp AI agents.

**Tagline:** أتمتة كاملة لعملك عبر واتساب — Full Automation for Your Business via WhatsApp.

---

## register

`brand`

For marketing pages, showcase, landing pages, tenant demos: design IS the product.
For admin dashboards, booking flows: design SERVES the product (switch to `product`).

---

## Users

| User | Who | Design needs |
|------|-----|-------------|
| **Tenant Admin** | Arabic SMB owner (restaurant, chalet, store) | Trust signal, professionalism, Arabic-native UI |
| **End Customer** | Arabic-speaking consumer | Frictionless booking / menu / cart |
| **Salman** | SUPER_ADMIN, platform builder | Technical clarity, full control |

Primary audience for **brand-register** pages: the Tenant Admin deciding to subscribe.
They're evaluating: "Is this professional enough for my brand?"

---

## Brand Identity

**Three-word brief:** Cinematic · Arabic · Luxury

**Feeling:** Like stepping into a high-end digital hotel lobby — dark, quiet, expensive.

**Voice:** Direct and confident. No filler phrases. No "we are passionate about." 
Arabic copy first, English translation secondary.
Every word earns its place or it's cut.

**Two accent systems:**
- **Marketing / Showcase** (`/marketing`, `/showcase`): `#ff1a55` — crimson red, bold, conversion urgency
- **Smar / Booking** (`/smar/*`): `#d4a853` — gold, luxury, heritage

---

## Anti-References

| Reference | Why it's wrong |
|-----------|----------------|
| Notion | Too white, too neutral, no personality, Western-only |
| Stripe | Cold gray minimalism, no Arabic warmth |
| Linear | Tech startup aesthetic — doesn't speak to Arabic SMBs |
| Generic SaaS cream | `#f9fafb` backgrounds, Inter, Helvetica — invisible in MENA market |
| Decorative glassmorphism | Blurs everywhere for decoration with no hierarchy |
| Canva-style colorful | Rainbow gradients, playful fonts — no luxury signal |

---

## Key Differentiators

1. **WhatsApp-first**: every notification and confirmation via WhatsApp — no app download
2. **Arabic-native**: RTL, Cairo font, Arabic copy from day one
3. **Multi-tenant**: one server, one DB, full isolation between clients
4. **3-minute setup**: from registration to first booking in 3 minutes

---

## Pricing Tiers

| Tier | Price | Key | Target |
|------|-------|-----|--------|
| **Regular** | $15/mo | `regular` | SMBs starting out — booking / menu / store basics |
| **Pro** | $22/mo | `pro` | Growing businesses — advanced analytics, multi-branch |
| **Ultra** | $35/mo | `ultra` | Premium clients — immersive 3D showcase pages, AI agent, full automation |

**No free tier.**

### Feature Gates by Tier

| Feature | Regular | Pro | Ultra |
|---------|---------|-----|-------|
| Booking / Menu / Store | ✅ | ✅ | ✅ |
| WhatsApp AI bot | ✅ | ✅ | ✅ |
| Admin dashboard | ✅ | ✅ | ✅ |
| Multi-branch | ❌ | ✅ | ✅ |
| Advanced analytics | ❌ | ✅ | ✅ |
| **Immersive 3D showcase** (`immersive_3d`) | ❌ | ❌ | ✅ |
| Custom domain | ❌ | ✅ | ✅ |
| Priority support | ❌ | ❌ | ✅ |

**Rule for agents:** Never scaffold an `immersive_3d` page unless `client.tier === 'ultra'` is confirmed.
The `immersive_3d` serviceKey in `client_services` is only activated by SUPER_ADMIN (Salman).

---

## Current Live Tenants

| Tenant | Domain | Module | Status |
|--------|--------|--------|--------|
| smar | smar.salmansaas.com | booking | ✅ Live |
| caracas | caracas.salmansaas.com | restaurant | 🔄 Migration |
| footlab | footlab.salmansaas.com | store | 🔄 Migration |

---

## Core Products

### 1. Smart Booking (نظام الحجز الذكي)
Online appointment booking via WhatsApp Business API.
Target: hotels, chalets, villas, salons, clinics.
Live: smar.salmansaas.com

### 2. Smart Menu (المنيو الذكي)
Digital menu with animations, QR access, Arabic/English.
Target: restaurants, cafes, food trucks.

### 3. E-commerce Store (المتجر الإلكتروني)
Shopping cart + payment gateways + order management.
Target: fashion, accessories, local shops.

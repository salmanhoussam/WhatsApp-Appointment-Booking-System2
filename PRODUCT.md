# PRODUCT.md — SalmanSaaS Platform

## What is SalmanSaaS?

منصة SaaS عربية موحدة تُقدم لأصحاب الأعمال (مطاعم، فنادق، متاجر) نظاماً كاملاً لإدارة الحجوزات، القوائم الإلكترونية، والمتاجر — مع ربط مباشر بواتساب.

**Tagline:** ارتقِ بأعمالك للمستقبل. بأنظمة ذكية وسريعة.

---

## Core Products

### 1. Smart Booking System (نظام الحجز الذكي)
- Online appointment booking via WhatsApp Business API
- Admin dashboard: scheduling, client management, automated alerts
- Target: hotels, chalets, villas, salons, clinics
- Live example: smar.salmansaas.com (Beit Smar — mountain chalets)

### 2. Smart Menu (المنيو الذكي)
- Digital menu with smooth animations and native-app feel
- QR code access, category filtering, Arabic/English support
- Target: restaurants, cafes, food trucks

### 3. E-commerce Store (المتجر الإلكتروني)
- Complete selling platform with shopping cart and payment gateways
- Product catalog, order management, delivery tracking
- Target: fashion, accessories, local shops

---

## Plans & Pricing

### Normal (Basic)
- Pre-built template from registry
- Arabic + English support
- Basic booking or menu functionality
- Subdomain: `{slug}.salmansaas.com`

### Showcase / VIP
- Cyberpunk/premium visual design
- GSAP animations + WebGL background
- Advanced dashboard features
- Custom domain support

### Pro
- AI-designed custom website (Claude-powered brief)
- Unique design tailored to brand
- All features unlocked
- Dedicated support

---

## Target Customers

- أصحاب الشاليهات والفلل (Lebanon, GCC)
- أصحاب المطاعم الصغيرة والمتوسطة
- المتاجر المحلية التي تريد online presence
- الشركات التي تريد حجز مواعيد مدار عبر واتساب

---

## Key Differentiators

1. **WhatsApp-first**: كل إشعار وتأكيد عبر واتساب — لا email، لا app
2. **Arabic-native**: RTL، خطوط Cairo، نصوص عربية من اليوم الأول
3. **Multi-tenant**: سيرفر واحد، DB واحد، عزل كامل بين العملاء
4. **3-minute setup**: من التسجيل لأول حجز في 3 دقائق

---

## Tech Stack (للـ agents)

- Frontend: React 19 + Vite + Framer Motion + GSAP + R3F
- Backend: FastAPI + Prisma + Supabase (PostgreSQL)
- AI: Anthropic Claude API (claude-haiku-4-5 for chatbot)
- Deploy: Railway (backend) + Vercel (frontend)
- WhatsApp: WhatsApp Business API

---

## Current Live Tenants

| Tenant | Domain | Module | Status |
|--------|--------|--------|--------|
| smar | smar.salmansaas.com | booking | ✅ Live |
| caracas | caracas.salmansaas.com | restaurant | 🔄 Migration |
| footlab | footlab.salmansaas.com | store | 🔄 Migration |

---

*Last updated: 2026-05-15*

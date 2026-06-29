# Infinite Sites — AI-Powered Tenant Scaffolding
**Version:** 1.0  
**Date:** 2026-05-03  
**Status:** Design Phase

---

## الرؤية

بدل ما تحتاج مبرمج لكل زبون جديد:

```
زبون جديد
   ↓
محادثة WhatsApp (n8n extracts data)
   ↓
JSON Payload (كل معلومات الزبون + خياراته)
   ↓
AI Agent (يقرأ JSON → ينفذ API calls)
   ↓
Dashboard جاهز + صفحة عرض جاهزة
   ↓
الزبون يضيف منتجاته/خدماته مباشرة
```

---

## الـ 20 Template Library

### كيف نصنّف التمبلتات

كل template = industry + display style. المجموع: 20.

#### المجموعة 1 — الأزياء والموضة (Fashion) — 4 تمبلتات

| # | template_key | الاسم | الفرق |
|---|--------------|-------|-------|
| 1 | `store-fashion-grid` | متجر أزياء — شبكة | 4 col grid، portrait images، color swatches |
| 2 | `store-fashion-editorial` | متجر أزياء — editorial | صور كبيرة، magazine feel، 2 col |
| 3 | `store-shoes` | متجر أحذية | صور مربعة، size pills، white bg |
| 4 | `store-accessories` | إكسسوارات | 4 col compact، minimal info |

#### المجموعة 2 — المطاعم والكافيهات (F&B) — 4 تمبلتات

| # | template_key | الاسم | الفرق |
|---|--------------|-------|-------|
| 5 | `food-restaurant` | مطعم | قائمة أفقية (صورة + وصف + سعر) |
| 6 | `food-cafe` | كافيه | grid دافئ، بطاقات مربعة |
| 7 | `food-fastfood` | وجبات سريعة | قائمة بسيطة، تركيز على السعر |
| 8 | `food-bakery` | مخبوزات/حلويات | showcase كبير، صور احترافية |

#### المجموعة 3 — الصالونات والجمال (Beauty) — 4 تمبلتات

| # | template_key | الاسم | الفرق |
|---|--------------|-------|-------|
| 9  | `beauty-salon-women` | صالون نسائي | ناعم، ألوان وردية/ذهبية |
| 10 | `beauty-barber` | حلاق رجالي | داكن، minimalist، قوي |
| 11 | `beauty-nails` | نيل آرت | ألوان زاهية، صور كبيرة |
| 12 | `beauty-spa` | سبا/مساج | فاخر، neutral tones، showcase |

#### المجموعة 4 — الصحة واللياقة (Health) — 4 تمبلتات

| # | template_key | الاسم | الفرق |
|---|--------------|-------|-------|
| 13 | `health-clinic` | عيادة طبية | نظيف، أبيض/أزرق، list + مواعيد |
| 14 | `health-dental` | عيادة أسنان | grid خدمات، صور قبل/بعد |
| 15 | `health-gym` | صالة رياضية | dark theme، باقات، schedule |
| 16 | `health-pharmacy` | صيدلية | أخضر، list منتجات، بحث |

#### المجموعة 5 — الخدمات المتنوعة (Services) — 4 تمبلتات

| # | template_key | الاسم | الفرق |
|---|--------------|-------|-------|
| 17 | `service-mechanic` | ميكانيك/سيارات | داكن، list خدمات + أسعار |
| 18 | `service-education` | تعليم/دروس | grid، مستويات، جداول |
| 19 | `service-photography` | تصوير/استوديو | showcase، portfolio grid |
| 20 | `service-general` | خدمات عامة | universal fallback |

---

## JSON Payload Schema (n8n → AI Agent)

هذا الـ JSON الكامل اللي يجب أن يجمعه n8n ويرسله للـ agent:

```json
{
  "meta": {
    "flow_id": "onboarding-2026-05-03-001",
    "extracted_at": "2026-05-03T14:30:00Z",
    "confidence": 0.92,
    "source": "whatsapp_conversation"
  },

  "client": {
    "slug": "salon-maya",
    "name_ar": "صالون مايا",
    "name_en": "Salon Maya",
    "owner_name": "مايا عبدالله",
    "owner_phone": "+9611234567",
    "owner_email": "maya@example.com",
    "whatsapp_number": "+9611234567",
    "currency": "LBP",
    "service_type": "services",
    "status": "trial"
  },

  "design": {
    "template_key": "beauty-salon-women",
    "primary_color": "#e91e8c",
    "secondary_color": "#1a1a2e",
    "font_style": "elegant",
    "hero_style": "split-image",
    "dark_mode": true
  },

  "services_config": {
    "active_services": ["catalog", "catalog.booking", "whatsapp_ordering"],

    "catalog": {
      "has_pricing": true,
      "has_duration": true,
      "has_booking_per_item": true,
      "display_currency": "LBP",
      "seed_categories": [
        {
          "name_ar": "العناية بالشعر",
          "name_en": "Hair Care",
          "icon": "scissors",
          "display_template": "grid",
          "sort_order": 1
        },
        {
          "name_ar": "العناية بالأظافر",
          "name_en": "Nail Care",
          "icon": "sparkles",
          "display_template": "list",
          "sort_order": 2
        },
        {
          "name_ar": "العناية بالبشرة",
          "name_en": "Skin Care",
          "icon": "leaf",
          "display_template": "showcase",
          "sort_order": 3
        }
      ]
    },

    "store": null,

    "restaurant": null,

    "booking": null
  },

  "store_config": {
    "has_sizes": false,
    "has_colors": false,
    "has_variants": false,
    "filter_types": [],
    "enable_cart": false,
    "enable_wishlist": false
  },

  "content": {
    "hero_title_ar": "جمالك، أولويتنا",
    "hero_title_en": "Your Beauty, Our Priority",
    "hero_subtitle_ar": "احجزي موعدك الآن",
    "hero_subtitle_en": "Book your appointment now",
    "whatsapp_greeting": "أهلاً بكِ في صالون مايا 💄",
    "about_ar": "صالون مايا — جمال راقٍ في قلب المدينة"
  },

  "admin_account": {
    "email": "maya@example.com",
    "temp_password": "auto-generated",
    "full_name": "مايا عبدالله"
  }
}
```

---

## ماذا يعمل الـ AI Agent بالـ JSON

### الخطوات الـ 8 (بالترتيب)

```
1. POST /api/v1/public/register
   → ينشئ Client + TENANT_ADMIN user
   → يحصل على client_id + slug

2. PATCH /api/v1/super/clients/{id}/settings (color, template, config)
   → يحدث primary_color, template_key, hero content

3. PATCH /api/v1/super/clients/{id}/services (لكل service في active_services)
   → يفعّل catalog, catalog.booking, whatsapp_ordering

4. POST /api/v1/admin/catalog/categories (لكل category في seed_categories)
   → ينشئ الكاتيجوريز الأولية + display_template لكل واحدة

5. [اختياري] POST /api/v1/admin/store/config
   → يضبط filter_types, variants, cart

6. [اختياري] POST /api/v1/admin/restaurant/config
   → يضبط ordering mode, table/delivery

7. PATCH /api/v1/admin/settings (hero content, whatsapp greeting)
   → يضبط محتوى الصفحة الرئيسية

8. POST notify (WhatsApp/email)
   → يرسل للزبون: رابط dashboard + temp password
```

---

## ما يحتاجه كل Template من الـ JSON

| المجموعة | الحقول الإلزامية | الحقول الاختيارية |
|----------|-----------------|-------------------|
| **Fashion/Store** | `store_config.has_sizes`, `store_config.has_colors`, `store_config.filter_types` | `store_config.has_variants`, `enable_wishlist` |
| **F&B** | `services_config.restaurant.ordering_mode` (table/delivery/both) | `restaurant.has_table_numbers`, `delivery_zones` |
| **Beauty/Services** | `catalog.has_pricing`, `catalog.has_duration`, `catalog.has_booking_per_item` | `catalog.requires_deposit` |
| **Health** | `catalog.has_booking_per_item`, `catalog.booking_slot_minutes` | `catalog.has_online_payment` |
| **كل template** | `client.*`, `design.primary_color`, `design.template_key`, `admin_account.*` | `content.*` |

---

## Template Registry (Frontend)

كل template_key عنده:
- قائمة الـ components المستخدمة
- default color palette (5 ألوان)
- الـ active_services الافتراضية
- الـ catalog display_template الافتراضي
- هل عنده store filters أم لا

```js
// frontend/src/config/template-registry.js

export const TEMPLATE_REGISTRY = {
  'beauty-salon-women': {
    name_ar: 'صالون نسائي',
    industry: 'beauty',
    hero: 'split-image',
    nav: 'minimal-centered',
    catalog_template: 'grid',
    default_palette: {
      primary:    '#e91e8c',
      secondary:  '#1a1a2e',
      accent:     '#f8bbd0',
      background: '#0a0008',
      text:       '#fff',
    },
    default_services: ['catalog', 'catalog.booking', 'whatsapp_ordering'],
    store_filters: false,
    preview_img: '/templates/previews/beauty-salon-women.jpg',
  },

  'store-fashion-grid': {
    name_ar: 'متجر أزياء',
    industry: 'store',
    hero: 'full-bleed-video',
    nav: 'sticky-dark',
    catalog_template: 'grid',
    default_palette: {
      primary:    '#1a1a2e',
      secondary:  '#e8d5b7',
      accent:     '#c9a96e',
      background: '#0d0d18',
      text:       '#fff',
    },
    default_services: ['store', 'store.products', 'store.cart', 'store.wishlist'],
    store_filters: {
      sizes:  ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
      colors: true,
    },
    preview_img: '/templates/previews/store-fashion-grid.jpg',
  },

  // ... 18 more
};
```

---

## الـ Agent System Prompt (المسودة)

```
أنت SalmanSaaS Onboarding Agent.

مهمتك: استقبال JSON payload وتنفيذ الـ API calls اللازمة لإنشاء tenant جديد كامل.

الـ Base URL: https://api.salmansaas.com/api/v1

الخطوات:
1. اقرأ الـ JSON بالكامل أولاً
2. تحقق أن slug غير مستخدم: GET /public/{slug}/config
3. نفّذ الخطوات الـ 8 بالترتيب
4. إذا فشل step → سجّل الخطأ وكمّل (لا تتوقف)
5. ارجع تقرير بالنتيجة: ما تم، ما فشل، رابط الـ dashboard

المعلومات الحساسة:
- SUPER_ADMIN_TOKEN: {from n8n credentials}
- ADMIN_TOKEN: يتولد بعد step 1
```

---

## n8n Workflow Nodes

```
[WhatsApp Webhook]
       ↓
[LLM Extractor Node]          ← يستخرج البيانات من المحادثة
  prompt: "extract client info..."
  output: raw_extracted JSON
       ↓
[JSON Validator Node]          ← يتحقق من الحقول الإلزامية
  if missing → ask clarification
       ↓
[Template Matcher Node]        ← يختار template_key بناءً على service_type
  + يضيف default colors من TEMPLATE_REGISTRY
       ↓
[AI Scaffolding Agent]         ← Claude Agent يقرأ JSON وينفذ الـ 8 steps
  model: claude-opus-4-7
  tools: HTTP requests
       ↓
[Notification Node]            ← يرسل WhatsApp للزبون
  "جاهز! داشبوردك: https://slug.salmansaas.com/admin"
       ↓
[Google Sheet Update]          ← يضيف الزبون لجدول الـ CRM
```

---

## ما يرى الزبون بعد الـ Scaffolding

```
https://slug.salmansaas.com
  └── صفحة عرض جاهزة:
      ├── Hero section بالألوان + المحتوى المختار
      ├── Nav مع الـ services المفعّلة
      └── Catalog بالكاتيجوريز الأولية (فارغة)

https://slug.salmansaas.com/admin
  └── Dashboard جاهز:
      ├── Catalog tab: يضيف products/services
      ├── Settings tab: يعدّل الألوان والمحتوى
      └── Bookings tab: يتابع الحجوزات
```

---

## ربط الـ JSON بالـ DB Schema (unified_db_schema)

الـ schema HTML اللي رسمناه يوضح الصورة الكاملة. إليك كيف يتربط كل حقل JSON بجدول DB:

### `client_services.config jsonb` — القلب الخفي

هذا الحقل **موجود فعلاً** في الـ schema وهو المكان الصح لتخزين إعدادات كل service:

```json
// client_services row للزبون اللي عنده store
{
  "client_id": "uuid",
  "service_key": "store",
  "is_active": true,
  "config": {
    "has_sizes":    true,
    "has_colors":   true,
    "filter_types": ["size", "color", "price"],
    "size_options": ["XS", "S", "M", "L", "XL"],
    "enable_cart":  true,
    "enable_wishlist": true,
    "catalog_template": "fashion-grid"
  }
}

// client_services row للزبون اللي عنده catalog (صالون)
{
  "client_id": "uuid",
  "service_key": "catalog",
  "is_active": true,
  "config": {
    "has_pricing":          true,
    "has_duration":         true,
    "has_booking_per_item": true,
    "catalog_template":     "grid",
    "booking_slot_minutes": 60
  }
}

// client_services row لـ restaurant
{
  "client_id": "uuid",
  "service_key": "restaurant",
  "is_active": true,
  "config": {
    "ordering_mode":     "table",
    "has_table_numbers": true,
    "menu_template":     "food-cafe"
  }
}
```

**الميزة:** الـ config يُقرأ من الـ frontend عبر `GET /{slug}/config` → يحدد behavior الصفحة بدون hardcode.

### الجداول المستقبلية من الـ Schema

| الجدول | الصلة بـ Infinite Sites |
|--------|------------------------|
| `ai_agents` | يُنشأ تلقائياً لكل زبون → system_prompt مخصص بالـ template |
| `customers` | قاعدة زبائن الـ tenant — تبدأ فارغة، تُملأ تدريجياً |
| `marketing_campaigns` | يُفعَّل بعد الـ scaffolding إذا كان في `whatsapp_blast` service |
| `analytics_events` | يبدأ التسجيل فور أول page_view بعد الإطلاق |
| `notifications_log` | يسجل رسالة الترحيب المرسلة للزبون |

### خريطة JSON → DB Operations

```
JSON.client              → INSERT clients
JSON.admin_account       → INSERT users (role=TENANT_ADMIN)
JSON.services_config     → INSERT client_services (1 row per service_key)
JSON.services_config.*.config  → client_services.config jsonb
JSON.services_config.catalog.seed_categories → INSERT catalog_categories
JSON.design              → UPDATE clients.config jsonb (template_key, colors)
JSON.content             → UPDATE clients.config jsonb (hero, whatsapp_greeting)
```

---

## الأولويات للتنفيذ

### المرحلة A — Backend Prerequisites (لازم قبل الـ agent)

- [ ] `PATCH /api/v1/admin/settings` — يحفظ `template_key` + hero content
- [ ] `GET /api/v1/public/{slug}/config` — يرجع template_key في الـ response
- [ ] `POST /api/v1/super/clients/{id}/seed-categories` — bulk seed catalog categories
- [ ] `POST /api/v1/super/clients/{id}/reset` — reset + reseed (للتجربة)

### المرحلة B — Template Registry

- [ ] `frontend/src/config/template-registry.js` — 20 template definitions
- [ ] `frontend/src/components/TemplatePicker.jsx` — UI للاختيار (للـ onboarding page)
- [ ] Template preview images (20 صورة)

### المرحلة C — n8n Flow

- [ ] WhatsApp webhook node
- [ ] LLM extractor node (Claude)
- [ ] JSON validator
- [ ] Template matcher
- [ ] AI scaffolding agent (Claude с tools)
- [ ] Notification + Sheet update

### المرحلة D — Frontend Templates (20 template)

كل template = hero component + nav style + catalog layout config  
لا تحتاج 20 ملف — تحتاج:
- 5 hero variants
- 3 nav styles
- 3 catalog templates (grid/list/showcase)
- Color injection عبر CSS variables

**الـ 20 template = combinations من هذه المكونات**

---

## الحقول الـ Critical (لا يكتمل الـ scaffolding بدونها)

```
client.slug             ← الأهم — لا يتكرر
client.owner_phone      ← للـ WhatsApp
admin_account.email     ← للدخول
design.primary_color    ← يحدد لون كل الـ UI
design.template_key     ← يحدد البنية الكاملة
services_config.active_services  ← يحدد الـ features
```

---

*هذا الـ design doc يُحدَّث مع كل مرحلة تنفيذ.*

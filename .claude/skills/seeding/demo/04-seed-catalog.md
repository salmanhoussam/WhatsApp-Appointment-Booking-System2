# Demo Step 4 — Seed Catalog Categories

## الهدف
زرع تصنيفات الكتالوج من القالب المختار — هذه التصنيفات ستظهر مباشرة في صفحة الـ demo.

---

## الـ Endpoint

```
POST /api/v1/admin/catalog/seed-from-template
Authorization: Bearer {admin_token}
Content-Type: application/json
```

**الـ Body:**
```json
{
  "template_key":   "{design.template_key}",
  "module_key":     "{design.module_key}",
  "categories":     "{catalog.categories}",
  "clear_existing": false
}
```

**⚠️ `module_key` إلزامي** — بدونه categories تُزرع بـ moduleKey=null في DB وما يشتغل الـ CatalogPage.

**مثال لـ fashion-grid:**
```json
{
  "template_key": "fashion-grid",
  "module_key":   "store",
  "categories": [
    { "name_ar": "فساتين",    "name_en": "Dresses",     "display_template": "grid" },
    { "name_ar": "عبايات",    "name_en": "Abayas",      "display_template": "grid" },
    { "name_ar": "بلايز",     "name_en": "Blouses",     "display_template": "grid" },
    { "name_ar": "أحذية",     "name_en": "Shoes",       "display_template": "grid" },
    { "name_ar": "إكسسوارات", "name_en": "Accessories", "display_template": "grid" }
  ],
  "clear_existing": false
}
```

**الـ Response المتوقع:**
```json
{
  "success": true,
  "data": {
    "template_key":  "fashion-grid",
    "created_count": 5,
    "categories": [
      { "id": "uuid...", "name_ar": "فساتين", "name_en": "Dresses" },
      ...
    ]
  }
}
```

---

## من أين تجيب الـ categories؟

**الأولوية:**
1. إذا `catalog.categories` في الـ JSON غير فارغ → استخدمها مباشرة
2. إذا فارغ + `catalog.seed_from_template: true` → اقرأ `seedCategories` من `template-registry.js`
3. إذا كلاهما فارغ → أنشئ تصنيفاً افتراضياً واحداً: `{ name_ar: "عام", name_en: "General", display_template: "grid" }`

**اقرأ من template-registry.js:**
```js
import { templateRegistry } from 'frontend/src/config/template-registry.js'
const categories = templateRegistry[template_key].seedCategories
// كل category: { name_ar, name_en, display_template }
```

---

## قواعد display_template

| القيمة | متى تستخدم |
|--------|-----------|
| `grid` | المنتجات العادية — شبكة بطاقات |
| `list` | الخدمات والقوائم — عرض عمودي |
| `showcase` | التصنيف الأول المميز فقط — full-width hero |

**قاعدة من registry:**
- `catalogLayout: 'grid'` → كل categories بـ `display_template: 'grid'`
- `catalogLayout: 'list'` → كل categories بـ `display_template: 'list'`
- `catalogLayout: 'showcase'` → أول category: `showcase`، الباقي: `grid`

---

## `clear_existing`

| الحالة | القيمة |
|--------|--------|
| أول مرة للـ tenant | `false` (افتراضي) |
| إعادة seeding لتصحيح بيانات | `true` |
| tenant موجود وعنده categories | `false` — لا تمسح |

---

## التحقق بعد الـ seed

```
GET /api/v1/public/catalog/categories?client_slug={slug}
```

يجب أن يرجع الـ categories مع `display_template` الصحيح.

**إذا جاء 403** → خدمة catalog مش مفعّلة.
السبب: `catalog` service لم تُزرع عند التسجيل.
الحل: تحقق من `registration_service.py` أن `seed_default_services(client.id, ["catalog"])` موجودة.

---

## إذا نجح هذا الـ step → انتقل لـ `05-verify-live.md`

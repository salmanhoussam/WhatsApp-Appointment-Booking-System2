# Demo Step 5 — Verify & Deliver Demo Link

## الهدف
التحقق أن كل الخطوات نجحت وتسليم رابط الـ demo للزبون.

---

## قائمة التحقق الكاملة

### ✅ 1. Public Config
```
GET /api/v1/public/{slug}/config
```

**يجب أن يرجع:**
```json
{
  "slug":           "{slug}",
  "name_ar":        "{name_ar}",
  "page_type":      "normal" | "showcase",
  "primary_color":  "#RRGGBB",
  "template_key":   "{template_key}",
  "active_services": ["catalog"]
}
```

**نقاط الفشل:**
| المشكلة | السبب | الحل |
|---------|-------|------|
| `page_type: null` | السيرفر ما أُعيد تشغيله | restart السيرفر |
| `active_services: []` | catalog لم يُزرع | راجع `registration_service.py` |
| `404 Not Found` | الـ slug خاطئ أو الـ tenant غير موجود | تحقق من DB |

---

### ✅ 2. Catalog Categories
```
GET /api/v1/public/catalog/categories?client_slug={slug}
```

**يجب أن يرجع:**
```json
{
  "success": true,
  "data": [
    { "name_ar": "...", "name_en": "...", "display_template": "grid|list|showcase" },
    ...
  ]
}
```

**إذا جاء `data: []`** → الـ seeding ما نجح، أعِد Step 4 مع `clear_existing: false`
**إذا جاء `403`** → catalog service مش مفعّل

---

### ✅ 3. Demo Page (Frontend)
```
http://localhost:5173/demo/{slug}
```

في production:
```
https://salmansaas.com/demo/{slug}
```

**ماذا يجب أن تظهر:**
- ✅ شريط Trial (بوتيك ليلى — حساب تجريبي)
- ✅ Hero مناسب لـ page_type (showcase أو normal)
- ✅ اللون الصحيح على الأزرار والعناوين
- ✅ التصنيفات في CatalogStrip

---

## رسالة التسليم للزبون

بعد التحقق الكامل، أرسل للزبون عبر WhatsApp:

```
مرحبا {owner.name} 👋

متجرك {client.name_ar} جاهز للمعاينة!

🔗 رابط الديمو:
https://salmansaas.com/demo/{slug}

🔐 لوحة التحكم:
https://salmansaas.com/{slug}/dashboard
البريد: {owner.email}
كلمة المرور: {owner.password_temp}

المتجر سيبقى مفعلاً لمدة 14 يوم.
للترقية للنسخة الكاملة تواصل معنا 🚀
```

---

## تقرير الـ Seeding (احفظه)

```json
{
  "seeded_at":      "ISO timestamp",
  "slug":           "...",
  "template_key":   "...",
  "page_type":      "...",
  "primary_color":  "...",
  "categories_count": 5,
  "status":         "demo_live",
  "demo_url":       "https://salmansaas.com/demo/{slug}",
  "dashboard_url":  "https://salmansaas.com/{slug}/dashboard",
  "trial_ends_at":  "..."
}
```

---

## الخطوة التالية: Production

إذا قرر الزبون الاشتراك → انتقل لـ `../production/01-activate-client.md`

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

### ✅ 2. Catalog Categories (endpoint يختلف حسب module_key)

```python
# BUG-FIX: استخدم الـ endpoint الصحيح بناءً على module_key
if module_key == "store":
    url = f"/api/v1/public/store/categories?client_slug={slug}"
elif module_key == "restaurant":
    url = f"/api/v1/public/restaurant/menu/categories?client_slug={slug}"
else:  # "catalog"
    url = f"/api/v1/public/{slug}/catalog/categories"
```

**يجب أن يرجع 200** — وجود `data: []` مقبول (tenant جديد ما عنده items بعد، الـ endpoint شغّال):
```json
{ "success": true, "data": [...] }
```

**إذا جاء `403`** → الـ service مش مفعّل → راجع `active_services` في config
**إذا جاء `404`** → الـ endpoint غير مسجّل أو الـ slug خاطئ

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

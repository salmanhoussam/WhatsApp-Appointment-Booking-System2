# Demo Step 3 — Apply Design Settings

## الهدف
تطبيق القالب واللون ونوع الصفحة على الـ tenant باستخدام TENANT_ADMIN JWT.

---

## الـ Endpoint

```
PATCH /api/v1/admin/settings
Authorization: Bearer {admin_token}
Content-Type: application/json
```

**الـ Body:**
```json
{
  "page_type":     "{design.page_type}",
  "primary_color": "{design.primary_color}",
  "template_key":  "{design.template_key}",
  "name_ar":       "{client.name_ar}",
  "name_en":       "{client.name_en}"
}
```

**الـ Response المتوقع:**
```json
{
  "success": true,
  "updated_fields": ["pageType", "templateKey", "primary_color", "name_ar", "name_en"]
}
```

---

## قواعد الـ Design

### page_type
| القيمة | متى تستخدم | الـ Component |
|--------|-----------|--------------|
| `showcase` | أزياء، مطاعم راقية، صالونات | ShowcaseHero (split-screen + rings) |
| `normal` | عيادات، صيدليات، خدمات عامة | SimpleHero (centered orb + CTA) |

**من template-registry.js:** كل قالب عنده `page_type` محدد مسبقاً — استخدمه دائماً إلا إذا طلب الـ meta خلاف ذلك.

### primary_color
- يجب أن يكون `#RRGGBB` (6 أرقام hex)
- إذا غير موجود في الـ JSON → خذه من `template-registry.js` → `primary_color` للقالب
- تحقق أنه لا يختفي على dark background (تجنب: `#000000`, `#1A1A1A`, `#0A0A0A`)

### template_key
- يجب أن يطابق مفتاحاً موجوداً في `frontend/src/config/template-registry.js`
- القوالب الحالية (20 قالب):
  ```
  fashion:  fashion-grid, fashion-menswear, fashion-accessories, fashion-kids
  food:     food-cafe, food-restaurant, food-fastfood, food-bakery
  beauty:   beauty-salon, beauty-barber, beauty-nails, beauty-spa
  health:   health-clinic, health-dental, health-gym, health-pharmacy
  services: services-photography, services-education, services-mechanic, services-general
  ```

---

## ملاحظة تقنية مهمة

الـ `pageType` و`templateKey` في Prisma هم camelCase.
الـ `PATCH /admin/settings` يحولهم تلقائياً:
```python
_CAMEL = {"page_type": "pageType", "template_key": "templateKey"}
```
أنت ترسل snake_case — السيرفر يتولى الباقي.

---

## التحقق بعد الـ PATCH

```
GET /api/v1/public/{slug}/config
```

يجب أن يرجع:
```json
{
  "page_type":    "showcase",
  "primary_color": "#E8E8E8",
  "template_key": "fashion-grid"
}
```

إذا رجعت القيم القديمة → السيرفر يحتاج restart أو الـ tenant cache ما اتكسر.

---

## إذا نجح هذا الـ step → انتقل لـ `04-seed-catalog.md`

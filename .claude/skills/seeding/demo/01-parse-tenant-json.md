# Demo Step 1 — Parse & Validate Tenant JSON

## الهدف
قراءة الـ JSON الواصل من كونان والتحقق من اكتمال الحقول الإلزامية قبل أي API call.

---

## الحقول الإلزامية (يجب أن تكون موجودة وغير null)

```
client.slug          → 3-50 حرف، lowercase، أرقام وشرطات فقط  ^[a-z0-9-]{3,50}$
client.name_ar       → اسم النشاط بالعربي
client.service_type  → real_estate | restaurant | store | hotel | sports
owner.email          → بريد إلكتروني صالح
owner.password_temp  → 8 أحرف على الأقل
owner.whatsapp       → رقم بالصيغة الدولية +XXXXXXXXXXX
design.template_key  → يجب أن يكون موجوداً في template-registry.js
design.page_type     → normal | showcase فقط
```

## الحقول الاختيارية (لها قيم افتراضية)

```
client.currency      → افتراضي: "USD"
client.status        → افتراضي: "trial"
design.primary_color → افتراضي: أول لون من القالب في template-registry.js
catalog.categories   → افتراضي: seedCategories من القالب في template-registry.js
```

---

## خطوات التنفيذ

### 1. اقرأ الـ JSON
```python
import json
with open("scripts/data/{slug}.json", encoding="utf-8") as f:
    payload = json.load(f)
```

### 2. تحقق من الـ schema version
```python
if payload.get("_schema_version") != "2.0":
    raise ValueError("JSON قديم — استخدم tenant_onboarding_template.json v2.0")
```

### 3. تحقق من الحقول الإلزامية
```python
required = {
    "client.slug":         payload["client"].get("slug"),
    "client.name_ar":      payload["client"].get("name_ar"),
    "client.service_type": payload["client"].get("service_type"),
    "owner.email":         payload["owner"].get("email"),
    "owner.password_temp": payload["owner"].get("password_temp"),
    "owner.whatsapp":      payload["owner"].get("whatsapp"),
    "design.template_key": payload["design"].get("template_key"),
    "design.page_type":    payload["design"].get("page_type"),
}
missing = [k for k, v in required.items() if not v]
if missing:
    raise ValueError(f"حقول ناقصة: {missing}")
```

### 4. تحقق من الـ template_key
```python
# اقرأ template-registry.js وتحقق أن المفتاح موجود
# القوالب الموجودة: fashion-grid, fashion-menswear, food-cafe, food-restaurant,
# food-fastfood, food-bakery, beauty-salon, beauty-barber, beauty-nails, beauty-spa,
# health-clinic, health-dental, health-gym, health-pharmacy,
# services-photography, services-education, services-mechanic, services-general,
# fashion-accessories, food-dessert
VALID_TEMPLATES = { ... }  # اقرأها من template-registry.js
if payload["design"]["template_key"] not in VALID_TEMPLATES:
    raise ValueError(f"template_key غير موجود: {payload['design']['template_key']}")
```

### 5. تحقق من needs_review
```python
needs_review = payload.get("meta", {}).get("needs_review", [])
if needs_review:
    print(f"⚠️  يحتاج مراجعة: {needs_review}")
    print("أوقف وانتظر موافقة سلمان قبل المتابعة.")
    raise SystemExit(1)
```

### 6. اعبئ القيم الافتراضية
```python
# primary_color: خذه من القالب إذا غير موجود
if not payload["design"].get("primary_color"):
    payload["design"]["primary_color"] = TEMPLATE_REGISTRY[template_key]["primary_color"]

# categories: خذها من القالب إذا فارغة
if not payload["catalog"].get("categories"):
    payload["catalog"]["categories"] = TEMPLATE_REGISTRY[template_key]["seedCategories"]
```

---

## Output المتوقع

```python
{
    "slug":           "...",
    "name_ar":        "...",
    "name_en":        "...",
    "email":          "...",
    "password":       "...",
    "whatsapp":       "...",
    "service_type":   "...",
    "template_key":   "...",
    "page_type":      "normal" | "showcase",
    "primary_color":  "#RRGGBB",
    "categories":     [ { name_ar, name_en, display_template }, ... ],
}
```

## إذا نجح هذا الـ step → انتقل لـ `02-register-and-auth.md`

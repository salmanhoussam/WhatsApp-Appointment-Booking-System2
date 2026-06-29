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
version = payload.get("_schema_version")
if version not in ("2.0", "2.1"):
    raise ValueError(f"JSON قديم (v{version}) — استخدم schema v2.1")
```

### 3. تحقق من الحقول الإلزامية
```python
# BUG-FIX: اقرأ من design.template_key (ليس template.template_key)
required = {
    "client.slug":         payload["client"].get("slug"),
    "client.name_ar":      payload["client"].get("name_ar"),
    "owner.email":         payload["owner"].get("email"),
    "owner.password_temp": payload["owner"].get("password_temp"),
    "owner.whatsapp":      payload["owner"].get("whatsapp"),
    "design.template_key": payload["design"].get("template_key"),   # ← v2.1
    "design.module_key":   payload["design"].get("module_key"),     # ← v2.1 جديد
    "design.page_type":    payload["design"].get("page_type"),
}
missing = [k for k, v in required.items() if not v]
if missing:
    raise ValueError(f"حقول ناقصة: {missing}")
```

### 4. تحقق من الـ template_key
```python
# 20 قالب متاح — اقرأ من template-registry.js
VALID_TEMPLATES = {
    "fashion-grid", "fashion-menswear", "fashion-kids", "fashion-abayas",
    "food-restaurant", "food-cafe", "food-bakery", "food-fastfood", "food-grocery",
    "beauty-barber", "beauty-salon", "beauty-spa", "beauty-cosmetics",
    "health-clinic", "health-pharmacy", "health-gym", "health-nutrition",
    "services-photography", "services-maintenance", "services-design",
}
template_key = payload["design"]["template_key"]
if template_key not in VALID_TEMPLATES:
    raise ValueError(f"template_key غير موجود: {template_key}")
```

### 4B. التحقق من تناسق module_key مع services (validateModuleServicesConsistency)
```python
# module_key يجب أن يتطابق مع getModuleKey(template_key)
REGISTRY_MODULE_KEY = {
    "fashion-grid": "store", "fashion-menswear": "store", "fashion-kids": "store",
    "fashion-abayas": "store", "food-grocery": "store", "beauty-cosmetics": "store",
    "health-pharmacy": "store",
    "food-restaurant": "restaurant", "food-cafe": "restaurant",
    "food-bakery": "restaurant", "food-fastfood": "restaurant",
    "beauty-barber": "catalog", "beauty-salon": "catalog", "beauty-spa": "catalog",
    "health-clinic": "catalog", "health-nutrition": "catalog", "health-gym": "catalog",
    "services-photography": "catalog", "services-maintenance": "catalog",
    "services-design": "catalog",
}
expected_module = REGISTRY_MODULE_KEY[template_key]
given_module    = payload["design"]["module_key"]
if given_module != expected_module:
    raise ValueError(
        f"module_key مش متوافق: template={template_key} يتطلب module_key={expected_module}، "
        f"لكن الـ JSON يحتوي {given_module}"
    )

# services يجب أن تحتوي على module_key كمحرك رئيسي
services = payload["design"].get("services", [])
if expected_module != "catalog" and expected_module not in services:
    raise ValueError(f"services ناقصة: يجب أن تحتوي على '{expected_module}'")
```

### 4C. إصلاح تلقائي لـ BUG-08 — ضمان وجود "catalog" (AUTO-CORRECTION)
```python
# قاعدة إلزامية (BUG-08 permanent fix):
# كل module_key = "store" أو "restaurant" يحتاج "catalog" في services
# لأن admin catalog endpoints تتطلب require_service("catalog")
# إذا "catalog" مفقود → يُضاف تلقائياً — لا يوقف الـ Pipeline، يُسجَّل فقط

MODULE_REQUIRES_CATALOG = {"store", "restaurant"}

if expected_module in MODULE_REQUIRES_CATALOG:
    if "catalog" not in services:
        services.append("catalog")
        payload["design"]["services"] = services
        print(f"⚡ AUTO-CORRECTION: 'catalog' أُضيف تلقائياً إلى services "
              f"(module_key={expected_module} يتطلبه)")
        # لا raise — Pipeline يكمل، فقط نسجّل التصحيح
```

**متى يحدث هذا؟**
- Konaan يُرجع `services: ["store"]` بدون "catalog" (النسيان الشائع)
- الـ Validator يُصحح: `["store"] → ["store", "catalog"]`
- الـ Backend يتلقى قائمة مكتملة → seed-from-template يمر بدون 403

**قاعدة الذهب:** "catalog" دائماً موجود لأي tenant يستخدم `store` أو `restaurant`.

### 5. تحقق من needs_review
```python
needs_review = payload.get("meta", {}).get("needs_review", False)
if needs_review:
    missing = payload.get("meta", {}).get("missing_fields", [])
    print(f"⚠️  يحتاج مراجعة. missing_fields: {missing}")
    print("أوقف وانتظر موافقة سلمان قبل المتابعة.")
    raise SystemExit(1)
```

### 6. اعبئ القيم الافتراضية
```python
# primary_color: خذه من القالب إذا غير موجود
if not payload["design"].get("primary_color"):
    payload["design"]["primary_color"] = REGISTRY_COLORS[template_key]

# page_type: fallback to "normal" إذا قيمة غير معروفة
valid_page_types = {"normal", "showcase"}
if payload["design"].get("page_type") not in valid_page_types:
    payload["design"]["page_type"] = "normal"  # safe fallback

# categories: خذها من القالب إذا فارغة
if not payload["catalog"].get("categories"):
    payload["catalog"]["seed_from_template"] = True
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

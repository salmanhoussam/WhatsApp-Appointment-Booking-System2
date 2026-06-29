paths: "app/**,scripts/**,frontend/src/**"

# Supabase Storage — Tenant Namespacing Rules

## 1. الـ Bucket الوحيد

**Bucket:** `properties` (public, single bucket for all tenants)

كل شيء فيه — لا buckets إضافية. العزل يتم بـ `{slug}/` prefix فقط.

---

## 2. هيكلية المجلدات الكاملة

```
properties/
└── {slug}/                           ← root لكل tenant
    │
    ├── catalog/                      ← module: catalog (restaurant, store, ecommerce)
    │   └── {category_id}/            ← UUID الـ CatalogCategory
    │       └── {item_id}/            ← UUID الـ CatalogItem
    │           ├── main.jpg          ← صورة العنصر الأساسية
    │           └── {n}.jpg           ← صور إضافية (2.jpg, 3.jpg...)
    │
    ├── pages/                        ← صور صفحات الـ tenant
    │   ├── home/
    │   │   ├── hero/                 ← صورة/فيديو الـ hero الرئيسي
    │   │   ├── logo/                 ← شعار المنشأة
    │   │   └── story/                ← صور قسم "قصتنا" / About
    │   └── demo/                     ← thumbnail الـ demo page للعميل
    │
    └── units/                        ← module: booking / real_estate فقط
        └── {unit_id}/                ← UUID الـ Unit
            ├── cover/                ← صورة الغلاف الرئيسية (1 صورة)
            └── gallery/              ← معرض الصور (n صور)
```

---

## 3. Public URL Pattern

```
https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/{slug}/{path}
```

**أمثلة:**
```
# صورة عنصر كاتالوج
.../properties/tastybites/catalog/cat-uuid-123/item-uuid-456/main.jpg

# hero الصفحة
.../properties/beitSmar/pages/home/hero/cover.jpg

# صورة وحدة
.../properties/smar/units/unit-uuid-789/cover/main.jpg
```

> **ملاحظة smar:** مجلد smar في Supabase هو `beitsmar/` (تاريخي).
> هذا الاستثناء موثّق في `public_service.py` — slug→folder mapping.
> كل tenant جديد: المجلد = الـ slug مباشرةً.

---

## 4. كيف "تُنشئ" مجلداً في Supabase

Supabase Storage لا تحتاج إنشاء مجلد صريح — المجلد يُنشأ تلقائياً عند رفع أول ملف بذلك المسار.

**لإنشاء المجلد مسبقاً (placeholder):**
```python
from app.services.supabase_service import supabase

def create_tenant_folders(slug: str):
    """يُنشئ هيكلية المجلدات الأساسية عند تسجيل tenant جديد."""
    folders = [
        f"{slug}/pages/home/hero/.keep",
        f"{slug}/pages/home/logo/.keep",
        f"{slug}/pages/demo/.keep",
        f"{slug}/catalog/.keep",
    ]
    for path in folders:
        supabase.storage.from_("properties").upload(
            path,
            b"",           # ملف فارغ
            {"upsert": "true"}
        )
```

> يُستدعى هذا من `registration_service.register_new_tenant()` كـ background task.

---

## 5. Backend Upload Path Logic

```python
# app/services/upload_service.py

FOLDER_MAP = {
    "catalog_item":  "catalog/{category_id}/{item_id}",
    "page_hero":     "pages/home/hero",
    "page_logo":     "pages/home/logo",
    "page_story":    "pages/home/story",
    "page_demo":     "pages/demo",
    "unit_cover":    "units/{unit_id}/cover",
    "unit_gallery":  "units/{unit_id}/gallery",
}

def build_storage_path(slug: str, context: str, filename: str, **ids) -> str:
    """
    context: مفتاح من FOLDER_MAP
    ids: category_id, item_id, unit_id حسب الـ context
    """
    folder_template = FOLDER_MAP[context]
    folder = folder_template.format(**ids)
    return f"{slug}/{folder}/{filename}"
```

**الـ endpoint:**
```
POST /api/v1/admin/upload
Form: file (binary), context (str), category_id? (uuid), item_id? (uuid), unit_id? (uuid)
→ يرجع: { "url": "https://...supabase.co/storage/v1/object/public/properties/{path}" }
```

---

## 6. Per-Tenant Storage Profile

عند إنشاء tenant جديد من الـ onboarding webhook أو self-registration:

| الخطوة | ما يتم |
|--------|--------|
| 1 | `register_new_tenant()` ينشئ Client + User في DB |
| 2 | Background task يرفع placeholder files لإنشاء المجلدات |
| 3 | Seed categories → يُنشئ مجلد `catalog/{cat_id}/` لكل category |

---

## 7. قواعد للـ Agent

- **لا ترفع ملفات لـ slug خاطئ** — تحقق من `client.slug` قبل أي upload
- **لا تضع ملفين بنفس المسار** — Supabase يـ overwrite بدون تحذير (استخدم `{timestamp}_{filename}`)
- **الـ `.keep` ملفات** — لا تحذفها، هي placeholder لإبقاء المجلد
- **item_id قبل الرفع** — يجب إنشاء الـ CatalogItem في DB أولاً ثم رفع الصورة لمسار `catalog/{cat_id}/{item_id}/`
- **عزل كامل** — لا تخلط ملفات slug A في مجلد slug B تحت أي ظرف

---

## 8. خريطة عمل الأنواع

| service_type | المجلدات المستخدمة |
|-------------|-------------------|
| `restaurant` | `catalog/`, `pages/` |
| `ecommerce` / `store` | `catalog/`, `pages/` |
| `real_estate` / `hotel` | `units/`, `pages/` |
| `services` | `pages/` فقط |

---

## 9. الحالة الحالية (2026-05-04)

| المكوّن | الحالة |
|---------|--------|
| Bucket `properties` موجود | ✅ |
| مجلد `smar` (= `beitsmar/`) | ✅ Live |
| Backend upload endpoint | ⏳ لم يُبنَ بعد — `useImageUpload.js` (Phase 52.5) |
| `create_tenant_folders()` | ⏳ لم يُدمج في registration بعد |
| `GalleryImage` DB table | ⏳ خطة موثقة، لم تُبنَ (يُستخدم Supabase listing مباشرة) |

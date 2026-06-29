paths: "scripts/**,scripts/data/**,app/services/registration_service.py,app/api/v1/super/**"

# Tenant Onboarding — Mandatory File Checklist
# ⚠️ كل tenant جديد يجب أن يحصل على هذه الملفات — لا استثناء

---

## 1. الملفات الإلزامية لكل tenant

عند إنشاء أي tenant جديد (سواء يدوياً أو عبر onboarding)،
يجب أن تُنشأ هذه الملفات بالترتيب:

```
scripts/data/{slug}/
├── settings.json       ✅ REQUIRED — slug + module_key + currency + metadata
├── page_content.json   ✅ REQUIRED — sections الصفحة (مبني من page_templates/)
├── categories.json     ✅ إذا module = restaurant | store
└── items.json          ✅ إذا module = restaurant | store
```

---

## 2. page_content.json — يُبنى من القالب المناسب

| module_key   | قالب مصدر                              |
|-------------|----------------------------------------|
| restaurant  | `scripts/data/page_templates/restaurant.json` |
| store       | `scripts/data/page_templates/store.json`      |
| booking     | `scripts/data/page_templates/booking.json`    |

**الخطوات:**
```bash
# 1. انسخ القالب المناسب
cp scripts/data/page_templates/{module}.json scripts/data/{slug}/page_content.json

# 2. عدّل _meta + النصوص ليناسبوا الـ tenant (اسم، لون، واتساب)

# 3. seed في الـ DB
python scripts/seed_page_content.py {slug}
```

---

## 3. settings.json — الحد الأدنى المطلوب

```json
{
  "_meta": {
    "slug": "{slug}",
    "module_key": "restaurant | store | booking",
    "currency": "$ | ل.ل | SAR",
    "note": "وصف مختصر للـ tenant"
  }
}
```

---

## 4. ترتيب التنفيذ الإلزامي

```
1. إنشاء Client + User في DB  (seed_unified_clients.py أو API)
2. إنشاء settings.json
3. إنشاء page_content.json من القالب المناسب
4. إنشاء categories.json + items.json (إذا catalog module)
5. python scripts/seed_page_content.py {slug}
6. python scripts/seed_catalog.py {slug}  (إذا catalog)
7. تحقق: curl أو فتح في المتصفح
```

---

## 5. قواعد للـ Agent

- **لا تنشئ tenant بدون page_content.json** — الصفحة ستظهر فارغة
- **لا تنسخ page_content.json من tenant آخر** — عدّل النصوص
- **module_key في settings.json يطابق service_key في client_services**
- **بعد أي تعديل على page_content.json**: أعد تشغيل `seed_page_content.py`
- **tenant-seeder agent**: مسؤول عن تنفيذ هذه الـ checklist كاملة

---

## 6. التحقق السريع

```bash
python scripts/seed_page_content.py {slug} --dry-run
```
يطبع عدد الـ sections والـ template_key — تحقق أنها صحيحة قبل الـ seed الفعلي.

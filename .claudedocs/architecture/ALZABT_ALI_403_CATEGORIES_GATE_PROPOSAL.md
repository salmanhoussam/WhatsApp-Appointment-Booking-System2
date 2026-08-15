# `GET /admin/catalog/categories` — Capability Gate Fix Proposal

**Status:** Proposal only. **No code changed.** Per Salman's explicit framing (2026-08-16): this is
real Production work, not "just an Ali/demo issue" — Ali being classified `demo` doesn't change that
the gate itself is a real bug in the Barber-vertical path any real Barber tenant would hit. Supabase's
current outage is explicitly **not** referenced or worked around anywhere below — separate, open
incident, untouched by this proposal.

---

## 1. الـ gate الحالي بالضبط

`app/api/v1/admin/catalog.py` — 9 routes، **كلها** مبوَّبة `Depends(require_service("catalog"))` بلا
استثناء: `GET/POST/PATCH/DELETE /categories`، `POST /seed-from-template`، `GET/POST/PATCH/DELETE
/items`. لا فرق بين قراءة وكتابة اليوم — بوابة واحدة لكل الملف.

الاستدعاء الذي يفشل فعليًا لـ Ali: `StaffTab.jsx:232` →
`adminApi.get('/catalog/categories?include_inactive=true')` → `list_categories()` (`catalog.py:80-94`)
→ `403` لأن Ali يملك `reservations` لا `catalog`.

## 2. لماذا `reservations` هي الـ capability الصحيحة لهذا المسار عند Barber

`CatalogCategory` هو نموذج بيانات **مشترك فعليًا** بين النظامين — ليس حصريًا للتجزئة. دليل مباشر من
الكود نفسه: `provisioning_service.py`'s `provision_barber_domain()` (السطر 71-77) ينشئ فئة كل Barber
tenant ("الخدمات") عبر **نفس** `catalog_repo.create_category()` الذي يستخدمه هذا الراوتر بالضبط —
`CatalogService.categoryId` يشير فعليًا لصف `CatalogCategory` حقيقي. أي Barber tenant حقيقي (Ali، RK،
alzabt-demo، وأي مستقبلي) **يملك فئة `CatalogCategory` حقيقية بالفعل** — البوابة الحالية تمنع تينانت
يملك بيانات حقيقية من رؤية بياناته الخاصة، لا تحميه من شيء لا يملكه.

هذا **ليس bug من نوع "endpoint خاطئ"** (مثل P0.1's `featured_items`) — هذا bug من نوع **"بوابة أضيق
مما تحتاجه البيانات الحقيقية"**: تصنيف Barber يُبوَّب خلف `reservations`، بينما هذا المسار المحدَّد ظل
يطلب `catalog` حصرًا منذ قبل وجود Barber كـ vertical أصلًا.

## 3. لماذا إضافة `reservations` للـ gate لا توسّع صلاحيات غير مقصودة

**التعديل المقترح مقتصر على راوت واحد فقط: `GET /categories` (`list_categories`) — قراءة فقط.** لا
تعديل على `POST/PATCH/DELETE /categories`، ولا `POST /seed-from-template`، ولا أي من الأربعة routes
تحت `# ── Items ──` (`GET/POST/PATCH/DELETE /items`). هذه الثمانية تبقى `catalog`-only بلا أي تغيير.

**دليل إضافي، مباشر من الكود، أن هذا لا يفتح مسارًا فعليًا جديدًا**: `GenericAdminDashboard.jsx`'s
`buildNav()` (السطر 168-180) **يستبعد تبويب "الكتالوج" (`CatalogTab.jsx`) بالكامل** لأي تينانت
`hasReservations` — غير موجود في القائمة الجانبية إطلاقًا. `CatalogTab.jsx` (الملف الوحيد الذي يستدعي
`POST/PATCH/DELETE /categories` و**كل** routes الـ`/items`) **غير قابل للوصول بنيويًا** لأي تينانت
Barber اليوم، بصرف النظر عن أي بوابة API. حتى لو نجحت `list_categories` لـ Ali، لا طريق واجهة يوصله لأي
من عمليات الكتابة على `CatalogItem` — نموذج بيانات لا يستخدمه Barber أصلًا (يستخدم `CatalogService`
بدلًا منه، حسب `catalog-contract.md`).

## 4. كل الـ callers المتأثرين، ليس Ali فقط

| Caller | الملف | التأثير |
|---|---|---|
| `StaffTab.jsx:232` | نموذج إضافة/تعديل خدمة | **المُصلَح فعليًا** — يعمل بدل الفشل، لأي تينانت Barber بلا `catalog` |
| `OverviewTab.jsx:554-555` | بطاقات إحصاء الكتالوج | يستدعي `categories` **و** `items` معًا في `Promise.all` — بما أن `items` يبقى `catalog`-only، الـ `Promise.all` يبقى يفشل بالكامل لتينانت Barber بلا `catalog`، **بلا تغيير فعلي** (أصلًا يتعافى بصمت عبر `.catch(() => {})` اليوم، يبقى كذلك). لا حاجة لتعديل `items` أيضًا — `CatalogItem` غير ذي صلة ببيانات Barber أصلًا |
| `CatalogTab.jsx` (6 استدعاءات) | إدارة الكتالوج الكاملة | **غير متأثر إطلاقًا** — غير قابل للوصول بنيويًا لتينانت Barber (§3 أعلاه)، وحتى لو وُصِل إليه، فقط الـ`GET` سينجح، الكتابة تبقى محجوبة |
| `CatalogPage.jsx:83,99` | صفحة كتالوج عامة | **غير ذي صلة** — يستخدم `publicApi` على راوتر عام مختلف تمامًا، لا علاقة له بهذا الـ gate الإداري |

## 5. الأثر على RK وalzabt-demo وأي vertical آخر

- **RK**: يملك `catalog` فعليًا (مؤكَّد من `active_services` الحقيقية) — يمر من البوابة الحالية أصلًا،
  الشرط الجديد (`OR`) لا يغيّر شيئًا له إطلاقًا.
- **alzabt-demo**: نفس الحال — يملك `catalog` ضمن `_SERVICE_MAP["barbershop"]`، غير متأثر.
- **تينانت تجزئة/مطعم حقيقي** (لا `reservations`): يمر من البوابة كما اليوم بالضبط عبر شرط `catalog`
  وحده — لا تغيير.
- **أي vertical مستقبلي بنفس شكل Barber** (مثلًا Clinic لو أُضيف لاحقًا، يملك `reservations` بلا
  `catalog`): يستفيد من نفس الإصلاح تلقائيًا — التعديل مبني على capability لا على اسم vertical، متوافق
  مع مبدأ "vertical-neutral" المُلتزَم به طوال هذا المسار (لا `if vertical == 'barber'` في أي مكان).

## 6. خطة الـ verification بعد التنفيذ (لن تُنفَّذ الآن)

1. **Ali** — تسجيل دخول حقيقي، فتح تبويب الموظفين، فتح نموذج "إضافة خدمة"، تأكيد أن قائمة الفئات تُحمَّل
   فعليًا (فئة "الخدمات" الحقيقية تظهر)، صفر 403 في الشبكة.
2. **RK** — نفس المسار، تأكيد عدم تغيّر أي سلوك (لا يزال يمر عبر `catalog`).
3. **تينانت تجزئة حقيقي أو تجريبي** (بدون `reservations`) — تأكيد تبويب الكتالوج وكل عمليات الكتابة
   (إنشاء/تعديل/حذف فئة، كل عمليات `/items`) تعمل بلا تغيير، وتأكيد أن تبويب "الموظفين" (`staff` nav)
   غير ظاهر أصلًا له (نفس `buildNav()` الحالي).
4. **فحص صريح لعدم التوسّع**: تأكيد أن `POST/PATCH/DELETE /categories` و**كل** `/items` routes ما زالت
   ترفض `403` لتينانت يملك `reservations` بلا `catalog` (Ali تحديدًا) — إثبات مباشر أن الكتابة لم
   تُفتَح.
5. Console/network نظيفة، صفر طلبات إضافية غير متوقعة.
6. **صفر تعديل على بيانات أي tenant حقيقي** في كل خطوات الـ verification.

## 7. لماذا لا علاقة لهذا بحادثة Supabase الحالية

هذا التعديل كود تطبيقي بحت (سطر واحد من شرط بوابة)، لا علاقة له بالاتصال بقاعدة البيانات أو استقرار
الـ pooler. حادثة Supabase تبقى مفتوحة، منفصلة، غير مربوطة بهذا القرار من أي جهة — لا workaround يُبنى
بسببها هنا.

---

**بانتظار موافقتك الصريحة قبل أي تعديل على `app/api/v1/admin/catalog.py`.**

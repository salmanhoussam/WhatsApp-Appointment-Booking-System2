# ق-٥-ب — كيف تعرف الصفحةُ الـvertical؟

**النوع:** تحقيقٌ للقراءةِ فقط (`rules/investigation-protocol.md`) · **صفرُ كود · صفرُ schema · صفرُ كتابةِ إنتاج**
**الحالة:** مُغلَقٌ بتوصيةٍ — **والقرارُ لسلمان، ولم يُتَّخذ هنا.**
**السبب:** القرارُ الوحيدُ الذي يوقف أوّلَ سطرٍ في P5-D.
**البوّابة:** 🔴 `PRODUCTION GATE: CLOSED` · ولم يُقرَأ الإنتاجُ في هذه الجولةِ إطلاقاً (لم يُحتَج).

---

## الخلاصةُ في ثلاثةِ أسطر

```
١  السؤالُ ليس «كيف نُضيف مفهوماً جديداً» — الصفحةُ **تقرّر الموديولَ اليومَ فعلاً**، بثلاثِ قيمٍ
   مكتوبةٍ نصّاً في الكود. فالمطلوبُ استبدالُ حرفٍ بمصدرٍ، لا اختراعُ طبقة.
٢  و«Client.vertical عبر /config» **يخالف عقداً مُقَرّاً** يقول إنّ vertical لا يُقرَأ وقتَ العرض —
   لكنّ العقدَ نفسَه يحمل الجوابَ في سطرٍ آخر، وهو أدقُّ من توصيتي الأولى.
٣  وإن لم يُحسَم: مريضُ العيادةِ **يسقط صامتاً** في نموذجِ الحلاقِ القديم. مقيسٌ من الطرفين.
```

---

## Confirmed Findings

### C-1 · `/config` لا يحمل `vertical` اليوم — والادّعاءُ مقيسٌ على الدالّةِ لا على الذاكرة

`app/services/public_service.py:216-240` — `_record_to_dict()` هي **كلُّ** شكلِ الرد. مفاتيحُها:

```
slug · name_ar · name_en · primary_color · whatsapp_number · instagram_url · maps_url · email
currency · features · config · unit_types · payment_methods · service_type · active_services
page_type · template_key
```

**ولا `vertical` بينها.** والمسارُ `GET /{slug}/config` (`app/api/v1/public/__init__.py:41-52`) لا
يضيف شيئاً — يُعيد ما تُعيده `get_tenant_config` حرفيّاً.

⇒ التوصيةُ «Client.vertical عبر /config» **ليست قراءةَ حقلٍ موجود**، بل إضافةُ حقلٍ إلى عقدٍ عامّ.

### C-2 · الواجهةُ لا تقرأ vertical تينانتٍ **قائم** — 🔴 وهذه الصياغةُ صُحِّحت

`grep -rn "vertical" frontend/src/` ⇒ ٩٤ نتيجة، الظاهرُ منها `resize: vertical` ·
`verticalAlign` · `WebkitBoxOrient` · ونثرٌ في تعليقات.

> 🔴 **تصحيحٌ، ٢٠٢٦-٠٩-٢٧، ظهر أثناءَ تنفيذِ العقد لا أثناءَ التحقيق.** الصياغةُ الأولى كانت:
> «الواجهةُ عمياءُ عن الـvertical تماماً — صفرُ قارئ … ولا واحدةٌ منها حقل». **وهي مبالَغةٌ
> وغيرُ صحيحة.** `frontend/src/config/template-registry.js` يحمل حقلَ `vertical:` على
> **٢٠** قالبَ تسجيل (١٩ منها `null`، وواحدٌ `'barber'` في السطر ٢٣٣)، ويقرأه
> `TenantRegisterPage.jsx` (`:126` · `:200`).
>
> **ولماذا لا يغيّر هذا القرارَ — بل يسنده:** الاتجاهُ مختلف، واللحظةُ مختلفة.
>
> ```
> صادر (قائمٌ ومشروع)   الواجهة → الخادم:  «أنشئ التينانتَ الجديدَ كـbarber»   عند التسجيل
> وارد (وهو موضوعُ ق-٥-ب) الخادم → الواجهة: «أنتَ تعرض تينانتَ …»              عند كلِّ عرض
> ```
>
> فالوارِدُ هو ما كان معدوماً، وق-٥-ب يملؤه بـ**الموديولِ المحسومِ** لا بالـvertical الخام.
> فالاتجاهانِ يبقيان منفصلين، وهذا مقصود. وقد صار الشقّان **بوّابةً مقيسة** (T-ب-٥a و T-ب-٥c في
> `scripts/test_clinic_booking_module_contract.py`): صفرُ قراءةٍ واردة، و٢٠ قالباً صادراً بقارئٍ
> واحد.
>
> **وكيف انكشفت:** لا بمراجعةٍ ثانيةٍ للنصّ، بل لأنّ بوّابةَ T-ب-٥a **فشلت** حين شُغِّلت أوّلَ
> مرّة. المدّعى قيسَ فسقط.

### C-3 · 🔴 والصفحةُ **تقرّر الموديولَ اليومَ**، بثلاثةِ حروفٍ مثبَّتةٍ في الكود

| الموضع | ما يُرسَل | كيف يُقرَّر |
|---|---|---|
| `frontend/src/hooks/useReservationBooking.js:277` | `module_key: 'barber'` | **حرفٌ ثابت** |
| `frontend/src/pages/generic/normal/ReservePage.jsx:853` | `module_key: isRestaurant ? 'restaurant' : 'services'` | `hasCapability(activeServices,'restaurant')` — أي من `active_services` |
| `frontend/src/pages/generic-admin/components/reservationInteractions.jsx:519` | `module_key: 'barber'` | **حرفٌ ثابت** (مسارُ الإدارة) |

و`ReservationIn.module_key: str` **مطلوبٌ ويأتي من العميل** (`public/reservations.py:53`).
و`GET /reservations/resources` يأخذ `module_key: str = Query(...)` **مطلوباً** كذلك (`:163`).

⇒ فالعيادةُ لا تُدخِل مفهوماً جديداً؛ هي **الحالةُ الثالثةُ** التي تكشف أنّ المصدرَ كان حرفاً.

### C-4 · 🔴 الفشلُ الصامتُ إن لم يُحسَم — مقيسٌ من الطرفين، لا مُتوقَّع

**الخادم:** `GET /reservations/barbers` (`public/reservations.py:250-289`) لتينانتٍ بلا صفوفِ
`Barber` يُعيد **٢٠٠** و:

```json
{"success": true, "data": []}
```

**الواجهة:** `useReservationBooking.js:185-189`

```js
const mode = barbersLoading ? 'loading'
  : barbersError ? 'error'
  : (barbers.length > 0 ? 'booking' : 'legacy')
```

⇒ **مريضُ العيادةِ يصل `mode='legacy'`** — نموذجُ تاريخٍ ووقتٍ عامّ، بلا طبيبٍ وبلا خدمةٍ وبلا
أيٍّ من النصوصِ التسعةَ عشرَ المُقَرّة. **٢٠٠ في كلِّ خطوة، ولا رسالةَ خطأ.**

🔴 **وهذا بالضبط العطبُ الذي أُصلح مرّةً وسيعود بمعنًى ثالث.** تعليقُ `:176-180` يوثّق إصلاحَ
٢٠٢٦-٠٨-١٠: «طلبٌ فاشلٌ كان يُعامَل مثلَ تينانتٍ بلا موظّفين — فيسقط زبونٌ حقيقيٌّ صامتاً في
النموذجِ القديم»، فصار `barbersError` يفرّق بينهما. والعيادةُ تُحمّل المصفوفةَ الفارغةَ **معنًى
ثالثاً**: «هذا التينانتُ لا يستعمل الحلاقين أصلاً». فحلُّ ق-٥-ب بالعدِّ (`length === 0`) يُعيد
إنتاجَ العطبِ نفسِه بعد أن دُفع ثمنُه مرّةً.

### C-5 · 🔴 التوصيةُ الحاليّةُ تخالف عقداً مُقَرّاً — **والعقدُ نفسُه يحمل الجواب**

ثلاثةُ نصوصٍ مُقَرّة، وظاهرُها متناقض:

```
① prisma/schema.prisma:106-108   عن Client.vertical:
   «Drives default client_services + Section Repertoire at provisioning … never derived from
    client_services afterward, **never read at render time**.»

② ALZABT_VERTICAL_REGISTRY_ARCHITECTURE.md:26   عن الـRegistry:
   «Interfaces (Dashboard, AI, Mobile) **never read it**; only backend provisioning code does»

③ ALZABT_VERTICAL_REGISTRY_ARCHITECTURE.md:255   عن اختيارِ موديلِ الموظّفين:
   «**Staff Model choice** (which endpoint/model a `staff` section queries) | **Derived, and stays
    derived** | Not a one-time seed — **every render**, the Registry (or a cached resolution of it)
    tells the `staff` section whether to query `Barber` or `Resource` for this tenant's vertical.
    This is the one element in the chain that stays a live, ongoing derivation … because *which
    model to query* is a structural fact about the vertical, not tenant-owned content.»
```

⇒ **وق-٥-ب هو حرفيّاً ذلك السطرُ الثالث**: «barber ⇒ `/barbers` · clinic ⇒ `/resources`» هو
«أيَّ موديلٍ يستعلم منتقي الموظّفين». فالعقدُ المُقَرُّ **أجاب على السؤالِ سلفاً**، وجوابُه:
اشتقاقٌ **حيٌّ عند كلِّ عرض**، لا حقلٌ مخزَّن.

**والقراءةُ الوحيدةُ التي تُصدِّق الثلاثةَ معاً:** الاشتقاقُ يحدث في **الخادم** (يقرأ `vertical`
والـRegistry معاً)، والواجهةُ تستقبل **الجوابَ المحسوم** لا الـvertical الخام. فيبقى ① صادقاً
(لا أحدَ يقرأ vertical وقتَ العرض) و② صادقاً (الواجهةُ لا تلمس الـRegistry) و③ منفَّذاً.

### C-6 · كلُّ بديلٍ موجودٍ على السلكِ اليومَ **لا يميّز** العيادةَ من الحلاق

| المرشَّح | في `/config`؟ | الحكم |
|---|---|---|
| `active_services` | ✅ | 🔴 **لا يميّز.** عقدُ التينانتِ المُقَرّ (`CLINIC_TEST_TENANT_CONTRACT.md` §٢، الصفُّ ٢) يعطي cliniclab-test `client_services` = **`reservations` فقط**. والحلاقُ يحمل `reservations` أيضاً. ولا وجودَ لمفتاحِ خدمةٍ باسم `clinic` إطلاقاً (`require_service("clinic")` ⇒ **صفر**) |
| `service_type` | ✅ | 🔴 **مُسقَطٌ بشهادةِ الـschema على نفسِه** (`:103-105`): «confirmed-unreliable … carries 3+ disagreeing real values today, plus a misleading `real_estate` default». والعقدُ **لا يذكره**، فـcliniclab-test سيحمل الافتراضَ `real_estate` — أي قيمةً **كاذبةً** بلا أن يكتبها أحد |
| `page_type` · `template_key` | ✅ | 🔴 لا يميّزان: العقدُ يثبّت `page_type='normal'` و`template_key=NULL` — وهو حالُ التينانتاتِ الأربعةِ للحلاقِ نفسِها (كلُّها `generic`) |
| `Client.config` (JSON) | ✅ | 🟡 يصل فعلاً بلا أيِّ تغييرٍ في الكود — لكنّه Layer-3 «tenant-owned content» بنصِّ جدولِ العقدِ (`ALZABT_VERTICAL_REGISTRY_ARCHITECTURE.md:257`)، فوضعُ حقيقةٍ **بنيويّةٍ** فيه يخالف العقدَ من جهةٍ أخرى |
| `vertical` | ❌ | ليس على السلك — وهو موضوعُ C-1/C-5 |

### C-7 · 🔴 شرطٌ سابقٌ لم يسمِّه أحد: **لا مدخلَ `clinic` في الـRegistry**

`app/core/verticals.py` — ٦٦ سطراً، ومفتاحٌ **واحد**:

```python
VERTICAL_REGISTRY: dict[str, dict] = { "barber": {...} }      # grep clinic ⇒ صفر
```

⇒ `get_vertical("clinic")` ⇒ `None`. والعقدُ يسجّل الأثرَ سلفاً (`CLINIC_TEST_TENANT_CONTRACT.md:31`):
`provision_vertical_domain_objects()` ⇒ `BusinessLogicError: Unsupported vertical`.

و`staff_backing_model` — الحقلُ الذي يحمل «Barber أم Resource» — قارئُه **واحدٌ فقط اليومَ**:
`provisioning_service.py:207`. والعقدُ الموحَّد للتجهيز يقول صراحةً (`ALZABT_UNIFIED_PROVISIONING_
CONTRACT_FINAL.md:113`): «dispatched by `entry["staff_backing_model"]`, **NOT by vertical name**».

⇒ فأيُّ حلٍّ يمرّ بالـRegistry يحتاج مدخلَ `clinic` بـ`staff_backing_model: "Resource"` **أوّلاً**،
وهو تغييرُ كودٍ في ملفٍّ تحكمه قاعدةُ الـdrift (سببٌ مُعلَنٌ في الإيداع).

### C-8 · و`vertical` فارغٌ لأكثرِ التينانتات — وسابقةٌ حقيقيّةٌ رفضت التفرّعَ عليه لهذا

`app/api/v1/admin/store.py:53` — بنصِّه: «not knowable here — `Client.vertical` is NULL for 17 of
20 tenants — and branching on a capability …». أي أنّ موضعاً حقيقيّاً في هذا المستودعِ **نظر في
التفرّعِ على vertical ورفضَه** لهذا السبب بعينِه.

والمقيسُ اليومَ (جدولُ `CLAUDE.md`، قراءةُ إنتاجٍ حقيقيّةٌ بتاريخِ اليوم): **٤ من ٩** صفوفِ
`clients` تحمل `vertical='barber'`، والخمسةُ الباقيةُ `NULL`.

⇒ فأيُّ تفرّعٍ وقتَ العرضِ يحتاج **سلوكاً معرَّفاً لـNULL**، مكتوباً لا مفترَضاً.

---

## Side Findings

```
S-1  /resources يُعيد {"success": true, "data": []} لأيِّ module_key غيرِ معروف
     (public/reservations.py:184-186). فلو أرسلت P5-D قيمةً خاطئةً، تقول الصفحةُ «لا أطبّاء»
     بدلاً من أن تفشل. نفسُ أسرةِ C-4 — والثالثةُ في هذا المسار.
S-2  get_tenant_config يحتوي مسارَيْ **كتابة** داخلَ GET عامّ (إنشاءُ صفِّ smar تلقائيّاً ·
     وتطبيقُ التنسيقِ) — معروفٌ وخارجَ النطاق بنصِّ تعليقِ المسار، ومسجَّلٌ هنا لأنّ أيَّ
     تعديلٍ على هذه الدالّةِ يلمس دالّةً تكتب.
S-3  DEFAULT_CONFIG في useTenantConfig.js يُستعمل عند فشلِ الطلب — فأيُّ مميِّزٍ جديدٍ يحتاج
     قيمةً فيه أيضاً، وإلّا صار «سلوكُ الخطأ» هو سلوكَ الحلاقِ ضمناً.
S-4  🟢 والكاش ليس خطراً: _PUBLIC_CONFIG_CACHE_TTL = 30.0 ثانية (public_service.py:323).
```

---

## Unknowns — بصراحةٍ لا بصمت

```
U-1  لم يُقرَأ الإنتاجُ في هذه الجولة (لم يُحتَج). قيمُ vertical مأخوذةٌ من جدولِ CLAUDE.md
     المقيسِ **اليومَ** بقراءةٍ حقيقيّة — لا من الذاكرة.
U-2  لا دليلَ متصفّح. وهو غيرُ ممكنٍ أصلاً: **لا تينانتَ عيادةٍ موجود**، فمسارُ العرضِ الكاملُ
     (هل يصل زائرُ العيادةِ إلى ReservePage/الهوك أصلاً، وبأيِّ مسار؟) **غيرُ مُتحقَّقٍ منه**
     ولا يمكن التحقّقُ منه قبل P5-F. مسجَّلٌ Unknown لا مفترَضاً ناجحاً.
U-3  أثرُ المميِّزِ الجديدِ على التينانتاتِ الخمسةِ ذاتِ vertical=NULL لم يُختبَر — فحصٌ
     يحتاج كوداً، وهو خارجُ نطاقِ هذه الجولة.
```

---

## Recommendation — وليست قراراً

**أرجعُ عن توصيتي الأولى.** «`Client.vertical` عبر `/config`» تعبر ① و② أعلاه، وتضع حقيقةً
بنيويّةً في يدِ الواجهةِ خاماً. والأفضلُ مشتقٌّ من العقدِ المُقَرِّ نفسِه (③)، لا من ذوقي:

```
🥇 (أ) الخادمُ يشتقّ، والواجهةُ تستقبل الجوابَ المحسوم
       /config يحمل مفتاحاً **محسوماً** — مثلاً booking_module: "barber" | "clinic" (أو
       staff_endpoint) — يُحسَب في الخادمِ من vertical + VERTICAL_REGISTRY.
       ✅ يُصدِّق النصوصَ الثلاثةَ معاً  ✅ يقتل الحروفَ الثلاثةَ في C-3  ✅ صفرُ schema
       ✅ ويمنع C-4 لأنّ القرارَ لم يبقَ مبنيّاً على عدِّ مصفوفة
       الثمن: مدخلُ clinic في الـRegistry (C-7) · وسطرٌ في _record_to_dict · وتسميةُ NULL (C-8)

🥈 (ب) vertical خاماً في /config  ← توصيتي السابقة
       أرخصُ سطراً، وأغلى عقداً: يحتاج **تعديلَ** نصِّ الـschema ونصِّ الـarchitecture (STOP-4)،
       ويسلّم الواجهةَ حقيقةً بنيويّةً تُلزمها بمعرفةِ أسماءِ الverticals.

🥉 (ج) مفتاحٌ داخلَ Client.config
       صفرُ تغييرٍ في الكودِ الخادم (config يصل أصلاً)، وصفرُ كتابةٍ على التينانتاتِ القائمةِ
       لأنّ تينانتَ العيادةِ لم يُخلَق بعد. وثمنُه: حقيقةٌ بنيويّةٌ في مكانٍ يملكه التينانت (`ARCH:257`).

❌ (د) الاستنتاجُ من active_services أو service_type أو عدِّ /barbers
       مُسقَطٌ بالقياس: C-6 و C-4.
```

**والقرارُ قرارُك.** ولا سطرَ كودٍ في P5-D قبله.

### وسؤالٌ واحدٌ يلزم مع (أ) أو (ب)

اسمُ المفتاح وقيمتُه للتينانتاتِ الخمسةِ ذاتِ `vertical=NULL`: هل `"barber"` (توافقٌ خلفيٌّ صامت)،
أم `null` صريحةٌ تعني «أكمِل كما كنتَ» (توصيتي — فتبقى الصراحةُ في الاسمِ لا في السلوك)؟

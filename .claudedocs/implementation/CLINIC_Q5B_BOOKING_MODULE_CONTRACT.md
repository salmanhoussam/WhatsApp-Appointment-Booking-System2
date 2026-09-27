# ق-٥-ب — عقدُ `booking_module` · الخادمُ يشتقّ، والواجهةُ تستقبل

**التاريخ:** ٢٠٢٦-٠٩-٢٧ · **الحالة:** 🟡 **مقترَحٌ — ينتظر إقرارَ سلمان. ولا يأذن بـP5-D.**
**القرارُ الذي ينفّذه:** ق-٥-ب = الخيار (أ) · و`vertical=NULL` ⇒ `booking_module=null`، **ولا تُقهَر إلى `"barber"`** (سلمان، ٢٠٢٦-٠٩-٢٧).
**الدليلُ الذي بُني عليه:** `.claudedocs/work/clinic-q5b-vertical-resolution/2026-09-27/summary.md`
**البوّابة:** 🔴 `PRODUCTION GATE: CLOSED` · وهذا العقدُ **لا يكتب صفّاً** ولا يحتاج تينانتاً.

> **لماذا عقدٌ قبل الكود.** لأنّ سلمان نصَّ: «null ليست بحدِّ ذاتها تعريفاً لسلوكِ الـfrontend …
> ما منخترع هالسلوك ضمن P5-D». فسلوكُ `null` يُقَرُّ **هنا**، لا يُستنبَط هناك.

---

## §١ — السلسلةُ المُقَرّة

```
Client.vertical  →  VERTICAL_REGISTRY  →  booking_module  →  /config  →  الواجهة  →  ReservationIn.module_key
        (الخادم، عند كلِّ عرض)                                          (تستقبل، لا تشتقّ)
```

**وليس:** `frontend → Client.vertical → تخمينُ الموديول`.

وهذا ينفّذ `ALZABT_VERTICAL_REGISTRY_ARCHITECTURE.md:255` حرفيّاً («Staff Model choice … Derived,
and stays derived … every render») **دون** خرقِ `:26` (الواجهةُ لا تلمس الـRegistry) ولا خرقِ
`schema.prisma:106-108` (`vertical` لا يُقرَأ وقتَ العرضِ **في الواجهة** — الخادمُ يقرأه، وهو
صاحبُه).

---

## §٢ — كيف يحلُّ الخادم: حقلٌ صريح، لا اسمٌ مُصادَف

### ق-ب-١ · الحلُّ بحقلٍ في الـRegistry

```python
VERTICAL_REGISTRY = {
    "barber": { ..., "booking_module": "barber"  },
    "clinic": { ..., "booking_module": "clinic", "staff_backing_model": "Resource" },
}

resolve_booking_module(vertical) -> str | None:
    entry = get_vertical(vertical)          # None لكلتا حالتَي get_vertical الموثَّقتين
    return entry.get("booking_module") if entry else None
```

**ولماذا حقلٌ صريحٌ ولا واحدٌ من البديلين المُغرِيَين:**

```
❌ echo لاسمِ الـvertical  (booking_module = vertical)
   يصحّ اليومَ بالمصادفةِ وحدَها (barber→barber · clinic→clinic)، وهو حرفيّاً «dispatch by
   vertical name» الذي يمنعه ALZABT_UNIFIED_PROVISIONING_CONTRACT_FINAL.md:113 بنصِّه.

❌ الاشتقاقُ من staff_backing_model  ("Resource" ⇒ "clinic")
   **غيرُ تقابليّ** — أيُّ vertical مستقبليٍّ مدعومٍ بـResource (مغسلةُ سيّارات، مختبر) يكسره
   في الحالةِ الثانية. والدالّةُ التي تصحّ لحالةٍ واحدةٍ ليست اشتقاقاً، هي مصادفةٌ ثانية.
```

### 🛑 ق-ب-٢ · وهذا الحقلُ **يوسّع قائمةً بيضاءَ مُقَرّة** — قرارٌ مطلوبٌ صريحاً

`app/core/verticals.py:20` يحمل حدَّ ملكيّةٍ مكتوباً:

```
ALLOWED:  default_services (list[str]), page_template (str | None), staff_backing_model (str | None)
NEVER:    procedural logic, per-tenant overrides, Reservations engine internals, section
          content/labels, anything that varies per-tenant
```

⇒ إضافةُ `booking_module` **تعديلٌ لهذا النصّ**، فهي رابعُ حقلٍ في قائمةٍ صريحةٍ من ثلاثة.
**وحجّتي أنّها مقبولةٌ بروحِ النصِّ لا خارجَها:** `booking_module` اسمُ موديولٍ، لا «Reservations
engine internals» (تلك منطقُ التعارضِ والشِّقوقِ والمدد). و`staff_backing_model` نفسُه يسمّي مفهوماً
من عالمِ الحجز (Barber مقابل Resource)، فالسابقةُ قائمة. وهو ثابتٌ للـvertical، **لا يتغيّر
بالتينانت** — فيمرّ بشرطِ `NEVER` الأخير.

**لكنّه تعديلُ عقدٍ (STOP-4)، فلا أُجريه بلا كلمتِك.** والبديلُ إن رفضتَه: خريطةٌ في نطاقِ الحجز
بدلَ الـRegistry — وثمنُها **خريطةٌ ثالثةٌ** يجب أن تبقى في تناسقٍ يدويٍّ مع
`RESOURCE_BACKED_MODULE_KEYS` و`MODULE_KEY_TO_RESOURCE_TYPE` (وهما أصلاً في ملفّين)، وهو داءُ
التكرارِ الذي حذفنا منه شجرتين في هذه الجلسةِ نفسِها. **توصيتي: الحقلُ في الـRegistry.**

### ق-ب-٣ · شرطٌ سابقٌ لا يُتجاوَز

**لا مدخلَ `clinic` في `VERTICAL_REGISTRY` اليومَ** (٦٦ سطراً · مفتاحٌ واحد `barber`).
فـ`get_vertical("clinic")` ⇒ `None`، وهذا يعني أنّ العيادةَ **ستُحَلّ `null`** حتّى لو نُفِّذ كلُّ
ما في هذا العقد. ⇒ مدخلُ `clinic` شرطٌ سابقٌ لأوّلِ سطرٍ نافعٍ في P5-D، ومحتواه:

```python
"clinic": {
    "default_services":    ["reservations"],        # ← عقدُ التينانتِ §٢ حرفيّاً، لا أكثر
    "page_template":       None,                    # غيرُ مبنيٍّ — لا يُشار إلى ملفٍّ غيرِ موجود
    "staff_backing_model": "Resource",
    "booking_module":      "clinic",
}
```

🔴 **وأثرٌ جانبيٌّ يجب أن يُقَرَّ لا أن يُكتَشَف:** وجودُ المدخلِ يجعل
`provision_vertical_domain_objects()` **يتوقّف عن رفعِ** `BusinessLogicError: Unsupported vertical`
لعيادةٍ — وهو السلوكُ المسجَّلُ في `CLINIC_TEST_TENANT_CONTRACT.md:31` كحالةٍ معروفة. وقارئُ
`staff_backing_model` الوحيدُ اليومَ هو `provisioning_service.py:207`، والعقدُ الموحَّدُ يقول: لا
تطبيقَ لـ`staff_backing_model="Resource"` ⇒ `BusinessLogicError` مختلفٌ (`:223`). ⇒ **لا يصير
التجهيزُ الآليُّ للعيادةِ عاملاً بهذا المدخلِ وحدَه**، ولا يُدَّعى ذلك.

---

## §٣ — معنى `null`: حالتان في الخادم، وسلوكٌ واحدٌ في الواجهة

`booking_module: null` تعني **«الخادمُ لم يستطع حسمَ موديولِ حجزٍ لهذا التينانت»** — ولها سببان
مختلفان، يوثّقهما `get_vertical` في docstringه بنفسِه:

| السبب | المعنى | الشدّة |
|---|---|---|
| `vertical IS NULL` | لم يُخصَّص بعد — حالُ **٥ من ٩** صفوفٍ اليومَ (قراءةُ إنتاجٍ، ٢٠٢٦-٠٩-٢٧) | 🟢 حالةٌ شرعيّةٌ قائمة |
| `vertical` مضبوطٌ ولا مدخلَ له | مطبعةٌ أو vertical غيرُ مسجَّل | 🔴 **عطبُ تجهيز** |

### ق-ب-٤ · الحمولةُ تجمعهما، **والخادمُ يفرّقهما** — وهذا شرطٌ لا تحسين

الواجهةُ تحتاج سلوكاً واحداً، فمفتاحٌ واحدٌ يكفيها. **لكن جمعَهما بلا أثرٍ في الخادم يُعيد إنتاج
الخطيئةِ التي وجدها التحقيقُ نفسُه** (مصفوفةٌ فارغةٌ تحمل معنيين). ⇒ يلزم:

```
الحالةُ الأولى (NULL)      لا تُسجَّل — حالةٌ عاديّةٌ لخمسةِ تينانتات، والتسجيلُ ضجيج
الحالةُ الثانية (مجهول)    🔴 تُسجَّل WARNING تحمل الـslug والقيمةَ غيرَ المعروفة
```

فتبقى «عيادةٌ بـvertical مطبوعٍ خطأً» **مرئيّةً** بدلَ أن تتنكّر في زيِّ تينانتٍ قديم.

### ق-ب-٥ · وسلوكُ الواجهةِ عند `null` — **مقيسٌ من الحاضر، لا مخترَع**

`ReservePage.jsx` هي **المستهلكُ الوحيدُ** للهوك (مقيسٌ: `grep` ⇒ موضعٌ واحدٌ يستورده)، وهي
**صفحةٌ واحدةٌ بمفتاحِ أنماط** (`:972-1035`):

```
configLoading || mode==='loading'   →  نقطةُ تحميل
!hasReservations                    →  «الخدمةُ غيرُ متاحة»
mode==='error'                      →  خطأٌ + إعادةُ محاولة
mode==='booking'                    →  <BookingPage>   ⇒ الهوك يرسل module_key:'barber'  (:277)
غيرُ ذلك (legacy)                    →  <LegacyPage>    ⇒ يرسل 'restaurant' أو 'services'  (:853)
```

**والحقيقةُ الحاسمةُ:** `module_key:'barber'` لا يُرسَل إلّا داخلَ `BookingPage`، أي **إلّا إذا
كانت `barbers.length > 0`** — أي إلّا لتينانتٍ يحمل صفوفَ `Barber` حقيقيّة. والتينانتاتُ الخمسةُ
ذاتُ `vertical=NULL` لا تحمل أيّاً منها، **فهي تصل `<LegacyPage>` اليومَ فعلاً.**

```
⇒ ق-ب-٥:  booking_module === null   ⇒   <LegacyPage> كما هي، بلا أيِّ تغيير
           و<LegacyPage> تُبقي اشتقاقَها الحاليَّ من active_services (restaurant/services) كما هو.
           ⇒ **صفرُ تغييرٍ في السلوكِ للتينانتاتِ الخمسة.** وهذا ليس اختياراً محافظاً،
             هو وصفُ ما يحدث اليومَ — قيسَ ولم يُفترَض.
```

**و`null` لا تعني «barber» ولا تعني «legacy» كقرارِ منتج** — تعني «غيرُ محسوم»، وسلوكُها المُقَرُّ
هو الإبقاءُ على المسارِ القائمِ الذي تسلكه تلك التينانتاتُ أصلاً.

### 🛑 ق-ب-٦ · حالةٌ جديدةٌ يخلقها هذا العقدُ، وتحتاج قرارَك

بمجرّدِ وجودِ `booking_module`، يصير ممكناً أن نعرف: **«هذا تينانتُ حلاقٍ، ولا موظّفَ فيه»**
(`booking_module === 'barber'` مع `barbers.length === 0`). اليومَ يسقط هذا في `<LegacyPage>`
لأنّ العدَّ وحدَه كان الحاكم.

```
(أ) 🟢 يبقى <LegacyPage> — صفرُ تغيير، ويؤجّل السؤال          ← توصيتي
(ب) شاشةُ «لا موظّفين بعد» — أصدقُ، لكنّه تغييرُ سلوكٍ خارجَ نطاقِ ق-٥-ب
```

**ولا تقع هذه الحالةُ على أيِّ تينانتٍ حيٍّ اليومَ** — الأربعةُ كلُّها تحمل حلاقين (rk 2 ·
barberlab-test 2 · mr-h 2 · alzabt-demo 2). فهي احتمالٌ لتينانتٍ جديد، لا عطبٌ قائم.

### ق-ب-٧ · والمبدأُ الذي يجعل هذا العقدَ إصلاحاً لا إضافة

```
🔴 بعد هذا العقد، «أيُّ مسارِ حجزٍ نعرض» يُقرَّر من booking_module — **لا** من عدِّ مصفوفة.
   و barbers.length يعود إلى معناه الوحيدِ الصحيح: **هل يوجد موظّفون**، لا **أيُّ vertical هذا**.
```

وهذا يقتل الفشلَ الصامتَ الذي وجده التحقيق: عيادةٌ لن تسقط في نموذجِ الحلاقِ القديم، لأنّ القرارَ
لم يبقَ مبنيّاً على `[]`.

---

## §٤ — الشكلُ النهائيُّ لـ`/config`

مفتاحٌ **واحدٌ** يُضاف إلى `_record_to_dict` (`app/services/public_service.py:216-240`، وقارئُها
**واحدٌ**: `:358`):

```diff
  "page_type":       getattr(record, "pageType",    "normal"),
  "template_key":    getattr(record, "templateKey", None),
+ "booking_module":  resolve_booking_module(getattr(record, "vertical", None)),   # str | null
```

```
الاسم       booking_module         ← بنصِّ قرارِ سلمان، لا اسمٌ آخر
النوع       string | null
القيمة      قيمةٌ يقبلها ReservationIn.module_key حرفيّاً — أو null
❌ ولا يُضاف `vertical` نفسُه إلى الحمولة. أبداً. هذا نصفُ القرار.
```

**وثلاثةُ حدودٍ صريحة:**

```
١  الحمولةُ لا تكبر بغيرِ هذا المفتاح — لا staff_endpoint ولا resource_type ولا vertical
٢  <LegacyPage> لا تتغيّر: اشتقاقُها من active_services يبقى كما هو (§٣ ق-ب-٥)
٣  DEFAULT_CONFIG في useTenantConfig.js يحمل `booking_module: null` صريحةً — وإلّا صار
   **سلوكُ فشلِ الشبكةِ** هو سلوكَ الحلاقِ ضمناً (S-3 في ملفِّ الدليل)
```

والكاشُ ليس خطراً: `_PUBLIC_CONFIG_CACHE_TTL = 30.0` ثانية (`public_service.py:323`).

---

## §٥ — بوّاباتُ القبول · تُقاس، لا تُوعَد

```
T-ب-١  لكلِّ مدخلٍ في VERTICAL_REGISTRY: قيمةُ booking_module المُعلَنةُ **يقبلها** مسارُ الإنشاء
       فعلاً — فحصٌ يمرّ بالقيمةِ إلى create_reservation، لا تأكيدٌ على سمةِ dict.
       🔴 وهذه البوّابةُ هي التي تمنع «حقلاً يقول clinic» ومسارَ الإنشاءِ لا يعرفها.
T-ب-٢  vertical=NULL ⇒ booking_module IS null  ·  وvertical مجهولٌ ⇒ null **مع** سطرِ WARNING
       (يُقاس السطرُ، لا يُفترَض)
T-ب-٣  صفرُ تغييرٍ في حمولةِ /config لتينانتٍ قائم **إلّا** المفتاحَ الجديد — يُقاس بمقارنةِ
       المفاتيحِ قبل/بعد، ضبطاً موجَباً وسالباً
T-ب-٤  الحزمُ الـ1364 تبقى خضراءَ، والإخفاقاتُ **٨** بنفسِ المجموعة (Slice 4) — لا تُمَسّ
T-ب-٥  صفرُ ظهورٍ لكلمةِ `vertical` في `frontend/src/` كحقلِ بيانات (الـ٩٤ نتيجةُ CSS تبقى ٩٤)
T-ب-٦  خطُّ الأساس: `module_key:'barber'` لا يبقى حرفاً ثابتاً في الهوك — TRANSITION تسمّي
       قيمتَها القديمة (`feedback_invariant_vs_transition_tests`)
```

---

## §٦ — النطاق

```
✅ داخلَ النطاق   حقلُ booking_module في الـRegistry (بإقرارِ ق-ب-٢) · مدخلُ clinic (ق-ب-٣)
                  · دالّةُ الحلّ · مفتاحٌ واحدٌ في /config · booking_module في DEFAULT_CONFIG
                  · وبوّاباتُ §٥

❌ خارجَ النطاق    أيُّ سطرٍ في P5-D أو P5-E  ·  أيُّ تغييرٍ في <LegacyPage>  ·  ClinicReservePage
                  توأماً (ممنوعةٌ أصلاً)  ·  تجهيزُ العيادةِ الآليُّ (§٢ ق-ب-٣)  ·  إنشاءُ أيِّ
                  تينانت  ·  الـ٥٥ موضعَ data.detail  ·  service_type (مُسقَطٌ بالقياس)
                  ·  حالةُ «حلاقٌ بلا موظّفين» (ق-ب-٦ ينتظر قرارَك)
```

---

## §٧ — ما لا يأذن به هذا العقد

```
🔴 لا يأذن ببدءِ P5-D. الإقرارُ على هذه النقاطِ شرطٌ، ثمّ P5-D بأمرٍ مستقلّ.
🔴 لا يفتح البوّابةَ الإنتاجيّة، ولا يحتاج cliniclab-test، ولا يكتب صفّاً.
🔴 ولا يعدّل verticals.py ولا public_service.py قبل إقرارِ ق-ب-٢ صريحاً (STOP-4).
```

## §٨ — القراراتُ المطلوبةُ منك، مرقَّمةً

```
ق-ب-٢   حقلُ booking_module في VERTICAL_REGISTRY — أوافق على توسيعِ قائمةِ ALLOWED؟
        (البديلُ: خريطةٌ ثالثةٌ في نطاقِ الحجز — لا أوصي بها)
ق-ب-٣   مدخلُ clinic بالمحتوى المقترَحِ أعلاه؟
ق-ب-٦   «حلاقٌ بلا موظّفين» ⇒ (أ) يبقى LegacyPage 🟢 أم (ب) شاشةٌ صريحة؟
        وإن كانت (ب) فنصُّها العربيُّ نصُّك، لا نصّي (rules/text-context-rule.md)
```

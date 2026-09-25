# Clinic P3 — Gate Report · Service Booking Contract

**التاريخ:** ٢٠٢٦-٠٩-٢٥ · **العقد:** [`implementation/CLINIC_P3_SERVICE_MOTIF_CONTRACT.md`](../implementation/CLINIC_P3_SERVICE_MOTIF_CONTRACT.md)
**الحالة:** ✅ **نُفِّذ** · ⏸️ **غيرُ مُودَع — لا commit ولا push ولا deploy**

---

## §١ — ما نُفِّذ

| | |
|---|---|
| **Schema** | `CatalogService.instructions` (`String?`) · `CatalogService.bookableBy` (`String @default("patients")`) |
| **الإنفاذ** | `PATIENT_FACING_SOURCES = frozenset({"website","whatsapp"})` · فرعٌ واحدٌ في `create_reservation` |
| **الإسقاط** | `_fmt` يعرض الحقلين — المسارُ الإداريُّ والعامُّ يقرآن الشكلَ نفسَه |
| **الكتابة** | `admin_create_service` · `admin_update_service` · وجسما الطلب في `admin/catalog_services.py` |
| **الفحوص** | `scripts/test_clinic_service_motif.py` — ٢١ فحصاً · الإجماليّ **١٠٧٣** |

### 🔒 ما لم يُمَسّ

```
Patient · PatientContact · Customer · Barber · Resource · Lia
أيُّ دالّةِ توفّر · أيُّ route حجوزات · أيُّ واجهة · VERTICAL_REGISTRY
و`patient_category` غيرُ موجودٍ في الـschema إطلاقاً — «مؤجَّل» تعني غائباً لا مخفيّاً (مفحوص)
```

**ولا قناةَ واتساب — مقيساً (قرار سلمان، ٢٠٢٦-٠٩-٢٥):**

```
ملفّاتُ واتساب التي لمستها P3        : صفر
أسطرٌ تذكر زرّاً أو قائمةً أو قالباً   : صفر
```

تدفّقُ العيادة على واتساب وأزرارُه مكانُهما **P6**، فوق أربعةِ عقودٍ ثابتة — وبناؤها الآن يعني
إعادةَ كتابتها مع كلّ قرارٍ في P4/P5. والتمييزُ المُثبَّت في عقد P3: **القالبُ** رسالةٌ استباقيّةٌ
إلى التاجر خارجَ المحادثة، و**الأزرارُ** داخلَ محادثةٍ قائمة — ولا يُضاف قالبٌ من أجل أزرار.

---

## §٢ — SM-1…SM-10 خضراء

| # | ما أُثبت |
|---|---|
| **SM-1** | خدمةٌ لم تسمع بالعمودين **تحجز حرفيّاً كما أمس** — وهو الانحدارُ الذي يخصّ ٣٨ خدمةً حيّة |
| SM-2 · SM-3 | `staff_only` + `website` / `whatsapp` ⇒ **رفض** |
| SM-4 · SM-5 | `staff_only` + `admin` / `lia` ⇒ **تمرّ** — المالكُ ليس مريضاً |
| **SM-6** | `staff_only` + `source=None` ⇒ **تمرّ** · و**SM-6b** قناةٌ غيرُ موجودةٍ بعد ⇒ **تمرّ** |
| SM-7 | `patients` تمرّ من القنوات الأربع |
| **SM-10** | قيمةٌ مكتوبةٌ خطأً («patiints») ⇒ **تحجز** لا تُغلِق العيادة بصمت |
| SM-8 · SM-8b | الحقلان على الإسقاط · وصفٌّ يسبقهما يُقرأ `NULL`/`patients` لا انهياراً |
| SM-9…SM-9d | **AST:** الإنفاذُ في موضعٍ **واحد** · صفرُ نسخةٍ في route · القائمةُ `frozenset` في الكود · والقراءةُ دفاعيّةٌ بـ`getattr` |

**و SM-6/SM-6b هما ما يجعل اتّجاه القائمة قياساً لا نيّةً:** اتّفقنا على قائمة **سماحٍ للخضوع**،
وهاتان الحالتان تثبتان أنّها كذلك فعلاً — قناةٌ لم تُذكَر **لا تُقيَّد**.

---

## §٣ — الهجرة

**الخَرج:** `.claudedocs/work/clinic-preflight/2026-09-25/db-06-p3-migration.txt`

```
جملةٌ واحدة، إضافيّة ومراجَعة — صفر DROP / TRUNCATE / DELETE

BEFORE · customers=10 · reservations=66 · catalog_services=38 · العمودان: []
AFTER  · customers=10 · reservations=66 · catalog_services=38

🔒 CUSTOMER untouched · rows 10 -> 10                : True
🔒 CUSTOMER unique index identical                    : True
   catalog_services rows 38 -> 38                     : True
   column bookable_by   text  nullable=NO   default='patients'::text
   column instructions  text  nullable=YES  default=None
   rows carrying anything but the default (0)         : True  (ZERO backfill)
```

**والسطرُ الأخيرُ هو الادّعاءُ كلُّه:** «صفرُ تغييرٍ سلوكيّ» لم يُقَل، بل قُرئ — **صفرُ صفٍّ**
من الثمانيةِ والثلاثين يحمل شيئاً غيرَ الافتراضيّ.

---

## §٤ — الانحدار: ١٠٧٣ فحصاً

| | |
|---|---|
| t4 250 · daily_log 197 · foundation 104 · s3 102 · s7 92 | ✅ |
| first_message 49 · matcher 49 · draft 46 · baseline 33 | ✅ |
| patient_identity 31 · **service_motif 21** 🆕 · t5 29 · t3b 28 · t1 23 · s1 19 | ✅ |
| **المجموع** | **١٠٧٣** (كان ١٠٥٢) · و`app` يستورد بنجاح |

### TRANSITION مُعلَنة — وهي الثانيةُ على التوكيد نفسِه

`test_reservation_contract_baseline.py` كان يثبّت **«لم يتغيّر أيُّ route»**. وP3 يعدّل
`admin/catalog_services.py` — وهو route لقدرةٍ **أخرى** (الخدمات)، يمرّر حقلين جديدين إلى خدمته،
ولا يقول شيئاً عن الحجوزات.

ضُيِّق إلى **«لم يتغيّر أيُّ route حجوزات»** — وهو ما كان يعنيه: العقدُ يتحرّك **دون أن يتحرّك
معه مسارُ حجز**، فيبقى حارسُ الماضي مكرَّراً في المسارات عن قصد. والقيمةُ القديمة مذكورةٌ في
الملاحظة، ومعها أنّ هذا **تضييقُه الثاني** (الأوّل في S7، للسبب نفسِه: كان يثبّت لقطةَ diff لا
خاصّيّة).

**والنصفُ الأقوى في مكانٍ آخر:** `SM-9b` يثبت أنّ **لا route يحمل نسخةً من قاعدة العقد أصلاً**.

---

## §٥ — Unknowns

| ID | الحالة |
|---|---|
| **P3-U1** 🆕 | `bookable_by='staff_only'` **لم يُستعمَل على صفٍّ حقيقيّ بعد** — ٣٨ خدمةً كلُّها `patients`. مُثبَتٌ بحزمٍ محلّيّة، وأوّلُ استعمالٍ حقيقيٍّ في P5/P6 |
| **P3-U2** 🆕 | **لغةُ الرفض إنكليزيّة** وتصل الزبون عبر 409 — عرفٌ قائمٌ في `create_reservation` كلِّه، لا من صنع P3. توحيدُ اللغة **دَينٌ تقنيٌّ مفتوحٌ بقرارك**، يُحَلّ مركزيّاً لا ترقيعاً هنا |
| **U3** | أين تسكن نوافذُ الحجز (الخدمة أم المورد) — C2.4 |
| **U4** | تعريفُ «مريضٍ معروف» — شرطُ دخول `patient_category` |
| P1-U1 · P2-U1 · U2 · PRE-1 | كما هي |

---

## §٦ — التراجع

```
ALTER TABLE catalog_services DROP COLUMN bookable_by, DROP COLUMN instructions;
+ git revert
```
**صفرُ فقدانِ بيانات** — لم يُكتب شيءٌ غيرُ الافتراضيّ على أيّ صفّ (مقيس).

---

## §٧ — الحالة

```
✅  P3 منفَّذة · SM-1…SM-10 خضراء · ١٠٧٣ فحصاً · صفرُ تغييرٍ سلوكيٍّ مقيس
✅  Customer مُثبَتٌ أنّه لم يُمَسّ للمرّة الثالثة — عدّاً وقيداً
⏸️  صفرُ commit · صفرُ push · صفرُ deploy
🔴  `staff_only` بلا صفٍّ حقيقيٍّ بعد — مُعلَن، لا مطويّ
```

# Clinic P2 — Gate Report · Patient Identity Foundation

**التاريخ:** ٢٠٢٦-٠٩-٢٥ · **العقد:** [`implementation/CLINIC_P2_PATIENT_IDENTITY_CONTRACT.md`](../implementation/CLINIC_P2_PATIENT_IDENTITY_CONTRACT.md)
**الحالة:** ✅ **نُفِّذ** · ⏸️ **غيرُ مُودَع — لا commit ولا push ولا deploy**

---

## §١ — ما نُفِّذ

| | |
|---|---|
| **Schema** | `patients` · `patient_contacts` · `Reservation.patientId` (قابلٌ للإفراغ) · **FK حقيقيٌّ على `patient_contacts.client_id`** |
| **Repository** | `app/repositories/patient_repo.py` — سبعُ دوالّ، **كلُّها تأخذ `client_id` وتضعه في الـ`where`** |
| **Service** | `app/services/patient_service.py` — مسارُ الكتابة الوحيد · الكاشفُ الحتميّ · `PatientAccessDenied` |
| **Reservation** | `patient_id` بارامترٌ خامس keyword-only، افتراضُه `None` |
| **Boundary** | **MD-1** فحصٌ حقيقيّ: صفرُ حقلٍ سريريٍّ في النموذجين والكودِ معاً |
| **الفحوص** | `scripts/test_clinic_patient_identity.py` — ٣١ فحصاً · والإجماليُّ **١٠٥٢** |

### 🔒 ما لم يُمَسّ — وهو المطلوبُ إثباتُه لا ادّعاؤه

```
Customer   صفرُ عمود · صفرُ قيد · صفرُ صفّ · و@@unique([clientId, phone]) كما هو
Barber · rk · Lia · WhatsAppConversation · WALK_IN · أيُّ دالّةِ توفّر · VERTICAL_REGISTRY
أيُّ route · أيُّ واجهة · أيُّ عمليّةِ Lia
```

---

## §٢ — بوّابةُ الهويّة: IG-1…IG-11 خضراء

| # | ما أُثبت |
|---|---|
| IG-1 | الـContact يحجز لنفسه ⇒ **هو** المريض، `role=self` |
| IG-2 | الأمّ تحجز لابنها ⇒ المريضُ **الابن**، والـContact **الأمّ**، `role=guardian` |
| IG-3 | طفلان على contact واحد ⇒ **مريضان متمايزان**، والـcontact نفسُه |
| IG-4 | المريضُ نفسُه من رقمٍ ثانٍ ⇒ **صفرُ صفِّ مريضٍ جديد** · و**IG-4b** إعادةُ الربط حقيقةٌ لا استثناء |
| IG-5 | contact بعدّة مرضى ⇒ **لا دمج** |
| IG-9 | اسمٌ مطويٌّ مكرَّر ⇒ **يُبلَّغ، ولا يُدمَج** · و**IG-9b** الصفُّ الثاني كُتب فعلاً — الكاشفُ لا يمنع كتابة |
| IG-10 | مرشَّحٌ **واحد** يبقى **سؤالاً**، لا افتراضاً · و**IG-10b** اسمٌ مجهول ⇒ `none` |
| IG-11 | مريضٌ **بلا contact** حالةٌ صحيحة، لا خطأ |
| IG-cross | اسمٌ معروفٌ لـcontact آخر **غيرُ مرئيٍّ هنا** — لا مطابقةَ عابرة |

**IG-6 · IG-7 · IG-8 مُثبَتةٌ بنيويّاً** — وهي الشكلُ الأقوى لها، لأنّها كلُّها «لم يحدث شيء»:

```
IG-6  صفرُ backfill        ← قُرئ من الإنتاج: patient_id IS NULL على ٦٦/٦٦، وpatients فارغ (٠)
IG-7  WALK_IN لا يُقرأ     ← فحصُ AST على الكود المنزوعِ منه التوثيق: السلسلة غائبة
IG-8  المحادثة لا تُقيَّد   ← P2 لا تلمس WhatsAppConversation إطلاقاً
```

---

## §٣ — القواعدُ الخمس، **كوداً لا نيّةً**

```
R2  المطابقةُ تقرأ قائمةَ contact واحدٍ، ولا تلمس قائمةَ التينانت      PASS
R3  الكاشفُ لا يكتب شيئاً                                             PASS
R4  لا تسامحَ بحرفٍ واحد في الكود                                      PASS
R5  لا قراءةَ ولا تحويلَ لصفِّ Customer                                PASS
R5b الـWALK_IN لا يُقرأ في الكود                                       PASS
    وكلُّ دالّةِ مستودعٍ تأخذ client_id وتضعه في الـwhere              PASS
```

### 🔴 وملاحظةٌ على منهج الفحص نفسِه

أربعةٌ من هذه الفحوص **فشلت أوّلَ تشغيل، وكان الفشلُ صحيحاً**: كنتُ أفحص **نصَّ الملفّ** لا
**الكود**، فوجد البحثُ `_within_one_edit` و`WALK_IN` داخل **التوثيقِ الذي يشرح غيابَهما** —
ونجح لسببٍ خاطئ. وهذا كسرٌ لقاعدةٍ قائمةٍ في هذا المشروع نفسِه («assert on code, not text»،
مسجَّلةٌ بعد ثلاث حالاتٍ في جلسةٍ واحدة). أُصلحت بنزع الـdocstrings عبر AST قبل الفحص، وبقراءة
**أسطر الحقول** فقط في `schema.prisma` بدل الكتلةِ التي تحوي تعليقَ الحدّ الطبّيّ.

---

## §٤ — الأمن

```
SEC-1   هويّةُ مريضٍ من تينانتٍ آخر ⇒ لا شيء، بالـwhere clause                 PASS
SEC-1b  والمعرّفُ نفسُه تحت تينانتٍ آخر يُسمّى `patient_not_found_in_tenant`    PASS
SEC-3   مريضٌ حقيقيٌّ يصل إليه contact لا يملكه ⇒ رفضٌ باسمِه                   PASS
        `patient_not_linked_to_contact` — وهو ما لا يُستنتَج من وجودِ المريض   
SEC-3b  حالةُ الموظّف (بلا contact) تمرّ على ملكيّة التينانت وحدَها             PASS
```

`PatientAccessDenied` يُرفَع **كما هو** ولا يُسطَّح إلى `ValueError` — مرآةُ
`ReservationAccessDenied` القائم: المسارُ يحوّله إلى ٤٠٣ حقيقيّ، بينما `ValueError` مفرداتُ
«هذا الوقت لا يصلح». ولا شيء يستطيع رفعَه اليوم: **لا مُنادٍ في `app/` يمرّر `patient_id`** —
مُثبَتٌ بفحص.

---

## §٥ — الهجرة: الدليل الكامل

**الخَرج:** `.claudedocs/work/clinic-preflight/2026-09-25/db-05-p2-migration.txt`

```
١٤ جملة، كلُّها إضافيّة ومراجَعة — صفر DROP / TRUNCATE / DELETE / UPDATE
   (وحارسُ السكربت رفض أوّلاً «ON DELETE SET NULL»، فضُيِّق بالشكل لا بتوسيع القائمة)

BEFORE · customers=10 · reservations=66 · الجدولان الجديدان: []
AFTER  · customers=10 · reservations=66 · الجدولان الجديدان: [patient_contacts, patients]

🔒 CUSTOMER untouched · rows 10 -> 10                        : True
🔒 CUSTOMER unique index identical                            : True
   reservations rows 66 -> 66                                 : True
   patient_id IS NULL on 66/66 rows (NO backfill)             : True
   patients / patient_contacts created and EMPTY (0/0)        : True
```

**والسطران المقفلان بالقفل هما عقدُ P2 كلُّه:** وعدنا ألّا نلمس `Customer`، والوعدُ ليس دليلاً —
فقُرئ عددُ صفوفِه **وتعريفُ قيدِ التفرّد نفسُه** قبل وبعد، وقورنا حرفاً بحرف.

**الـschema أمامَ الكود الآن** (الجدولان موجودان والكودُ غيرُ منشور). خاملٌ تماماً: عمودٌ
`NULL` في كلّ صفّ، وجدولان فارغان، ولا مُنادٍ واحد.

---

## §٦ — الانحدار: ١٠٥٢ فحصاً

| الحزمة | PASS |
|---|---|
| t4 250 · daily_log 197 · foundation 104 · s3 102 · s7 92 | ✅ |
| first_message 49 · matcher 49 · draft 46 | ✅ |
| **clinic_patient_identity 31** 🆕 · **baseline 31** · t5 29 · t3b 28 · t1 23 · s1 19 | ✅ |
| **المجموع** | **١٠٥٢** (كان ١٠٢١ قبل P2) |

**TRANSITION مُعلَنة:** `test_reservation_contract_baseline.py` كان يثبّت «أربعةُ بارامترات» و
قاموسَ الافتراضات؛ صارا خمسةً بـ`patient_id: None`. القيمةُ القديمة مذكورةٌ في الملاحظتين
صراحةً — قاعدةُ INVARIANT مقابل TRANSITION.

**و`app` يستورد بنجاح** — مفاتيحُ النصوص والنماذجُ الجديدة تُحمَّل.

---

## §٧ — Unknowns

| ID | الحالة |
|---|---|
| **P1-U1** | 🔴 سباقُ المورد غيرُ مُثبَتٍ حيّاً — كما هو. يُغلَق في P4/P6 |
| **P2-U1** 🆕 | **لا مُنادٍ حقيقيٌّ لطبقة المريض بعد.** مُثبَتةٌ بالكامل بحزمٍ محلّيّة، وصفرُ صفٍّ حقيقيّ. أوّلُ استعمالٍ حقيقيٍّ في **P5/P6** — ولا يُقال «مُثبَتةٌ حيّاً» قبلها |
| **U2** | ماذا تحتاج عيادةٌ حقيقيّة — يخصّ `date_of_birth` المستبعَد وC2.3 |
| **PRE-1** | حزمتان فاشلتان على HEAD، خارج النطاق |

---

## §٨ — التراجع

```
١  الكفُّ عن تمرير patient_id                    صفرُ أثر (لا مُنادِيَ أصلاً)
٢  git revert للكود                              صفر
٣  ALTER TABLE reservations DROP COLUMN patient_id    صفر — كلُّ الـ٦٦ NULL
٤  DROP TABLE patient_contacts; DROP TABLE patients;  ← والجدولان فارغان الآن (0/0)
```

🔴 **وإن حملا صفوفاً يوماً: يُترَكان ويُوقَف المسار. لا تُحذَف بياناتُ مرضى في تراجع.**

---

## §٩ — الحالة

```
✅  P2 منفَّذة · IG-1…IG-11 خضراء · MD-1 · SEC · ١٠٥٢ فحصاً
✅  Customer مُثبَتٌ أنّه لم يُمَسّ — عدّاً وقيداً، قبل وبعد
✅  صفرُ backfill — ٦٦/٦٦ NULL، والجدولان فارغان
⏸️  صفرُ commit · صفرُ push · صفرُ deploy
🔴  طبقةُ المريض بلا مُنادٍ حقيقيٍّ بعد — مُعلَن، لا مطويّ
```

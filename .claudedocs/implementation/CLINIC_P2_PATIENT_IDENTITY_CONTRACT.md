# Clinic P2 — Patient Identity · Implementation Contract

**التاريخ:** ٢٠٢٦-٠٩-٢٥ · **الحالة:** ✅ **العقدُ مقفولٌ بحدوده، والقراراتُ الستّةُ محسومة** · ⏸️ **إذنُ التنفيذ لم يُعطَ — صفرُ كود، صفرُ schema**
**العقدُ الأمّ:** الخطّة §٢ · **C1** (مُقَرّ) · **بوّابةُ P1:** [`verification/CLINIC_P1_GATE.md`](../verification/CLINIC_P1_GATE.md) ✅

---

## §٠ — النطاق

### 🔒 P2 = **Patient Identity Foundation** — لا أكثر (سلمان، ٢٠٢٦-٠٩-٢٥)

**المبدأُ الحاكم، بكلماته:**

> **`Patient identity ≠ demographic profile`**
>
> الـPatient في P2 يحلّ سؤالين فقط: **مَن المريض؟** و**مَن صاحب/وسيلة التواصل؟**

**يشمل — حصراً:**

```
Patient
PatientContact
Reservation.patientId  (nullable)
FK صحيح مع tenant ownership
repository / service
قبول patient_id في reservation_service
medical-data boundary enforcement
tests + migration/rollback proof
```

**ولا يشمل — حصراً:**

```
Clinic booking flow        WhatsApp patient flow      website UI
doctor availability        appointment eligibility    Lia
Customer refactor          DOB                        medical records
```

### ما **لا** تفعله P2

| | يعود في |
|---|---|
| أيُّ route · أيُّ واجهة · أيُّ تبويب | P5 / P7 |
| تدفّقُ «لمين الموعد؟» على واتساب أو الموقع | P6 / P5 |
| حقولُ الـmotif · التوفّر · `ResourceService` | P3 / P4 |
| أيُّ عمليّةِ Lia جديدة | **أبداً في P2** — Lia مسيَّجةٌ على الحلاقة، والحلاقة لا تعرف المريض |
| أيُّ هجرةٍ لبيانات الحلاقة القائمة | **ممنوعٌ بنصّ C1.3** |

### 🔒 المجمَّد — مُعادٌ هنا لأنّه أخطرُ بندٍ في المرحلة

**«P2 لا يلزم أن تحلّ مشكلة Barber.» بنصّ أمره، ولا واحدٌ من هذه يُفتَح:**

```
❌  migration لـCustomer identity          ❌  نقل WhatsAppConversation
❌  تغيير Customer @@unique(clientId, phone) ❌  تعديل WALK_IN
❌  backfill للـPatients                    ❌  تعديل Lia
```

```
Customer            لا schema · لا فكَّ @@unique([clientId, phone]) · لا backfill · صفرُ صفٍّ يُلمَس
Barber · rk · Lia · أيُّ دالّةِ توفّر · VERTICAL_REGISTRY · WhatsAppConversation · WALK_IN
```

**P2 تبني طبقةَ Patient مستقلّةً فوق الواقع القائم — لا تصلحه ولا تهاجره.**

**و«صفرُ تحويلٍ تلقائيّ» ليس توصيةً بل فحصاً:** IG-6 يفشل إن صار `Customer` قائمٌ من الحلاقة
`Patient` بأيّ طريق.

---

## §١ — الشكلُ المقترَح

> أشكالٌ للمراجعة، **لم تُكتب في `schema.prisma`**.

### `patients`

| العمود | النوع | ملاحظة |
|---|---|---|
| `id` | uuid pk | الهويّةُ القانونيّة الوحيدة (C1.2) |
| `client_id` | uuid **FK → clients, Cascade** | عزلُ التينانت |
| `name` | text | المطابقةُ تتمّ في طبقة الخدمة بـ`_fold_ar`، لا في SQL |
| `is_active` | bool = true | تعطيلٌ لا حذف، كعرفِ المشروع |
| `created_at` · `updated_at` | timestamptz | |
| فهارس | `(client_id)` · `(client_id, is_active)` | |

**ولا عمودَ سريريٍّ واحد** — C5.1/C5.2، وهو فحصٌ لا نيّة (§٤، MD-1).

**🔒 و`date_of_birth` خارجٌ صراحةً (ق-٢-ج، سلمان ٢٠٢٦-٠٩-٢٥).** ليس تأجيلاً غامضاً بل قرارٌ
بسببٍ مكتوب: **الدليلُ الحاليُّ لا يُثبت أنّ تاريخ الميلاد مطلوبٌ لهويّةِ حجزٍ ولا لأيّ تدفّقٍ
نبنيه الآن.** وإضافةُ حقلٍ شخصيٍّ/طبّيٍّ إلى جدولٍ سيحمل مرضى حقيقيّين **لمجرّد احتمالِ
استعماله** توسيعٌ للعقد قبل الحاجة. ولو ظهرت حالةُ استعمالٍ حقيقيّة، فقرارٌ مستقلٌّ بعقدٍ خاصّ.

> وهذا يُبطل ترجيحي السابق («عمودٌ قابلٌ للإفراغ أرخصُ خطأ»). حجّتُه أقوى: العمودُ الفارغ
> ليس مجّانيّاً — هو ادّعاءٌ في الـschema بأنّ النظام يعرف شيئاً لا يعرفه.

### `patient_contacts` — الوصلُ N↔N

| العمود | النوع | ملاحظة |
|---|---|---|
| `id` | uuid pk | |
| `client_id` | uuid **FK → clients** | 🔴 **بـFK حقيقيّ** — `BarberService.clientId` بلا FK عيبٌ معروف **لا يُورَّث** |
| `patient_id` | uuid FK → patients, **Cascade** | الرابطُ بلا مريضٍ بلا معنى |
| `customer_id` | uuid FK → customers, **Cascade** | كذلك. و`Customer` نفسُه لا يُمَسّ |
| `role` | text | `self` · `guardian` · `other` — **قرارٌ مطلوب، §٦ ق-٢-ب** |
| `created_at` | timestamptz | |
| قيود | `@@unique([patient_id, customer_id])` · فهرسان `(client_id)` · `(customer_id)` | |

### `Reservation.patientId`

```
patientId  String?  @map("patient_id") @db.Uuid
patient    Patient? @relation(fields: [patientId], references: [id], onDelete: SetNull)
@@index([clientId, patientId])
```

`SetNull` بنفس عرفِ `customerId`/`barberId`/`resourceId`/`serviceId` على الجدول نفسِه: حذفُ
كيانٍ لا يمحو تاريخَ حجز.

---

## §٢ — الملفّات المتأثّرة

```
prisma/schema.prisma                        نموذجان + عمودٌ + علاقات
prisma/migrations/add_patient_identity.sql  جديد — جملٌ صريحةٌ داخل معاملة
app/repositories/patient_repo.py            جديد — استعلاماتٌ فقط، كلُّها بـclientId
app/services/patient_service.py             جديد — مسارُ الكتابة الوحيد + الكاشفُ الحتميّ
app/services/reservation_service.py         يقبل patient_id · يحلّه · يكتبه
scripts/test_clinic_patient_identity.py     جديد — مصفوفةُ IG كاملةً
scripts/test_reservation_contract_baseline.py   توكيدٌ: patientId اختياريّ، وغيابُه يبقى None
```

**لا يُمَسّ:** أيُّ ملفٍّ تحت `app/api/` · `whatsapp_*` · `lia_*` · `customer_repo.py` · الواجهة.

---

## §٣ — أثرُ الهجرة — مقيسٌ لا مقدَّر

| البند | القياس (P0.5 · ٢٠٢٦-٠٩-٢٥) |
|---|---|
| صفوفٌ تتأثّر | **صفر** — جدولان جديدان + عمودٌ قابلٌ للإفراغ |
| `Reservation.patientId` بعد الهجرة | `NULL` في **٦٦ من ٦٦** — الجدولُ كلُّه، بلا استثناء |
| `backfill` | **صفر، وبالعقد لا بالراحة** |
| `Customer` | **صفرُ تغيير** — يُثبَت بقراءةٍ مختومةٍ قبل/بعد: العدّ (١٠) والقيد `customers_client_id_phone_key` |
| `Barber` · الحجوزات القائمة | صفر |

**قواعدُ التنفيذ:** ❌ `prisma db push` · ✅ `migrate diff` ⇒ مراجعةٌ بالعين ⇒ SQL صريحٌ داخل
معاملة · prisma@5.22 · migration واحدةٌ لهذه المرحلة.

---

## §٤ — الفحوص

### 🔴 بوّابةُ الانحدار — IG-1…IG-11 (الخطّة §٧٫١)

| # | السيناريو | المتوقَّع |
|---|---|---|
| IG-1 | الأمّ تحجز لنفسها | `Patient` = الأمّ · `role='self'` |
| IG-2 | الأمّ تحجز لابنها | `Patient` = الابن · `Contact` = الأمّ · `role='guardian'` |
| IG-3 | أمٌّ لها طفلان | `Patient A ≠ Patient B` · الـContact نفسُه |
| IG-4 | المريضُ نفسُه من رقمين | رابطان · **`Patient` واحد** |
| IG-5 | الـContact نفسُه لأشخاصٍ مختلفين | **لا دمج** |
| IG-6 | 🔴 `Customer` قائمٌ من الحلاقة | **لا يتحوّل تلقائيّاً إلى `Patient`** |
| IG-7 | `WALK_IN` | **لا `Patient` مشترك** — ولا يُقرأ صفُّ `WALK_IN` أصلاً |
| IG-8 | محادثةُ واتساب | **لا تفرض `Patient` واحداً** — يُثبَت بأنّ P2 لا تلمس `WhatsAppConversation` إطلاقاً |
| IG-9 | اسمان متطابقان داخل قائمةِ Contact واحد | **يسأل، لا يدمج** |
| IG-10 | تطابقٌ غامض (٢ فأكثر) | **لا اختيارَ آليّ** |
| IG-11 | `Patient` بلا `Contact` | يُكتب · `customerId = NULL` مقبول |

### الأمن · والحدّ الطبّي

| # | ما يُثبَت |
|---|---|
| SEC-1 · SEC-2 | `patient_id` أو `reservation_id` من تينانتٍ آخر ⇒ **لا شيء** (`clientId` في الـwhere) |
| SEC-3 | `patient_id` صحيحٌ في التينانت لكنّه ليس للـContact ⇒ **رفض + `SecurityAuditLog`** |
| SEC-5 | لا يظهر اسمُ مريضٍ لـContact لا يملكه |
| **MD-1** | 🔴 **AST:** لا عمودَ ولا حقلَ في `patients`/`patient_contacts` باسمٍ سريريّ (`diagnosis`, `symptom`, `treatment`, `prescription`, `lab`, `clinical`) — C5 كعقدٍ قابلٍ للفحص |

### الانحدار

`RG-b` **`Customer` لم يُمَسّ** (schema + عدٌّ + قيد) · `RG-c` صفرُ ذكرٍ لـ`patientId` في مسار
الحلاقة · `RG-d` صفرُ استعمالٍ لـ`rk` كـfixture · **`RG-f`** الـ١٠٢١ فحصاً الحاليّة تبقى خضراء ·
**`RG-g`** سياجُ P1 سليمٌ ولم يُفتَح.

**وقواعدُ الفحص الموروثة:** INVARIANT مقابل TRANSITION · AST لا grep · والـfake لا أفقرَ من
الواقع (وهو ما أسقط حزمةً في P1 وأُصلح).

---

## §٥ — البوّابات والتراجع

| البوّابة | الشرط |
|---|---|
| **قبل الكود** | موافقتُك على §١ و§٦ |
| **قبل الـmigration** | مراجعةُ خَرج `migrate diff` بالعين — ويُعرَض عليك |
| **إغلاقُ P2** | IG-1…IG-11 **كلُّها خضراء** · MD-1 · SEC · RG-b…RG-g · وقراءةٌ مختومةٌ قبل/بعد تُثبت `Customer` ثابتاً و٦٦/٦٦ `patientId = NULL` |

### التراجع — بترتيبٍ آمن

```
١  الكفُّ عن كتابة patientId            صفرُ أثرٍ على صفٍّ قائم
٢  git revert للكود                     صفر
٣  DROP COLUMN reservations.patient_id  صفر (كلُّها NULL)
٤  DROP TABLE patient_contacts, patients  ← فقط إن كان عددُ الصفوف صفراً
```

🔴 **وإن حملا صفوفاً: يُترَك الجدولان ويُوقَف المسار. لا تُحذَف بياناتُ مرضى في تراجع.**

---

## §٦ — القرارات الستّة — ✅ **محسومةٌ ٢٠٢٦-٠٩-٢٥**

| # | القرار | **القرار المعتمد** |
|---|---|---|
| **ق-٢-أ** | أشكالُ §١ الثلاثة | ✅ **موافق** — كما هي، ومعها **FK حقيقيٌّ على `patient_contacts.client_id`** |
| **ق-٢-ب** | مفرداتُ `role` | ✅ **موافق** — `self` · `guardian` · `other`. ولا `parent`/`spouse` بلا حاجةٍ مُثبَتة |
| **ق-٢-ج** | `date_of_birth` في v1؟ | ❌ **لا — خارج P2-v1.** السببُ مكتوبٌ في §١ |
| **ق-٢-د** | قاعدةُ الكاشف | ✅ **موافق** — تطابقُ الاسم المطويّ (`_fold_ar`) **داخل قائمة الـContact وحدَها**، و**بلا** `_within_one_edit`: عند الحلاق يقترح، وعند المريض قد يقترح دمجَ شخصين |
| **ق-٢-هـ** | مطابقةٌ **عبر** Contacts؟ | ✅ **لا** — C1.1 §٧. اقتراحٌ عابرٌ يكشف وجودَ مريضٍ لمن لا يملكه |
| **ق-٢-و** | `Customer` يبقى كما هو؟ | ✅ **نعم** — `create_reservation` يبقى يعمل find-or-create للـContact. `Patient` يُضاف **فوقه**، ولا يحلّ محلَّه |

---

## §٧ — بوّابةُ P2

نفسُ أسلوب P1، ولا اختصار:

```
contract  →  approval  →  implementation  →  tests  →  migration evidence  →  Gate P2  →  P3
     ✅          ⏸️              ❌              ❌              ❌               ❌
```

**ولا تُغلَق P2 إلّا بالخمسة معاً:** IG-1…IG-11 خضراء · MD-1 · SEC-1/2/3/5 · RG-b…RG-g ·
وقراءةٌ مختومةٌ قبل/بعد تُثبت `Customer` ثابتاً (العدّ والقيد) و`patientId = NULL` في ٦٦/٦٦.

---

**الحالة:** ✅ العقدُ مقفولٌ بحدوده · القراراتُ الستّةُ محسومة · ⏸️ **إذنُ التنفيذ لم يُعطَ.**
صفرُ كود · صفرُ schema · صفرُ migration · صفرُ كتابةِ إنتاج · صفرُ commit.

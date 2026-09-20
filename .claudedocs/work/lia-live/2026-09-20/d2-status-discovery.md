# D-2 Discovery — حالة الزيارة التاريخيّة · 2026-09-20

**بأمر سلمان:** تحقيقٌ فقط. **لا كود · لا تعديل signature · لا commit.**
**السؤال:** هل تُكتَب زيارةٌ حدثت فعلاً بحالة `arrived` مباشرةً، وما أقلّ تصميمٍ يحفظ كلّ
الـcallers القائمين كما هم؟

---

## ١ · أين يُستعمل `status` عند إنشاء Reservation

**في مكانٍ واحد، وهو حرفيّ لا افتراضيّ:**

```python
# app/services/reservation_service.py:523
create_data = { …, "status": "pending", … }
```

والعمود نفسه: `status String @default("pending")` (`prisma/schema.prisma:756`) —
**نصّ عاديّ، ولا enum في قاعدة البيانات**. فالسطر أعلاه يكتب `pending` صراحةً ولا يعتمد على
الافتراض. ⇒ **`arrived` مسموحةٌ على مستوى الـDB بلا أيّ migration.**

`repo.create(data)` تمريرةٌ خالصة (`reservation_repo.py:14-15`) — لا منطق فيها.

## ٢ · الـcallers الحاليّون — أربعةٌ حقيقيّون

| # | المكان | القناة |
|---|---|---|
| 1 | `app/api/v1/public/reservations.py:83` | حجز من الموقع |
| 2 | `app/services/whatsapp_reservation_flow.py:884` | حجز الزبون عبر واتساب |
| 3 | `app/api/v1/admin/reservations.py:324` | إنشاء من الداشبورد |
| 4 | `app/services/lia_owner_entry.py:1785` | ليا |
| — | `scripts/test_lia_reservation_t1.py:191` | حزمة اختبار |

**ولا واحدٌ منهم يمرّر `status`** (البارامتر غير موجود أصلاً)، **ولا واحدٌ منهم يقرأ
`result["status"]` بعد النداء** — مقيسٌ بقراءة كلّ موقعٍ منها.

## ٣ · مَن يقرأ `reservation.status` بعد الإنشاء

| المكان | ماذا يفعل | أثر `arrived` |
|---|---|---|
| `reservation_repo.py:108 · :131 · :154 · :175` | استعلامات التداخل: `status IN (pending, confirmed, arrived)` | **الصفّ يحجز الخانة** — صحيحٌ تماماً: الحلاق كان مشغولاً فعلاً |
| `prisma/migrations/add_reservation_barber_slot_unique_index.sql` | فهرس فريد جزئيّ على `(client_id, barber_id, reserved_at) WHERE status IN ('pending','confirmed','arrived')` | **محميّ على مستوى قاعدة البيانات مثل الباقي.** ولهذا **الأوقات المتسلسلة ضرورة لا تحسين**: ثلاثة أسماء بنفس الساعة تصطدم بالفهرس نفسه، لا بفحص بايثون فقط |
| `reservation_repo.py:211-213` | إلغاء الزبون: `status IN (pending, confirmed)` | **صفّ `arrived` لا يُلغى من هذا المسار** |
| `reservation_service.py:47` `TRANSITIONS` | `arrived: []` — حالةٌ نهائيّة | **لا انتقال بعدها، أبداً، من أيّ واجهة** |
| `admin/reservations.py:160-162` | عدّاد اليوم لكلّ حالة | يظهر ضمن العدّادات |
| `ReservationsTab.jsx:49` | الشارة «وصل» | مدعومة في الواجهة اليوم |
| `reservationInteractions.jsx:21` | `VISIBLE_STATUSES = [pending, confirmed, arrived]` | ظاهرٌ في اللوائح |
| `OverviewTab.jsx:512` | `completed = confirmed + arrived` | **يُحتسَب «منجَز»** — وهو بالضبط ما تريده الحسابات |
| `edit_reservation` (`:958+`) | **لا حارس حالة فيها** | صفّ `arrived` **ما زال قابلاً للتعديل** (الوقت/الحلاق/الخدمة) |

**ولا مسار حذفٍ لحجز في المستودع كلّه** (`grep "\.delete("` على `reservation_repo.py` ⇒ صفر).

## ٤ · هل الإنشاء المباشر بـ`arrived` آمنٌ من ناحية الإشعارات والأحداث؟

**نعم — وهذا مقيسٌ لا مُستنتَج.** للإنشاء **أثرٌ جانبيٌّ واحد**:

```python
# reservation_service.py, بعد repo.create
if notify_merchant:
    await _notify_merchant_new_reservation(reservation)
return _fmt(reservation)
```

- `_notify_merchant_new_reservation` **لا تقرأ `status` إطلاقاً** — تقرأ التينانت والحلاق والخدمة
  وبيانات الزبون فقط.
- `_notify_reservation_event` (الإشعار الذاهب إلى **الزبون**) **لا يُنادى عند الإنشاء بتاتاً**؛
  ينطلق فقط من `update_status` عند تغيّرٍ حقيقيّ إلى `confirmed` أو `cancelled`
  (`reservation_service.py:936-940`).
- وليا تمرّر `notify_merchant = not past` أصلاً ⇒ **الزيارة الماضية لا تُشعر أحداً، لا التاجر ولا
  الزبون.**

### 🔴 ولماذا «أنشئ ثمّ حدّث الحالة» ليس بديلاً
`TRANSITIONS["pending"] = ["confirmed", "cancelled"]` — **`pending → arrived` ممنوع**. فالطريق
يمرّ بـ`confirmed`، و`update_status` عند `confirmed` **تبعث إشعاراً إلى الزبون**
(`:936-938`). ⇒ البديل يخالف شرطك «لا إشعار» **ويكتب ثلاث مرّات بدل واحدة**.

## ٥ · هل يفترض أيّ caller أنّ كلّ حجزٍ جديد يبدأ `pending`؟

**لا caller في `app/`.** لكنّ **الحزم تفترضه صراحةً، وهو مقصود:**

| الملفّ | السطر | ما يثبّته |
|---|---|---|
| `scripts/test_lia_reservation_t1.py` | `:18` · `:248` | **«`status` is "pending" — a recorded past appointment is not an attendance claim»** |
| `scripts/test_reservation_contract_t3b.py` | `:77` · `:94` | عقد T3-b: ماضٍ ومستقبل، كلاهما `pending` |
| `scripts/test_reservation_contract_baseline.py` | `:224` | خطّ الأساس |

**وهذا هو مبدأ سلمان نفسه، مكتوباً في حزمةِ اختبارٍ منذ T1** — لا رأياً جديداً. والتصميم أدناه
**يحفظه حرفيّاً**: جملة T1 («سجل موعد … مبارح») تبقى `pending`؛ `arrived` تحتاج فعلَ زيارةٍ صريحاً.

## ٦ · أقلّ تصميمٍ ممكن

```python
# reservation_service.create_reservation — بارامتر واحد، keyword-only، بعد enforce_working_hours
status: str = "pending",
```
```python
# وفي جسم الدالّة، السطر 523 وحده:
if status not in VALID_STATUSES:
    raise ValueError(f"Invalid status. Use: {VALID_STATUSES}")
create_data = { …, "status": status, … }
```

- **كلّ caller قائمٍ لا يتغيّر بايتاً واحداً** — الافتراض هو سلوك اليوم حرفيّاً.
- **نفس شكل `allow_past` و`enforce_working_hours` و`notify_merchant`** حين أُضيفت (T3-b/T3-c):
  keyword-only، افتراضها السلوك القائم، والتغيير شيءٌ **يطلبه** الـcaller لا شيءٌ يرثه.
- **لا migration** — العمود نصّ بلا enum.
- **لا أثر جانبيّ جديد** — §4.
- وليا وحدها تمرّر `arrived`، **وفقط في وضع سجلّ الزيارة** (فعل زيارةٍ صريح). مسار T4 يبقى كما هو.
- والحزم الثلاث في §5 تصبح **حارس عدم الانحدار**: تمرّ بلا تعديل، وهي ما يثبت أنّ الافتراض لم يتحرّك.

**البديل الأصغر (لا تعديل إطلاقاً):** تبقى الزيارة `pending`. الكلفة أنّ سجلّ الحسابات لا يفرّق
بين «إجا وخلص» و«محجوز ولسّا». وهذا ما طلب سلمان تجاوزه.

---

## Confirmed / Side Findings / Unknowns

**Confirmed** — الأرقام والأسطر أعلاه، كلّها من قراءة الملفّات الحقيقيّة في 2026-09-20.

**Side Findings**
1. **حالةٌ نهائيّة بلا رجعة.** `arrived` طرفيّة في الغراف (خلفاً وأماماً)، ولا مسار حذف لحجز.
   فزيارةٌ سُجّلت خطأً **لا يمكن إلغاؤها ولا تحويل حالتها** من أيّ واجهة — يبقى التعديل
   (`edit_reservation` بلا حارس حالة) وحده. **قرارُ منتجٍ مطلوب: هل نقبل هذا لصفوفٍ تكتبها ليا؟**
2. **«نصٌّ لسياقٍ ظهر بسياقٍ آخر» — الحالتان السابعة والثامنة.** `reservation_cancelled`
   («ألغيت **الموعد**… ابعتلي **الزبون والوقت والخدمة**») و`reservation_expired` («ألغيت
   **الموعد**») كلاهما مفردٌ، وسيظهران بعد ❌ على معاينةٍ فيها ثلاثة. **زرّ ❌ «إلغاء» نفسه
   محايدٌ ولا لبس فيه؛ الرسالةُ بعده هي المشكلة.**
3. الفهرس الفريد الجزئيّ يشمل `arrived` ⇒ الأوقات المتسلسلة **ضرورةُ قاعدة بيانات**، لا تفضيل.

**Unknowns** — لا شيء معلَّقاً في نطاق هذا التحقيق. كلّ سؤالٍ من الخمسة له جوابٌ بدليل.

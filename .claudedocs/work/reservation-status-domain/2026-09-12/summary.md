# تحقيق — نطاق حالات الحجز، وهل يستوعب «تمّ / ما حضر»

**التكليف (سلمان، ٢٠٢٦-٠٩-١٢):** تحقيق فقط قبل تحويل A2-b إلى قرار تنفيذي.
**القيود:** لا كود · لا schema · لا migration · لا إرسال واتساب · لا إنتاج. احتُرمت كلها.
**الطريقة:** قراءة الكود والمخطّط والـmigrations والواجهة. **لا استعلام قاعدة بيانات** (يتطلّب
اعتماد إنتاج، وخارج التكليف). فكل ما يلي عن **الكود** لا عن **البيانات**.

---

## Confirmed Findings

### ١ — الحالات الخمس، ومصدرها الحقيقي

`app/services/reservation_service.py:36`

```python
VALID_STATUSES  = ["pending", "confirmed", "arrived", "cancelled", "no_show"]
ACTIVE_STATUSES = ["pending", "confirmed", "arrived"]
```

مكرَّرة حرفياً في `app/api/v1/admin/reservations.py:32`، ومطابقة لتعليق المخطّط
(`prisma/schema.prisma`, `model Reservation`: `// pending | confirmed | arrived | cancelled | no_show`).
**`String` لا enum في قاعدة البيانات** — فلا قيد DB على القيم.

### ٢ — رسم الانتقالات موجود ومُنفَّذ على السيرفر

`app/services/reservation_service.py:47-53`

```python
TRANSITIONS = {
    "pending":   ["confirmed", "cancelled"],
    "confirmed": ["arrived", "cancelled", "no_show"],
    "arrived":   [],  "cancelled": [],  "no_show":   [],
}
```

مُنفَّذ في `update_status()` (`:671-672`): `raise ValueError` عند أي حدّ غير موجود. وأُضيف
٢٠٢٦-٠٨-٢٤ لسببٍ مسمّى في تعليقه: قبله كان الرسم موجوداً **في الواجهة فقط**، فنداء API خام كان
يستطيع إرجاع حجز `cancelled` إلى `confirmed`. التعليق يقول صراحةً إنه أُغلق *«because WhatsApp is
about to become a second, unattended writer to this same endpoint»* — أي أنّ هذا الرسم بُني
تحسّباً لـA2 بالتحديد.

**الواجهة مطابقة حرفياً** — `frontend/.../ReservationsTab.jsx:57-63`، نفس الخمسة ونفس الحدود.
فادّعاء «mirrors exactly» في تعليق الـbackend **صحيح ومُتحقَّق منه**.

### ٣ — 🔴 النتيجة الحاسمة لـA2-b: لا حدّ من `pending` إلى `arrived` أو `no_show`

`arrived` و`no_show` **لا يُمكن الوصول إليهما إلا من `confirmed`**. فالحلاق لا يستطيع تعليم
«تمّ» ولا «ما حضر» على حجز لم يؤكّده أحد.

> **هذا قيد نطاق (domain) لا فحص صلاحية.** ومعناه أنّ A2-b **لا يستطيع تجاوز تأكيد المالك في
> A2-a حتى لو أراد** — لا يوجد مسار. الأمان هنا من بنية النطاق، لا من التخويل.

### ٤ — «تمّ» و«ما حضر» يُمثَّلان بالنطاق القائم، بلا حالة جديدة — بتحفّظ واحد على التسمية

| المطلوب | الحالة القائمة | تسمية الواجهة العربية |
|---|---|---|
| ما حضر | `no_show` | **«لم يحضر»** — `ReservationsTab.jsx:51` · `CustomersTab.jsx:48` |
| تمّ | `arrived` | **«وصل»** — `ReservationsTab.jsx:49` · `CustomersTab.jsx:47` |

**«ما حضر» مطابق تماماً.** أمّا «تمّ» فـ`arrived` تعني **«وصل الزبون»** لا **«انتهت الخدمة»**.
وهما متكافئان وظيفياً (كلٌّ منهما حالة نهائية تُثبت أنّ الموعد حدث) لكن **غير متكافئين دلالياً**.

**ولا يوجد مفهوم `completed` للحجز إطلاقاً.** `completed` موجود لكن في نطاق آخر:
`booking_service.py:69` → `{"pending","confirmed","cancelled","completed"}` — وهو حجز الوحدات
(الشاليهات)، جدول ومفردات مختلفة.

### ٥ — من يملك تغيير الحالة اليوم

`app/api/v1/admin/reservations.py:214-227` — `PATCH /admin/reservations/{id}/status`

```python
user = Depends(require_permission("reservations.write", *RESERVATION_ROLES))
_svc = Depends(require_service("reservations"))
...
staff_barber_id = _require_staff_barber_id(user)
```

`RESERVATION_ROLES = ("SUPER_ADMIN","TENANT_ADMIN","MANAGER_RESERVATIONS","STAFF")` (`:39`).
فالتخويل **واحد لكل الحالات الخمس** — لا تمييز بين «من يؤكّد» و«من يعلّم وصل». والتضييق الوحيد
القائم هو النطاق الذاتي: `staff_barber_id` يُشتقّ من الحساب المصادَق عليه، و`update_status()`
يرفع `ReservationAccessDenied` إن لم يطابق `reservation.barberId` (`:669-670`).

> **هذه بالضبط الآلية التي يحتاجها A2-b** — موجودة ومُستعملة، ويكفي اشتقاقها من `Barber` بدل
> `User`. لا مفردات جديدة.

### ٦ — أثر «تمّ / ما حضر»: أضيق مما قد يُتوقَّع

| المحور | `arrived` | `no_show` |
|---|---|---|
| **إشعار الزبون** | ❌ لا شيء | ❌ لا شيء |
| **التوفّر / منع التعارض** | يبقى شاغلاً للموعد | **يُفرِّغ الموعد** |
| **الفهرس الفريد الجزئي** | داخل الفهرس | **يخرج منه** |
| **التقارير** | يُحتسب في مقياس «مكتمل» | لا يُحتسب |

- **الإشعارات:** `update_status()` (`:674-679`) يُشعر الزبون **فقط** عند `confirmed` و`cancelled`.
  فـ`arrived`/`no_show` **صامتان تماماً** تجاه الزبون ⇒ **A2-b لا يحتاج قالباً جديداً من ميتا.**
- **التوفّر:** الفلترة مُثبَّتة سطرياً في `app/repositories/reservation_repo.py:108,131,154,175`
  بـ`{"in": ["pending","confirmed","arrived"]}`، و`prisma/migrations/add_reservation_barber_slot_unique_index.sql:37`
  بـ`WHERE status IN ('pending','confirmed','arrived')`.
- **التقارير:** `frontend/.../OverviewTab.jsx:512` — `completed: os.completed + byS.confirmed + byS.arrived`.

### ٧ — A2-c: للمشروع سابقة رفض حقيقية، وهي **صمت + تدقيق**

`app/services/whatsapp_flow.py:465-475` — عند مستأجر موقوف: `log_security_event(...)` ثم
`logger.info` ثم `return`، **بلا أي ردّ للمُرسِل**. وتعليقه (`:458-464`) يقول صراحةً إنّ إخبار
الزبون من عدمه *«a UX/business decision outside this ADR's scope, not made here»*.

**فالسابقة تدعم الصمت + السجل.** و`log_security_event` عقده *«never raises»*
(`security_audit_service.py:8`) — فالتسجيل لا يُعطِّل مساراً.

### ٨ — A2-d: **لا توجد أي سياسة نافذة زمنية للفعل، ولا شيء يمنع فعلاً على حجز قديم**

`update_status()` **لا يقارن `reservedAt` بالوقت الحالي إطلاقاً**. بحث عن
`hold|grace|expiry|expires_at|stale|older_than` في `reservation_service.py`: صفر نتيجة ذات صلة.
عملياً: يمكن اليوم تعليم حجز عمره ستة أشهر `arrived`.

**و`D4` ليس هذا.** `D4` = *ساعة، من لحظة وصول رسالة الواتساب* — وهو عمر **نافذة محادثة الزبون**
(`.claudedocs/plans/reservation-whatsapp-handoff-and-customer-identity.md:170,522`)، لا نافذة فعل
التاجر. **فـA2-d قرار عمل مستقلّ فعلاً، بلا سابقة يُشتقّ منها.**

---

## Side Findings

١. **`ACTIVE_STATUSES` ثابت ميت.** معرَّف في `reservation_service.py:37`، و**صفر** استعمال في
   `app/` كلها. والقائمة نفسها مُثبَّتة سطرياً أربع مرّات في `reservation_repo.py` وخامسةً في
   الـmigration. التسمية موجودة، والإنفاذ في مكان آخر.

٢. **تعليق الواجهة يشير إلى سطور خاطئة.** `reservationInteractions.jsx:15` يقول *"Mirrors the
   backend's ACTIVE_STATUSES (reservation_service.py:26-28)"* — الموضع الحقيقي `:37`، والثابت
   المُشار إليه ميت.

٣. **`VALID_STATUSES` مكرَّر** بين `reservation_service.py:36` و`admin/reservations.py:32` بلا
   مصدر مشترك.

٤. **`["pending","confirmed"]` في `reservation_repo.py:211` ليس انحرافاً** — داخل `cancel()`
   (إلغاء الزبون لنفسه)، ويمنع عن قصد إلغاء حجز صار `arrived`. **فُحص ولم يُبلَّغ كعيب.**

٥. **`no_show` يُفرِّغ الموعد.** تعليمه يُخرِج الصفّ من الفهرس الفريد الجزئي، فيُصبح الموعد قابلاً
   لحجز جديد. **ذو دلالة أمنية لـA2-b**: فعل خاطئ أو منتحَل لا يُنهي السجل فقط، بل يفتح الموعد.

---

## Unknowns

١. **توزيع الحالات في بيانات الإنتاج الحقيقية غير معروف** — لا استعلام قاعدة بيانات جرى (خارج
   التكليف). فلا نعرف كم حجزاً يقف اليوم عند `confirmed` بلا إغلاق، ولا إن كان `arrived` مستعملاً
   فعلاً من قبل أصحاب المحلات. **هذا يهمّ A2-d**: بدونه لا نعرف إن كانت «ضغطة بعد يومين» حالة
   نظرية أم واقعاً متكرّراً.

٢. **هل «تمّ» عند سلمان تعني «وصل» أم «انتهت الخدمة»؟** إن كانت الثانية، فالنطاق **لا** يستوعبها
   بلا حالة جديدة. **قرار تسمية/عمل، لا قياس.**

٣. **سلوك الواجهة لم يُفحص بمتصفّح حقيقي** — الاستنتاجات عن أزرار الحالة والتسميات من قراءة الكود
   فقط (`rules/frontend/browser-verification-protocol.md`).

# Lia — إنشاء حجز · ودعم الإدخال التاريخي

> **دراسة وتصميم فقط.** لا كود · لا migration · لا schema · لا ميتا · لا كتابة إنتاج · لا push.
> **مبنيّة على قراءة الكود القائم**، وكل رقم ومسار أدناه مقيس لا مفترض.
> **الحالة:** `HEAD = origin/main = الإنتاج = 6cbdf16`.

---

## ١ · ما استُعيد من المستودع

| المصدر | ما أخذته منه |
|---|---|
| `prisma/schema.prisma:743-830` | `model Reservation` كاملاً: الحقول · الـFKs · `source` · الفهارس |
| `app/services/reservation_service.py` | `create_reservation` (خطّ ٦ مراحل) · `_check_working_hours` · `_resolve_barber` · `_resolve_catalog_service` · `_notify_merchant_new_reservation` · `MODULE_DEFAULTS` · `VALID_STATUSES` · `TRANSITIONS` |
| `app/api/v1/admin/reservations.py` | `ReservationCreateIn` · `CREATE_VALID_MODULE_KEYS` · حرس الماضي (`:320`) · `require_permission("reservations.write", *RESERVATION_ROLES)` |
| `app/api/v1/public/reservations.py:64-93` | نفس حرس الماضي (`:79`) · `source="website"` |
| `app/services/whatsapp_reservation_flow.py:886-893` | `module_key="barber"` · `source="whatsapp"` — المسار الحيّ الذي يعمل اليوم |
| `app/core/permissions.py` | `is_authorized(user, permission, *legacy_roles)` · `PRESET_STAFF` · `SCOPABLE_AREAS` |
| `app/services/lia_owner_entry.py` · `app/schemas/lia_drafts.py` · `app/prompts/lia.md` | حلقة Lia كاملة كما هي منشورة |
| `.claudedocs/architecture/capabilities/lia.md` | العقد ومبادئه |
| `plans/lia-owner-data-entry.md` · `plans/lia-draft-editing-p1.md` | الشريحتان السابقتان |
| `plans/reservation-whatsapp-domain-alignment.md` · `reviews/BARBER_WHATSAPP_…md` | نطاق RESERVATION وقيود القناة |
| قاعدة الإنتاج (قراءة فقط) | ٥٢ حجزاً · ٤٩ منها في الماضي · توزيع `source` |

**ومبادئ الحكم المُستعادة كما هي في العقد:** Lia خدمة منصّة · **لا تكتب DB مباشرة** ·
`AI → مسوّدة مُهيكَلة → Pydantic → مسار الكتابة المُخوَّل القائم → DB` · **لا معرّفات مخترعة** ·
**لا قيم مخترعة** · نطاق التينانت إلزاميّ · **عملية واحدة لكل دور محادثة** · تأكيد قبل الكتابة ·
الذاكرة في الـDB وحدها · وأي تحليلات مستقبلية عبر **قراءات مُسمّاة مُراجَعة مُنطَّقة بالتينانت**، لا SQL يولّده الـAI.

---

## ٢ · مسار إنشاء الحجز القائم — `create_reservation`

`reservation_service.py:343`. **خطٌّ ثابت الترتيب**، واحدٌ لكل المستدعين:

```
Validate            duration = duration_min  أو  MODULE_DEFAULTS[module_key]  (barber ⇒ 30)
Resolve Resource    للـclinic فقط
Resolve Barber      🔴 يلزمه metadata.barber_id · يرفع ValueError إن غاب أو لم يُوجَد
                       أو إن كان الحلاق غير مُتاح للحجز
Resolve Service     🟡 متسامح: بلا service_id يُرجع None ولا يرفع
Working Hours       _check_working_hours(reserved_at, working_hours)
                       أيام مغلقة · open_time ≤ HH:MM < close_time
                       أولوية: working_hours الحلاق ← ثمّ Client.config.working_hours
Conflict Check      find_overlapping_by_barber ⇒ «This barber is already booked…»
                       وحتى في الـrace: UniqueViolation تُترجَم لنفس الرسالة
Resolve Customer    get_by_phone ثمّ create  ← 🔴 كتابة ثانية ضمنية: صفّ Customer
Create              repo.create
Post Actions        🔴 _notify_merchant_new_reservation(reservation)
```

---

## ٣ · مسار الأدمن القائم

```
POST /api/v1/admin/reservations/
   require_permission("reservations.write", *RESERVATION_ROLES)
   require_service("reservations")
   module_key ∈ CREATE_VALID_MODULE_KEYS = [restaurant, services, real_estate, hotel, clinic, barber]
   🔴 if body.reserved_at < now:  400 "Cannot reserve a past time slot."
   → reservation_service.create_reservation(..., source="admin")
```

`ReservationCreateIn`: `module_key · customer_name · customer_phone · reserved_at`
(+ `customer_email` · `duration_min` · `notes` · `metadata` اختيارية). **وبلا أي مُتحقِّق زمنيّ.**

---

## ٤ · مسار Lia القائم — من الرسالة إلى الكتابة

```
whatsapp_flow._dispatch
   └─ _peek_session
   └─ lia_owner_entry.try_handle            ← قبل حلّ التينانت، لأن تينانتها من رقم المُرسِل
        0    انتهاء مهلة المسوّدة ⇒ IDLE
        0.5  BOOK_ID ⇒ مسار الهروب إلى فلو الزبون
        1    LIA_AWAITING_CONFIRM + نقرة ⇒ ✅ _commit  /  ❌ إلغاء
        1b   LIA_AWAITING_CONFIRM + نصّ  ⇒ _extract_edit ⇒ patch ⇒ دمج ⇒ _advance   (P1)
        2    LIA_AWAITING_FIELD + نصّ    ⇒ _parse_field_answer ⇒ _advance
        2.5  تحية من مالك ⇒ الترحيب + زرّ «احجز موعد»
        3    _looks_like_service_entry ⇒ _resolve_owner ⇒ _tenant_has_reservations
             ⇒ _extract ⇒ LiaExtraction ⇒ _advance ⇒ معاينة ⇒ LIA_AWAITING_CONFIRM
   _commit  ⇒ LiaServiceDraft.model_validate ⇒ _still_authorised (ثانية، لحظة الكتابة)
            ⇒ _resolve_service_category ⇒ admin_create_service
```

**والتخويل اليوم `services.write`** (`lia_owner_entry.py:207`).

---

## ٥ · حقول `Reservation` — ما هو موجود فعلاً

| الحقل | النوع | إلزاميّ؟ | ملاحظة |
|---|---|---|---|
| `clientId` | uuid | ✅ | نطاق التينانت |
| `moduleKey` | string | ✅ | للحلاق: **`"barber"`** |
| `customerName` | string | ✅ | لقطة تاريخية، لا تُعاد كتابتها |
| `customerPhone` | string | ✅ | **NOT NULL** — فلا حجز بلا رقم |
| `customerEmail` | string? | — | |
| `reservedAt` | timestamptz | ✅ | |
| `durationMin` | int | افتراضي 60 | والخطّ يضع 30 للحلاق إن لم يُمرَّر |
| `status` | string | افتراضي `pending` | `pending·confirmed·arrived·cancelled·no_show` |
| `notes` | string? | — | |
| `metadata` | json? | — | `{barber_id, service_id}` للحلاق |
| `barberId` | uuid? FK | — | مرآة لـmetadata · `onDelete: SetNull` |
| `serviceId` | uuid? FK | — | مثله |
| `customerId` | uuid? FK | — | إضافيّ بجانب اللقطة |
| `source` | **string?** | — | 🔑 **موجود** · قيم موثَّقة لا enum |

**`source` المقيس على الإنتاج:** `whatsapp` ٨ · `website` ٢ · `NULL` ٤٢ (صفوف قديمة).
و`"admin"` مُستعمَل في الكود ولم يُنتج صفّاً بعد.

---

## ٦ · التحقّق القائم بالضبط

```
مسار الأدمن     module_key ∈ القائمة  ·  🔴 منع الماضي  ·  الصلاحية  ·  require_service
مسار الويب      نفسهما  ·  🔴 منع الماضي
الخدمة          working hours · فحص التعارض · الحلاق موجود ومُتاح · لا فحص زمنيّ
Pydantic        ReservationCreateIn: أنواع فقط، بلا حدود زمنية
قاعدة البيانات   لا قيد CHECK على reserved_at
الواجهة         لا `min` على أي حقل تاريخ/وقت لحجز — الحرس ليس هناك
إعادة الجدولة   reservation_service:950  ValueError "Cannot reschedule to a past time slot."
```

---

## ٧ · هل الماضي مسموح للأدمن؟ — **بالدليل: نعم في الخدمة، لا في الـroute**

```
🔴 المنع موجود في موضعين فقط، وكلاهما route:
      app/api/v1/admin/reservations.py:320
      app/api/v1/public/reservations.py:79

✅ وغير موجود في:
      create_reservation            ← مرحلة Validate تحسب المدة وحدها
      ReservationCreateIn           ← أنواع فقط
      قاعدة البيانات                 ← لا قيد
      الواجهة                        ← لا min
```

**والنتيجة العملية:** Lia تنادي **الخدمة** لا الـroute (كما تنادي `admin_create_service` اليوم لا
`POST /admin/catalog-services`). **فالإدخال التاريخي مسموح اليوم بلا تغيير سطر واحد.**

**وشاهدٌ من الإنتاج:** ٤٩ من ٥٢ حجزاً `reservedAt` في الماضي — لكنها صارت ماضياً **بمرور الوقت**،
لا أُدخِلت ماضية. فالشاهد يُثبت أن الـDB تقبلها، لا أن مساراً أدخلها.

### وثلاثة حرّاس **تبقى فعّالة** ولا يجوز تجاوزها بصمت

| الحرس | على الإدخال التاريخي |
|---|---|
| **فحص التعارض** | ✅ **مطلوب** — زبونان لا يمكن أن يكونا عند نفس الحلاق الساعة ١٠ |
| **ساعات العمل** | 🟡 **قد يمنع ظلماً** — إدخال ٢٢:٠٠ لمحل أقفل ٢٠:٠٠، أو يوم مغلق |
| **`isAcceptingReservations`** | 🟡 **قد يمنع ظلماً** — حلاق تركَ المحل لا يمكن تسجيل ماضيه |

### 🔴 والعطل الأخطر: كل إنشاء يُرسل تنبيهاً

```
Post Actions ⇒ _notify_merchant_new_reservation(reservation)
                يُرسل واتساب للمالك (وللحلاق المعنيّ إن كان له حساب)
```

فمالكٌ يُدخِل ثلاثة حجوزات وقعت صباحاً **يتلقّى ثلاث رسائل «حجز جديد»** عن أشياء أخبرنا بها هو.
**وهذا داخل الخدمة المشتركة** — فلا يُعالَج بلا معامل جديد، وهو **قرارك**.

---

## ٨ · الفرق المطلوب بين حجز الزبون والإدخال التاريخي

```
حجز الزبون (site/bot)      منع الماضي صحيح  ·  تنبيه المالك صحيح  ·  status=pending صحيح
إدخال المالك التاريخي       الماضي مسموح     ·  التنبيه خطأ        ·  status يحتاج قرارك
```

**والفصل قائم بنيويّاً أصلاً:** الحرس في الـroute، والخدمة بلا حرس. **فالمسارَان منفصلان بالتصميم
لا بالحيلة** — ولا يلزم لا علم جديد ولا حقل جديد.

**و`source` هو ما يميّزها في السجلّ** — موجود، نصّيّ، لا enum ⇒ لا migration. والقيمة قرارك:
`"lia"` (الأدقّ) · أو `"whatsapp"` (الأصدق قناةً) · أو `"admin"` (الأصدق فاعلاً).

---

## ٩ · كيف تتصرّف Lia في كل حالة

| الحالة | السلوك المقترح |
|---|---|
| معلومات كاملة | مسوّدة → معاينة تقتبس **الاسم والرقم والخدمة والحلاق والوقت والمدة** → تأكيد → كتابة |
| **الخدمة غير موجودة** | سؤال، ولا اختراع. والمُطابِق القائم (`_match_service_by_text`) يُعاد استعماله بعد حلّ التينانت — **لا مُطابِق ثانٍ** |
| **الحلاق غير موجود** | سؤال + **عرض أسماء حلاقي المحل**. ولا اختراع معرّف — القاعدة الحاكمة |
| **الزبون غير معروف** | 🔴 `customerPhone` **NOT NULL** ⇒ الرقم **إلزاميّ**. غيابه سؤال لا افتراض. ومعروف/غير معروف لا يغيّر شيئاً: الخطّ يفعل find-or-create بنفسه |
| **وقت متعارض** | الخدمة ترفع ValueError ⇒ يُنقَل للمالك كما هو، مع الوقت المتعارض. **ولا تُقترَح بدائل تلقائياً** |
| **وقت سابق** | يُقبَل، **ويُقال له صراحةً في المعاينة**: «تسجيل حجز ماضي». فقبولٌ صامت للماضي يخفي خطأ مطبعيّ في السنة |
| **معلومات ناقصة** | نفس آلية `LIA_AWAITING_FIELD` القائمة — سؤال واحد لكل حقل |
| **أكثر من حجز في رسالة** | 🔴 **عملية واحدة لكل دور محادثة** (مبدأ معتمد). فالثلاثة ⇒ إمّا رفضٌ مُرشِد («ابعتلي واحد واحد») أو طابور مسوّدات — **وهذا قرارك، والطابور خارج الشريحة الأولى** |

---

## ١٠ · عقد المسوّدة المقترح — من الحقول الموجودة فقط

```python
class LiaReservationDraft(BaseModel):
    model_config = {"extra": "forbid"}
    customer_name:  str          # 2..200، ويمرّ على clean_customer_name القائم
    customer_phone: str          # إلزاميّ — العمود NOT NULL
    service_name:   str          # اسمٌ لا معرّف. الباكند يحلّه على التينانت
    barber_name:    str          # اسمٌ لا معرّف
    reserved_at:    datetime     # الباكند يحلّ «بكرة ٩ ونص» لا النموذج
    notes:          Optional[str]

class LiaReservationExtraction(BaseModel):
    model_config = {"extra": "forbid"}
    intent:     Literal["create_reservation"]
    confidence: Literal["high", "medium", "low"]
    data:       dict
    unresolved: list[str]
```

**🔑 والقاعدة التي تبني هذا العقد:** النموذج يُنتج **أسماءً ونصّاً**، والباكند يحلّ **المعرّفات
والتاريخ** على التينانت الحالي. فلا `barber_id` ولا `service_id` ولا `duration_min` من النموذج —
والمدة تُقرأ **من الخدمة المحلولة**، لا من كلام المالك.

**والتاريخ النسبيّ («بكرة»، «اليوم الساعة ١٠») يُحلّ في الكود لا في النموذج** — نموذجٌ لا يعرف
اليوم ولا منطقة التينانت الزمنية سيخترع تاريخاً، وثمنه موعدٌ في يوم خطأ.

---

## ١١ · مسار الكتابة الذي تستعمله Lia

```
reservation_service.create_reservation(
    client_id, module_key="barber",
    customer_name, customer_phone, reserved_at,
    duration_min = <من الخدمة المحلولة>,
    metadata = {"barber_id": …, "service_id": …},
    source = <قرارك>)
```

**هو المسار نفسه** الذي يستعمله الموقع والبوت واللوحة — لا ثانٍ. وهو ما يحفظ المبدأ:
*One Capability · One Service · One write path*.

---

## ١٢ · الشريحة الأولى المقترحة

```
داخلها:  قصد create_reservation واحد لحجز واحد
         حلّ الخدمة (بالمُطابِق القائم) · حلّ الحلاق بالاسم · حلّ التاريخ في الكود
         معاينة تقتبس كل شيء + وسمٌ صريح للماضي
         تأكيد ⇒ create_reservation ⇒ إبلاغ بالنتيجة
خارجها:  الطابور (أكثر من حجز) · التعديل قبل الحفظ للحجز · الإلغاء/التغيير بعد الحفظ
         اقتراح بدائل عند التعارض · الحقول الاختيارية (email/notes المركّبة)
```

---

## ١٣ · الملفّات التي ستتغيّر

```
جديد    app/schemas/lia_reservation.py      العقد
تعديل   app/prompts/lia.md                  + LIA_RESERVATION_PROMPT + ردود جديدة
تعديل   app/services/lia_owner_entry.py     بوابة القصد · الحلّ · المعاينة · commit ثانٍ
جديد    scripts/test_lia_create_reservation.py
```

**ولا `reservation_service.py` ولا `prisma/` ولا `app/api/`** — إلّا إن قرّرتَ معالجة التنبيه،
وحينها يلزم معامل في الخدمة، **وهو تغييرٌ في مسار مشترك يخدم الموقع والبوت واللوحة.**

---

## ١٤ · الفحوص المطلوبة

```
الحلّ           خدمة/حلاق بالاسم · الغامض سؤال · غير الموجود سؤال · ولا معرّف مخترع
التاريخ         «بكرة ٩ ونص» · «اليوم ١٠» · «أمس ١١» · سنة خطأ · صيغة غامضة ⇒ سؤال
الماضي          يُقبَل · ويُوسَم في المعاينة
التعارض         ValueError يُنقَل كما هو، ولا بديل يُقترَح
الرقم           غائب ⇒ سؤال، ولا حجز بلا رقم
التخويل         reservations.write · ورفضٌ صامت لغير المُخوَّل · وإعادة تحقّق لحظة الكتابة
العزل           حلاق/خدمة من تينانت آخر ⇒ رفض
الكتابة         create_reservation هي المسار، وتستقبل القيم المؤكَّدة بالضبط
بلا انحدار      45 · 48 · 49/49  والـprompt مطابق
```

---

## ١٥ · المخاطر

| الخطر | التقدير |
|---|---|
| **عزل التينانت** | 🟢 منخفض — `_resolve_barber` و`find_catalog_service` يأخذان `client_id`، و`_resolve_owner` يحسم التينانت من الرقم |
| **التخويل** | 🟡 **تغيير حقيقي**: الصلاحية `reservations.write` لا `services.write`. و`PRESET_STAFF` يحمل الأولى **دون** الثانية ⇒ **حلاقٌ بحساب staff سيستطيع إنشاء حجز عبر Lia ولا يستطيع إنشاء خدمة.** وهذا صحيح منطقيّاً، لكنه **يوسّع من تصل إليه Lia** — ويحتاج علمك |
| | و`SCOPABLE_AREAS` تحوي `reservations` ⇒ `scope="self"` يقيّد الموظّف بحجوزاته وحدها. المالك `scope="all"` فلا يتأثّر |
| **حجز مكرّر** | 🟡 فحص التعارض يمسك نفس الحلاق/الوقت. **ولا يمسك نفس الزبون مرّتين عند حلاقين مختلفين** — ولا `wamid` هنا يُستعمل كـidempotency |
| **التنبيه الكاذب** | 🔴 **الأعلى** — كل إنشاء يُرسل «حجز جديد» للمالك، حتى لحجز وقع صباحاً |
| **كتابة ضمنية ثانية** | 🟡 `create_reservation` يُنشئ صفّ `Customer` إن لم يوجد. **فLia تُسبّب كتابتين لا واحدة** — وهذا يجب أن يُعلَن في العقد |
| **تاريخ مُختلَق** | 🟡 يُخفَّض بحلّ التاريخ في الكود لا في النموذج، وبوسم الماضي في المعاينة |

---

## ١٦ · ما يحتاج قرارك قبل التنفيذ

```
١  🔴 التنبيه الكاذب
      (أ) اتركه — المالك يتلقّى تنبيهاً عن حجز أدخله هو
      (ب) معامل في create_reservation (مثل notify=True) — تغيير في مسار مشترك
      (ج) الشريحة الأولى للمستقبل فقط، والتاريخي بعد حلّ التنبيه
      ⟶ ترشيحي: (ب) بمعامل صريح افتراضه الحالي، فلا يتغيّر سلوك أي مستدعٍ قائم

٢  🟡 قيمة source للحجز من Lia:  "lia"  ·  "whatsapp"  ·  "admin"
      ⟶ ترشيحي: "lia" — يميّزها في السجلّ بلا لبس، والعمود نصّيّ فلا migration

٣  🟡 status للحجز التاريخي:  pending  ·  confirmed  ·  arrived
      ⟶ ترشيحي: "arrived" لحجز ماضٍ أخبرنا به المالك — فهو وقع فعلاً.
        وهو من VALID_STATUSES، لكنه قرار منتج لا تقني

٤  🟡 ساعات العمل على الماضي: تبقى حارسة أم تُستثنى للإدخال التاريخي؟
      ⟶ ترشيحي: تبقى — وإن منعت ظلماً فالخبر أصدق من صفّ خطأ

٥  🟡 isAcceptingReservations على الماضي: نفس السؤال لحلاق تركَ المحل

٦  🟡 أكثر من حجز في رسالة: رفضٌ مُرشِد أم طابور؟
      ⟶ ترشيحي: رفضٌ مُرشِد في الشريحة الأولى — «عملية واحدة لكل دور» مبدأ معتمد

٧  🟡 التخويل: reservations.write يوسّع من تصل إليه Lia إلى حاملي preset staff — مقبول؟
```

**ولا شيء ينفَّذ قبل جواب (١) و(٢) و(٣) على الأقلّ** — الثلاثة تُغيّر شكل الكتابة نفسها.

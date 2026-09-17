# تحقيق — Lia Reservation Entry (الماضي والمستقبل)  ·  ٢٠٢٦-٠٩-١٧

**تحقيقٌ وخطّةٌ فقط، بأمرِ سلمان.** لا كود · لا schema · لا كتابةَ إنتاج · لا إرسال.
كلُّ رقمٍ أدناه مقروءٌ من الكودِ أو من قاعدةِ الإنتاج (قراءةً فقط)، وما لم يُقَس مكتوبٌ في
«Unknowns» صراحةً.

---

## Confirmed Findings

### C-1 · 🔴 `historical_entry` و `notify_merchant` **غيرُ موجودَين**. الخطّةُ الأمُّ تصفهما كأنّهما قائمان.

`lia-expansion-master-plan.md` §15 يقول: *«معاملان في create_reservation: notify_merchant=True ·
historical_entry=False (خامد على المستقبل)»*. والتوقيعُ الحقيقيّ
(`app/services/reservation_service.py:343-354`):

```python
async def create_reservation(
    client_id, module_key, customer_name, customer_phone, reserved_at,
    duration_min, notes, metadata, customer_email=None, source=None,
) -> dict:
```

```
grep "historical_entry" app/   →   صفرُ نتيجةٍ كمُعامِل (النتائجُ كلُّها تعليقاتٌ عن بياناتٍ تاريخيّة)
grep "notify_merchant" app/    →   صفر
```

**⇒ التصميمُ المذكورُ اقتراحٌ لا واقع، ويجب تصحيحُ الخطّةِ الأمّ.** وهذا بالضبط ما حذّرت منه
قاعدةُ `context-recovery-protocol`: **المستودعُ يغلب الوثيقة.**

### C-2 · 🔴🔴 الخدمةُ **تقبل تاريخاً ماضياً أصلاً**. الحارسُ يعيش في الـroutes.

لا حارسَ للماضي داخل `create_reservation`. والحراسُ الثلاثةُ كلُّهم **خارجَها**:

```
app/api/v1/admin/reservations.py:320    if body.reserved_at < now: 400 "Cannot reserve a past time slot."
app/api/v1/public/reservations.py:~80   نفسُ السطرِ ونفسُ التعليقِ حرفيّاً
whatsapp_reservation_flow               لا حارسَ صريح — الخاناتُ تُولَّد من get_next_open_days
                                        فالماضي غيرُ قابلٍ للاختيارِ أصلاً
reservation_service.py:949              حارسٌ للماضي، لكنّه في **reschedule** لا في الإنشاء
```

**⇒ «الإدخالُ التاريخيّ» ليس ميزةً تُضاف، بل حارسٌ لن ترثَه Lia.** وهذا يقلب التأطير: الخطرُ
ليس «هل نستطيع تسجيلَ الماضي؟» بل **«سنُسمَح به بالصدفة إن لم نقرّر»**.

🔴 **وهذه ثالثُ حالةٍ لنفسِ الشكل** — قيدٌ يعيش في الـroute فلا يراه مستدعٍ ثانٍ:

```
١  admin/barbers.py      normalize_for_storage   ← عطبُ جعفر الحقيقيّ
٢  admin/store.py        clientId + moduleKey
٣  admin+public/reservations.py   حارسُ الماضي   ← الآن
```

⇒ **مرشَّحٌ لتصعيدِ نمطٍ** بموجب `architecture-review-loop.md` (الحالةُ الثانيةُ المستقلّة تُصعِّد).

### C-3 · إشعارُ التاجر يُطلَق **بلا شرط** — وهنا يلزم مُعامِلٌ فعلاً

`reservation_service.py:523`: `await _notify_merchant_new_reservation(reservation)` في نهايةِ كلِّ
إنشاء، بلا أيِّ راية. ⇒ تسجيلُ موعدِ أمسٍ يُرسل للمالك **«حجز جديد!»** عن شيءٍ مضى.

**⇒ هذا هو المُعامِلُ الوحيدُ الذي يلزم إضافتُه فعلاً**، وافتراضُه `True` يُبقي المستدعين الثلاثةَ
بلا تغيير.

### C-4 · 🔴 `customer_phone` **إلزاميّ**، وهو مفتاحُ find-or-create

```python
customer_phone = normalize_for_storage(customer_phone) or customer_phone
customer = await customer_repo.get_by_phone(customer_phone, client_id)
if not customer: customer = await customer_repo.create(...)
```

**و«أحمد إجا مبارح» يعطي اسماً لا رقماً.** فإمّا تسأل Lia عن الرقم (احتكاكٌ حقيقيّ: زبونٌ عابرٌ
قد لا يملك المالكُ رقمَه)، وإمّا يلزم قرارٌ آخر.

**وسابقةٌ مقيسةٌ في الإنتاج:** ١٧ حجزاً من ٥٢ تحمل `customerPhone = «عبر واتساب»` — نصّاً لا رقماً.
لكنّ **الاثنَي عشرَ الذين يحملون `customerId` ليس فيهم واحدٌ منها** (كلُّها تسبق Phase A)، و**لا
زبونَ واحدٌ في `customers` يحمل هاتفاً غيرَ رقميّ**. ⇒ فالحشوُ لم يدخل جدولَ الزبائنِ قطّ،
**وأوّلُ من سيُدخِله هو Lia إن قرّرنا الحشو.** قرارٌ مفتوح، لا إرثٌ يُتَّبع.

### C-5 · `status` مثبَّتٌ على `"pending"` — وهذا **يوافق الواقعَ** لا يخالفه

```
حالاتُ الإنتاج:      pending 30 · cancelled 15 · confirmed 7      (لا 'arrived' ولا 'completed')
وفي الماضي فعلاً:     51 من 52 حجزاً · منها 29 ما زالت pending
```

**⇒ «حجزٌ ماضٍ وحالتُه pending» هو القاعدةُ في الإنتاج لا الشذوذ.** فقاعدةُ سلمان «past ≠ arrived»
مُحقَّقةٌ تلقائيّاً، ولا قرارَ جديدٌ لازم — إلّا إن أردنا حالةً جديدة، وهي عندئذٍ قرارُ منتجٍ مستقلّ.

### C-6 · ساعاتُ العمل تُفحَص للماضي أيضاً — وهذا يكسر التسجيلَ التاريخيّ

`_check_working_hours` يقارن **اليومَ من الأسبوعِ والوقتَ من اليوم**، بلا علاقةٍ بالتاريخ:

```
rk              09:00–21:00 · مغلق **الاثنين**
barberlab-test  09:00–21:00 · مغلق الاثنين
mr-h            09:00–20:00 · بلا إغلاق
```

⇒ «سجّل إنّو أحمد إجا الاثنين» على `rk` → `ValueError: This business is closed on Monday`.
**والواقعُ لا يطيع الجدولَ الحاليّ**، وقد يكون الجدولُ نفسُه تغيّر منذئذ. ⇒ قرارٌ لازم.

### C-7 · فهرسُ التفرّدِ مشروطٌ بالحالة — فيمنع تصادمَ الماضي أيضاً

```sql
CREATE UNIQUE INDEX reservations_active_barber_slot_uidx
ON reservations (client_id, barber_id, reserved_at)
WHERE status IN ('pending','confirmed','arrived') AND barber_id IS NOT NULL;
```

⇒ تسجيلُ موعدٍ ماضٍ في خانةٍ مشغولةٍ يرفع `UniqueViolationError` → «الحلاق محجوز». **وهذا صحيحٌ
منطقيّاً** (لا يجلس زبونان عند حلّاقٍ واحدٍ في اللحظةِ نفسِها)، لكنّه يعني أنّ تعبئةَ يومٍ مزدحمٍ
تتوقّف عند أوّلِ تصادم.

### C-8 · الحلاقُ والخدمةُ يُحَلّان في الباكند من `metadata` — النمطُ المُثبَتُ نفسُه

```
metadata={"barber_id": …, "service_id": …}  →  _resolve_barber() · _resolve_catalog_service()
```

وفي الإنتاج: **٥٢ من ٥٢ حجزاً تحمل `barberId` و`serviceId`**، وكلُّها `moduleKey="barber"`.
⇒ فLia تحتاج أن تُحوّل **اسمَ حلّاقٍ واسمَ خدمة** إلى معرّفَين — وهو بالضبط ما تفعله اليوم مع
الفئة (`_resolve_service_category`). **لا معماريّةَ جديدة.**

---

## Side Findings

```
S-1  حارسُ الماضي منسوخٌ حرفيّاً في ملفَّي routes بنفسِ التعليقِ — والنسخةُ الثالثةُ ستكون Lia
     إن كُتب فيها بدل أن يُرفَع إلى الخدمة بمُعامِل.
S-2  `source` نصٌّ حرٌّ بلا تحقّق: website · whatsapp · admin اليوم، و٤٢ صفّاً بلا مصدرٍ أصلاً.
     ⇒ "lia" ستمرّ، لكن لا شيءَ يمنع مطبعيّاً.
S-3  ١٧ حجزاً بـcustomerPhone = «عبر واتساب» — بياناتٌ قديمةٌ سابقةٌ لـPhase A، بلا customerId.
     غيرُ ضارّةٍ اليوم، وتصير ضارّةً لحظةَ أن يمرّ حشوٌ مثلُها عبر find-or-create.
S-4  ٤٢ من ٥٢ حجزاً بلا `source` — فتحليلُ «من أين تأتي الحجوزات» لا يُجاب من البيانات بعد.
```

---

## Unknowns — لم تُقَس، وتُذكَر لا تُخمَّن

```
U-1  كيف تعرض اللوحةُ حجزاً ماضياً حالتُه pending؟ (يحتاج متصفّحاً — لم يُفتَح)
U-2  هل لتسجيلٍ تاريخيٍّ أثرٌ على أيِّ تقريرٍ أو إحصاءٍ قائم؟ لم تُفحَص أسطحُ التقارير.
U-3  ماذا يقصد سلمان بـ«مبارح الساعة ٤» حين يكون المحلُّ في UTC+3 والعمودُ `Timestamptz`
     يُعامَل كـUTC في كلِّ هذا المسار؟ **فخُّ المناطقِ الزمنيّةِ قائمٌ ومُعلَنٌ في تعليقات الكود
     نفسِها** (`admin/reservations.py:317`) ولم يُحسَم لهذه الشريحة.
U-4  هل يملك المالكُ رقمَ الزبونِ عادةً حين يسجّل موعداً ماضياً؟ سؤالُ منتجٍ لا كود.
```

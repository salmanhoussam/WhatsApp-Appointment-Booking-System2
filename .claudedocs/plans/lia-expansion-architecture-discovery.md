# Lia Expansion — Architecture Discovery

> **اكتشاف فقط.** لا تنفيذ · لا refactor · لا migration · لا ميتا · لا كتابة إنتاج · لا commit · لا push.
> **كل سطر أدناه مقيس من الكود أو من قاعدة الإنتاج (قراءة فقط)** — لا من الخطط ولا من الذاكرة.
> **الحالة:** `HEAD = origin/main = الإنتاج = 6cbdf16`.
> **ولا شيء أدناه معتمد** — الاتجاهات المقترحة **مقترحات**، والقرار قرار سلمان.

---

## A · نموذج تفعيل Lia الحالي

```
'lia' في platform_services   ❌ صفر صفّ  (الجدول فيه ١٥ مفتاحاً، وليس فيها lia)
'lia' في client_services     ❌ صفر صفّ على أي تينانت
serviceKey خاص بـLia          ❌ لا وجود له
```

**فبوّابتها ثلاثة شروط في الكود، لا صفٌّ في جدول:**

```
lia_owner_entry.py:620   _looks_like_service_entry(value)        بوابة نصّية رخيصة
lia_owner_entry.py:207   is_authorized(user, "services.write", "SUPER_ADMIN", "TENANT_ADMIN")
lia_owner_entry.py:221   clientservice{serviceKey:"reservations", isActive:true}
```

**قياسٌ بالمُحلِّل الحقيقي `_resolve_owner` (٢٠٢٦-٠٩-١٥):**

| الرقم | الشخص | التينانت | actor | Lia تعمل؟ |
|---|---|---|---|---|
| `96176985477` | حسين | `rk` | `owner` | ✅ |
| `96170764479` | جعفر | `rk` | `admin` | ✅ |
| `96178727986` | سلمان | `barberlab-test` | `owner` | ✅ |

**⇒ Lia مُفعَّلة ضمنياً على كل تينانت عنده `reservations` نشطة ومالكه يُحلّ بالرقم.
ولا يمكن إطفاؤها إلا بإطفاء الحجوزات كلّها.**

---

## B · `PlatformService` مقابل `ClientService` — الواقع

### أين تُقرأ الخدمة فعلاً — بالدليل

```
require_service()  ⇒  app/core/services.py:36-62
                      prisma_client.clientservice.find_first(
                          clientId · serviceKey · isActive:True)
                      وإلّا 403 "Service 'X' is not activated for this tenant."

قراءات platform_services خارج app/api/v1/super/platform_services.py:   صفر
```

**⇒ `client_services` هو مصدر الحقيقة وقت التشغيل. و`platform_services` كاتالوج منتج
(اسم · وصف · أيقونة · سعر شهري · ترتيب) لا يبوّب سلوكاً.**

### والمفرداتان منفصلتان فعلاً

```
platform_services (١٥):  booking · restaurant · store · restaurant.menu · store.products
                         store.cart · restaurant.table_booking · restaurant.delivery
                         store.wishlist · store.loyalty · gallery · whatsapp_ordering
                         analytics · ai_bot · whatsapp_blast

ACTIVATABLE_KEYS (٦):    restaurant · store · catalog · reservations · gallery · delivery_zones

النشط فعلاً على الحلاقين:  reservations · store · whatsapp_ordering
                          (وrk عنده booking و catalog معطَّلَين)
```

**ثلاثة تباينات مقيسة:**

```
🔴 reservations    يبوّب ٣٢ نقطة في الكود، ومفعَّل على الثلاثة  —  وغير موجود في platform_services
🔴 catalog · delivery_zones   قابلان للتفعيل  —  وغير موجودين في platform_services
🔴 booking         موجود في platform_services بسعر 49$  —  ولا يبوّب شيئاً
                   (مسجَّل مسبقاً في .claude/rules/backend/service-system.md §2b)
```

### وثلاثة أسطح تفعيل، بثلاثة قوانين

| السطح | من | التحقّق من المفتاح |
|---|---|---|
| `PATCH /super/clients/{id}/services` | `require_super_admin` | 🔴 **لا شيء** — أي نصّ يُقبَل |
| `POST /admin/client-services/activate` | `require_roles("SUPER_ADMIN","TENANT_ADMIN")` | ✅ `ACTIVATABLE_KEYS` |
| seeders · `VERTICAL_REGISTRY` · `_SERVICE_SEED_MAP` | سكربت | ✅/❌ بحسب السكربت |

---

## C · جرد أسطح الإدخال في اللوحة

**مسحٌ شامل لكل ملفّات `app/api/v1/admin/` التي تكتب** (`@router.post|patch|put|delete`)،
مصنَّفاً بطبقة الكتابة:

| الملفّ | كتابات | عبر خدمة | عبر repo | داخل نطاق الحلاق |
|---|---|---|---|---|
| `catalog.py` | 7 | **9** ✅ | 0 | ✅ فئة/عنصر |
| `catalog_services.py` | 2 | **3** ✅ | 0 | ✅ الخدمة |
| `reservations.py` | 4 | **3** ✅ | 0 | ✅ الحجز |
| `content.py` | 8 | **3** ✅ | 0 | ✅ محتوى الصفحة |
| `settings.py` | 1 | **1** ✅ | 0 | ✅ الإعدادات |
| `barbers.py` | 4 | 0 | **3** 🔴 | ✅ **الحلاق** |
| `store.py` | 7 | 0 | **7** 🔴 | ✅ **منتج المتجر** |
| `team.py` | 5 | 0 | **5** 🔴 | ✅ الموظّف/الدعوة |
| `gallery.py` · `upload.py` | 5 | 0 | 0 | ✅ عبر `_gallery` helper |
| `media.py` | 4 | **`media_service`** ✅ | 0 | ✅ |
| `bookings.py` · `units.py` · `properties.py` · `fleet.py` · `resources.py` · `restaurant.py` · `services.py` | 24 | 1 | **22** 🔴 | ❌ عمودياتٌ أخرى |

### تفصيل الأسطح داخل نطاق الحلاق

| الإدخال | الـUI | الـroute | الصلاحية | طبقة الخدمة | Lia تستطيع إعادة الاستعمال؟ |
|---|---|---|---|---|---|
| **خدمة** | `CatalogTab` | `POST /catalog-services/` | `services.write` + `require_service("reservations")` | ✅ `admin_create_service` | ✅ **تفعله اليوم** |
| **حجز** | `ReservationsTab` | `POST /reservations/` | `reservations.write` + `require_service("reservations")` | ✅ `create_reservation` | ✅ (بقرارات مأخوذة) |
| **فئة/عنصر** | `CatalogTab` | `POST /catalog/categories` · `/items` | `_WRITE` + `require_service("catalog")` | ✅ `admin_create_*` | ✅ — 🟡 و`catalog` **معطَّل على rk** |
| **حلاق** | `StaffTab` | `POST /barbers/` | `staff.write` + `require_service("reservations")` | 🔴 **لا شيء** | 🔴 **لا** |
| **منتج** | `StoreTab` | `POST /store/products` | `store.write` + `require_service("store")` | 🔴 **لا شيء** | 🔴 **لا** |
| **موظّف** | `TeamTab` | `POST /team` | — | 🔴 **لا شيء** | خارج نطاق الإدخال التشغيلي |

---

## D · فجوات قدرة الكتابة القابلة لإعادة الاستعمال

### الهدف مقابل الواقع

```
الواقع اليوم:        Dashboard → route(يبني الصفّ ويفرض القيود) → repo → DB
                     Lia       → service(يفرض القيود) → repo → DB      ← للخدمة فقط

الهدف:               Dashboard ─┐
                                ├→ reusable authorized write capability → DB
                     Lia ───────┘
```

### 🔴 F2 — لا قدرة كتابة قابلة لإعادة الاستعمال للحلاق ولا للمنتج

```python
# app/repositories/barber_repo.py:47
async def create_barber(data: dict):
    return await prisma_client.barber.create(data=data)      # ← قاموسٌ خام، بلا client_id

# app/repositories/admin_catalog_repo.py:135
async def create_item(data: dict):
    return await prisma_client.catalogitem.create(data=data)  # ← مثله
```

**فالـroute هو مسار الكتابة.** ولا توجد دالّة تحمل العقد.

### 🔴 F3 — والقيود تعيش في الـroute، فمستدعٍ ثانٍ يجب أن يُعيد بناءها

`app/api/v1/admin/barbers.py:120-137` يفرض ثلاثة أشياء **لا تعرفها `create_barber`**:

```python
"clientId": tenant["id"],                    # وتعليقها: CRITICAL: always the current tenant
"phone":    normalize_for_storage(body.phone),   # 🔴 قاعدة phone-numbers.md
data["workingHours"] = Json(body.working_hours)
```

**والأثر ملموس لا نظريّ:** `normalize_for_storage` هي القاعدة التي وُلدت من **عطل جعفر الحقيقي**
(`.claude/rules/phone-numbers.md`: ستة أيام مقفولاً خارج حسابه، لأنّ رقمه خُزِّن بلا رمز دولة).
**فمستدعٍ ثانٍ ينسى السطر يُعيد إنتاج العطل نفسه** — والقاعدة نفسها تنصّ أنّ التطبيع **حدثٌ عند
حدود الـAPI**، فأيّ حدٍّ جديد (Lia) يلزمه.

**وتباينٌ يؤكّد أنّ هذا سهوٌ لا تصميم:** `update_barber(client_id, barber_id, data)` **يأخذ
`client_id` صراحةً** وموثَّق أنه «scoped to tenant» بموجب تدقيق Study 7 — **أي أنّ التحديث
حُصِّن والإنشاء لم يُحصَّن.**

### أثر إعادة الاستعمال الساذجة

```
Lia تنادي create_barber(data) مباشرةً
   ⇒ تبني الصفّ بنفسها  ⇒  مسار كتابة ثانٍ
   ⇒ مخالفة صريحة لـ rules/backend/architecture.md §9
      «One Capability · One Contract · One Service · One Source of Truth · Many Interfaces»
   ⇒ والسابقة مسجَّلة: store.py مسار الكتابة المزدوج، ظهوره الثاني
```

---

## E · التخويل والتبويب

### 🔴 F1 — Lia بلا مفتاح، ومبوَّبة على مفتاح غيرها

```
_tenant_has_reservations()  ⇒  serviceKey = "reservations"
```

**ثلاث نتائج مقيسة:**

```
١  لا يمكن تفعيل Lia لتينانت دون تفعيل الحجوزات
٢  لا يمكن إطفاء Lia دون إطفاء الحجوزات — أي إطفاء منتج بيعناه
٣  والتبويب يصير خطأً صريحاً لحظة كتابتها منتجاً (store) أو حلاقاً (staff)
```

### 🟡 F6 — صلاحية واحدة لكل العمليات

```
lia_owner_entry.py:207   is_authorized(user, "services.write", ...)
```

وهي صحيحة لإنشاء خدمة، **وخطأ لكل ما عداه**:

| العملية | صلاحية اللوحة | Lia اليوم |
|---|---|---|
| خدمة | `services.write` | ✅ مطابقة |
| حجز | `reservations.write` | 🔴 لا تُفحَص |
| حلاق | `staff.write` | 🔴 لا تُفحَص |
| منتج | `store.write` | 🔴 لا تُفحَص |

**والأثر في الاتجاهين:** حاملُ `reservations.write` وحدها (`PRESET_STAFF`) **يُرفَض اليوم** من
Lia رغم أحقيّته بالحجز؛ وحاملُ `services.write` **سيُقبَل** لعمليةٍ لا يملكها لو وسّعناها بلا
تفصيل الصلاحية.

### 🟡 F7 — إعادة التحقّق وقت الكتابة قائمة، ومثبَّتة على مفتاح واحد

`_still_authorised()` (`:683`) يُعاد استدعاؤه داخل `_commit` — **خاصّية أمنية حقيقية** — لكنه
يفحص `services.write` ثابتاً. **فالتوسّع يلزمه تمرير الصلاحية لا تثبيتها.**

### 🟡 F5 — ثلاثة أسطح تفعيل، وأحدها بلا تحقّق من المفتاح

مسار الـsuper يكتب أي نصّ في `serviceKey` بلا تحقّق. **فمفتاحٌ مطبعيّ يُنشئ خدمة وهمية نشطة
صامتة** — و`require_service` سيرفض للأبد بحثاً عن مفتاح لا يُكتب هكذا في أي مكان آخر.

---

## F · عزل التينانت

```
🟢 مسارات الخدمة       admin_create_service(client_id=…) · create_reservation(client_id=…)
                       · admin_create_category(client_id=…)   ← معامل صريح
🟢 _resolve_owner      يحسم التينانت من رقم المُرسِل، ولا يقبله من الرسالة
🟢 _resolve_barber · find_catalog_service      يأخذان client_id ويصفّيان عليه
🟢 require_service     clientId من التينانت المُحلّ لا من الجسم
🟢 /admin/client-services/activate             tenantId من الـJWT لا من الجسم (موثَّق)

🔴 المسارات المباشرة    create_barber(data) · create_item(data)
                       العزل خصيصةُ المستدعي لا الدالّة.  والتحديث محصَّن والإنشاء لا.
🟡 _resolve_client_from_text                   ثغرة مسجَّلة، ويستعملها سلمان للتحويل بين التينانتات
```

---

## G · تبعيّة الحجز

من دراسة `plans/lia-create-reservation.md` (ولا أُعيد كتابتها):

```
✅ جاهز            create_reservation موجود بمعامل client_id · source موجود
                   والإدخال التاريخي مسموح لأن منع الماضي في الـroute لا في الخدمة
✅ قرارات مأخوذة    notify_merchant · source="lia" · pending دائماً
                   · إرخاء ساعات العمل والإتاحة للتاريخيّ · حجز واحد · لا صلاحية خاصة

🔴 تعتمد على فجوات مشتركة:
   F1  المفتاح       الحجز عبر Lia مبوَّب على reservations — صحيحٌ بالحظّ لا بالتصميم
   F6  الصلاحية      يلزمه reservations.write لا services.write  ⇒ تفصيل الصلاحية شرطٌ سابق
   F7  إعادة التحقّق  يلزمها تمرير الصلاحية

🟡 مستقلّة عن الفجوات:  التنبيه · status · الكتابة المزدوجة (صفّ Customer)
```

**⇒ الحجز أقرب شريحة جاهزة، وتعتمد على F6 وF7 فقط — لا على F2 (المسارات المباشرة).**

---

## H · الـFindings مرتَّبة

### P0 — تحجب التوسّع

| # | الـFinding | الدليل | الأثر | اتجاه مقترح | قرار؟ |
|---|---|---|---|---|---|
| **F1** | Lia بلا `serviceKey`، ومبوَّبة على `reservations` | `lia_owner_entry.py:221` · صفر صفّ `lia` في الجدولين | لا تفعيل ولا إطفاء مستقلّ · والتبويب يصير كاذباً عند التوسّع | صفّ `lia` في `platform_services` + مفتاح في `client_services` + تبويبها عليه | **نعم** |
| **F2** | لا قدرة كتابة قابلة لإعادة الاستعمال للحلاق والمنتج (و٧ ملفّات أخرى خارج النطاق) | `barber_repo.py:47` · `admin_catalog_repo.py:135` · المسح: ٩ ملفّات · ٣٧ كتابة مباشرة | Lia لا تكتبهما بلا مسار ثانٍ ⇒ مخالفة §9 | استخراج `admin_create_barber` / `admin_create_product` بـ`safe-refactor` محفوظ السلوك | **نعم** |
| **F3** | القيود في الـroute لا في دالّة الكتابة — ومنها `normalize_for_storage` | `admin/barbers.py:120-137` مقابل `barber_repo.py:47-49` · و`update_barber` محصَّن | مستدعٍ ثانٍ ينسى التطبيع **يُعيد عطل جعفر** | الاستخراج في F2 يحمل القيود معه — لا تكرارها | **نعم** (ضمن F2) |

### P1 — تُفسد الصواب لكن لا تحجب

| # | الـFinding | الدليل | الأثر | اتجاه مقترح | قرار؟ |
|---|---|---|---|---|---|
| **F6** | صلاحية واحدة (`services.write`) لكل عمليات Lia | `lia_owner_entry.py:207` | يمنع مُحقّاً ويقبل غير مُحقّ عند التوسّع | صلاحية لكل عملية، مُمرَّرة لا مثبَّتة | **نعم** |
| **F7** | `_still_authorised` يفحص مفتاحاً ثابتاً | `:683-690` | نفس الأثر لحظة الكتابة | تمرير الصلاحية | نعم (مع F6) |
| **F4** | `platform_services` انحرف عن مفردات التشغيل | ١٥ مقابل ٦ · و`reservations` غائب · و`booking` لا يبوّب شيئاً | الكاتالوج لا يصف المنتج المُشتغِل | مصالحة المفردات — **ورقة مستقلّة** | **نعم** |
| **F5** | مسار الـsuper لا يتحقّق من المفتاح | `super/platform_services.py:120-140` | مفتاح مطبعيّ ⇒ خدمة وهمية نشطة صامتة | تحقّقٌ من قائمة معروفة | نعم |

### P2 — مسجَّلة ومؤجَّلة

| # | الـFinding | الأثر | قرار؟ |
|---|---|---|---|
| **F8** | كل `create_reservation` يُرسل تنبيه المالك | قرارٌ مأخوذ: معامل | لا |
| **F9** | `status` مثبَّت `pending` · و`pending→arrived` ممنوع · والمرور بـ`confirmed` يُرسل للزبون | يؤجّل «حضر» | لا (مأخوذ) |
| **F10** | `create_reservation` يُنشئ صفّ `Customer` ⇒ Lia تُسبّب كتابتين | يُعلَن في العقد | لا |
| **F11** | `catalog` معطَّل على `rk` | إدخال الفئة/العنصر عبر Lia سيُرفَض هناك بـ403 | نعم عند فتحه |
| **F12** | `_resolve_client_from_text` | ثغرة مسجَّلة، إصلاحٌ أمنيّ مستقلّ | لا |

---

## I · ما يجب إصلاحه قبل توسّع Lia

```
لتوسّعها إلى الحجز فقط:        F6 + F7            (تفصيل الصلاحية وتمريرها)
لتوسّعها إلى الحلاق والمنتج:     F1 + F2 + F3 + F6 + F7
ولأي توسّع يُبقيها قابلة للإطفاء:  F1
```

---

## J · ما يمكن تأجيله

```
F4 · F5      انحراف الكاتالوج وتحقّق مفتاح الـsuper — ورقة نظافة مستقلّة
F8 · F9 · F10  قراراتٌ مأخوذة، وتُنفَّذ داخل شريحة الحجز
F11          حتى فتح catalog على rk
F12          إصلاح أمنيّ مستقلّ
٢٢ كتابة مباشرة في عمودياتٍ أخرى (units · bookings · restaurant · fleet · resources · properties)
             خارج نطاق الحلاق — تُسجَّل ولا تُفتَح
```

---

## K · التعديل المقترح على خطّة توسّع Lia

**الخطّة القائمة كانت:** الخدمة ✅ → الحجز → الفئة/المنتج → الحلاق.
**والاكتشاف يقول إنّ الترتيب صحيح، وينقصه شرطان سابقان:**

```
٠   مقدّمة إلزامية       F1 مفتاح lia          +  F6/F7 تفصيل الصلاحية
١   الحجز                لا يحتاج F2 — المسار موجود بطبقة خدمة
٢   الفئة/العنصر         لا يحتاج F2 — موجودة بطبقة خدمة (وينتظر F11 على rk)
٣   الحلاق · المنتج      🔴 يحتاج F2 + F3 — استخراج قدرتَي كتابة أولاً
```

**والتغيير الجوهريّ:** Lia لم تكن تحتاج مقدّمة معمارية وهي تكتب شيئاً واحداً. **ومن ثانٍ فصاعداً
تحتاجها** — لأن «صلاحية واحدة» و«تبويب مستعار» و«لا قدرة كتابة» كلّها تنكسر عند العملية الثانية.

---

## L · أوّل شريحة تنفيذ — **بعد الموافقة فقط**

**المرشّحة: المقدّمة (٠)، لا الحجز** — لأنها تحجب كل ما بعدها وهي الأصغر:

```
١  صفّ lia في platform_services              بيانات لا كود (أو سكربت بذرة)
٢  'lia' إلى ACTIVATABLE_KEYS                سطر واحد
٣  تبويب Lia على مفتاحها لا على reservations  _tenant_has_lia() بدل _tenant_has_reservations
   🔴 وهذا يُطفئها على الثلاثة حتى تُفعَّل      ⇒ تنسيقٌ مع تفعيل حسين غداً
٤  تفصيل الصلاحية                            معامل permission في _resolve_owner و_still_authorised
٥  فحوص                                      تفعيل/إطفاء · رفض غير المُخوَّل لكل عملية · بلا انحدار
```

**وما يبقى خارجها:** F2/F3 (استخراج القدرتين) · الحجز · الفئة/المنتج · كل P1/P2 الأخرى.

**🔴 وتعارضٌ زمنيّ يجب أن يُحسَم أولاً:** البند ٣ **يُطفئ Lia على `rk` و`barberlab-test`
و`mr-h`** حتى يُفعَّل مفتاحها. **فإمّا يُنفَّذ التفعيل في نفس الجولة، أو تُؤجَّل المقدّمة إلى ما
بعد تفعيل حسين.** — قرارك.

# ✅ سجلّ القرارات — Lia Expansion · مُغلَقٌ ٢٠٢٦-٠٩-١٦

> **الحالة: كلُّ القرارات المعماريّة محسومة. و`FOUNDATION READY` — قراراً لا تنفيذاً.**
> **وهذا الرأسُ يَسبِق الخطّةَ ويحكمها.** فحيث تعارضَ نصُّ قسمٍ أدناه مع جدولِ القرارات هذا،
> **القرارُ هو النافذ**، والقسمُ يُقرأ كتاريخٍ للدراسة لا كتصميمٍ قائم.
>
> **🔴 وقاعدةٌ لا تُخترَق:** `FOUNDATION READY` **≠** `PRODUCTION ACTIVATION APPROVED`.
> **F0.4** (كتابةُ صفَّي تفعيل `lia`) **كتابةُ إنتاجٍ مستقلّة، بموافقةٍ تُطلَب لحظةَ التنفيذ** —
> ولا تدخل ضمن التنفيذ تلقائياً بحجّة أنّها «جزءٌ من Foundation». قرارُ سلمان، ٢٠٢٦-٠٩-١٦.

## جدولُ القرارات المحسومة

| # | القرار | المحسوم | الجلسة |
|---|---|---|---|
| **D0** | نطاقُ الـtenant population | **`alzabt-demo` ليس تينانتاً** ويُتجاهَل دائماً في أي population أو قرار تينانت. الأحياء ثلاثة: `rk` · `barberlab-test` · `mr-h` | ٠٩-١٦ |
| **I-1…I-7** | الثوابتُ الدلاليّة | مُعتمَدةٌ كما هي · و**I-7**: لا صلاحيةَ اسمها «lia». و**I-3 بلا تعديل** — اللبسُ يُرفَض ولا يُحسَم — **ونطاقُه: حلُّ الهويّة داخل Lia وحده** (R4, ٠٩-١٦). ومسارُ تسجيل الدخول `user_repo.find_user_by_phone` **مُستثنىً صراحةً** ويحتفظ باختيارِ الأقدم: تغييرُه يمنع دخولَ صاحبِ محلَّين، وذلك اختيارٌ بين تينانتَين يلزمه نموذجُ العضويّة لا حكمٌ هنا | ٠٩-١٦ |
| **D3-b** | هويّةُ فاعلِ مسارِ رقم المحلّ | **D3-2** — رقمُ المحلّ يعطي **التينانت** ولا يعطي **الفاعل**. والفاعلُ `User` نشطٌ مُخوَّل، دائماً | ٠٩-١٦ |
| **D3-c** | سياسةُ حلّ الفاعل | **c-C + Resolver خاصٌّ بـLia يخدم المسارَين** · `isActive` شرطٌ صريح · **لا أقدميّة** · و`user_repo.find_user_by_phone` **لا تُمَسّ** فلا يتغيّر سلوكُ تسجيل الدخول | ٠٩-١٦ |
| **D3-a** | وحدةُ التخويل | `OperationDefinition(permission, legacy_roles, service_key, write_fn)` — أربعةُ حقول. ولا هويّةَ قناةٍ ولا صلاحيةَ «lia» داخل التعريف | ٠٩-١٦ |
| **a-1 · a-2** | نطاقُ السجلّ | ثلاثُ عمليات فقط: `create_service` · `create_reservation` · `create_catalog_item`. **وما لا `write_fn` صالحٌ له لا يُسجَّل إطلاقاً** — لا بـ`None` ولا كعمليةٍ قابلةِ التنفيذ | ٠٩-١٦ |
| **a-4** | عدمُ الانحدار | `create_service` تبقى `services.write` بنفس قائمتها القديمة — شرطٌ مُثبَّت. **ونطاقُه: تخويلُ العملية ومسارُ كتابتها وحدهما** (R5, ٠٩-١٦)، **ولا يشمل فرعَ الترحيب** — فذاك محلُّ `F0.7` وتغييرُه مقصود | ٠٩-١٦ |
| **D9** | الشروطُ الثلاثة | `A AND B AND C` · **وترتيبُه `C → ① → [تُعرَف العملية] → A → B`** (R1, ٠٩-١٦): `A = OP.service_key` **لا تُفحَص قبل معرفةِ العملية**، والترحيبُ مشروطٌ بـ**① الوصولِ إلى Lia وحده**. وكلُّ الفحوصِ تسبق نداءَ النموذج · وتُعاد قبل الكتابة **بنفس `OperationDefinition`** | ٠٩-١٦ |
| **a-3** | ثابتُ التقديم | **a3-PR** — التقديمُ يمنع «تينانتاً بلا `User` صالحٍ على رقم محلّه»، والتشغيلُ يكشفه أيضاً كحمايةٍ ثانية | ٠٩-١٦ |
| **D1 · D2 · D5** | مفتاحُ `lia` · استراتيجيةُ التفعيل · الترتيب | كما في §21 — معتمدةٌ منذ ٠٩-١٥ | ٠٩-١٥ |

### النوافي الأربعةُ ومَن يُثبت كلاًّ منها

```
A ⇏ B   قدرةٌ لا تمنح صلاحية            AC-12
B ⇏ A   صلاحيةٌ لا تُغني عن قدرة          AC-5  (قبل المعاينة)  +  AC-13  (عند إعادة الفحص)
C ⇏ A   تينانتٌ محلولٌ لا يُفعِّل قدرة       AC-11
C ⇏ B   فاعلٌ محلولٌ لا يمنح نفسَه صلاحية   AC-4   ← وهو ما كان AC-7 قبل حسم D3-b
```

`AC-5` و`AC-13` **نافٍ واحدٌ بمرحلتَين** بقرار سلمان، لا فحصان مكرَّران.

### 🔴 فحصانِ للقدرة، لا فحصٌ واحد — ولا يُدمَجان

```
①  الوصولُ إلى Lia      مفتاحُ `lia`  (بشقّ التسامح `lia OR reservations`)        ← F0.3
②  قدرةُ العملية        `OP.service_key`:  reservations | catalog | store         ← D9 · الشرط A

ودمجُهما يُعيد تثبيتَ المفتاح من البابِ الآخر، وهو بالضبط ما فكّه F1.
```

### الترتيبُ الكامل — R1 · ٠٩-١٦

```
رسالةٌ واردة
   │
   ├─ C   الهويّة:  التينانت + فاعلٌ نشطٌ بلا لبس        Resolver Lia  (D3-c)
   │         سقوطُه ⇒ صمتٌ + سجلُّ تدقيق
   ├─ ①  الوصولُ إلى Lia:  lia OR reservations           F0.3
   │         سقوطُه ⇒ رفضٌ مُصرَّح  ·  **وهذا وحده ما يحكم الترحيب**
   │
   ├─ [ تُعرَف العملية ]  ← اسمٌ مُحقَّقٌ بـLiteral، ومنه OperationDefinition
   │
   ├─ A   قدرةُ العملية:  client_services{ OP.service_key , isActive }
   ├─ B   صلاحيةُ العملية: is_authorized( C.actor , OP.permission , *OP.legacy_roles )
   │
   └─ إعادةُ C · ① · A · B قبل الكتابة، بنفس OperationDefinition
```

**⇒ `A` لا تُفحَص قبل معرفةِ العملية — إذ لا `OP.service_key` قبلها.** ومحاولةُ فحصِها عند الترحيب
تُجبِر على اختلاقِ عمليةٍ افتراضيّة أو على دمجِ ① و② — وكلاهما مخالف.

### تغييرٌ سلوكيٌّ واحدٌ يراه المالك

الترحيبُ يصير مشروطاً بـ**① الوصولِ إلى Lia** (لا بقدرةِ عملية). اليوم يُرسَل لمالكٍ على تينانتٍ
بلا أيّ قدرة (`:888` يفحص الهويّة وحدها). لا أثرَ على الثلاثة الأحياء — والأثرُ على تينانتٍ
لا يحمل `lia` ولا `reservations`.

**وزرُّ الهروب ثالثٌ مستقلّ (R2):** يبقى على `reservations` — قدرةُ **فلو الزبون** الذي يُسلَّم إليه،
لا ① ولا ②. ودمجُه بأيٍّ منهما يُسلّم مالكاً إلى فلوِ حجزٍ على تينانتٍ بلا حجوزات.

---

# ⚠️ مراجعة سلمان — ٢٠٢٦-٠٩-١٥ · تاريخُ المراجعة، وقد عُولجت

> **حالة الخطّة عند الحفظ: محفوظة ومعتمدة كـArchitecture Discovery مكتملة، ولم يبدأ أي تنفيذ.**
> **قرارُ سلمان حينها:** *«خلي أبو حسين يعمل Save للـMaster Plan الآن. ولا يعدّل التصميم بناءً على
> هالتعليقات حالياً… ما بدي أبو حسين يبلّش Foundation بعد الحفظ.»*
> **وقد عُولجت التعليقاتُ الخمسةُ في جلسات ٠٩-١٥/٠٩-١٦** — وحالةُ كلٍّ منها مُثبَّتةٌ أدناه.
> نصُّها الأصليُّ محفوظٌ كما هو، ولم يُعَد صياغتُه.

## حكمه على الخطّة

```
✅ Architecture discovery مكتملة
✅ F1 مفهوم: Lia ليست Barber capability
✅ F2/F3 واضحان: الـseeder ليس سبباً لمسار كتابة جديد · والحلاق/المنتج يحتاجان shared write path قبل Lia
✅ F4 مهمّ فعلاً لكنه مستقلّ
✅ F5 قرار الإلغاء واضح، والتنفيذ لاحق
🟡 F6 يحتاج تثبيت الصياغة النهائية لتخويل العمليات
🟡 contract_version / LiaOperationResult — لا يُدخَلان تلقائياً
🟡 lia OR reservations جسرُ ترحيل مؤقّت، لا المعمارية النهائية
```

## التعليقات الخمسة — بصيغته

### 🔴 Comment 1 — F1 / §14

> *«استراتيجية `lia OR reservations` تحلّ مشكلة الانقطاع عند التفعيل، لكنها تعني أن Lia لا تصبح
> مستقلة فعلياً طالما `reservations` مفعّلة. لازم نراجع بالجلسة القادمة إذا بدنا هذا كـmigration
> bridge مؤقت فعلاً، وما هو شرط إزالة الـOR بشكل قابل للقياس. لا تنفيذ الآن.»*

**سببه:** الهدف الأصلي من F1 هو **استقلال Lia**
> **🟠 الحالة (٠٩-١٦): مفتوحٌ بقرارٍ — الأولويّة P4، وغيرُ حاجبٍ لبداية Foundation.**
> والـpopulation صار **ثلاثة** لا أربعة بموجب **D0**، فشرطُ السداد يُقاس على الأحياء وحدهم.
> ويلزمه شرطُ خروجٍ بأعدادٍ قابلةِ الفحص (`N₁` الـpopulation · `N₂` الحاملُ لـ`lia` · `N₃` العاملُ بـ`lia` وحدها).
> ومقيسٌ ٠٩-١٦: `N₁=3 · N₂=0 · N₃=0`.
. والـOR ممتاز كجسر، **لكن يجب ألّا يتحوّل إلى وضع دائم.**

> **أثره على §14:** شرط السداد المكتوب هناك («يُحذَف حين يحمل كل تينانت حيّ صفّ lia») **يحتاج
> مراجعة لصياغةٍ قابلة للقياس** — ولم يُعدَّل.

### 🔴 Comment 2 — F6 / §21 D3 — **الأهمّ تقنياً بحكمه**

> *«يوجد تعارض بسيط بين §8 و§15 و§21: التصميم يقول إن authorization يصبح `operation → permission`
> ديناميكي، بينما D3 في §21 ما زال يذكر `is_authorized("reservations.write")` كمثال أساسي. يجب في
> الجلسة القادمة تثبيت الصياغة النهائية: صلاحية العملية تُحدَّد من operation registry/map، وليس من
> Lia نفسها ولا من hardcoded reservations permission.»*

> **والتعارض حقيقيّ ومُعترَف به.**
> **✅ الحالة (٠٩-١٦): مُحسَمٌ بالكامل — وسمُ «لم يُحسَم عمداً» مُزال.**
> الصلاحيةُ تُقرأ من **`OperationDefinition`** (D3-a)، لا من Lia ولا من صلاحيةٍ مثبَّتة.
> وأُضيف حقلٌ رابعٌ لم يكن في الاقتراح الأصليّ: **`legacy_roles`** — لأنّ `is_authorized` يحاكم
> الحساباتَ القديمة (`permissions IS NULL`) على **قائمةِ مسارِها** لا على الصلاحية (Invariant I1)،
> والقوائمُ الحقيقيّةُ أربعٌ مختلفة. وبدونه ينكسر I1 صامتاً. انظر §8 و§15·F0.6 و§21·D3.
 ونشأ لأنّ D3 في §21 **ينقل نصّه هو** من جولة الحجز
> (*«is_authorized("reservations.write")»*) وكان صحيحاً في سياق عملية واحدة — **لكنه يتناقض مع §8
> الذي يجعل الصلاحية مُمرَّرة من خريطة العمليات.** ولم يُصلَح بقراره.

### 🟡 Comment 3 — F4 / §6

> *«نتيجة F4 جيدة، لكن عبارة أن خطر migration "منخفض جداً" تخص إضافة catalog metadata فقط، وليس
> مصالحة الخرائط الأربع نفسها. عند فتح F4 لاحقاً يجب فصل: (1) إضافة المفاتيح للـcatalog،
> (2) توحيد provisioning maps، (3) تغيير runtime behavior إن وجد. لا نخلط مخاطر هذه الثلاثة.»*

**سببه:** إضافة صفوف شيء، وتوحيد الخرائط شيء آخر تماماً.
> **🟡 الحالة (٠٩-١٦): مقبولٌ ومُقسَّمٌ إلى ثلاث مراحل مستقلّة — الأولويّة P7، آخرُ شيء.**
> `F4-A` صفوفُ الكاتالوج (metadata · صفرُ قراءةٍ وقتَ التشغيل) · `F4-B` مصالحةُ خرائط التقديم
> (وقتَ التقديم · تُصيب التينانت القادم وحده) · `F4-C` تغييرُ سلوكِ التشغيل.
> و**`F4-B` شرطٌ لسداد دَينِ الـOR** (خرائطُ البذر لا تحتوي `lia`) — لا لبدايةِ Foundation.


> **وهو تصحيح دقيق:** §6 يقول «خطر migration منخفض جداً — إضافة صفوف كاتالوج لا تلمس سلوكاً»،
> **وهذا صحيح للبند (1) وحده**، ولا يشمل (2) ولا (3). **ولم يُعدَّل النصّ.**

### 🟡 Comment 4 — §19 / Contract

> *«`contract_version` و`LiaOperationResult` ما لازم ننفذهم تلقائياً ضمن Foundation قبل ما نثبت شكل
> operation contract النهائي. نراجع بالجلسة القادمة هل versioning مطلوب الآن فعلاً أم عند دخول
> العملية الثانية، وهل result contract يجب أن يكون transport-independent.»*

**سببه:** *«ما بدي نضيف abstraction بس لأنه "مستقبلياً ممكن نحتاجه".»*
— وهو تطبيقٌ حرفيّ لقاعدة التجريد في هذا المشروع (`rules/team-roles.md`).
> **🟡 الحالة (٠٩-١٦): مُؤجَّلانِ بقرار — P5 و P6. ولا يدخلان Foundation.**
> `contract_version`: أطولُ أثرٍ محفوظٍ عند Lia **عشرُ دقائق** (`DRAFT_WINDOW_MIN = 10`)،
> ويُعاد التحقّقُ منه بالعقد **الحالي** عند الكتابة، ومخرَجُ النموذج لا يُحفَظ إطلاقاً ⇒ لا مشكلةَ قائمة.
> وشرطُ فتحه: أثرٌ محفوظٌ يعبُر محادثةً أو نشراً.
> `LiaOperationResult`: مستهلكٌ **واحد** (`whatsapp_flow.py:474`) و**٢٢** نداءَ إرسالٍ داخل Lia
> ⇒ حالةٌ واحدة، وقاعدةُ التجريد تطلب اثنتَين. وشرطُ فتحه: مستهلكٌ/واجهةٌ ثانيةٌ حقيقيّة.


### 🟡 Comment 5 — §15

> *«قبل تنفيذ Foundation، نريد إثبات أن `lia` كـcapability لا تعني أن Lia تعمل مع كل tenant
> تلقائياً. يجب أن يبقى activation + operation permission + tenant identity شروطاً منفصلة، مع
> الحفاظ على existing sender-based authorization.»*

> **ويُلاحَظ أنّ الشروط الثلاثة منفصلة اليوم فعلاً** (`_resolve_owner` للهويّة ·
> `is_authorized` للصلاحية · `_tenant_has_reservations` للتفعيل) — **والمطلوب إثباتُ بقائها منفصلة
> بفحوصٍ صريحة، لا الاكتفاء بأنها كذلك.**
> **✅ الحالة (٠٩-١٦): مُحسَمٌ بـD9 — والاستقلالُ صار أربعةَ نوافٍ لكلٍّ فحصُه.**
> وقياسُ ٠٩-١٦ أثبت أنّ الانفصالَ لم يكن تامّاً كما ظُنّ: المسارُ A في `_resolve_owner:192`
> **يدمج C و B** (رقمُ المحلّ = الهويّةُ = التخويل، بلا `is_authorized` إطلاقاً)، وفرعُ الترحيب
> `:888` **لا يفحص القدرة أصلاً**. فـD9 يُصلح الاثنين، وD3-2 يفصل C عن B بنيويّاً.


---

## ✅ ما كان مطلوباً، وما صار عليه — ٠٩-١٦

| كان | صار |
|---|---|
| ١ تثبيت صياغة تخويل العمليات (Comment 2) | ✅ **محسوم** — D3-a · §8 · §21·D3 |
| ٢ شرط قابل للقياس لإزالة الـOR (Comment 1) | 🟠 **مفتوحٌ بقرار** — P4 · غيرُ حاجب · والأعدادُ الثلاثة في §14 |
| ٣ قرار versioning و result contract (Comment 4) | ✅ **محسوم: مؤجَّلان** — P5 · P6 |
| ٤ تقسيم F4 إلى ثلاث مخاطر (Comment 3) | ✅ **محسوم: ثلاثُ مراحل** — P7 · عند فتحه |
| ٥ فحوص انفصال الشروط الثلاثة (Comment 5) | ✅ **محسوم** — D9 · وأربعةُ نوافٍ لكلٍّ فحصُه |

**والشرطُ القديم «Foundation لا تبدأ قبل (١) و(٥)» مُستوفى.** وأُضيف إليهما ما لم يكن على أي
قائمة: **D3-b** (هويّةُ فاعلِ مسارِ رقم المحلّ) و**D3-c** (سياسةُ حلّ الفاعل) — وكلاهما محسومٌ الآن.

## الأولويّاتُ الباقية — بترتيب سلمان ٠٩-١٦

```
🔴 P0 D3-b   ✅ محسوم        🔴 P2 D3-a   ✅ محسوم        🟠 P4 D2-b   مفتوح · غيرُ حاجب
🔴 P1 D3-c   ✅ محسوم        🔴 P3 D9     ✅ محسوم        🟡 P5 contract_version · P6 Result · P7 F4
```

---
---

# Lia Expansion — Architecture Master Plan

> **دراسة وتصميم فقط.** لا كود · لا schema · لا migration · لا ميتا · لا كتابة إنتاج · لا commit · لا push · لا remediation.
> **كل رقم ومسار أدناه مقيس** من الكود أو من قاعدة الإنتاج (قراءة فقط). وما لم يُقَس مكتوبٌ **UNKNOWN** صراحةً.
> **ولا شيء أدناه معتمد.** الاتجاهات مقترحات، والقرار قرار سلمان.
> **الحالة:** `HEAD = origin/main = الإنتاج = 6cbdf16` · غير مُودَع: `M scripts/inspect_whatsapp_templates.py` (Phase T).
> يستند إلى: `.claudedocs/plans/lia-expansion-architecture-discovery.md` · `lia-create-reservation.md` · `lia-owner-data-entry.md` · `capabilities/lia.md`.

---

## 1 · Executive Summary

Lia تعمل اليوم بعملية واحدة مُثبَتة بالإنتاج: `Lia → admin_create_service → CatalogService`. والتوسّع إلى عملية ثانية **يكسر ثلاثة افتراضات ضمنية** لم تكن مرئية بعملية واحدة:

```
١  Lia بلا مفتاح تفعيل، ومبوَّبة على serviceKey="reservations" الذي ليس مفتاحها
٢  Lia تفحص صلاحية واحدة (services.write) لكل عملياتها المستقبلية
٣  حلاقٌ ومنتجٌ لا يملكان دالّة كتابة قابلة لإعادة الاستعمال — الـroute هو مسار الكتابة
```

**والخلاصة العملية:**

| | |
|---|---|
| **يُفعَل** | مقدّمة معمارية صغيرة (مفتاح Lia + تفصيل الصلاحية) **قبل** أي عملية ثانية |
| **ثمّ** | **الحجز** — أقرب شريحة جاهزة، ولا تعتمد على استخراج أي مسار كتابة |
| **لا يُفعَل الآن** | الحلاق والمنتج — يلزمهما استخراج قدرتَي كتابة، وهو `safe-refactor` مستقلّ |
| **لا يُفعَل الآن** | مصالحة `platform_services` — ورقة نظافة مستقلّة، **لا تحجب Lia** |
| **الخطر الأكبر** | تبويب Lia على مفتاحها **يُطفئها على الثلاثة** حتى تُفعَّل ⇒ استراتيجية تفعيل إلزامية |

---

## 2 · Current Architecture

```
Meta webhook
  └─ whatsapp_flow._dispatch
       ├─ _extract_message           أربعة أشكال: text · button_reply · list_reply · template_button
       ├─ _peek_session              لا جلسة وهمية لمُرسِل مجهول
       ├─ whatsapp_merchant_actions  ← تينانتها من رقم المُرسِل
       ├─ lia_owner_entry.try_handle ← تينانتها من رقم المُرسِل  (قبل حلّ التينانت، بعد إصلاح df35d62)
       ├─ _resolve_client            ← تينانت القناة: deep-link · slug في النصّ · جلسة مرتبطة
       └─ حالات الفلو                 IDLE · RES_* · AWAITING_* (الفلو العقاريّ)
```

**وطبقات Lia الداخلية** (`app/services/lia_owner_entry.py`، ٩٠٠+ سطر):

```
بوابة نصّية رخيصة        _looks_like_service_entry  (فعل AND مفعول، len ≥ 6)
حلّ الفاعل والتينانت       _resolve_owner   رقم → User → is_authorized("services.write") → client_id, actor
بوابة الخدمة              _tenant_has_reservations   clientservice{serviceKey:"reservations"}
استخراج                   _extract → LiaExtraction (Pydantic)
استكمال                   _advance / LIA_AWAITING_FIELD / _parse_field_answer
تعديل (P1)                _extract_edit → LiaEditPatch → merge → _advance
معاينة                    _preview_text → LIA_AWAITING_CONFIRM
كتابة                     _commit → clear_draft() → validate → _still_authorised → admin_create_service
```

---

## 3 · Current Runtime Truth

### مصدر الحقيقة وقت التشغيل — بالدليل

```
require_service()                 app/core/services.py:36-62
  prisma_client.clientservice.find_first(clientId · serviceKey · isActive:True)
  وإلّا 403 "Service 'X' is not activated for this tenant."

قراءات platform_services خارج app/api/v1/super/platform_services.py:   صفر
```

**⇒ `client_services` هو مصدر الحقيقة. `platform_services` كاتالوج منتج (اسم · وصف · أيقونة · سعر · ترتيب) لا يبوّب سلوكاً.**

### المفردات الثلاث — مقيسة على الإنتاج

```
platform_services       ١٥ مفتاحاً
ACTIVATABLE_KEYS         ٦ مفاتيح   (admin/client_services.py:57)
مستعمل فعلاً            ١٠ مفاتيح · ٣٢ صفّاً
```

| المفتاح | نشط | معطَّل | في الكاتالوج | قابل للتفعيل الذاتي |
|---|---|---|---|---|
| `whatsapp_ordering` | 6 | 0 | ✅ | ❌ |
| `catalog` | 4 | 2 | 🔴 **لا** | ✅ |
| `reservations` | 4 | 0 | 🔴 **لا** | ✅ |
| `store` | 4 | 0 | ✅ | ✅ |
| `booking` | 3 | 1 | ✅ | ❌ |
| `restaurant` | 2 | 0 | ✅ | ✅ |
| `store.cart` · `store.products` | 2 | 0 | ✅ | ❌ |
| `gallery` | 1 | 0 | ✅ | ✅ |
| `restaurant.menu` | 1 | 0 | ✅ | ❌ |

```
✅ مفاتيح نشطة خارج المفردتين معاً:  صفر        ← لا مفتاح حرّ في الإنتاج
🔴 reservations و catalog يبوّبان كوداً حقيقياً وغائبان عن الكاتالوج
🔴 booking في الكاتالوج بـ49$ ولا يبوّب شيئاً   (مسجَّل في rules/backend/service-system.md §2b)
⚪ سبعة مفاتيح في الكاتالوج بلا أي صفّ:  ai_bot · analytics · whatsapp_blast
     restaurant.delivery · restaurant.table_booking · store.loyalty · store.wishlist
```

---

## 4 · F1 Analysis — هل Lia قدرة مستقلّة؟

### الواقع

```
'lia' في platform_services   صفر صفّ
'lia' في client_services      صفر صفّ
serviceKey خاص بها             لا وجود له
البوّابة الفعلية                _tenant_has_reservations()  ⇒  serviceKey = "reservations"
```

**قياسٌ بالمُحلِّل الحقيقي `_resolve_owner` (٢٠٢٦-٠٩-١٥):**

| الرقم | الشخص | التينانت | actor | Lia تعمل؟ |
|---|---|---|---|---|
| `96176985477` | حسين | `rk` | `owner` | ✅ |
| `96170764479` | جعفر | `rk` | `admin` | ✅ |
| `96178727986` | سلمان | `barberlab-test` | `owner` | ✅ |

### الإثبات أنّ Lia **ليست** خدمة Barber

```
✅ لا شيء في lia_owner_entry.py يقرأ Client.vertical ولا موديل Barber
✅ ما تكتبه CatalogService — وهو جدول كاتالوج عامّ لا جدول حلاقة
✅ عقدها capabilities/lia.md بأقسام القدرات الثلاثة عشر، لا .claude/agent/
🔴 والارتباط الوحيد بالحلاق **عرضيّ**: تبويبها على reservations، وهو الخدمة التي
   يستعملها فلو الحلاق — لا خدمةٌ تعرّفها هي
```

**⇒ الارتباط بالـBarber صدفةُ تبويب لا خصيصةَ تصميم.** وLia قدرةٌ مستقلّة **بالفعل** في كل شيء إلّا مفتاحها.

### والـvertical طبقةٌ منفصلة أصلاً — بالدليل

`app/core/verticals.py` — ونصُّه حاسم:

```
«Platform-owned (app/core/), not a Tenant OS Capability itself — it has no tenant data,
 no Interface, no client-facing success measure (fails TOS-003's Capability Proposal Gate
 on purpose).»
«Read-only, developer-maintained. No runtime write path exists or should ever exist here.»

VERTICAL_REGISTRY["barber"] = {
  default_services: [reservations, catalog, whatsapp_ordering],
  page_template:    None,
  staff_backing_model: "Barber",
}
```

**⇒ النموذج الصحيح موجود ومُعلَن: `vertical` = سياق provisioning، و`capability` = بوّابة تشغيل.**
فـLia **لا تُربَط بالـvertical**؛ تُربَط بمفتاحها، والـvertical يحدّد ما يُفعَّل تلقائياً لتينانت جديد.

---

## 5 · F2/F3 — Shared Write Paths

### مسحٌ شامل لكل ملفّات `app/api/v1/admin/` التي تكتب

| الملفّ | كتابات | خدمة | repo | نطاق الحلاق |
|---|---|---|---|---|
| `catalog.py` | 7 | **9** ✅ | 0 | ✅ فئة/عنصر |
| `catalog_services.py` | 2 | **3** ✅ | 0 | ✅ الخدمة |
| `reservations.py` | 4 | **3** ✅ | 0 | ✅ الحجز |
| `content.py` | 8 | **3** ✅ | 0 | ✅ المحتوى |
| `settings.py` | 1 | **1** ✅ | 0 | ✅ |
| `media.py` | 4 | **`media_service`** ✅ | 0 | ✅ |
| `barbers.py` | 4 | 0 | **3** 🔴 | ✅ **الحلاق** |
| `store.py` | 7 | 0 | **7** 🔴 | ✅ **المنتج** |
| `team.py` | 5 | 0 | **5** 🔴 | ✅ الموظّف |
| `gallery.py` · `upload.py` | 5 | 0 | 0 | عبر `_gallery` helper |
| `units` · `restaurant` · `resources` · `services` · `bookings` · `fleet` · `properties` | 24 | 1 | **22** 🔴 | ❌ عموديات أخرى |

### الفجوة بالكود

```python
# app/repositories/barber_repo.py:47
async def create_barber(data: dict):
    return await prisma_client.barber.create(data=data)          # ← قاموسٌ خام، بلا client_id

# app/repositories/admin_catalog_repo.py:135
async def create_item(data: dict):
    return await prisma_client.catalogitem.create(data=data)     # ← مثله
```

### 🔴 والقيود تعيش في الـroute — وأثرها مدفوع الثمن

`app/api/v1/admin/barbers.py:120-137` يفرض ثلاثة أشياء **لا تعرفها `create_barber`**:

```python
"clientId": tenant["id"],                        # وتعليقها: CRITICAL: always the current tenant
"phone":    normalize_for_storage(body.phone),   # 🔴 قاعدة .claude/rules/phone-numbers.md
data["workingHours"] = Json(body.working_hours)
```

**و`normalize_for_storage` هي القاعدة التي وُلدت من عطل جعفر الحقيقي** — ستة أيام مقفولاً خارج حسابه لأن رقمه خُزِّن بلا رمز دولة. **فمستدعٍ ثانٍ ينسى السطر يُعيد العطل نفسه.** والقاعدة تنصّ أنّ التطبيع **حدثٌ عند حدود الـAPI** ⇒ أيّ حدٍّ جديد (Lia) يلزمه.

**وتباينٌ يُثبت أنّ هذا سهوٌ لا تصميم:** `update_barber(client_id, barber_id, data)` **يأخذ `client_id` صراحةً** وموثَّق «scoped to tenant» بموجب تدقيق Study 7 — **فالتحديث حُصِّن والإنشاء لم يُحصَّن.**

### الفرق بين أدوات البذر والكتابة التشغيلية

| | seed/import tooling | production business write |
|---|---|---|
| المُدخَل | ملفّ JSON يكتبه مطوّر | رسالة إنسان أو نموذج |
| الثقة | مُراجَع قبل التشغيل | غير موثوق بالتعريف |
| التطبيع | **يُكتب canonical أصلاً** (قاعدة `phone-numbers.md`: طبقتان ومسؤوليّتان) | **يُطبَّع عند الحدّ** |
| التخويل | صلاحية المشغّل على الجهاز | `is_authorized` لكل عملية |
| الإشعارات | لا تُطلَق | تُطلَق |

**⇒ البذر لا يجب أن يستعمل نفس المسار، ولا يُشترَط.** والقاعدة موجودة ومُعلَنة، فلا قرار جديد هنا — فقط **لا نُجبر الـseeders على المرور بالمسار المُخوَّل**.

### والبذر مقيس الآن — ولا سكربت يمرّ بطبقة الخدمة

```
صفر سكربت ينادي admin_create_service · admin_create_item · create_reservation
الاستثناءان الوحيدان:
   seed_from_rk_template.py:208   → provisioning_service.provision_barber_domain   (منسّق provisioning، لا admin_create_*)
   seed_catalog.py:160            → HTTP إلى POST /admin/catalog/items             (يمرّ بالمكدّس كاملاً)
وكل ما عداه: prisma مباشر أو SQL خام، ويُعيد بناء الافتراضات التي تملكها الخدمة
   (isActive · isFeatured · sortOrder · currency)
```

**🟢 و`Barber.phone` في البذر ليس خرقاً — بل تطبيقُ القاعدة:** `seed_barber_arch_test.py:83,90` يكتب `"96170111111"` **canonical أصلاً** بلا نداء المُطبِّع، وهو **بالحرف** ما تنصّ عليه `phone-numbers.md` («طبقتان ومسؤوليّتان: التطبيع حدثٌ عند حدود الـAPI، وبيانات البذر تُكتَب canonical في الأصل»). و`provision_barber_domain` **لا يكتب هاتفاً إطلاقاً** ⇒ لا خرق.

**🔴 وثلاثة اكتشافات جانبية مسجَّلة ولا تُفتَح:**

```
١  جدولان من الـrepo يكتبان catalog_services:  catalog_service_repo.create_catalog_service:34
   و service_repo.create_service:82  ← تصادم الأسماء الذي يحذّر منه docstring الأول
٢  تحديثان غير مُنطَّقين في سكربتات:  set_hassan_barber_hours.py:58
   و update_hr_barber_and_services.py:84  →  barber.update(where={"id":…}) بلا clientId
   وهو النمط الذي أُعيد كتابة barber_repo.update_barber:57-70 لإلغائه
٣  seed_from_rk_template.py غير متّسق داخلياً: خدمة للحلاق الأول (:208) · repo للباقي (:217)
   و prisma خام لمنتجات المتجر (:236)
```

---

## 6 · F4 — Platform Service / Capability / Vertical Alignment

### الأجوبة المقيسة

| السؤال | الجواب |
|---|---|
| ما هو Platform Service Catalog؟ | `platform_services` — ١٥ صفّاً: مفتاح · module · اسم · وصف · أيقونة · **سعر شهري** · ترتيب. **عرضٌ وتسعير.** |
| مصدر الحقيقة وقت التشغيل؟ | `client_services` عبر `require_service()` — حصراً |
| أين تُمثَّل الـverticals؟ | `Client.vertical` (عمود) + `app/core/verticals.py::VERTICAL_REGISTRY` (كود، read-only) |
| كيف يعرف الـruntime أنّ التينانت يملك قدرة؟ | صفّ `client_services` بـ`serviceKey` و`isActive=True` |
| لماذا قدراتٌ غائبة عن الكاتالوج؟ | **لأنّ الكاتالوج لم يُحدَّث عند إضافتها.** `reservations` وُلد من محرّك الحجوزات، و`catalog` من توحيد Phase 54 — ولا أحدهما مرّ بالكاتالوج |
| هل هي متسقة؟ | 🔴 **لا.** أدناه |
| هل يجب أن يُعرَف كل capability في الكاتالوج؟ | **قرار** — والاتجاه المقترح: نعم، ليصير الكاتالوج قائمة المفاتيح المعروفة |
| كيف يجب تمثيل vertical؟ | كما هو: **طبقة provisioning منفصلة** لا capability. ونصّ `verticals.py` يقرّر ذلك بنفسه |
| هل يحتاج vertical↔capability جدولاً؟ | **لا.** `VERTICAL_REGISTRY` يفعلها، والملفّ يمنع مسار كتابة runtime صراحةً |
| ما هو canonical؟ | `client_services` (تشغيل) · `Client.vertical` + `VERTICAL_REGISTRY` (provisioning) |
| ما هو metadata؟ | `platform_services` بكامله — عرض وتسعير |
| خطر الـmigration؟ | **منخفض جداً** — إضافة صفوف كاتالوج لا تلمس سلوكاً (صفر قراءة runtime) |
| التوافق الخلفي المطلوب؟ | لا تُحذَف مفاتيح · لا يُعاد تسمية شيء · `booking` يبقى رغم أنه لا يبوّب |

### 🔴 والتباين الأخطر: **أربع خرائط للخدمات الافتراضية، تختلف أربعتها**

```
app/core/verticals.py           VERTICAL_REGISTRY["barber"]   = [reservations, catalog, whatsapp_ordering]
app/services/registration_…     _SERVICE_SEED_MAP["barbershop"]= [booking, reservations, catalog, whatsapp_ordering]
app/services/demo_service.py    _SERVICE_MAP["barbershop"]     = [booking, reservations, catalog, whatsapp_ordering]
app/core/services.py            SERVICE_TYPE_MAP["services"]   = [catalog]
app/core/services.py            DEFAULT_SERVICES               = [booking, gallery, whatsapp_ordering]
```

**والواقع على الثلاثة:**

```
barberlab-test   reservations · store · whatsapp_ordering                  (لا catalog)
rk               reservations · store · whatsapp_ordering  (+booking, catalog معطَّلان)
mr-h             booking · reservations · whatsapp_ordering                (لا catalog, لا store)
```

**⇒ ولا واحدٌ من التينانتات الثلاثة الحيّة يطابق أيّاً من الخرائط الأربع. و`store` نشط على اثنين ولا يظهر في أي خريطة barber — فعُلِّل باليد.**

**اتجاه مقترح (F4):** ورقة نظافة مستقلّة تجعل `VERTICAL_REGISTRY` المصدر الوحيد للافتراضات، وتُضيف المفاتيح الغائبة إلى الكاتالوج. **ولا تحجب Lia** — فالتوسّع لا يقرأ أيّاً منها.

---

## 7 · F5 — إلغاء مسار serviceKey الحرّ

### الواقع

| السطح | من | تحقّق المفتاح |
|---|---|---|
| `PATCH /super/clients/{id}/services` | `require_super_admin` | 🔴 **لا شيء** — أي نصّ يُقبَل ويُكتَب |
| `POST /admin/client-services/activate` | `require_roles("SUPER_ADMIN","TENANT_ADMIN")` | ✅ `ACTIVATABLE_KEYS` وإلّا 400 |
| seeders · `VERTICAL_REGISTRY` · الخرائط الأربع | سكربت | بحسب السكربت |

- **من يقبله:** `ClientServiceToggle.service_key: str` بلا قيد
- **أين يُخزَّن:** `client_services.service_key` — عمود نصّيّ، `@@unique([clientId, serviceKey])`
- **من يستهلكه:** `require_service()` فقط (٣٢ نقطة لـ`reservations`، ١٦ لـ`catalog`، ١٣ لـ`store`، ١٢ لـ`restaurant`)
- **هل يعتمد إنتاجٌ على مفتاح حرّ؟** 🟢 **لا — صفر.** كل المفاتيح العشرة المستعملة داخل المفردتين
- **هل يمكن إزالة المسار بلا كسر runtime؟** 🟢 **نعم** — صفر مفتاح خارج القائمة المعروفة
- **البديل:** التحقّق من اتّحاد `platform_services.key ∪ ACTIVATABLE_KEYS` (١٨ مفتاحاً)، أو من قائمة مفاتيح معروفة واحدة بعد مصالحة F4
- **الكاتالوج مصدر الحقيقة للمفاتيح؟** ليس اليوم — **يصير كذلك** إن نُفِّذت F4
- **الـvertical جزء من الكاتالوج؟** **لا** — طبقة منفصلة، ونصّ `verticals.py` يقرّره

**والخطر الحقيقي للمسار الحرّ:** مفتاحٌ مطبعيّ يُنشئ صفّاً **نشطاً وصامتاً** يبوّب لا شيء، و`require_service` يرفض للأبد بحثاً عن مفتاح لا يُكتب هكذا في أي موضع آخر.

---

## 8 · F6 — Operation-aware Lia Authorization

> ## ✅ القرارُ المحسوم (٠٩-١٦) — وهو النافذ
>
> ```
> اسمُ العملية (Literal · من النموذج)  ──►  السجلّ (في الكود)  ──►  OperationDefinition
>                                 ( permission , legacy_roles , service_key , write_fn )
> ```
>
> | الحقل | مصدرُه — موضعٌ قائمٌ في المستودع | ما ليس هو |
> |---|---|---|
> | `permission` | أوّلُ وسيطٍ في `require_permission` على مسارِ اللوحة نفسِه | ليست صلاحيةً جديدة · ولا تأتي من النموذج |
> | `legacy_roles` | **قائمةُ ذلك المسار حرفيّاً** | ليست قائمةً موحَّدةً لكلّ العمليات |
> | `service_key` | `require_service(...)` على ذلك المسار | **ليس `reservations` المثبَّت في Lia اليوم** |
> | `write_fn` | دالّةُ `app/services/*.py` | **ليست repo** · وغيابُها ⇒ العمليةُ لا تُسجَّل (a-2) |
>
> **ولماذا لا يُنشئ هذا صلاحيةً لـLia:** العمليةُ تُقدّم **السؤال** (أيُّ صلاحيةٍ وأيُّ أدوارٍ قديمةٍ
> وأيُّ مفتاح)، والفاعلُ الإنسانُ يُقدّم **الجواب**. و`is_authorized(user, permission, *legacy_roles)`
> هو المحمولُ نفسُه الذي يستعمله `require_permission` على اللوحة، بنفس الوسيطَين —
> **فالسؤالُ في WhatsApp هو السؤالُ في اللوحة حرفيّاً**، ولا كتابَ قواعدَ ثانياً.
> والسابقةُ قائمةٌ في المستودع مرّةً واحدة: `whatsapp_merchant_actions.py:347`.
>
> ### القيمُ الحقيقيّة — مقيسةٌ ٠٩-١٦، لا مفترضة
>
> | العملية | `permission` | `legacy_roles` | `service_key` | `write_fn` |
> |---|---|---|---|---|
> | `create_service` | `services.write` | `SUPER_ADMIN, TENANT_ADMIN` | `reservations` | 🟢 `catalog_service_service.admin_create_service` |
> | `create_reservation` | `reservations.write` | `SUPER_ADMIN, TENANT_ADMIN, MANAGER_RESERVATIONS, STAFF` | `reservations` | 🟢 `reservation_service.create_reservation` |
> | `create_catalog_item` | `catalog.write` | `SUPER_ADMIN, TENANT_ADMIN, MANAGER_RESERVATIONS, MANAGER_UNITS` | `catalog` | 🟢 `catalog_service.admin_create_item` |
> | `create_barber` | `staff.write` | `SUPER_ADMIN, TENANT_ADMIN` | `reservations` | 🔴 **لا شيء** — `barber_repo.create_barber` |
> | `create_product` | `store.write` | `SUPER_ADMIN, TENANT_ADMIN, MANAGER_RESERVATIONS` | `store` | 🔴 **لا شيء** — repo + الـroute |
>
> **⇒ القوائمُ القديمةُ أربعٌ مختلفة، والمفاتيحُ ثلاثة.** فحقلٌ واحدٌ للصلاحية لا يكفي، و`reservations`
> المثبَّتُ يقيس قدرةً لا تبوّب العملية. والعمليتان بلا دالّةِ خدمةٍ **لا تُسجَّلان** (a-1/a-2).
>
> **ما يجب ألّا يكون في التعريف:** نصُّ رسالةٍ أو صياغةٌ · مُعرِّفاتُ ميتا/`wamid`/أزرار ·
> مُعرِّفُ تينانتٍ أو فاعلٍ (يأتيان من الحلّ) · أيُّ قيمةٍ يُنتجها النموذج غيرَ الاسم ·
> صلاحيةٌ خاصّةٌ بـLia (I-7) · ومفتاحُ `lia` نفسُه — فهو طبقةُ **الوصول** (F0.3) لا قدرةُ العملية.

### الواقع — قياسُ ٠٩-١٥/٠٩-١٦ (تاريخُ الدراسة)

> **🔴 وقياسُ ٠٩-١٦ أضاف ما لم يكن على أي قائمة:** `_resolve_owner` مسارانِ، و**الأوّلُ يعود قبل أيّ
> فحصِ صلاحية** — `:192` يعيد `(client_id, "owner", client_id)` بلا `User` وبلا `is_authorized`.
> ومقيسٌ أنّ أرقامَ المحلّ الستّة للتينانتات الحيّة تسلك هذا المسار. فنصُّ «الواقع» أدناه يذكر `:207`
> وهو صحيحٌ **للمسار الثاني وحده**. وهذا ما حسمه **D3-2**.

```
lia_owner_entry.py:207   is_authorized(user, "services.write", "SUPER_ADMIN", "TENANT_ADMIN")   ← داخل _resolve_owner
lia_owner_entry.py:683   _still_authorised() ⇒ يعيد نداء _resolve_owner ⇒ يورث نفس التثبيت
```

### العمليات المستخرجة من المستودع (لا مفترضة)

| العملية | صلاحية اللوحة | بوّابة الخدمة | طبقة كتابة؟ | حالة Lia |
|---|---|---|---|---|
| `create_service` | `services.write` | `reservations` | ✅ | ✅ حيّة |
| `create_reservation` | `reservations.write` | `reservations` | ✅ | 🟡 مدروسة |
| `create_category` | `_WRITE` (catalog.py) | `catalog` | ✅ | ⚪ ممكنة |
| `create_catalog_item` | `_WRITE` | `catalog` | ✅ | ⚪ ممكنة |
| `create_barber` | `staff.write` | `reservations` | 🔴 | 🔴 محجوبة بـF2 |
| `create_product` | `store.write` | `store` | 🔴 | 🔴 محجوبة بـF2 |
| `update_service` | `services.write` | `reservations` | ✅ | 🔵 لاحقاً |
| تغيير حالة حجز | `reservations.write` | `reservations` | ✅ | 🔵 لاحقاً |

**الأثر في الاتجاهين، مقيساً على `PRESET_STAFF = [reservations.write, staff.read, services.read]`:**

```
🔴 حاملُ reservations.write وحدها  ⇒  يُرفَض من Lia اليوم رغم أحقيّته بالحجز
🔴 حاملُ services.write            ⇒  سيُقبَل لعملية لا يملكها لو وسّعنا بلا تفصيل
```

### الأجوبة على أسئلتك التسعة

| السؤال | الجواب المقترح |
|---|---|
| كيف تعرف Lia أي عملية؟ | البوّابة الرخيصة أولاً (نمط لكل عملية) ثمّ `operation` في مخرَج النموذج، **مُحقَّقاً بـ`Literal`** — لا نصّاً حرّاً |
| كيف تُختار الصلاحية؟ | خريطة **في الكود** `OPERATION → (permission, service_key, write_fn)` — لا من النموذج |
| أين التخويل؟ | قبل أيّ نداء نموذج (كما اليوم: `_resolve_owner` يسبق `_extract`) |
| قبل المعاينة؟ | **نعم** — وهو السلوك الحالي، يُحفَظ |
| إعادة التخويل وقت الكتابة؟ | **نعم** — `_still_authorised` يُحفَظ، **ويُمرَّر إليه مفتاح العملية** بدل التثبيت |
| كيف نمنع صلاحية Lia الواسعة؟ | **لا صلاحية لـLia إطلاقاً.** الفاعل هو الإنسان، والصلاحية صلاحيته على تلك العملية |
| capability غير مفعَّلة؟ | رفضٌ مُصرَّح: «هالميزة مش مفعّلة على محلّك» — كما `_tenant_has_reservations` اليوم |
| صلاحية موجودة وcapability لا؟ | **الاثنان شرطان تراكميّان** — الرفض يذكر أيّهما سقط (لغير الصامت) |
| عملية غير مدعومة؟ | `Literal` يرفضها عند Pydantic ⇒ سؤال لا تخمين (نفس نمط `LiaIntent` اليوم) |

---

## 9 · Lia JSON/Pydantic Contract

### العقد الحقيقي المستخرج من الكود القائم

```python
# app/schemas/lia_drafts.py
LiaIntent = Literal["create_service"]                 # قصدٌ واحد اليوم

class LiaExtraction:      extra="forbid"
    intent: LiaIntent · confidence: Literal[high|medium|low] · data: dict · unresolved: list[str]

class LiaServiceDraft:    name_ar(2..200) · price(>0, ≤100k) · duration_min(5..480, %5==0)
                          currency(USD|LBP) · name_en? · description_ar?

class LiaDraftChanges:    كل الحقول Optional · نفس الحدود · .applied() يُسقِط غير المضبوط
class LiaEditPatch:       extra="forbid" · intent: Literal["edit_draft"] · confidence · changes · unresolved
```

**والمسوّدة في `whatsapp_sessions.stateData.lia`**: `client_id · actor · actor_id · category_id · category_name · data · asking · started_at`.

### المبادئ المُنفَّذة فعلاً (لا مقترحة)

```
✅ لا معرّفات من النموذج      category_id يُحلّ في الباكند · وlia_drafts يشرح استثناءه صراحةً
✅ الأسماء لا المعرّفات        النموذج يُنتج name_ar · الباكند يحلّ
✅ extra="forbid"            حقلٌ مُختلَق يُرفَض لا يُقلَّم
✅ unresolved                إقرار النموذج بما لم يقرأه ⇒ سؤال لا قيمة مُختلَقة
✅ patch جزئي                والنتيجة المُتحقَّقة تُهمَل ⇒ لا حقن افتراضات
✅ مسوّدة ≠ مكتوب             معاينة → تأكيد → كتابة، وإعادة تحقّق عند الكتابة
✅ الاستهلاك قبل الكتابة       clear_draft() أولاً ⇒ نقرة مزدوجة لا تُنشئ صفّين
```

### الفجوات

```
🔴 لا حقل إصدار (schema version) في أي عقد   ⇒ لا سبيل لتطوير العقد بتوافق خلفي
🔴 نتيجة التخويل والفشل ليست جزءاً من العقد     ⇒ منطق النتائج مبثوث في try_handle
🟡 tenant context ليس في العقد                 ⇒ في المسوّدة (client_id) لا في مخرَج النموذج — وهذا صحيح
```

**واتجاه مقترح:** `operation` بدل `intent` مع `Literal` موسَّع، و`contract_version: Literal["1"]`، ونوع نتيجة صريح `LiaOperationResult` يحمل (نجاح · رفض تخويل · رفض قدرة · فشل تحقّق · غير متوفّر).

> ## ✅ القرارُ المحسوم (٠٩-١٦)
>
> ```
> operation بـLiteral موسَّع     ✅ مُعتمَد — وهو اسمُ العملية الذي يفتح OperationDefinition (D3-a)
> contract_version                🟡 مؤجَّل — P5.  لا يدخل Foundation
> LiaOperationResult              🟡 مؤجَّل — P6.  لا يدخل Foundation
> ```
>
> **سببُ التأجيل، مقيساً لا مُقدَّراً:** أطولُ أثرٍ محفوظٍ عند Lia **عشرُ دقائق**
> (`DRAFT_WINDOW_MIN = 10`، والفحصُ في `lia_owner_entry.py:502`)، ويُعاد التحقّقُ منه بالعقد
> **الحالي** عند الكتابة، ومخرَجُ النموذج **لا يُحفَظ إطلاقاً** ⇒ لا يوجد أثرٌ يعيش أطولَ من الكود
> الذي كتبه، فلا مشكلةَ يحلّها حقلُ الإصدار اليوم. و`LiaOperationResult`: مستهلكٌ **واحد**
> (`whatsapp_flow.py:474`) و**٢٢** نداءَ إرسالٍ داخل Lia ⇒ Lia **هي** القناة، لا خدمةٌ تُعيد نتيجةً
> لقناة. وقاعدةُ التجريد (`rules/team-roles.md`) تطلب حالتَين حقيقيّتَين مستقلّتَين.
>
> **وشرطُ فتحِ كلٍّ منهما، قابلاً للفحص:** `contract_version` ⇐ أوّلُ أثرٍ محفوظٍ يعبُر محادثةً أو
> نشراً. و`LiaOperationResult` ⇐ مستهلكٌ/واجهةٌ ثانيةٌ حقيقيّة (لوحةُ التحكّم مثلاً)، لا توقُّعُها.
>
> **وإن اعتُمد `LiaOperationResult` لاحقاً:** يحمل `outcome` · `operation` · `client_id` ·
> `actor`/`actor_id` · `entity_id` عند النجاح · و`refusal_reason` **رمزاً لا نثراً**. ولا يحمل
> نصَّ رسالةٍ ولا `wamid` ولا أزراراً ولا سلاسلَ صلاحيات. والرسائلُ العربيّةُ الـ٢٢ **تبقى في القناة**.

---

## 10 · LLM Token / API Usage Architecture

### الواقع — مقيس

```
الموديل            claude-haiku-4-5-20251001            (موضعان: :402 و :458)
max_tokens         512
مهلة (timeout)     🔴 غير مضبوطة — افتراض المكتبة
إعادة المحاولة     🔴 غير مضبوطة — لا max_retries ولا backoff
رصد الاستهلاك      🔴 صفر — لا input_tokens ولا output_tokens ولا زمن مُسجَّل
حدّ المعدّل          يُصنَّف كـ_UNAVAILABLE ولا يُعاد المحاولة
```

**تصنيف الفشل القائم — وهو جيّد ويُحفَظ:**

```python
AuthenticationError · PermissionDeniedError · APIConnectionError · RateLimitError
   ⇒ _UNAVAILABLE     «عطبٌ عندنا» — لا يُلام المالك، والمسوّدة تُحفَظ
كل ما عداه            ⇒ None          «ما فهمت» — سؤال
JSON مشوَّه            ⇒ model_validate_json يرفع ⇒ None
```

### 🔴 الفصل الإلزامي

```
LLM token  =  وحدة فاتورة وسياق.  ليس هويّة · ليس تخويلاً · ليس مُعرِّف عملية
```

**ولا شيء في الكود اليوم يخلطهما** — التخويل من `User` و`is_authorized`، والجلسة من `whatsapp_sessions`. **والمطلوب أن يبقى كذلك عند التوسّع.**

**وإن احتجنا مفاتيح عمليات لاحقاً، تكون منفصلة صراحةً:**

| ما هو | من أين | ليس |
|---|---|---|
| `wamid` | ميتا | مفتاح تخويل — وهو idempotency للوارد فقط |
| `operation_id` (مقترح) | نحن | ليس token النموذج |
| `idempotency_key` (مقترح) | مشتقّ من المسوّدة | ليس `wamid` |

**اتجاه مقترح:** مهلة صريحة · بلا إعادة محاولة تلقائية على عملية كتابة (سؤال أصدق من نداء ثانٍ) · تسجيل `usage` في اللوج لا في جدول (Phase 2 يقرّر الجدول).

**والرصيد بندٌ تشغيليّ:** `$4.98` وثلاث ميزات تعتمد على المفتاح (`Lia` · `ai_chat` · `onboarding`)، وقد صمتت الثلاثة بصمت من قبل.

---

## 11 · Vertical Model

```
Platform            المنصّة: الكود المشترك · platform_services (عرض/تسعير) · VERTICAL_REGISTRY
  │
  ├─ Vertical       Client.vertical + VERTICAL_REGISTRY   ← سياق provisioning، read-only، بلا مسار كتابة
  │                 barber: default_services · page_template · staff_backing_model="Barber"
  │
  ├─ Capability     serviceKey في client_services  ← بوّابة تشغيل (require_service)
  │                 reservations · catalog · store · restaurant · gallery · whatsapp_ordering
  │                 و**lia** (مقترح)
  │
  ├─ Tenant         Client — يملك صفوف client_services
  │
  ├─ Actor          User (+ Barber للربط) → is_authorized(permission, *legacy_roles)
  │                 المفردات: owner · admin · barber   (قاعدة سلمان ٢٠٢٦-٠٩-١٢)
  │
  ├─ Operation      create_service · create_reservation · … ← وحدة التخويل والكتابة
  │
  └─ Business entity CatalogService · Reservation · Barber · CatalogItem · Customer
```

**الحدود التي يجب ألّا تُخترَق:**

```
🔴 Barber ليس التجريد العامّ      موديل موردٍ لعموديّة واحدة · staff_backing_model يقول ذلك
🔴 Lia ليست Barber-specific       لا تقرأ vertical ولا Barber · وتكتب CatalogService العامّ
🔴 Reservation ≠ Booking          نطاقان: Reservation = خدمة/موعد · Booking = وحدة عقارية
                                  (moduleKey منفصل · جدولان · وقرار نطاق سلمان الرسمي)
⚪ Booking/Real-Estate            خارج التنفيذ. **ملاحظة معمارية واحدة:** ٢٢ كتابة مباشرة فيها
                                  تُضاعف فجوة F2 لو عُمِّمت — تُسجَّل ولا تُفتَح
⚪ Clinic                          سابقة قائمة: RESOURCE_BACKED_MODULE_KEYS + _resolve_resource
                                  بُني مستقلّاً عن barber بقرار صريح (٢٠٢٦-٠٧-٣١) — ولا يُدمَج
```

---

## 12 · Existing Write Paths Inventory

| | **CatalogService** | **Reservation** | **Barber** | **Store Product (CatalogItem)** |
|---|---|---|---|---|
| Admin route | `POST /admin/catalog-services/` | `POST /admin/reservations/` | `POST /admin/barbers/` | `POST /admin/store/products` |
| Service layer | ✅ `catalog_service_service.admin_create_service` | ✅ `reservation_service.create_reservation` | 🔴 **لا شيء** | 🔴 **لا شيء** |
| Repository | `catalog_service_repo.create_catalog_service` | `ReservationRepository.create` | `barber_repo.create_barber(data)` | `admin_catalog_repo.create_item(data)` |
| Seeder | 🔴 prisma مباشر: `seed_alzabt_demo_tenant:182` · SQL خام: `migrate_legacy_services_to_catalog:142` · 🟢 خدمة: `seed_from_rk_template:208` (عبر provisioning) | 🟢 **صفر سكربت يُنشئ حجزاً** | 🔴 prisma مباشر: `seed_alzabt_demo_tenant:149` · `seed_ali_tenant:125` · `seed_barber_arch_test:83,90` · 🟡 repo: `seed_from_rk_template:217` | 🔴 prisma مباشر ×6 سكربتات · SQL خام ×3 · 🟢 HTTP كامل: `seed_catalog:160` |
| WhatsApp path | — | ✅ `whatsapp_reservation_flow:886` `module_key="barber"` `source="whatsapp"` | — | — |
| Lia path | ✅ حيّ | 🟡 مدروس | 🔴 محجوب | 🔴 محجوب |
| نقطة التخويل | route: `services.write` · Lia: `_resolve_owner` + `_still_authorised` | route: `reservations.write` | route: `staff.write` | route: `store.write` |
| بوّابة الخدمة | `reservations` | `reservations` | `reservations` | `store` |
| عزل التينانت | ✅ معامل `client_id` | ✅ معامل `client_id` | 🔴 في الـroute | 🔴 في الـroute |
| التحقّق | Pydantic route + Lia: `LiaServiceDraft` | Pydantic route + خطّ ٦ مراحل في الخدمة | Pydantic route + `normalize_for_storage` **في الـroute** | Pydantic route + `find_active_category` |
| آثار جانبية | لا | 🔴 `_notify_merchant_new_reservation` + إنشاء `Customer` | لا | لا |
| قابل لإعادة الاستعمال؟ | ✅ نعم | ✅ نعم | 🔴 لا | 🔴 لا |
| refactor مطلوب؟ | لا | لا (معاملان فقط: `notify_merchant` · `historical_entry`) | **نعم** | **نعم** |
| الخطر | منخفض | متوسّط (تنبيه · حالة · كتابة مزدوجة) | **عالٍ** — تخطّي التطبيع يُعيد عطل جعفر | متوسّط — تخطّي `clientId`/`moduleKey` |

---

## 13 · Security Model

| المحور | الحالة | الدليل |
|---|---|---|
| حلّ التينانت | 🟢 من رقم المُرسِل، لا من الرسالة | `_resolve_owner` · والالتباس يُرفَض |
| تخويل العملية | 🟡 صلاحية واحدة مثبَّتة | `:207` — F6 |
| تفعيل القدرة | 🔴 مستعار من `reservations` | `:221` — F1 |
| تخويل وقت الكتابة | 🟢 يُعاد، ويطلب **نفس التينانت** | `_still_authorised` بأربع أسباب رفض |
| حلّ المعرّفات | 🟢 في الباكند حصراً | `_resolve_service_category` · `_resolve_barber(client_id,…)` |
| محاولات عبر التينانتات | 🟢 مرفوضة بنيويّاً | كل حلٍّ يأخذ `client_id` · و`tenant_changed` سببُ رفضٍ صريح |
| معرّفات مُختلَقة من النموذج | 🟢 مستحيلة | لا حقل معرّف في أي عقد · `extra="forbid"` |
| مسوّدة قديمة | 🟢 مهلة ١٠ دقائق + فرع انتهاء + تحقّق ثانٍ عند الكتابة | `:502` عمر المسوّدة |
| إعادة (replay) | 🟢 `wamid UNIQUE` للوارد | `claim_inbound` |
| عملية مكرَّرة | 🟢 `clear_draft()` **قبل** الكتابة | «Consume first… a double write is not» |
| إعادة التأكيد | 🟢 نفس الآلية — نقرة ثانية لا تجد مسوّدة | والتعليق يشرح أنّ النقر البشري يُنتج wamid آخر |
| ملكيّة الجلسة | 🟡 الجلسة بـ`(phone_number_id, customer_phone)` · ولا جلسة وهمية | `_peek_session` + `_SENTINEL` |
| رفض صامت لغير المُخوَّل | 🟢 + تدقيق | `log_security_event("lia_entry_refused")` |
| الثغرة المعروفة | 🟡 `_resolve_client_from_text` | بندٌ أمنيّ مستقلّ |

**⇒ لا تُقترَح صلاحية خاصة بـLia.** النموذج القائم يكفي: **الفاعل إنسان، والصلاحية صلاحيته.** والناقص **تفصيلٌ** لا توسيع.

---

## 14 · Migration / Backward Compatibility

### 🔴 الخطر الأوحد الحاجب: تبويب Lia على مفتاحها **يُطفئها فوراً**

```
اليوم:   _tenant_has_reservations()  ⇒  rk ✅  barberlab-test ✅  mr-h ✅
بعده:    _tenant_has_lia()           ⇒  الثلاثة ❌  حتى يُفعَّل المفتاح
```

> ## ✅ تصحيحٌ ونطاقٌ محسوم (٠٩-١٦)
>
> **قياسُ ٠٩-١٥ أعطى أربعةَ تينانتات** ذاتِ `reservations` نشطة — القائمةُ أعلاه تذكر ثلاثة،
> والرابعُ `alzabt-demo`. **وقرارُ سلمان ٠٩-١٦ (D0) استبعده من الـpopulation نهائيّاً**، فعادت
> القائمةُ أعلاه صحيحةً — **بسببٍ مذكورٍ هذه المرّة**، لا بالعَرَض.
>
> ```
> الـpopulation الحقيقيّ:  rk · barberlab-test · mr-h        (ثلاثة)
> وقياسُ ٠٩-١٦:            N₁ = 3  ·  N₂ = 0  ·  N₃ = 0       (صفرُ صفوفِ serviceKey='lia')
>     N₁ الـpopulation   ·   N₂ الحاملُ لـlia   ·   N₃ العاملُ بـlia وحدها (بلا reservations)
> ```
>
> **و`status` لا يفرز `alzabt-demo`** — مقيسٌ أنّ `status="active"` على الأربعة، فالاستبعادُ
> **بالـslug** ويجب أن يُكتَب صراحةً في أيّ استعلامِ امتثال، وإلّا أُعيد ضمُّه صامتاً.
>
> **وشرطُ سدادِ الدَّين (Comment 1 · P4، ما زال مفتوحاً):** يُقاس بالأعداد الثلاثة أعلاه، لا بالنثر.
> **و`N₃` ليس شرطَ خروج (R6, ٠٩-١٦).** تينانتٌ يحمل `lia` وحدها يعبُر ① الوصول ثمّ **يفشل في كلّ
> عملياتِ السجلّ** — لأنّ `service_key` لها `reservations` أو `catalog`، ولا واحدةٌ منها `lia`.
> فـ`N₃ ≥ 1` يصف تينانتاً يُرحِّب ثمّ يرفض كلَّ شيء، لا دليلَ عمل.
> **⇒ استقلالُ `lia` عن `reservations` يُثبَت بـfixture/test** — تينانتُ اختبارٍ بـ`lia` وحدها يعبُر ①
> ويُرفَض عند قدرةِ العملية برفضٍ مُسمّى، وتينانتٌ بـ`reservations` وحدها يُرفَض بعد حذفِ الشقّ.
> و`N₃` يبقى **مؤشِّرَ رصدٍ** لا شرطاً. **ويُعاد القياسُ في لحظةِ الإزالة لا قبلها**،
> لأنّ خرائطَ البذر **لا تحتوي `lia`** ⇒ تينانتٌ جديدٌ يُولَد غيرَ ممتثلٍ بعد إعلانِ الامتثال.
> ⇒ **`F4-B` شرطٌ لسدادِ الدَّين** (تبعيّةٌ لم تكن مكتوبةً في §16).

### ✅ استراتيجية التفعيل — **قرار سلمان ٢٠٢٦-٠٩-١٥**

> *«fa3lha 3nd barberlab w rk. khali mr-h later 7a nrja3 na3mlo seed»* + **الخيار الأول**

**تبويب متسامح مؤقّتاً، ومعه تفعيل صريح للتينانتين الحقيقيين:**

```
١  التبويب:   _tenant_has_lia()  ⇒  lia  OR  reservations       ← صفر انقطاع، وصفر اعتماد على توقيت الكتابة
٢  التفعيل:   صفّ lia في client_services لـ barberlab-test و rk  ← كتابة إنتاج، بموافقة مستقلّة عند التنفيذ
٣  mr-h:      مؤجَّل — يُفعَّل عند إعادة بذره، ويبقى عاملاً عبر شقّ التسامح حتى ذلك الحين
٤  الدَّين:    شقّ `OR reservations` دَينٌ صريح يُسجَّل في capabilities/lia.md بشرط سداد مُعلَن:
              **يُحذَف حين يحمل كل تينانت حيّ صفّ lia** — وmr-h هو آخر شرط
```

**ولماذا الاثنان معاً أفضل من أيٍّ منهما وحده:** التسامح يضمن **صفر انقطاع بلا اعتماد على ترتيب زمنيّ** (فلا يهمّ أن يُنشَر الكود قبل الصفوف أو بعدها)، والتفعيل الصريح يجعل التينانتين **مستقلَّين فعلاً** فيمكن إطفاء Lia عليهما بلا مسّ الحجوزات — وهو الهدف الأصلي من F1. **و`mr-h` لا يُكتَب له صفّ، فلا كتابة على تينانت سنُعيد بذره.**

### الخيارات المرفوضة، وسبب رفضها

```
🔴 تبويب صرف بلا تسامح    انقطاع مؤكَّد على الثلاثة حتى تُكتب الصفوف ⇒ نافذة عطل حقيقية
🔴 لا مفتاح لـLia إطلاقاً   تُبقيها غير قابلة للإطفاء، والتبويب يصير كاذباً عند العملية الثانية
```

### توافق خلفيّ مطلوب

```
لا يُحذَف مفتاح · لا يُعاد تسمية شيء · booking يبقى (لا يبوّب لكن ٣ صفوف تحمله)
ولا تُمَس الصفوف التاريخية · وكل معامل جديد في خدمة مشتركة افتراضُه السلوك الحالي
```

---

## 15 · Phased Implementation Plan

**✅ الترتيب المُقرَّر (سلمان ٢٠٢٦-٠٩-١٥): Foundation أولاً، ثمّ الحجز.**

```
Foundation (المقدّمة) — تحجب كل ما بعدها · ولا عملية جديدة فيها
  F0.1  صفّ lia في platform_services                     بيانات/سكربت بذرة
  F0.2  'lia' → ACTIVATABLE_KEYS                         سطر واحد
  F0.3  _tenant_has_lia() = lia OR reservations           التبويب المتسامح المُقرَّر
        + الدَّين مُسجَّلاً في capabilities/lia.md بشرط سداده
  F0.4  تفعيل lia على barberlab-test و rk                ← كتابة إنتاج · موافقة مستقلّة عند التنفيذ
        (mr-h مؤجَّل لإعادة بذره · ويبقى عاملاً عبر التسامح)
  F0.5  Resolver خاصٌّ بـLia (D3-c) — يملك **المسارَين**، ولا يُشارِك سياستَه مع أحد:
        المسار A  رقمُ المحلّ → التينانت → فاعلٌ نشطٌ **داخل ذلك التينانت**
        المسار B  لا تطابقَ رقمِ محلّ → فاعلٌ نشطٌ، بحثاً عابراً للتينانتات
        وفي الحالتين: isActive **شرطٌ صريح** · و**لا أقدميّة** · واللبسُ يُرفَض **بالعدّ**
        (أكثرُ من تطابقٍ ⇒ رفض — **وداخلَ التينانت أيضاً**، لا فقط عبرَه)   ← R3
        ⚠️ **لا يُنادى `find_active_user_by_phones`** — فهي `find_first` + `order createdAt asc`
           أي أقدميّةٌ صامتة، وإعادةُ استعمالها تورّثها إلى مسارِ تخويل
        ⚠️ و**لا تُمَسّ `user_repo.find_user_by_phone`** ⇒ سلوكُ تسجيل الدخول لا يتغيّر (R4)
  F0.6  سجلُّ OperationDefinition(permission, legacy_roles, service_key, write_fn) في الكود
        ثلاثُ عمليات فقط (a-1): create_service · create_reservation · create_catalog_item
        وما لا write_fn صالحٌ له لا يُسجَّل إطلاقاً (a-2)
  F0.7  D9:  A AND B AND C  ·  والترتيبُ  C → ① → [تُعرَف العملية] → A → B      ← R1
        · الترحيبُ مشروطٌ بـ**① وحده** — لا بـA، إذ لا عمليةَ عنده             ← R1
        · **زرُّ الهروب يبقى على `reservations`** ولا يُدمج مع ① ولا ②          ← R2
        · كلُّ الفحوص تسبق نداءَ النموذج · وتُعاد قبل الكتابة بنفس OperationDefinition
        · رفضٌ مُسمّى: identity_unresolved · identity_ambiguous · tenant_changed
                      lia_access_inactive · capability_inactive · missing_permission
        · ودلالةُ الرفض: C يسقط ⇒ صمتٌ + سجلُّ تدقيق
                         ① / A / B يسقط ⇒ رفضٌ مُصرَّحٌ بلا ذكرِ السلسلة
        ⚠️ ولا يُخترَع نصُّ رفضٍ جديد — تُستعمل الصياغاتُ القائمة، وأيُّ نصٍّ جديد
           يلزمه `app/prompts/lia.md` و Intent مُعلَن (`repository-hygiene.md`)
  F0.8  قاعدةُ التقديم (a3-PR): منعُ «تينانتٍ بلا User صالحٍ على رقم محلّه» عند التقديم
        + كشفُه عند التشغيل، حمايةً ثانية
        (مقيس: registration_service:127,167 يستوفي الثابت · provision_barber_domain لا يكتب هاتفاً)
  F0.9  فحوصُ القبول AC-1…AC-16 بترقيم سلمان · و45 · 48 · 49/49 · وبصمةُ الـprompt بايتاً

Operation 1 — Reservation        ← أوّل عملية جديدة كبرى، ولا تعتمد على F2
  🟢 والسبب مقيس: Reservation أنظف كيان في المستودع — مسار كتابة **واحد**
     (ReservationRepository.create:15) يُبلَغ **حصراً** عبر create_reservation:343،
     من ثلاثة مستدعين فقط (الموقع :83 · اللوحة :324 · البوت :884)، و**صفر سكربت يُنشئ حجزاً**.
     فLia تصير المستدعي الرابع لنفس الدالّة — لا مسار جديد ولا استثناء.
  معاملان في create_reservation: notify_merchant=True · historical_entry=False (خامد على المستقبل)
  والقرارات مأخوذة: source="lia" · pending دائماً · حجز واحد · إرخاء الوقت للتاريخيّ

Prerequisite — Shared write capabilities   ← safe-refactor مستقلّ، محفوظ السلوك
  admin_create_barber   ← يحمل clientId و normalize_for_storage و workingHours
  admin_create_product  ← يحمل clientId و moduleKey والتحقّق من الفئة

Operation 2/3 — Barber · Product  ← **لا تُبنى قبل إثبات الـprerequisite**

Hygiene (مستقلّ، غير حاجب)
  F4  مصالحة الخرائط الأربع والكاتالوج      F5  تحقّق مفتاح مسار الـsuper
```

---

## 16 · Dependencies

```
Reservation        →  F6 + F7 (تفصيل الصلاحية)                    ولا F2
Barber · Product   →  F1 + F2 + F3 + F6 + F7
أي إطفاء لـLia      →  F1
F4 · F5            →  مستقلّان، لا يحجبان بدايةَ Foundation
F4-B               →  🔴 شرطٌ **لسدادِ دَينِ الـOR** (خرائطُ البذر بلا lia) — أُضيف ٠٩-١٦
Item Order         →  لا تبعيّة معمارية على هذه الجولة  ⇒ عملٌ منفصل
Voice/Image        →  لا تبعيّة مُثبَتة  ⇒ يبقى منفصلاً
```

---

## 17 · Risks

| # | الخطر | الأثر | التخفيف |
|---|---|---|---|
| R1 | تبويب Lia يُطفئها على الثلاثة | انقطاع قدرة مبيعة | استراتيجية (أ) أو (ب) — §14 |
| R2 | إعادة استعمال ساذجة لـ`create_barber` | **إعادة عطل جعفر** (رقم بلا رمز دولة) | الاستخراج يحمل القيود — لا تكرارها |
| R3 | مسار كتابة ثانٍ | مخالفة `architecture.md §9` — وسابقتها مسجَّلة | لا عملية بلا دالّة خدمة |
| R4 | توسيع الصلاحية بلا تفصيل | قبولُ عملية لا يملكها الفاعل | F6 قبل أي عملية ثانية |
| R5 | `catalog` معطَّل على `rk` | عمليات الفئة/العنصر تُرفَض 403 هناك | يُفتَح بقرار، أو يُستثنى من النطاق |
| R6 | معامل في خدمة مشتركة | يخدم الموقع والبوت واللوحة | افتراضٌ = السلوك الحالي + خمود على المستقبل |
| R7 | رصيد المفتاح `$4.98` | صمتٌ صامت لثلاث ميزات | بندٌ تشغيليّ — مراقبة |
| R8 | لا إصدار في العقد | تطويرٌ لاحق بلا توافق خلفي | `contract_version` في المقدّمة |

---

## 18 · Explicit Out-of-Scope

```
🚫 التنفيذ الآن · migration · schema · ميتا · كتابة إنتاج · cleanup · push · deploy
🚫 refactor الحلاق والمنتج (يُسجَّل prerequisite ولا يُنفَّذ)
🚫 تنفيذ الحجز
🚫 Item Order · Phase 2 analytics · D13 · الصوت/الصورة/الوسائط
🚫 Booking / Real Estate  (ملاحظة معمارية وحدها: ٢٢ كتابة مباشرة)
🚫 Staff abstraction  (لا يوجد موديل Staff، ولا يُستنبَط من Barber)
🚫 إنشاء ADR الآن
🚫 توسيع صلاحيات (لا صلاحية خاصة بـLia)
```

---

## 19 · Exact First Implementation Slice — **بعد الموافقة فقط**

**Foundation وحدها. ولا عملية جديدة فيها.**

```
الملفّات المرجَّحة — مُحدَّثةٌ بقرارات ٠٩-١٦
  app/services/lia_owner_entry.py     _tenant_has_lia · Resolver Lia · سجلُّ العمليات
                                      وترتيبُ C → A → B · وإعادةُ الفحص بنفس التعريف
                                      وفحصُ القدرة **قبل** الترحيب  (تغييرٌ سلوكيٌّ مرئيّ)
  app/api/v1/admin/client_services.py 'lia' → ACTIVATABLE_KEYS
  .claudedocs/architecture/capabilities/lia.md   مفتاحُها · عقدُ العمليات · ودَينُ الـOR بشرط سداده
  scripts/ (جديد)                     بذرةُ صفّ platform_services + فحوصُ AC-1…AC-16
  app/prompts/lia.md                  ⚠️ فقط إن تغيّرت صياغةُ رفض (فيلزمه Intent مُعلَن)
  مسارُ التقديم (a3-PR)                موضعُ المنع — يُحدَّد عند التنفيذ، لا يُفترَض هنا

  ولم يبقَ في الشريحة:
  app/schemas/lia_drafts.py           🟡 contract_version و LiaOperationResult **مؤجَّلان** (P5/P6)
                                      ولا يُعدَّل هذا الملفّ إلّا لتوسيع Literal اسمِ العملية

خارج الشريحة
  create_reservation (التنفيذ) · الحلاق · المنتج · F4-A/B/C · F5 · وأيّ P2
  و**F0.4** ليست خارجَ الشريحة، لكنّها **بوّابةٌ مستقلّة** — انظر أدناه
```

> ## 🔴 بوّابةُ F0.4 — مستقلّة، ولا تُطوى في التنفيذ
>
> **`FOUNDATION READY` ≠ `PRODUCTION ACTIVATION APPROVED`** (قرارُ سلمان، ٠٩-١٦).
> كتابةُ صفَّي تفعيل `lia` لـ`barberlab-test` و`rk` **كتابةُ إنتاج**، وتُطلَب موافقتُها
> **لحظةَ التنفيذ** — لا تُستنتَج من كونها بنداً في Foundation، ولا من الموافقة على الخطّة.
> و`mr-h` **لا يُكتَب له صفّ** (مؤجَّلٌ لإعادة بذره، ويبقى عاملاً عبر شقّ التسامح).

---

## 20 · Verification Plan

```
١   صفّ lia موجود في platform_services ومقروء من super API
٢   POST /admin/client-services/activate {"services":["lia"]} يُقبَل · ومفتاح مجهول يُرفَض 400
٣   Lia تعمل حين lia مفعَّلة · وتُرفض بوضوح حين لا  ← والاستراتيجية المختارة تُفحَص صراحةً
٤   إطفاء lia لا يُعطّل الحجوزات · وإطفاء reservations لا يُعطّل lia   ← استقلالٌ مُثبَت
٥   لكل عملية: الصلاحية الصحيحة تُقبَل، والخطأ يُرفَض (PRESET_STAFF حالةَ اختبار حقيقية)
٦   _still_authorised يفحص صلاحية العملية لا مفتاحاً ثابتاً
٧   الـprompt مطابق بايتاً: 893 · 778a4462…e93d5e2
٨   بلا انحدار: 45 · 48 · 49/49 · from app.main import app
٩   صفر كتابة إنتاج وصفر إرسال في كل الفحوص
١٠  تحقّق حيّ على barberlab-test وحده، بعد موافقة مستقلّة
```

> ## ✅ مُحدَّثٌ بقرارات ٠٩-١٦
>
> البنودُ العشرةُ أعلاه تبقى صحيحةً، وتُقرأ الآن بترقيم سلمان لفحوصِ القبول (**F0.9**):
>
> ```
> ٣  →  AC-1 (القدرة معطَّلة ⇒ رفضٌ مُسمّى · ولا ترحيبَ يُرسَل)   ٤  →  AC-6 (استقلالُ المفتاحَين)
> ٥  →  AC-2 · AC-4 · AC-12 · وشقُّ AC-5 الموجب                ٦  →  AC-9 · AC-13 · AC-14
> ٨  →  AC-10                                                 ٩  →  شرطٌ عامٌّ على كلّ الفحوص
> ```
>
> **وثلاثةٌ تُضاف، ولم تكن في القائمة:**
>
> ```
> AC-3   هويّةٌ غيرُ محلولة  ⇒  صمتٌ + log_security_event         (لا رسالة — سلوكٌ قائمٌ يُحفَظ)
> AC-8   اللبسُ والحسابُ المعطَّل (D3-c)  ⇒  رفضٌ · والنشطُ يُحَلّ    ⚠️ يلزمها fixture
> AC-11  تينانتٌ محلولٌ يقيناً + قدرةٌ معطَّلة  ⇒  رفضٌ مُسمّى        (C ⇏ A)
> AC-16  الحساباتُ القديمة تُقاس بـlegacy_roles **الخاصّة بتلك العملية**   ← فحصُ F-B
> ```
>
> **و«PRESET_STAFF حالةَ اختبار حقيقية» في البند ٥ صار له فِكسچرٌ حيٌّ أدقّ:**
> `barberlab-test` …5212 — حسابُ صلاحياتٍ حقيقيٌّ يمنح `create_reservation` **وحدها**.
>
> **وبندٌ يُشدَّد:** «تحقّقٌ حيّ … بعد موافقةٍ مستقلّة» (١٠) و**F0.4** بوّابتانِ منفصلتان —
> الأوّلُ إرسالُ رسالةٍ على رقم سلمان، والثاني **كتابةُ إنتاج**. ولا تُطلَب موافقةٌ واحدةٌ عنهما.

**Rollback:** `git revert` للشريحة · لا schema ⇒ لا تراجع بيانات · وصفّ `lia` في `client_services` يُطفأ بـ`isActive=false` عبر المسار القائم. **والخطر الوحيد غير القابل للتراجع الفوري: إن نُفِّذت (أ) وكُتبت صفوف التفعيل — وهي كتابة إنتاج تحتاج موافقتك المستقلّة.**

---

## 21 · STOP / Approval Gate

### ✅ مُقرَّر (٢٠٢٦-٠٩-١٥)

```
D1  مفتاح lia                معتمد
D2  استراتيجية التفعيل        تبويب متسامح (lia OR reservations) + تفعيل صريح على barberlab-test و rk
                             · mr-h مؤجَّل لإعادة بذره · والدَّين بشرط سداد مُعلَن
D5  الترتيب                  Foundation أولاً، ثمّ الحجز
D3  تفصيل الصلاحية            🔄 **أُعيدت صياغتُه ٠٩-١٦ — والنصُّ القديم أدناه مُلغى**
```

> ### ✅ D3 — الصياغةُ النهائيّة (٠٩-١٦)، وهي النافذة
>
> ```
> العملية  ──►  OperationDefinition ( permission , legacy_roles , service_key , write_fn )
>                  ├─► C   التينانت + الفاعل      Resolver Lia · نشطٌ فقط · اللبسُ يُرفَض
>                  ├─► A   القدرة                 client_services{ OP.service_key , isActive }
>                  └─► B   الصلاحية               is_authorized( C.actor , OP.permission , *OP.legacy_roles )
>                                    A AND B AND C  ⇒  العملية
> ```
>
> **والنصُّ القديم المُلغى:** *«… → `is_authorized("reservations.write")` → Lia operation»*.
> كان صحيحاً في سياقٍ واحد — جولةُ «تغييرِ حالةِ حجز» على قناة WhatsApp، حيث العمليةُ **هي**
> `reservations.write` فعلاً (`merchant_actions:347`). **وبعمليةٍ واحدة لا فرقَ مرئيٌّ بين
> «الصلاحية» و«صلاحيةِ العملية»** — والتثبيتُ يصير خطأً في اللحظة التي تصير فيها العملياتُ أكثرَ
> من واحدة، لا قبلها. وأثرُه مقيسٌ في الاتّجاهَين: حاملُ `reservations.write` وحدها يُرفَض اليوم
> من Lia رغم أحقيّته بالحجز (`barberlab-test` …5212، حالةٌ حيّةٌ حقيقيّة)، وحاملُ `services.write`
> كان سيُقبَل لعمليةٍ لا يملكها لو وُسِّع النطاقُ بلا تفصيل.
>
> **وما أُضيف ولم يكن في الاقتراح:** `legacy_roles` — الحقلُ الرابع. `is_authorized` يحاكم
> الحساباتَ القديمة على **قائمةِ مسارِها** لا على الصلاحية (Invariant I1)، والقوائمُ الحقيقيّةُ
> أربعٌ مختلفة. ومقيسٌ ٠٩-١٦ أنّ **الحساباتَ الثلاثةَ الحيّة كلَّها `permissions IS NULL`**
> (`rk` …5477 · `mr-h` …5767 · `barberlab-test` …7986) ⇒ فمسارُ `legacy_roles` هو المسارُ
> الفعليُّ لكلّ مالكٍ حيٍّ اليوم، لا حالةٌ هامشيّة.

### 🟡 باقية، وغير حاجبة للـFoundation

```
D4  contract_version و LiaOperationResult   ✅ محسوم ٠٩-١٦: **مؤجَّلان** (P5/P6) · لا يدخلان Foundation
D6  F4/F5                                   ✅ محسوم ٠٩-١٦: ورقةٌ مستقلّة · وF4 ثلاثُ مراحل (P7)
                                            وF4-B شرطٌ لسدادِ دَينِ الـOR لا لبدايةِ Foundation
D7  catalog معطَّل على rk                    🟡 باقٍ — ولم يصر حاجباً: `create_catalog_item` مُسجَّلةٌ
                                            وقدرتُها تُفحَص بـOP.service_key='catalog' فتُرفَض على rk
                                            برفضٍ مُسمّى.  وهي **فِكسچرُ AC-1/AC-5/AC-11/AC-13 الحقيقيّ**
D8  كتابة صفّي التفعيل (barberlab-test · rk) ✅ محسوم ٠٩-١٦: **بوّابةٌ مستقلّة** — F0.4
                                            FOUNDATION READY ≠ PRODUCTION ACTIVATION APPROVED
```

### ✅ وحالةُ البوّابة الآن (٠٩-١٦)

```
لا قرارَ معماريٌّ حاجبٌ باقٍ.     FOUNDATION STATUS = READY  —  قراراً لا تنفيذاً.
والباقي المفتوحُ غيرُ حاجب:  P4 (D2-b · شرطُ خروجِ الـOR) · P5 · P6 · P7 (F4-A/B/C) · D7
وما لا يُفتَح حتى يُستخرَج مسارُ كتابةٍ مشترك:  create_barber · create_product
```

**ولا UNKNOWN حاجب باقياً.** مسارات البذر مقيسة (§5)، وReservation مُثبَت أنه أنظف كيان.

**UNKNOWN غير حاجبة، مسجَّلة للعلم:**

```
⚪ سقف قوالب ميتا للحساب — لم يُقرأ بعد (scripts/inspect_whatsapp_templates.py جاهز، وPhase T مؤجَّلة)
⚪ هل تُراقَب حالات القوالب التي تُسقِط قالباً عاملاً (PAUSED · DISABLED · LIMIT_EXCEEDED) — لا
⚪ أثر إطفاء `catalog` على rk على أي سطح آخر غير عمليات الفئة/العنصر
```

---

## 22 · Findings المقيسة — جلستا ٠٩-١٥ / ٠٩-١٦

> **كلُّها قياسٌ على الإنتاج (قراءةٌ فقط) أو قراءةُ كود، ولم يُصلَح أيٌّ منها.** والتصحيحاتُ أدناه
> تشمل تصحيحَ قياسٍ خاطئٍ لي، مُثبَّتاً لا مُزالاً — لأنّ تسعيرَ D3-2 بُني عليه أوّلاً.

| # | Finding | الدليل | الحالة |
|---|---|---|---|
| **F-A** | `_resolve_owner:192` (المسار A) يعيد `(client_id, "owner", client_id)` **بلا `User` وبلا `is_authorized`** ⇒ الشرطُ B لا يُفحَص على المسار الذي تسلكه أرقامُ المحلّ الستّة | `lia_owner_entry.py:192` مقابل `:207` | ✅ حُسِم بـD3-2 |
| **F-B** | خريطةُ العمليات المقترحة تُغفل `legacy_roles` · و`is_authorized` يحاكم الحساباتَ القديمة على قائمةِ مسارِها (I1) · والقوائمُ الحقيقيّةُ **أربعٌ مختلفة** | خمسةُ ملفّاتِ `admin/` · `permissions.py` | ✅ حُسِم بـD3-a |
| **F-C** | population الـOR قِيس **أربعةً** و§14 يذكر ثلاثة | قياس `client_services` | ✅ حُسِم بـD0 — عادت القائمةُ صحيحةً بسببٍ مذكور |
| **F-D** | فرعُ الترحيب `:888` يفحص الهويّةَ وحدها — **بلا فحصِ قدرة** | `lia_owner_entry.py:888-902` | ✅ حُسِم بـD9 · F0.7 |
| **F-K** | `auth.py:191` يدّعي أنّ `User.phone` يُرآي `Client.phone` على كلّ تينانت. **مقيس: قائمٌ على الثلاثة الأحياء بصيغتَين مختلفتَين** — `mr-h` يُخزَّن ٨ أرقام (وطنيّ) و`Client.phone` ١١ (مع الرمز). ⚠️ **وقياسي الأوّل «لا يوجد `User`» كان خطأً** — مقارنةُ سلاسلَ كاملةٍ بدل مُطابِق التطبيق | `admin/auth.py:191` · قياس ٠٩-١٦ | ⚪ مُصحَّح · والثابتُ قائم |
| **F-L** | Lia تَعِد *«AMBIGUITY IS REFUSED, NOT RESOLVED»* وتُوفي على المسار A (`:193`) · و**المسار B يختار الأقدم** (`user_repo:88-102`) | docstring `:177` مقابل `user_repo` | ✅ حُسِم بـD3-c |
| **F-M** | `find_user_by_phone` **لا يفلتر `isActive`** ويعيد الأقدم · و`continue` في `:204` ينتقل بين **صيغِ الرقم** لا بين المستخدمين ⇒ حسابٌ معطَّلٌ أقدمُ يحجب نشطاً أحدث | `user_repo:88` · `lia_owner_entry.py:202-205` | ✅ حُسِم بـD3-c (`isActive` صريح) |
| **F-N** | `Client.phone` **`@unique NOT NULL`** · و`whatsapp_number` **بلا قيد** ⇒ حصانةُ العزل من عمودٍ واحد، والثاني محميٌّ برفضِ اللبس لا بقيد | `schema.prisma` | ⚪ مسجَّل |
| **F-O** | لا علاقةَ DB لـownership: `Client.users` 1:N بلا `ownerId` · و`rk` يحمل **مالكَين shaped** · و`arizona` **بلا مستخدمٍ إطلاقاً** | `schema.prisma` · قياس | ⚪ مسجَّل |
| **F-P** | `caracas`/`footlab`: `Client.phone` نصُّ placeholder بـ**صفر أرقام** و`whatsapp_number = ""` ⇒ المطابقةُ لا تُخطئ، **لكنّ الحرزَ على جانب المُرسِل** (`:185`) لا على صفّ التينانت | قياس · `:185` | ⚪ مسجَّل |
| **F-Q** | `Client.phone` مُعرِّفُ **دخولٍ مُصادَق** (slug \| email \| phone → client JWT) ⇒ هويّةُ حسابٍ لا مجرّدَ جهةِ اتّصال | `admin/auth.py:87-94` | ⚪ مسجَّل |
| **F-R** | الschema يقرّر: *«Tenant identity on this channel lives on the CONVERSATION, never on the number»* ⇒ استعمالُ `whatsapp_number` كهويّةِ مُرسِلٍ واردة معنىً خامسٌ غيرُ مُعلَن | `schema.prisma` | ⚪ مسجَّل |
| **F-S** | 🔴 `registration_service.py:167` يكتب `User.phone` بـ`normalize_local_phone` — **مُطبِّعُ القراءة على مسارِ كتابة**، وقاعدةُ `phone-numbers.md` تقرّر العكس نصّاً. وصفُّ مالك `mr-h` ٨ أرقامٍ بلا رمز دولة = **نفسُ شكلِ عطب جعفر**. وتدقيقُ القاعدةِ نفسِها **لا يذكر `registration_service` إطلاقاً** | `registration_service.py:161-167` · `rules/phone-numbers.md` | 🔴 مفتوح · خارجَ النطاق |
| **F-T** | نفسُ ثغرةِ المسار A في `whatsapp_merchant_actions.py:338` ⇒ **حالتانِ مستقلّتان للشكل نفسه** ⇒ مرشَّحٌ لقاعدةِ تصعيدِ النمط (`rules/team-roles.md`) | `merchant_actions:335-338` | 🟡 مفتوح |
| **F-U** | **measured cross-layer identity divergence:** المُرسِل …7986 له ٢٤ رسالةً واردةً في محادثاتٍ مرتبطةٍ بـ`rk` **و**`barberlab-test`، و`_resolve_owner` يعيد `barberlab-test` دائماً ⇒ `conversation.clientId` قد يخالف تينانتَ Lia | قياس ٠٩-١٦ | ⚪ موثَّقٌ بقرار سلمان · **لا يُغيَّر به سلوك** |
| **F-V** | `provision_barber_domain` **لا يكتب هاتفاً إطلاقاً** ⇒ تينانتٌ مُقدَّمٌ به لا يستوفي ثابتَ D3-2 | مسحُ `provisioning_service.py` | ✅ يُعالَج بـa3-PR · F0.8 |
| **F-W** | `WhatsAppAccount.displayPhoneNumber` موصوفٌ بأنّه *«deliberately NOT a tenant-resolution key… the path being retired»* ⇒ الschema يُصرّح بالتخلّي عن مطابقةِ الأرقام لحلّ التينانت | `schema.prisma` | ⚪ مسجَّل |

### وفِكسچراتٌ حقيقيّةٌ حيّة — تُغني عن اختلاقها في AC-1…AC-16

| الفِكسچر | يمنح | يخدم |
|---|---|---|
| `barberlab-test` …5212 · `MANAGER_RESERVATIONS` · حسابُ صلاحيات | **`create_reservation` وحدها** | AC-2 · AC-4 · AC-12 · وشقُّ AC-5 الموجب |
| `rk` …4479 (جعفر · `tenant_manager`) · حسابُ صلاحيات | الخمس | AC-16 |
| `rk` …5477 · `mr-h` …5767 · `barberlab-test` …7986 | الخمس | **AC-16** — وكلُّها `permissions IS NULL` ⇒ مسارُ `legacy_roles` |
| `rk`: `catalog` **معطَّل** و`reservations` **مفعَّل** | — | **AC-1 · AC-5 · AC-11 · AC-13** |
| لبسُ الهاتف (داخل التينانت · عابرُه · معطَّلٌ أقدم) | — | **AC-8 — يلزمها fixture**: صفرُ تكرارٍ في الإنتاج |

**ودليلٌ مباشرٌ أنّ الشرط B يعمل على المسار B:** تشغيلُ المُحلِّل الحقيقيّ على …5212 طبع
`🚫 Lia: user … is not authorised for services.write` — رفضٌ صحيحٌ لحسابٍ حيٍّ حقيقيّ.

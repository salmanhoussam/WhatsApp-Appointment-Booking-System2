# restaurant vertical · تصنيفُ caracas وarizona · وتشغيلُ caracas

**الحالة:** 🟡 خطّةٌ للمراجعة · **صفرُ تنفيذ** · البوّابة CLOSED
**التحقيقُ السابق:** `.claudedocs/work/caracas-vertical-classification/2026-09-30/summary.md`
**كلُّ رقمٍ أدناه قراءةٌ حقيقيّةٌ من الإنتاجِ أو من الكود، ٢٠٢٦-٠٩-٣٠.**

---

## 🔴 قبل كلِّ شيء — إفصاحٌ عن حالةِ الشجرة

جزءٌ من Phase A **مكتوبٌ سلفاً وغيرُ مُودَع**، من عملٍ سابقٍ في الجلسةِ نفسِها:

```
 M app/core/verticals.py                              ← مدخلُ restaurant مُضافٌ محلّيّاً
?? scripts/test_restaurant_vertical_registration.py   ← حزمتُه · 22/22 تمرّ
?? .claudedocs/work/caracas-vertical-classification/  ← التحقيق
?? .claudedocs/work/fleet-module-audit/               ← تحقيقٌ آخر، غيرُ ذي صلة
مقابل origin: 0 إيداع  ·  والإنتاج: caracas.vertical=NULL · arizona.vertical=NULL
```

⇒ **Phase A ليست «ستُكتَب» بل «مكتوبةٌ وتنتظر إيداعاً».** ومعها إخفاقٌ واحدٌ معروف (§5-أ).

---

## 🎯 والنتيجةُ التي تقلب الخطّة

**تشغيلُ caracas لا علاقةَ له بالـvertical إطلاقاً.**

```
/api/v1/public/caracas/config  →  {"code":"NOT_FOUND","message":"Tenant not found"}
/api/v1/public/arizona/config  →  ✅ يعمل
```

والسبب **ليس** الـvertical، بل حقلٌ ثانٍ اسمُه `isActive` — منفصلٌ تماماً عن `status` النصّيّ:

```
caracas   status='active'   🔴 isActive = False   ⇒ محجوبٌ عن كلِّ الـAPI العامّ
arizona   status='active'   ✅ isActive = True
```

⇒ **لو نفّذنا الـvertical والتصنيفَ بالكامل، لبقيت صفحةُ caracas مكسورةً.** والعكس صحيح: تفعيلُ
`isActive` وحدَه يُصلحها **بلا أيِّ vertical**. فالمسارانِ مستقلّان، ويجب ألّا يُدمجا.

---

# ١ · Current State — مقيس

## ١-أ · مصدرُ الحقيقةِ للـvertical

| الطبقة | الموضع | الحالة |
|---|---|---|
| **الحاكم** | `clients.vertical` · `schema.prisma:109` · `String?` **بلا enum ولا قيد** | `NULL` للاثنين |
| الحارس | `registration_service.py:143,147` — يكتب القيمةَ فقط إن كانت في السجلّ، وإلّا يرفض | يعمل على التزويدِ فقط، لا على كتابةٍ مباشرةٍ في الصفّ |
| الواجهة | **صفرُ قراءةٍ لـ`vertical`** في `frontend/src` (كلُّ المطابقاتِ CSS) | ق-٥-ب صامدة |

## ١-ب · كيف يعمل `VERTICAL_REGISTRY`

`app/core/verticals.py` — قاموسٌ للقراءةِ فقط، **صفرُ مسارِ كتابةٍ في التشغيل**. وشكلُه مُعلَنٌ في
docstring الملفِّ نفسِه تحت `ALLOWED`: أربعةُ حقولٍ بالضبط، ولا خامس.

```
المسجَّلُ على origin:  barber · clinic          (اثنان)
والمسجَّلُ محلّيّاً:     barber · clinic · restaurant
```

دالّتانِ تقرآنه: `get_vertical(v)` → المدخلُ أو `None` · و`resolve_booking_module(v)` → قيمةُ
`booking_module` أو `None`.

## ١-ج · «restaurant» لها **ثلاثةُ معانٍ**، وهذا جوهرُ الالتباس

| المعنى | الموضع | caracas | arizona |
|---|---|---|---|
| **`service_key`** | `client_services` · **١٢ بوّابةَ `require_service("restaurant")`** | ✅ | ✅ |
| **`service_type`** | `SERVICE_TYPE_MAP['restaurant'] = ['restaurant','whatsapp_ordering','restaurant.menu']` | مطابق | ناقص |
| **`vertical`** | `VERTICAL_REGISTRY` | 🔴 غيرُ مسجَّلةٍ على origin | 🔴 |

**الخلاصة:** الكلمةُ معتمدةٌ في طبقتين ومفقودةٌ في الثالثة. والمهمّةُ تسدّ الثالثةَ **ولا تلمس الأولى والثانية**.

## ١-د · حالةُ التينانتَين — والفرقُ حادٌّ

| | **caracas** | **arizona** |
|---|---|---|
| `id` | `b4628f71-6e74-4170-ab18-59b7d51ec39c` | (يُقرأ عند التنفيذ) |
| الاسم | كاراكاس / Caracas | أريزونا / Arizona Restaurant |
| `vertical` | `NULL` | `NULL` |
| `status` / `lifecycle` | active / trial | active / trial |
| 🔴 `isActive` | **False** | True |
| الخدماتُ المفعَّلة | ✅ `catalog` · `restaurant` · `restaurant.menu` · `whatsapp_ordering` | 🔴 `restaurant` وحدَها |
| `catalog_items` | ✅ **٩٧** · ١٠ أقسام | ٢٨ · ٢ أقسام |
| أقسامُ الصفحة (`config.content.sections`) | ✅ **٨** | 🔴 **٠** |
| مستخدمون | ✅ ١ (`admin@caracas.com`، مفعَّلٌ الآن، بانتظارِ ضبطِ كلمة) | 🔴 **٠** |
| `whatsapp_number` | ✅ `96176699852` | 🔴 `NULL` |
| `phone` | 🟡 `placeholder_caracas` | `96171516580` |
| `store_orders` / `reservations` | 0 / 0 | 0 / 0 |
| سجلُّ الواجهة | ✅ `index.js:31` · `dark-ember` | ✅ `index.js:37` · `yellow-teal` |

**⇒ مسدودانِ بشيئين متعاكسَين:** caracas جاهزُ المحتوى ومحجوبٌ بعلَم · وarizona مرئيٌّ وفارغُ المحتوى.

---

# ٢ · Restaurant Vertical Contract

```python
"restaurant": {
    "default_services": ["catalog", "restaurant", "restaurant.menu", "whatsapp_ordering"],
    "page_template":      None,
    "staff_backing_model": None,
    "booking_module":      None,
},
```

| الحقل | القيمة | لماذا — ولا شيءَ مخترَع |
|---|---|---|
| `default_services` | الأربعة | **ما يحمله caracas فعلاً في الإنتاجِ الآن**، مقيساً. وهو `SERVICE_TYPE_MAP['restaurant']` + `catalog` الذي تحتاجه الـ٩٧ عنصراً. **وarizona يحمل واحدةً فقط — والمدخلُ لا يغيّر صفّاً قائماً** (§5-ب) |
| `page_template` | `None` | غيرُ مبنيّ. نفسُ صدقِ `barber` و`clinic` — لا اسمَ ملفٍّ غيرِ موجود |
| `staff_backing_model` | `None` | المطعمُ لا يحجز شخصاً. barber→`Barber` · clinic→`Resource`. والطاولةُ/المنطقةُ **نموذجٌ غيرُ موجودٍ ولا يُخترَع هنا**. و`None` يجعل التزويدَ التلقائيَّ **يفشل مغلقاً** برسالةٍ صريحة، بدل أن يزوّد كائناً خطأً |
| `booking_module` | `None` | لا صفحةَ حجزٍ عامّة. و**عقدُ ق-٥-ب §٧-ب يُقِرّ سلفاً** ما تفعله الواجهةُ عند `null` ⇒ صفرُ سلوكٍ جديد، وصفرُ محرّكِ حجزٍ يُفتَح |

**🔴 والـNones الثلاثةُ إعلانٌ لا نقص** — وهذا يجب أن يبقى مكتوباً في التعليقِ داخلَ الملفّ، وإلّا
قُرئ بعد شهرٍ كسهوٍ وأُكمِل بالخطأ.

---

# ٣ · Tenant Classification — والفصلُ الحاسم

**مُعدَّلٌ ٢٠٢٦-٠٩-٣٠ بطلبِ سلمان (بنودُه ٣ · ٤ · ٥ · ٧):** لا «rowcount كلّيّ» مبهم. **لكلِّ صفٍّ
invariant مُعلَنٌ قبلَه وبعدَه، ولكلِّ `UPDATE` شرطُ حالةٍ سابقةٍ و`RETURNING`.**

| التينانت | الحقل | من | إلى | عددُ التغييراتِ المقصودة |
|---|---|---|---|---|
| **caracas** | `vertical` | `NULL` | `'restaurant'` | **٢ تغييران** |
| **caracas** | `is_active` | `false` | `true` | |
| **arizona** | `vertical` | `NULL` | `'restaurant'` | **١ تغييرٌ واحد** |
| **arizona** | `is_active` | `true` | `true` | 🚫 **لا يُمَسّ — قيمتُه صحيحةٌ أصلاً** |

```sql
-- في معاملةٍ واحدة. كلُّ UPDATE مقيَّدٌ بحالتِه السابقةِ ويُعيد ما تغيّر فعلاً.
BEGIN;

UPDATE clients SET vertical = 'restaurant'
 WHERE slug = 'caracas' AND vertical IS NULL AND is_active = false
 RETURNING slug, vertical, is_active;          -- يجب: صفٌّ واحد

UPDATE clients SET is_active = true
 WHERE slug = 'caracas' AND is_active = false
 RETURNING slug, vertical, is_active;          -- يجب: صفٌّ واحد

UPDATE clients SET vertical = 'restaurant'
 WHERE slug = 'arizona' AND vertical IS NULL AND is_active = true
 RETURNING slug, vertical, is_active;          -- يجب: صفٌّ واحد

-- والتحقّقُ قبل COMMIT، داخلَ المعاملةِ نفسِها:
--   caracas → vertical='restaurant' AND is_active=true
--   arizona → vertical='restaurant' AND is_active=true
--   وصفرُ صفٍّ آخرَ تغيّر: count(vertical='restaurant') = 2 بالضبط
COMMIT;
```

## 🔴 قاعدةُ الشرطِ غيرِ المتوقَّع — **STOP، لا إصلاح** (بندُ سلمان ٥)

```
أيُّ UPDATE أعاد صفراً أو أكثرَ من صفٍّ  ⇒ ROLLBACK كامل · وتوقّف · ويُعرَض الحالُ عليك
أيُّ حقلٍ لم يكن على قيمتِه المتوقَّعةِ قبل الكتابة ⇒ نفسُه
🚫 ولا «إصلاحٌ» بإزالةِ الشرطِ أو بإعادةِ المحاولةِ بشرطٍ أوسع — ذاك يحوّل الحارسَ إلى ديكور
```

**ولماذا `RETURNING` لا `rowcount` وحدَه:** `rowcount` يقول «كم صفّاً»، و`RETURNING` يقول **«أيُّ
صفٍّ وبأيِّ قيمةٍ صار»**. وشرطُ الحالةِ السابقةِ في `WHERE` يجعل إعادةَ التشغيلِ آمنةً: المرّةُ
الثانيةُ تُعيد صفراً، فتتوقّف بدل أن تكتب فوقَ حالةٍ تغيّرت.

## 🔴 وترتيبٌ مُلزِم

```
مدخلُ الـregistry (كود) → مُنشَرٌ ومُثبَتٌ → ثمّ الكتابةُ في القاعدة
```

العكسُ يجعل الإنتاجَ يحمل قيمةً لا يعرفها سجلُّه ⇒ `Unsupported vertical` في أيِّ مسارِ تزويد.

## 🚫 وarizona تُصنَّف فقط، ولا تُشغَّل (بندُ سلمان ٧)

```
٠ أقسامِ صفحة · خدمةٌ واحدة · ٠ مستخدمين  ⇒ لا تدخل Phase C ولا يُدَّعى أنّها جاهزة
والتصنيفُ لا يجعلها جاهزةً — هو يسمّيها فقط
```

# ٤ · Caracas Activation — ما يعنيه فعلاً

**الـvertical ليس منه.** التشغيلُ حقلٌ واحد:

| # | البند | الحالة | الفعل |
|---|---|---|---|
| **ت-١** | 🔴 `clients.isActive = False` | يحجب كلَّ الـAPI العامّ | `UPDATE … isActive=TRUE` · **صفٌّ واحد · production** |
| ت-٢ | `/caracas/home` · `/menu` | ✅ 200 | تحقّقٌ فقط |
| ت-٣ | `/caracas/dashboard` | ✅ 200 | تحقّقٌ فقط |
| ت-٤ | الكتالوج | ✅ ٩٧ عنصراً · ١٠ أقسام | تحقّقٌ فقط |
| ت-٥ | أقسامُ الصفحة | ✅ ٨ | تحقّقٌ فقط |
| ت-٦ | الخدماتُ الأربع | ✅ مفعَّلة | تحقّقٌ فقط |
| ت-٧ | الحساب | ✅ مفعَّلٌ · هاتفٌ مضبوط · بانتظارِ ضبطِ كلمةٍ برابطٍ محفوظ (ينتهي ١٠-٠٧) | إيصالُ الرابطِ — **من الإنتاج** |
| ت-٨ | واتساب | `whatsapp_number=96176699852` ✅ · و**مسارُ إشعارِ الطلبِ غيرُ موجودٍ أصلاً** (`public/store.py` صفرُ إشعار) | لا شيءَ في هذه المهمّة — بندٌ منفصل |
| ت-٩ | `clients.phone='placeholder_caracas'` | لا يمنع شيئاً (`whatsapp_number` يُقرَأ أوّلاً) | 🟡 تنظيفٌ اختياريّ — **خارجَ النطاق** |

**⇒ التشغيلُ = ت-١ وحدَه. والثمانيةُ الباقيةُ تحقّقٌ لا تعديل.**

---

# ٥ · Regression / Safety

## ٥-أ · 🔴 الأثرُ الوحيدُ المُثبَت — والحلُّ **ليس** في هذه المهمّة

`public_service._resolve_booking_module_for` يفرّع على **القيمةِ المُعادة** لا على **وجودِ المدخل**:

```python
resolved = resolve_booking_module(vertical)
if resolved is None and vertical is not None:
    logger.warning("🔴 booking_module unresolved … This is a provisioning defect …")
```

مقيسٌ بتشغيلٍ حقيقيّ:

```
vertical='restaurant'  (مسجَّلٌ ويعلن أنّه بلا حجز)  ⇒ 🔴 تحذير
vertical='typo-xyz'    (غيرُ مسجَّل)                  ⇒ 🔴 تحذير
vertical='barber'                                    ⇒ صامت
vertical=None                                        ⇒ صامت
```

⇒ **بعد Phase B سيُطلَق تحذيرٌ يسمّي نفسَه «provisioning defect» على كلِّ زيارة — وهو ليس كذلك.**

```
الأثر:  ضجيجُ سجلٍّ فقط. صفرُ أثرٍ على الاستجابةِ أو على الواجهة (booking_module=null إمّا بإمّا)
الخطر: 🟡 تحذيرٌ كاذبٌ يدرّب القارئَ على تجاهلِ التحذيراتِ الحقيقيّة
🔒 ولا يُصلَح في هذه المهمّة — نطاقُها السجلُّ والتصنيف. يُسجَّل بنداً مستقلّاً
```

وهو **مُثبَّتٌ في الحزمةِ كـ`R-7`** مع ضبطٍ موجَبٍ ثلاثيّ، فلا يُنسى. وحين يُصلَح سينقلب R-7
ويُجبِر مَن يقلبه على تسميةِ السلوكِ القديم (`feedback_invariant_vs_transition_tests`).

## ٥-ب · والباقي — **صفرُ أثرٍ، مقيساً**

| المستهلك | الأثر | لماذا |
|---|---|---|
| `provisioning_service` | ⚪ صفر | لا يعمل إلّا بنداءٍ صريحٍ لـ`/admin/provisioning`. ولو نُودي، **يفشل مغلقاً** على `staff_backing_model=None` |
| `registration_service` | ⚪ صفر | يخصّ التسجيلَ الجديد. و`default_services` **يؤثّر في التزويدِ المستقبليِّ فقط — ولا يلمس صفّاً قائماً** (نفسُ سلوكِ تعديلِ barber يوم ٠٩-٠٦) |
| **arizona بخدمةٍ واحدة** | ⚪ صفر | لا مزامنةَ بأثرٍ رجعيّ. تبقى `restaurant` وحدَها حتّى يُقرَّر غيرُ ذلك |
| `demo_service` | ⚪ صفر | `_VERTICAL_MAP = {'barbershop':'barber'}` — لا مدخلَ للمطعم ⇒ مسارُ الديمو لا يتغيّر. **وخارجَ النطاق** |
| `whatsapp_notifications` | ⚪ صفر | `_VERTICAL_EMOJI = {'barber':'💈'}` ⇒ إيموجي افتراضيّ. **تجميليّ، خارجَ النطاق** |
| `lia_owner_entry` | ⚪ صفر | `_LIA_VERTICALS = frozenset({"barber"})` — **التصنيفُ لا يفكّ السياج**. ليا لا تعمل للمطاعم ولو صُنّفت |
| `reservation_service` | ⚪ صفر | `NO_MERCHANT_WHATSAPP_VERTICALS={'clinic'}` · و`reservations=0` للاثنين |
| الواجهة | ⚪ صفر | صفرُ قراءةٍ لـ`vertical`. تستقبل `booking_module` وستبقى `null` |
| Store vertical | ⚪ صفر | **لا يُمَسّ** — لا مدخلَ ولا تصنيفَ ولا خدمة |

## ٥-ج · وأثرُ ت-١ (`isActive=True`) — منفصلٌ تماماً

```
✅ يجعل /api/v1/public/caracas/* يستجيب (اليومَ NOT_FOUND)
🟡 ويجعل الصفحةَ **عامّةً فعلاً** — أيُّ أحدٍ بالرابطِ يراها. وهذا هو المطلوب، ويُقال صراحةً
⚪ صفرُ أثرٍ على تينانتٍ آخر: الشرطُ على slug واحد
🟡 وfootlab وsmar يبقيان isActive=False — **لا يُلمَسان**
```

---

# ٦ · Production Gate — **مُعدَّلٌ ببندِ سلمان ٦**

## 🔴 وأوّلاً: «التحقّقُ أنّ المنشورَ يعرف restaurant» **لا يُثبَت سلوكيّاً** — مقيس

```
resolve_booking_module("restaurant")   مسجَّلاً = None
                                       غيرَ مسجَّل = None      ⇒ صفرُ فرقٍ في أيِّ ردٍّ عامّ
وحتّى تحذيرُ /config نفسُه واحدٌ في الحالتين ("has no entry **or declares no booking_module**")
والفرقُ يظهر في موضعين فقط، وكلاهما يحتاج مصادقةً **ويكتب**:
   registration_service.py:114  ·  provisioning_service.py:162
```

⇒ **أيُّ فحصٍ سلوكيٍّ هنا سيكون أخضرَ بلا أن يقيس شيئاً** — وهو بالضبط صنفُ العطبِ المسجَّلِ في
`evolution/test-evidence-discipline.md`. فالبديلُ المُثبَت **الهاشُ ومحتواه**، طبقتان:

```
الطبقة ١   railway status --json  ⇒  commitHash == HEAD المدفوع        (النشرُ حصل)
الطبقة ٢   git show <commitHash>:app/core/verticals.py | grep restaurant (ذاك الهاشُ يحمل المدخل)
⇒ معاً: الكودُ المنشورُ يحمل السجلَّ — استنتاجٌ من حقيقتين مقيستين، لا من فحصٍ يدّعي القياس
⚠️ وrailway CLI مثبَّت (5.52.1) · والقاعدةُ: commit وlogs فقط، ولا `railway variables` أبداً
```

## التسلسل — بترتيبِ سلمان حرفيّاً

```
┌─ Phase A · كودٌ وفحوص · صفرُ إنتاج ──────────────────────────────┐
│ أ-١  إيداعُ مدخلِ restaurant + حزمتِه (مكتوبانِ سلفاً وغيرُ مُودَعَين) │
│ أ-٢  ف-أ١ التطبيقُ يُقلع · ف-أ٢ الحزمةُ 22/22                     │
│ أ-٣  ف-أ٣ الانحدارُ الكامل + مقارنةُ كلِّ إخفاقٍ على HEAD نظيفٍ في  │
│      worktree — ولا نسبةَ فشلٍ لتغييرِنا بلا هذه المقارنة          │
│ أ-٤  ف-أ٤ الإنتاجُ لم يتغيّر: الصفّانِ vertical=NULL بعدُ            │
└──────────────────────────────────────────────────────────────────┘
              🚦 بوّابة ١ — موافقةٌ صريحةٌ على نتائجِ أ-٢/٣/٤
                              ↓
┌─ Deploy · بموافقةٍ ─────────────────────────────────────────────┐
│ د-١  git push origin main                                       │
│ د-٢  مراقبةُ النشر (commit + logs فقط)                           │
│ د-٣  🔴 إثباتُ أنّ المنشورَ يحمل السجلَّ — بالطبقتين أعلاه         │
│      وإن لم تتطابق الطبقتان ⇒ STOP، ولا كتابةَ قاعدة             │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌─ Phase B · تصنيفُ الإنتاج ───────────────────────────────────────┐
│ ب-١  🔴 إعادةُ قراءةِ الصفَّين **مباشرةً قبل** الكتابة — الحقولُ     │
│      الأربعةُ على قيمِها المتوقَّعةِ في §٣، وإلّا STOP               │
│ ب-٢  المعاملةُ الواحدة · ثلاثةُ UPDATE بشروطٍ وRETURNING           │
│ ب-٣  تحقّقٌ داخلَ المعاملةِ قبل COMMIT · وROLLBACK على أيِّ شذوذ     │
│ ب-٤  قارئٌ مختومٌ مستقلٌّ بعدها — يُثبت ختمَه بكتابةٍ مرفوضةٍ أوّلاً  │
│      + ضبطٌ موجَب: clients=10 · reservations=67 · وcount(vertical='restaurant')=2 │
└──────────────────────────────────────────────────────────────────┘
              🚦 بوّابة ٢ — موافقةٌ على دليلِ ب-٤
                              ↓
┌─ Phase C · تشغيلُ caracas حيّاً — **وحدَه** ──────────────────────┐
│ ج-١  /api/v1/public/caracas/config ⇒ 200 (اليومَ NOT_FOUND)       │
│ ج-٢  🔴 **ومحتوىً فعليّاً لا 200 فقط** (بندُ سلمان):                │
│      booking_module=null · active_services فيها الأربع · sections=8 │
│ ج-٣  /caracas/home و /menu يرسمان أصنافاً حقيقيّةً من الـ٩٧         │
│ ج-٤  🔴 ضبطٌ موجَب: /rk/config ما زال booking_module='barber'      │
│      · /arizona/config ما زال 200 · ولم يُكسَر أحد                │
│ ج-٥  وتحذيرُ §5-أ: يُقرَأ من اللوجِ ويُسجَّل — **ولا يُصلَح**          │
└──────────────────────────────────────────────────────────────────┘
```

**وarizona لا تدخل Phase C** — تُصنَّف في B وتتوقّف عند ذلك.

# ٧ · Explicit Non-Goals

```
🚫 حجزُ طاولاتِ مطعم           🚫 حجوزاتُ مطعمٍ من أيِّ نوع
🚫 حجزُ موظَّفٍ أو مورد          🚫 أيُّ تغييرٍ في Store vertical
🚫 نقلُ footlab أو beit-al-fakhar أو smar أو أيِّ تينانتٍ آخر
🚫 إعادةُ تصميمِ WhatsApp ordering   🚫 معمارُ تزويدٍ جديد
🚫 إصلاحُ تحذيرِ §5-أ            🚫 بناءُ إشعارِ الطلبِ على واتساب
🚫 مدخلُ demo_service            🚫 إيموجي المطعم
🚫 تفعيلُ footlab أو smar (isActive=False كلاهما — يبقيان كما هما)
🚫 فكُّ سياجِ ليا للمطاعم         🚫 تنظيفُ clients.phone='placeholder_caracas'
```

---

# ٨ · Rollback

| التغيير | التراجع | يُفقَد شيء؟ |
|---|---|---|
| مدخلُ الـregistry | `git revert` لإيداعِ Phase A | لا |
| حزمةُ الفحص | نفسُ الإيداع | لا |
| `vertical='restaurant'` (صفّان) | `UPDATE clients SET vertical=NULL WHERE slug IN ('caracas','arizona')` | **لا** — القيمةُ كانت `NULL`، والتراجعُ يعيدها حرفيّاً |
| `isActive=TRUE` (caracas) | `UPDATE clients SET is_active=FALSE WHERE slug='caracas'` | **لا** — يعود محجوباً كما كان اليوم |

```
🟢 لا هجرة · لا تغييرَ مخطَّط · لا حذفَ صفٍّ · لا حذفَ عمود
🟢 وكلُّ تراجعٍ حقلٌ واحدٌ يعود إلى قيمتِه المقيسةِ سلفاً — لا إلى تخمين
🔴 وما لا يتراجع: رؤيةُ الناسِ للصفحةِ بعد isActive=TRUE. إن رآها أحدٌ فقد رآها
```

---

# ٩ · Exact Files / DB Rows

| File / Row | Change | Why | Production? | Risk | Verification |
|---|---|---|---|---|---|
| `app/core/verticals.py` | +مدخلُ `restaurant` (٤ حقول) | «restaurant» معتمدةٌ في طبقتين ومفقودةٌ في الثالثة | 🟢 لا | 🟡 تحذيرُ §5-أ | حزمة 22/22 · `sorted(V)==['barber','clinic','restaurant']` · وbarber/clinic بايتاً ببايت |
| `scripts/test_restaurant_vertical_registration.py` | ملفٌّ جديد | يثبّت الشكلَ والـNones الثلاثةَ و**فجوة R-7** | 🟢 لا | ⚪ | يُشغَّل بـ`venv/bin/python` (النظامُ يطبع صفراً كاذباً) |
| `clients` · `caracas` · `vertical` | `NULL → 'restaurant'` | تصنيف · Phase B | 🔴 **نعم** | 🟡 §5-أ | `WHERE vertical IS NULL AND is_active=false` + `RETURNING` ⇒ صفٌّ واحد |
| `clients` · `caracas` · `is_active` | `false → true` | 🎯 **هذا وحدَه تشغيلُ caracas** · Phase B | 🔴 **نعم** | 🟡 الصفحةُ تصير عامّةً فعلاً | `WHERE is_active=false` + `RETURNING` ⇒ صفٌّ واحد · ثمّ `/caracas/config` 200 **بمحتوىً** |
| `clients` · `arizona` · `vertical` | `NULL → 'restaurant'` | تصنيفٌ **فقط** · Phase B | 🔴 **نعم** | 🟡 §5-أ | `WHERE vertical IS NULL AND is_active=true` + `RETURNING` ⇒ صفٌّ واحد |
| `clients` · `arizona` · `is_active` | 🚫 **لا يُمَسّ** | قيمتُه `true` صحيحةٌ أصلاً | — | ⚪ | يُقرَأ ويُثبَت أنّه لم يتغيّر |
| `.claudedocs/plans/…` (هذا) + التحقيقان | توثيق | الخطّةُ تعيش في المستودع | 🟢 لا | ⚪ | — |

**ولا يُمَسّ:** `schema.prisma` · أيُّ ملفِّ واجهة · `demo_service` · `whatsapp_notifications` ·
`public_service` · `provisioning_service` · `service-system.md` · أيُّ عقدٍ قائم · وأيُّ صفٍّ
لتينانتٍ غيرِ الاثنين.

---

## ملاحظةٌ منهجيّةٌ تستحقّ البقاء

حقلُ `isActive` **لم يكن في جردتي الأولى للتينانتات** — عرضتُ `status` و`lifecycle_state` وغاب
الحقلُ الذي يحجب الـAPI فعلاً. ولم يظهر إلّا حين سألتُ سؤالاً آخرَ تماماً («هل الـconfig يحمل
`booking_module`؟») فجاء الجوابُ `Tenant not found`.

⇒ **جردةٌ لا تفحص المسارَ الحقيقيَّ تُظهر تينانتاً سليماً وهو محجوب.** وهذا نفسُ شكلِ العطبِ
المسجَّلِ في `feedback_verify_the_connection_not_the_pieces`.

---

**Decision: مطلوبةٌ من سلمان. Execution: صفر.**


---

# ١٠ · سجلُّ تعديلِ الخطّة

## تعديل ١ · ٢٠٢٦-٠٩-٣٠ — بعد مراجعةِ سلمان

وافق على المعمارِ والنطاق، ورفض تنفيذَ Phase A كما هي قبل ثمانيةِ تعديلات. ما تغيّر:

| # | طلبُه | ما صار |
|---|---|---|
| ١ | تعريفُ `restaurant` يبقى كما هو | ✅ §٢ بلا تغيير |
| ٢ | R-7 خارجَ النطاق | ✅ §٥-أ و§٧ مؤكَّدان · و`R-7` يبقى حارساً في الحزمة |
| ٣ | Phase B تميّز caracas (تغييران) عن arizona (تغييرٌ واحد) | ✅ §٣ أُعيد كتابتُه بجدولِ invariants لكلِّ صفٍّ وحقل |
| ٤ | لكلِّ `UPDATE` شرطُ حالةٍ سابقةٍ و`RETURNING` | ✅ ثلاثةُ `UPDATE` بشروطٍ صريحةٍ · و«أيُّ صفٍّ صار ماذا» بدل عدٍّ مبهم |
| ٥ | شرطٌ غيرُ متوقَّع = STOP لا إصلاح | ✅ قاعدةٌ مستقلّةٌ في §٣، ومعها منعُ «توسيعِ الشرطِ» صراحةً |
| ٦ | push/deploy قبل كتابةِ القاعدة، ومعه إثباتُ أنّ المنشورَ يعرف `restaurant` | ✅ مرحلةُ `Deploy` مستقلّةٌ بين البوّابةِ ١ وPhase B — **مع تصحيحٍ أدناه** |
| ٧ | arizona تُصنَّف ولا تُشغَّل | ✅ §٣ و§٦: لا تدخل Phase C · و`is_active` لا يُمَسّ |
| ٨ | caracas وحدَه يدخل Phase C | ✅ §٦ |

## 🔴 وتصحيحٌ لبندِه ٦ — قياسٌ غيّر الصياغة

طلب «التحقّقَ أنّ الكودَ المنشورَ يعرف `restaurant`». **وهذا لا يُثبَت سلوكيّاً، مقيساً:**

```
resolve_booking_module("restaurant")  مسجَّلاً = None  ·  غيرَ مسجَّل = None
وتحذيرُ /config واحدٌ في الحالتين — نصُّه نفسُه يقول "or declares no booking_module"
والفرقُ في موضعين فقط: registration_service:114 · provisioning_service:162 — كلاهما يحتاج مصادقةً ويكتب
```

⇒ لو كتبتُ فحصاً سلوكيّاً هنا لكان **أخضرَ بلا أن يقيس شيئاً** — وهو الصنفُ الذي سجّلناه سبعَ
مرّاتٍ في `evolution/test-evidence-discipline.md`. فالبديلُ المُعتمَد **طبقتان مقيستان**:
الهاشُ المنشورُ يطابق المدفوع، **وذلك الهاشُ نفسُه يحمل المدخلَ** (`git show <hash>:…`).

**نيّةُ بندِه محفوظة، وطريقةُ إثباتِه تغيّرت لأنّ الأولى غيرُ قابلةٍ للإثبات.**

---

**الحالة: 🟡 مُعدَّلةٌ وتنتظر بوّابةَ ١. Execution: صفر.**

---

# ١١ · ✅ نُفِّذت بالكامل · ٢٠٢٦-٠٩-٣٠

| المرحلة | الحالة | الدليل |
|---|---|---|
| **A** كودٌ وفحوص | ✅ | `83287f2` · حزمة 22/22 · والانحدارُ **FAIL 10 → 10** مقابلَ HEAD نظيفٍ في worktree بنفسِ اللحظةِ والقاعدة |
| **Deploy** | ✅ | `activeDeployments[0].meta.commitHash = 83287f2` · `status=SUCCESS` · `instances[0].status=RUNNING` — **لا `latestDeployment`** · و`/health` 200 على ٩ استطلاعات |
| **B** تصنيفُ الإنتاج | ✅ | ثلاثةُ `UPDATE` بشروطٍ وRETURNING في معاملةٍ واحدة · وقارئٌ مختومٌ مستقلّ |
| **C** تحقّقُ كاراكاس | ✅ | `/config` 200 · `booking_module=null` · ٤ خدمات · ٨ أقسام · ١٠ فئات · ١٤ صنفاً في أوّلِ فئة |

## مخرجاتُ `RETURNING` — حرفيّاً

```
caracas · vertical    → ('caracas', 'restaurant', False)
caracas · is_active   → ('caracas', 'restaurant', True)
arizona · vertical    → ('arizona',  'restaurant', True)
```

**والصفّانِ الأوّلانِ يُظهران التغييرَين منفصلَين بالترتيب** — وهو ما لم يكن `rowcount` ليقوله.

## الضبطُ الموجَب بعد التنفيذ

```
barber 4 (لم يُلمَسوا) · clinic 1 · restaurant 2
clients 10 · reservations 67 · customers 11 · barbers 8   — كلُّها كما كانت
rk='barber' · mr-h='barber' · cliniclab-test='clinic' · arizona=None
والمحجوبون: footlab · smar   (كانوا ثلاثةً، وخرج caracas وحدَه)
```

## وثلاثةُ أشياءَ لم تُنفَّذ بقصد

```
🔒 R-7          التحذيرُ الكاذبُ يُطلَق الآن — بندٌ مستقلّ، ومُثبَّتٌ في الحزمةِ فلا يُنسى
🔒 arizona      صُنِّفت ولم تُشغَّل — ٠ أقسامِ صفحة · ٠ مستخدمين · خدمةٌ واحدة
🔒 الرسمُ في متصفّح  Playwright منقطعٌ ⇒ البياناتُ مُثبَتةٌ والرسمُ **Unknown**، لا مُفترَضٌ نجاحُه
```

**الحالة: 🟢 مُغلَقة.**

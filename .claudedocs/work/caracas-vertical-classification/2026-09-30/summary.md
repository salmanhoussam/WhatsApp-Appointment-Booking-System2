# Caracas Online — تصنيفُه تحت vertical المطاعم · تحقيقٌ فقط · ٢٠٢٦-٠٩-٣٠

**الحالة:** 🟡 تحقيقٌ مكتمل · **صفرُ تعديل**: لا schema · لا بياناتِ إنتاج · لا سلوكَ تزويد
**الطلب:** سلمان — «الهدف أن تكون Caracas مصنَّفةً `restaurant`، وليس إنشاءَ vertical باسم Caracas»

---

## الخلاصة: الهدفُ صحيح، **والطريقُ إليه مسدودٌ بخطوةٍ ناقصة**

```
🔴 لا يوجد vertical اسمُه `restaurant`. السجلُّ يحمل اثنين فقط: barber · clinic
⇒ كتابةُ vertical='restaurant' اليومَ تُنتج قيمةً غيرَ مسجَّلة، لا تصنيفاً
⇒ الترتيبُ الملزِم: يُسجَّل الـvertical أوّلاً، ثمّ يُصنَّف التينانت. والعكسُ يُنتج عطباً صامتاً
```

---

## Confirmed Findings

### ت-١ · أين معرفةُ التينانت — ثلاثُ طبقاتٍ لا واحدة

| الطبقة | الموضع | القيمةُ الحاليّة |
|---|---|---|
| **القاعدة (الحاكمة)** | `clients.vertical` | 🔴 **`NULL`** |
| الخدمات | `client_services` | `catalog` · `restaurant` · `restaurant.menu` · `whatsapp_ordering` — **كلُّها مفعَّلة** |
| الواجهة | `router/tenants/index.js:31` | `caracas: { routes, defaultRedirect: 'home', theme: 'dark-ember' }` |

`id = b4628f71-6e74-4170-ab18-59b7d51ec39c` · `name_en='Caracas'` · `name_ar='كاراكاس'` ·
أُنشئ ٢٠٢٦-٠٥-٠١ · `status=active` · `lifecycle_state=trial`.

### ت-٢ · هو مطعمٌ **وظيفيّاً** بالفعل — والتصنيفُ وحدَه ناقص

```
catalog_items 97   ← أكبرُ عددٍ لدى أيِّ تينانتٍ في الإنتاج
catalog_services 0 · reservations 0 · units 0 · barbers 0 · store_orders 0
```

⇒ البياناتُ والخدماتُ تقول «مطعم». **الحقلُ الحاكمُ وحدَه فارغ.**

### ت-٣ · السجلُّ الحاكمُ يحمل قيمتين فقط

`app/core/verticals.py` · `VERTICAL_REGISTRY` = `['barber', 'clinic']`. ولكلِّ مدخلٍ **أربعةُ
حقولٍ إلزاميّة**: `default_services` · `page_template` · `staff_backing_model` · `booking_module`.

### ت-٤ · `vertical` نصٌّ حرّ — والحارسُ في التزويدِ لا في القاعدة

```
prisma/schema.prisma:109   vertical String? @map("vertical")   ← لا enum ولا قيد
registration_service:143   "vertical": vertical if vertical_entry else None
registration_service:147   raise BusinessLogicError(f"Unsupported vertical '{vertical}'.")
```

⇒ القاعدةُ تقبل أيَّ نصّ. **كتابةٌ مباشرةٌ في الصفِّ تتجاوز الحارسَ كلَّه.**

### ت-٥ · «restaurant» موجودةٌ في المشروعِ بثلاثةِ معانٍ — وخلطُها هو الخطر

| المعنى | الموضع | حالةُ caracas |
|---|---|---|
| **`service_key`** | `client_services` · **١٢ بوّابةَ `require_service("restaurant")` حقيقيّة** | ✅ يحملها |
| **`service_type`** | `SERVICE_TYPE_MAP['restaurant'] = ['restaurant','whatsapp_ordering','restaurant.menu']` | ✅ مطابق |
| **`vertical`** | `VERTICAL_REGISTRY` | 🔴 **غيرُ موجودةٍ أصلاً** |

**هذا جوهرُ المسألة:** «restaurant» مفردةٌ معتمدةٌ في طبقتين ومفقودةٌ في الثالثة — وهي الطبقةُ
التي طلبتَ التصنيفَ فيها.

### ت-٦ · ماذا يحدث لو كُتبت `vertical='restaurant'` **بلا** تسجيلٍ أوّلاً

| المستهلك | الأثر |
|---|---|
| 🔴 `public_service._resolve_booking_module_for` | `resolve_booking_module` ⇒ `None`، **وتحذيرٌ 🔴 في السجلّ عند كلِّ جلبٍ لـ`/config`** |
| 🟡 `admin/provisioning.py` | يتحوّل خطؤه من «no vertical assigned» إلى «Unsupported vertical» — **تغييرُ رسالةٍ لا إصلاح** |
| 🟡 `provisioning_service` | `BusinessLogicError(f"Unsupported vertical 'restaurant'")` |
| ⚪ `lia_owner_entry` | لا يتغيّر — ليا مسيَّجةٌ في barber، والمطعمُ لا يدخلها |
| ⚪ `reservation_service` | `NO_MERCHANT_WHATSAPP_VERTICALS={'clinic'}` — لا أثر (و`reservations=0`) |
| ⚪ `whatsapp_notifications.shop_label` | `_VERTICAL_EMOJI={'barber':'💈'}` ⇒ إيموجي افتراضيّ |

⇒ **يفتح صفراً، ويُضيف ضجيجاً في السجلِّ عند كلِّ زيارة.**

### ت-٧ · الواجهةُ لا تقرأ `vertical` إطلاقاً — وهذا مقصود

مسحُ `frontend/src` أعطى مطابقاتٍ كلَّها CSS (`resize: vertical` · `WebkitBoxOrient`). ما يصل
الواجهةَ هو `booking_module` المشتقُّ في الخادم — **ق-٥-ب صامدة**، فالتصنيفُ لا يغيّر شيئاً مرئيّاً.

---

## Side Findings

- **س-١ · جدولُ التينانتاتِ في `CLAUDE.md` يصف caracas بـ«zero activity» — وهو مغلوط.**
  عمودُ «Services» فيه = `catalog_services` (تحقّقٌ: rk=7 · smar=7)، و**أعمى تماماً عن
  `catalog_items`** حيث تعيش بياناتُ المطاعمِ والمتاجر. القياس:

  | slug | catalog_services | **catalog_items** | orders |
  |---|---:|---:|---:|
  | caracas | 0 | **97** | 0 |
  | beit-al-fakhar | 0 | 34 | **4** |
  | arizona | 0 | 28 | 0 |

  ⇒ ثلاثةُ تينانتاتٍ موصوفةٍ بـ«zero activity» تحمل ١٥٩ عنصراً و٤ طلبات. **أعمدةُ الجدولِ
  مصمَّمةٌ على شكلِ الحلاق.**

- **س-٢ · `_VERTICAL_MAP = {'barbershop': 'barber'}`** في `demo_service` — خريطةُ
  `business_type → vertical`، وتحمل مدخلاً واحداً. أيُّ vertical جديدٍ يحتاج مدخلَه هنا أيضاً
  ليعمل مسارُ الديمو.

---

## Unknowns

| # | المجهول |
|---|---|
| ك-١ | هل يُراد `restaurant` لـcaracas وحدَه، أم للثلاثةِ معاً (arizona · footlab · beit-al-fakhar)؟ **قرارُ نطاقٍ لم يُطلَب** |
| ك-٢ | ما `staff_backing_model` للمطعم؟ barber→`Barber` · clinic→`Resource` · والمطعمُ لا يحجز موظَّفاً. `None` هو الجوابُ الصادق، **وأثرُه أنّ التزويدَ التلقائيَّ يفشل مغلقاً** — وهو سلوكٌ صحيحٌ يحتاج إقرارَك |
| ك-٣ | هل تُنقل `arizona`/`footlab` أيضاً؟ لم يُقَس طلبُها |

---

## أقلُّ تغييرٍ مطلوب — بالترتيبِ الملزِم

### الخطوة ١ · تسجيلُ الـvertical (كودٌ فقط · صفرُ إنتاج)

`app/core/verticals.py` — مدخلٌ واحد:

```python
"restaurant": {
    "default_services": ["catalog", "restaurant", "restaurant.menu", "whatsapp_ordering"],
    "page_template": None,          # غيرُ مبنيٍّ — صدقٌ كما في barber وclinic
    "staff_backing_model": None,    # المطعمُ لا يحجز موظَّفاً  ← يحتاج إقرارَك (ك-٢)
    "booking_module": None,         # لا حجز. وق-٥-ب §٧-ب عرّفت null سلفاً ولا تخترع سلوكاً
},
```

🟢 **وأناقةُ ذلك أنّ `booking_module = null` سلوكُه مُقَرٌّ سلفاً** في عقدِ ق-٥-ب — فلا نخترع شيئاً.

### الخطوة ٢ · تصنيفُ التينانت (🔴 **كتابةُ إنتاج**)

```sql
UPDATE clients SET vertical = 'restaurant' WHERE slug = 'caracas';   -- صفٌّ واحد
```

🔴 **تحتاج تصريحاً صريحاً منفصلاً.** ولا تُنفَّذ قبل الخطوةِ ١، وإلّا أنتجت ت-٦.

### الملفّاتُ التي ستتأثّر — بالضبط

| الملفّ | التغيير | لازم؟ |
|---|---|---|
| `app/core/verticals.py` | مدخلُ `restaurant` | ✅ **إلزاميّ** |
| `clients` (صفُّ caracas) | `vertical = 'restaurant'` | ✅ **إلزاميّ · إنتاج** |
| `app/services/demo_service.py` | `_VERTICAL_MAP['restaurant']` | 🟡 فقط إن أردنا مساراً للديمو |
| `app/services/whatsapp_notifications.py` | `_VERTICAL_EMOJI['restaurant']` | ⚪ تجميليّ |
| `.claude/CLAUDE.md` | تصحيحُ جدولِ التينانتات (س-١) | 🟡 منفصلٌ عن هذا |

**ولا يتغيّر:** `schema.prisma` · أيُّ ملفِّ واجهة · أيُّ عقدٍ قائم · سلوكُ التزويدِ للتينانتاتِ
القائمة (المدخلُ الجديدُ يؤثّر في التزويدِ **المستقبليِّ** فقط، كما فعل تعديلُ barber يوم ٠٩-٠٦).

---

**Decision: مطلوبةٌ من سلمان. Execution: صفر.**

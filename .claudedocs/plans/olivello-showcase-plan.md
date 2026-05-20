# Olivello — خطة الـ Tenant والـ Showcase Page
# مستوحاة من "رحلة زيتونة"
# تاريخ: 2026-05-19

---

## 1. هوية الـ Tenant

| الحقل | القيمة |
|-------|--------|
| slug | `olivello` |
| name_ar | أوليفيلو |
| name_en | Olivello |
| module_key | `store` |
| currency | `$` |
| primary_color | `#7A6E4A` (زيتون محروق / burnt olive) |
| secondary_color | `#C8A84B` (ذهب دافئ / warm gold) |
| domain (مستقبلاً) | `olivello.salmansaas.com` |
| brand tone | حكائي · طبيعي · موروث · فاخر |

---

## 2. ملفات الـ Tenant الإلزامية (tenant-onboarding.md checklist)

```
scripts/data/olivello/
├── settings.json        ← يُنشأ أولاً
├── page_content.json    ← من قالب store + تعديل نصوص
├── categories.json      ← 4 فئات
└── items.json           ← 12 منتج
```

### settings.json
```json
{
  "_meta": {
    "slug": "olivello",
    "module_key": "store",
    "currency": "$",
    "note": "متجر زيت زيتون فاخر — رحلة من الشجرة إلى القنينة"
  },
  "name_ar": "أوليفيلو",
  "name_en": "Olivello",
  "tagline_ar": "من شجرة إلى قطرة — خلاصة التاريخ في قنينة",
  "tagline_en": "From tree to drop — history distilled in a bottle",
  "primary_color": "#7A6E4A",
  "whatsapp": "+961XXXXXXXX"
}
```

### categories.json (4 فئات)
```json
[
  { "name_ar": "زيت بكر ممتاز", "name_en": "Extra Virgin Oil", "sort_order": 1 },
  { "name_ar": "زيت المعصرة الحجرية", "name_en": "Stone Mill Oil", "sort_order": 2 },
  { "name_ar": "زيت معطّر", "name_en": "Infused Oil", "sort_order": 3 },
  { "name_ar": "مجموعات الهدايا", "name_en": "Gift Sets", "sort_order": 4 }
]
```

### items.json (نماذج)
```json
[
  {
    "category": "زيت بكر ممتاز",
    "name_ar": "زيت الزيتون البكر — 500مل",
    "name_en": "Extra Virgin Olive Oil — 500ml",
    "price": 18.00,
    "description_ar": "عصير بارد من بساتيننا الجبلية — حموضة أقل من 0.3٪",
    "metadata": { "size": "500ml", "harvest_year": "2025", "acidity": "< 0.3%", "origin": "جبال لبنان" }
  },
  {
    "category": "زيت المعصرة الحجرية",
    "name_ar": "زيت المعصرة الحجرية — 750مل",
    "name_en": "Stone Mill Oil — 750ml",
    "price": 28.00,
    "description_ar": "معصور بالأسلوب التقليدي على حجر البازلت — طعم الأرض والذاكرة",
    "metadata": { "size": "750ml", "method": "stone_mill", "notes": "fruity, peppery" }
  },
  {
    "category": "زيت معطّر",
    "name_ar": "زيت الزيتون بالزعتر البري",
    "name_en": "Wild Thyme Infused Oil",
    "price": 22.00,
    "description_ar": "زيت بكر ممتاز مُعطَّر بزعتر الجبل اللبناني",
    "metadata": { "infusion": "wild thyme", "size": "250ml" }
  },
  {
    "category": "مجموعات الهدايا",
    "name_ar": "طقم رحلة الزيتونة — 3 قناني",
    "name_en": "The Olive Journey Gift Set — 3 bottles",
    "price": 65.00,
    "description_ar": "ثلاث قناني تروي كل مرحلة من رحلة الزيتونة",
    "metadata": { "includes": ["500ml Extra Virgin", "250ml Stone Mill", "250ml Thyme Infused"] }
  }
]
```

---

## 3. خطوات التنفيذ (ترتيب إلزامي)

```
الخطوة 1: إنشاء scripts/data/olivello/ + 4 ملفات
الخطوة 2: python scripts/seed_unified_clients.py olivello   (أو API)
الخطوة 3: python scripts/seed_page_content.py olivello
الخطوة 4: python scripts/seed_catalog.py olivello
الخطوة 5: scaffold frontend — src/pages/olivello/
الخطوة 6: بناء ShowcasePage.jsx (خطة الـ 7 مراحل أدناه)
الخطوة 7: src/router/tenants/olivello.routes.jsx + تسجيل في registry
الخطوة 8: اختبار محلي + deploy
```

---

## 4. خطة الـ Showcase Page — رحلة زيتونة

### 4.1 الهوية البصرية

**نظام الألوان:**
```
--olive-dark:    oklch(32% 0.06 95)   /* أرضي غامق — خلفية رئيسية */
--olive-mid:     oklch(48% 0.08 100)  /* الزيتون الكلاسيكي */
--stone-warm:    oklch(68% 0.04 85)   /* حجر المعصرة */
--gold-harvest:  oklch(72% 0.12 75)   /* ذهب الحصاد */
--cream-press:   oklch(92% 0.02 90)   /* نص على خلفية داكنة */
--oil-gold:      oklch(78% 0.16 72)   /* لون الزيت النقي */
```

**الخط:** Playfair Display (عناوين) + النظام للعربية
**الإحساس:** ورش قديمة · حجارة · خشب متقدم في السن · ضوء الشمس الصباحي

---

### 4.2 هيكل الـ 7 Sections — رحلة زيتونة

---

#### Section 1: الزيتونة على الشجرة
**اسم الـ Component:** `TreeSection.jsx`
**الإحساس:** صمت الفجر، أوراق فضية، جذور قديمة

**Layout:**
- خلفية: `oklch(22% 0.05 100)` (ليل جبلي)
- Hero كامل الشاشة (100dvh)
- شجرة زيتون SVG متحركة تتمايل ببطء (Framer Motion `y: [0, -8, 0]` loop)
- نص ظاهر على اليسار، RTL:
  ```
  كانت تحلم      (fade in, 0.8s delay)
  بين السماء والتراب
  زيتونة لم تشخ أبداً
  ```
- Scroll cue: نقطة ذهبية تنبض أسفل الشاشة
- **Parallax:** أوراق تتحرك بسرعة مختلفة عن الجذع (3 طبقات)

**Animation:**
```js
// Framer Motion scroll-linked
const { scrollYProgress } = useScroll({ target: treeRef, offset: ['start end', 'end start'] })
const leavesY = useTransform(scrollYProgress, [0, 1], [0, -60])
const trunkY  = useTransform(scrollYProgress, [0, 1], [0, -20])
```

---

#### Section 2: القطاف
**اسم الـ Component:** `HarvestSection.jsx`
**الإحساس:** دفء، أيدي، سلال، أغاني جبلية

**Layout:**
- خلفية تنتقل من ليلي → ذهب الفجر (gradient animated)
- صورة كبيرة: يد تقطف زيتونة (fill, object-cover)
- نص يبرز من خلف الصورة:
  ```
  جاءت الأيدي الدافئة
  والسلال من قش البلاد
  والنساء يغنّين
  ```
- عند الـ scroll: ثلاث صور "cards" تنزلق من اليمين (stagger 0.15s)
  - صورة 1: سلة مليئة بالزيتون
  - صورة 2: عنقود زيتون أخضر
  - صورة 3: أيدي تعمل معاً

**Animation:**
```js
// Stagger entrance
cards.map((_, i) => ({
  initial: { opacity: 0, x: 60 },
  whileInView: { opacity: 1, x: 0 },
  transition: { delay: i * 0.15, type: 'spring', stiffness: 80, damping: 18 }
}))
```

---

#### Section 3: المعصرة الحجرية
**اسم الـ Component:** `MillSection.jsx`
**الإحساس:** حجر + تراب + عرق قديم، ظلام دافئ

**Layout:**
- الخلفية: صورة معصرة حجرية مع overlay `rgba(15,12,8,0.7)`
- تأثير grain texture مضاف (CSS `filter: url(#noise)` أو `mix-blend-mode: overlay`)
- النص في المركز، ينزل ببطء مع الـ scroll:
  ```
  هناك
  حيث يلتقي الحجر بالأرض
  والروائح تروي ما لا تقوله الكلمات
  ```
- المعصرة "تضيء" تدريجياً عند الدخول إلى الـ viewport

**Animation:**
```js
const lightOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [0.3, 0.9, 0.5])
// overlay يضعف = المشهد يضيء
```

---

#### Section 4: الحجر الدوّار والحمار الأعمى
**اسم الـ Component:** `DonkeySection.jsx`
**الإحساس:** دوران بلا نهاية، إيقاع، ذاكرة حركية

**Layout:**
- عنصر مركزي: حجر دائري SVG/CSS يدور بشكل مستمر
  ```css
  @keyframes millstone-turn {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  /* مدة: 8s linear infinite — بطيء وثقيل */
  ```
- النص يظهر حول الدائرة (circular text path أو 4 أرباع):
  ```
  دار · ودار · ودار
  الحمار المعصوب العينين
  يحفظ الطريق
  ```
- عند الـ scroll: سرعة الدوران تتسارع ثم تتباطأ

**Technical:**
```js
const speed = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [4, 2, 2, 8])
// CSS custom property tied to Framer MotionValue
```

---

#### Section 5: العجينة الخضراء
**اسم الـ Component:** `PasteSection.jsx`
**الإحساس:** تحول، تركيز، عطر حاد

**Layout:**
- خلفية: `oklch(42% 0.14 130)` (أخضر زيتوني مركّز)
- Animation: splash/ripple — كأن الزيتون يُسحق
  - دائرة خضراء تنفجر للخارج عند دخول الـ viewport
- نص واحد كبير يتكشّف حرفاً بحرفاً:
  ```
  انكسرت
  ```
  (ثم بأحرف أصغر تحتها)
  ```
  لتصبح شيئاً آخر
  ```
- 3 "نقاط ذوق" تظهر على اليسار:
  - 🌿 عشبي حاد
  - 🍋 نكهة ليمون خضراء
  - 🌶️ لسعة فلفل خفيفة

---

#### Section 6: الحصائر والمعصر
**اسم الـ Component:** `PressSection.jsx`
**الإحساس:** ثقل · ضغط · ولادة

**القصة:** انكسارها هو ولادتها الحقيقية

**Layout:**
- نظام طبقات عمودي: حصائر الليف تتراكم واحدة فوق أخرى عند الـ scroll
- كل حصيرة = `motion.div` تنزل من الأعلى بـ stagger:
  ```js
  {[1,2,3,4,5].map((i) => (
    <motion.div
      key={i}
      initial={{ y: -120 * i, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      transition={{ delay: i * 0.1, type: 'spring', stiffness: 50, damping: 14 }}
    />
  ))}
  ```
- عند اكتمال التراكم: نص ينبثق من الأسفل:
  ```
  الانكسار
  هو الولادة الحقيقية
  ```
- صوت اختياري: صوت معصرة خشبية قديمة (audio snippet, مشغّل عند hover)

---

#### Section 7: القطرة الذهبية
**اسم الـ Component:** `GoldenDropSection.jsx`
**الإحساس:** صفاء · ذهب · خلاصة كل شيء

**هذا هو الـ Climax — أهم section في الصفحة**

**Layout:**
- خلفية: gradient من `oklch(22% 0.05 100)` → `oklch(72% 0.16 72)` (أسود → ذهب)
- قطرة SVG كبيرة في المركز — يتملأ بالون داخلها من أسفل إلى أعلى (scroll-linked):
  ```js
  const fillHeight = useTransform(scrollYProgress, [0, 1], ['0%', '100%'])
  // clipPath داخل الـ SVG يتوسع مع الـ scroll
  ```
- داخل القطرة: نص متحرك يصعد مع الزيت:
  ```
  رائحة الجبل
  ذاكرة الحجر
  أغاني النساء
  دوائر الحمار
  ```
- عند اكتمال القطرة: تنفجر ببريق — confetti من جزيئات ذهبية صغيرة
- الـ CTA يظهر بعد الانفجار:
  ```
  [اطلب قنينتك الآن]    [اكتشف المنتجات]
  ```

**Animation — الـ confetti:**
```js
// 40 particle من motion.div
// random angle + distance عند trigger
// ease-out-expo: { type: 'spring', stiffness: 60, damping: 12 }
```

---

### 4.3 الـ ScrollProgress HUD (اختياري)

```
navbar ثابت في الأعلى:
○──●──○──○──○──○──○
الشجرة · القطاف · المعصرة · الدوران · العجينة · الضغط · القطرة

(نقطة ذهبية تنتقل بين المراحل مع الـ scroll)
```

---

### 4.4 نظام المنتجات (بعد الـ showcase sections)

**Section 8: المتجر**
- 4 cards منتجات — grid 2×2
- كل card بها: صورة، اسم، وصف قصير، سعر، زر "أضف للسلة"
- فيلتر بسيط: كل الأنواع | زيت بكر | معصرة حجرية | معطّر | هدايا
- Cart floating button (زر العربة ثابت)

---

## 5. Structure الـ Frontend Files

```
frontend/src/pages/olivello/
├── canvas/
│   └── (empty for now — no WebGL phase 1)
├── sections/
│   ├── TreeSection.jsx
│   ├── HarvestSection.jsx
│   ├── MillSection.jsx
│   ├── DonkeySection.jsx
│   ├── PasteSection.jsx
│   ├── PressSection.jsx
│   ├── GoldenDropSection.jsx
│   └── ProductsSection.jsx
├── ui/
│   ├── OlivelloNav.jsx       ← navbar + progress HUD
│   └── OlivelloCart.jsx      ← floating cart button
├── store/
│   └── useOlivelloStore.js   ← Zustand: cart items, scrollPhase
├── showcase/
│   └── OlivelloShowcase.jsx  ← الصفحة الرئيسية (تجمع الـ 7 sections)
├── normal/
│   └── StorePage.jsx         ← المتجر فقط (بدون showcase)
└── olivello.css              ← body[data-slug="olivello"] scoped CSS
```

---

## 6. Routes File

```jsx
// src/router/tenants/olivello.routes.jsx
import { lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

const OlivelloShowcase = lazy(() => import('../../pages/olivello/showcase/OlivelloShowcase'))
const StorePage        = lazy(() => import('../../pages/olivello/normal/StorePage'))

export default function OlivelloRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="showcase" replace />} />
      <Route path="showcase" element={<OlivelloShowcase />} />
      <Route path="store"    element={<StorePage />} />
      <Route path="*"        element={<Navigate to="showcase" replace />} />
    </Routes>
  )
}
```

```js
// src/router/tenants/index.js — إضافة:
olivello: {
  routes: lazy(() => import('./olivello.routes')),
  defaultRedirect: 'showcase',
  theme: 'olive',
},
```

---

## 7. تسلسل التنفيذ للـ Agent

```
Phase A — Tenant Registration (30 دقيقة)
→ منفّذ: backend-architect agent
→ إنشاء scripts/data/olivello/ (4 ملفات)
→ seed_unified_clients.py olivello
→ seed_page_content.py olivello
→ seed_catalog.py olivello
→ المخرج: olivello يظهر في /super/clients

Phase B — Frontend Scaffold (20 دقيقة)
→ منفّذ: Frontend-Architect-Agent
→ إنشاء folder structure كاملة
→ olivello.css + useOlivelloStore.js
→ olivello.routes.jsx + تسجيل في index.js
→ المخرج: /olivello/showcase يفتح بدون خطأ

Phase C — Section 1-4 (60 دقيقة)
→ منفّذ: impeccable craft
→ TreeSection + HarvestSection + MillSection + DonkeySection
→ Framer Motion scroll-linked للكل

Phase D — Section 5-7 + CTA (60 دقيقة)
→ منفّذ: impeccable craft (يكمل)
→ PasteSection + PressSection + GoldenDropSection
→ confetti animation + CTA buttons

Phase E — ProductsSection + Cart (45 دقيقة)
→ منفّذ: Frontend-Architect-Agent
→ ProductsSection مع فيلتر
→ OlivelloCart (Zustand + API integration)
→ wired to store module endpoints

Phase F — Polish + Deploy (30 دقيقة)
→ /impeccable polish
→ test scroll performance (60fps check)
→ git commit + deploy
```

---

## 8. معيار النجاح

```
✅ /olivello/showcase يفتح
✅ 7 sections تظهر بترتيب الـ scroll
✅ القطرة الذهبية تمتلئ مع الـ scroll
✅ المنتجات تُعرض من الـ DB
✅ إضافة منتج للسلة تشتغل
✅ 60fps على Chrome DevTools (no jank)
```

---

## 9. ملاحظات تقنية مهمة

- **FM12 Rule:** OlivelloShowcase يستخدم `useScroll` → يجب أن يكون `lazy()` في الـ routes
- **CSS Grain texture:** استخدم SVG feTurbulence filter — لا external image
- **Circular text (Section 4):** استخدم `textPath` داخل SVG — لا library
- **Scroll performance:** `will-change: transform` فقط على العناصر المتحركة بالـ scroll — لا على كل شيء
- **Mobile:** الـ 7 sections تتكدس عمودياً — parallax effects تنعدم على موبايل (performance)
- **Image loading:** كل صور الـ sections = `loading="eager"` + `decoding="async"` + dimensions محددة

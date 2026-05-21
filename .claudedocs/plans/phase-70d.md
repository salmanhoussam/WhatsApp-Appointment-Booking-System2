# Phase 70D — Olivello Showcase Sections 4-7
# تاريخ: 2026-05-21
# الهدف: بناء الـ 4 sections المتبقية من رحلة زيتونة

---

## الـ Sections المطلوبة

| # | Component | الوصف | الأولوية |
|---|-----------|-------|---------|
| 4 | `DonkeySection.jsx` | حجر دوّار — CSS rotation speed linked to scroll | 🟡 High |
| 5 | `PasteSection.jsx` | عجينة خضراء — splash ripple + char-by-char reveal | 🟡 High |
| 6 | `PressSection.jsx` | حصائر المعصر — 5 layers stagger from above | 🟡 High |
| 7 | `GoldenDropSection.jsx` | القطرة الذهبية — SVG fill + confetti + CTA | 🔴 Critical |

---

## توزيع العمل على الـ Agents

### Agent 1: Frontend-Architect-Agent
**المسؤولية:** DonkeySection + PasteSection + PressSection (sections 4-5-6)

**الملفات:**
- `frontend/src/pages/olivello/sections/DonkeySection.jsx`
- `frontend/src/pages/olivello/sections/PasteSection.jsx`
- `frontend/src/pages/olivello/sections/PressSection.jsx`

**Technical specs:**

#### DonkeySection (250vh)
```
- Background: oklch(18% 0.04 90) — أرضي داكن
- Element: millstone SVG circle دائرة 280px
  - CSS rotation speed = MotionValue → cssVar(--stone-speed)
  - الدوران: 6s at rest → 2s at peak scroll velocity → 8s exit
- Circular text (SVG textPath): "دار · ودار · ودار · الحمار المعصوب العينين · يحفظ الطريق"
- نص مركزي يظهر عند scroll 0.35:
    "الحمار المعصوب العينين"
    "يحفظ الطريق"
- Scroll map: scrollYProgress → stone rotation duration
  const speed = useTransform(p, [0, 0.3, 0.7, 1], [6, 2, 2, 8])
  // inject as CSS custom property on the div
```

#### PasteSection (200vh)
```
- Background: oklch(42% 0.14 130) — أخضر زيتوني مركّز
- Splash/ripple: 3 expanding rings on whileInView trigger
  - Ring 1: scale 0→4, opacity 0.6→0, duration 1.2s
  - Ring 2: scale 0→4, delay 0.4s
  - Ring 3: scale 0→4, delay 0.7s
- نص "انكسرت" — char-by-char fade-in delay 0.08s per char
- نص ثانوي "لتصبح شيئاً آخر" — fade in after title
- 3 taste notes (cards row):
  - 🌿 عشبي حاد
  - 🍋 نكهة ليمون خضراء
  - 🌶️ لسعة فلفل خفيفة
- Grain overlay (SVG feTurbulence — same pattern as TreeSection)
```

#### PressSection (250vh)
```
- Background: oklch(16% 0.04 85) — حجري داكن
- 5 حصيرة layers (motion.div rectangles, staggered height)
  initial: y: -120*i, opacity: 0
  whileInView: y: 0, opacity: 1
  transition: delay i*0.12, spring stiffness:50 damping:14
- لون الحصائر: oklch(38% 0.08 85) + borders oklch(52% 0.08 85)
- texture: horizontal lines on each mat (CSS repeating-linear-gradient)
- نص ينبثق من الأسفل عند اكتمال الطبقات:
  "الانكسار"         (h2, gold)
  "هو الولادة الحقيقية" (p, muted)
- ارتفاع الـ mat stack: clamp(280px, 38vw, 440px)
```

---

### Agent 2: /impeccable craft (via Frontend-Architect-Agent)
**المسؤولية:** GoldenDropSection (section 7) — الـ Climax

**الملف:** `frontend/src/pages/olivello/sections/GoldenDropSection.jsx`

**Technical specs (300vh):**
```
Background gradient:
  oklch(22% 0.05 100) → oklch(28% 0.08 80) → oklch(52% 0.18 72)

SVG Drop shape:
  - viewBox="0 0 200 280"
  - Drop path: M100,20 C160,20 185,80 185,140 C185,200 145,260 100,265
               C55,260 15,200 15,140 C15,80 40,20 100,20 Z
  - clipPath inside with rect height animated from 280→0 (bottom fill up)
  - Fill color: linear gradient oklch(78% 0.18 72) → oklch(68% 0.14 72)
  - Drop outline: oklch(72% 0.12 72) opacity 0.5, stroke 1.5

Scroll map:
  fillTop = useTransform(p, [0, 0.8], [280, 0])  // clipPath rect top moves up
  
Text inside drop (clips with oil):
  Lines fade in sequentially as fill rises:
    0%  → "رائحة الجبل"
    25% → "ذاكرة الحجر"  
    50% → "أغاني النساء"
    75% → "دوائر الحمار"

Confetti explosion at p > 0.82:
  - 48 particles (motion.div), 5px circles
  - Colors: oklch(78% 0.18 72), oklch(68% 0.12 75), oklch(88% 0.06 80)
  - Random angle 0→360, distance 80→240px
  - spring stiffness:60 damping:12, ease-out-expo feel
  - onlyOnce: triggered once via useState

CTA buttons (appear at p > 0.88, AnimatePresence):
  [اطلب قنينتك الآن]  → /olivello/store   (primary, gold bg)
  [اكتشف المنتجات]    → /olivello/store   (secondary, outline)
  
Footer credit:
  "أوليفيلو — من الجبل إلى طاولتك"
  "Olivello · Lebanese Mountain Olive Oil · Since 1943"
```

---

### Agent 3: Main Agent (هذه المحادثة)
**المسؤولية:** تحديث OlivelloShowcase.jsx + التحقق النهائي

**الملف:** `frontend/src/pages/olivello/sections/OlivelloShowcase.jsx`

```jsx
// إضافة الـ 4 imports الجديدة + render في الـ JSX
import DonkeySection    from './DonkeySection'
import PasteSection     from './PasteSection'
import PressSection     from './PressSection'
import GoldenDropSection from './GoldenDropSection'
```

---

## ترتيب التنفيذ

```
1. كتابة DonkeySection.jsx
2. كتابة PasteSection.jsx
3. كتابة PressSection.jsx
4. كتابة GoldenDropSection.jsx
5. تحديث OlivelloShowcase.jsx (إضافة الـ 4 sections)
6. فتح localhost:5173/olivello/home والتحقق
```

---

## معيار النجاح

```
✅ الـ 7 sections تظهر بترتيب صحيح
✅ Donkey: الحجر يدور، سرعته تتغير بالـ scroll
✅ Paste: splash ripple عند الدخول، النص يتكشّف
✅ Press: الـ 5 حصائر تتراكم بـ stagger
✅ GoldenDrop: القطرة تمتلئ بالذهب، confetti تنفجر، CTA يظهر
✅ لا crash، لا FM12 error
✅ الـ scroll smooth على Chrome
```

---

## ملاحظات تقنية

- كل section يستخدم `useScroll` → يجب أن يبقى OlivelloShowcase lazy-loaded (FM12 rule ✅)
- `will-change: transform` على العناصر المتحركة بالـ scroll فقط
- الـ confetti particles: `pointer-events: none` + `position: absolute`
- CSS custom property للـ rotation speed: `element.style.setProperty('--stone-dur', ...)`
  أو استخدام Framer Motion `animate` مع duration dynamic
- المسارات الـ SVG: verified في browser قبل commit

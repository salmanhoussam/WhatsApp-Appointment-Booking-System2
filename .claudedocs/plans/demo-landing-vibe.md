# Plan — demo.salmansaas.com Vibe Redesign
**Date:** 2026-06-01
**Page:** `frontend/src/pages/showcase/pages/DemoLandingPage.jsx`
**Goal:** تحويل الصفحة من static blocks → تجربة سردية غامرة بفلسفة Vibe Coding

---

## فلسفة Vibe Coding (المرجع)

> ليس إطار عمل — بل نهج يُعطي الأولوية للإحساس العام والانسيابية.
> كل وصف جمالي يُترجم مباشرة لكود.
> السكرول = مخرج القصة، لا مجرد تنقل.

### معجم الـ Vibe لهذه الصفحة

| الفيب | التقني |
|-------|--------|
| "سكرول حريري لا يقفز" | `scroll-behavior: smooth` + Intersection Observer |
| "المحتوى يتنفس مع التمرير" | fade-up on scroll — `opacity 0→1 + translateY(30px→0)` |
| "الخلفية تعطي عمقاً حُلمياً" | parallax radial glow يتحرك مع scroll position |
| "الهيدر يلتصق برقة ثم ينسحب" | sticky header + padding shrink + backdrop-blur on scroll |
| "كأننا نتصفح لوحة فنية طويلة" | staggered reveal للبطاقات — تظهر واحدة تلو الأخرى |
| "الإيقاع مريح، لا استعجال" | transition 0.6s ease-out — ليس سريعاً ولا بطيئاً |

---

## الوصف الكامل للصفحة (Vibe → Technical)

### Block 1 — Navbar
**الفيب:** "شفاف في البداية، يصبح مثل لوح زجاجي معلّق حين تنزل"
- **Technical:**
  - `position: sticky; top: 0`
  - On scroll > 50px: `background: rgba(5,5,8,0.88)`, `backdrop-filter: blur(20px)`, padding 1.2rem → 0.8rem transition
  - `border-bottom: 1px solid rgba(212,168,83,0.12)` يظهر عند scroll
  - Transition: `all 0.4s ease`

### Block 2 — Hero Section
**الفيب:** "تفتح على مساحة واسعة مظلمة، نقطة ذهبية تنبض في المنتصف، ثم الكلمات تتدفق"
- **Technical:**
  - Radial gold glow يتحرك بـ `parallax: mouseX/Y` (subtle, 0.02 factor)
  - Heading: fade-in + slide-up 40px → 0, delay 200ms
  - Subheading: نفس الأثر، delay 400ms
  - Glass form panel: scale(0.97) → scale(1) + opacity 0→1, delay 600ms
  - كل input يحصل على gold focus ring بـ `box-shadow: 0 0 0 2px rgba(212,168,83,0.4)`

### Block 3 — Demo Cards
**الفيب:** "البطاقات تظهر كتقليب ألبوم صور — واحدة واحدة من اليمين لليسار"
- **Technical:**
  - Intersection Observer على الـ section
  - كل بطاقة: `transitionDelay: index * 120ms`
  - `opacity 0 + translateY(24px)` → `opacity 1 + translateY(0)`
  - Hover: `transform: translateY(-6px)`, `border-color: rgba(accent, 0.5)`, `box-shadow: 0 12px 32px rgba(accent, 0.15)`

### Block 4 — Features Strip
**الفيب:** "الأيقونات تنبض مرة وتستقر — كإشارة أنها حية"
- **Technical:**
  - Intersection Observer
  - Icon: scale(0.8) → scale(1.1) → scale(1) عند الظهور (pulse once)
  - Text: fade-up مع delay بعد الأيقونة بـ 150ms

### Block 5 — Footer
**الفيب:** "هادئ، محايد، لا يطلب شيئاً — مجرد توقيع"
- Simple fade-in, no animation

---

## الـ Scroll Experience الكاملة

```
المستخدم يفتح الصفحة:
  ↓ Hero يظهر: glow ينبض مرة → heading تنزل → form يظهر
  
يسكرول للأسفل:
  ↓ Navbar يصبح frosted glass
  ↓ Demo cards تظهر واحدة واحدة (staggered)
  ↓ Features icons تنبض عند الدخول
  ↓ Footer يتلاشى للوجود
  
الإيقاع العام:
  → 0.6s ease-out لكل شيء
  → لا bounce، لا elastic، لا shake
  → ناعم كالماء، يشعر المستخدم بالتحكم
```

---

## قائمة التنفيذ

```
□ Intersection Observer utility (reusable hook: useScrollReveal)
□ Block 1: Navbar scroll behavior (shrink + frosted)
□ Block 2: Hero parallax glow + staggered text reveal
□ Block 3: Demo cards staggered fade-up with hover lift
□ Block 4: Features icon pulse + text reveal
□ Block 5: Footer simple fade
□ Global: scroll-behavior smooth on html
□ Mobile: reduce-motion media query (no animations if prefers-reduced-motion)
```

---

## ملاحظات التنفيذ

- **لا Framer Motion** هنا — CSS transitions + Intersection Observer فقط (أخف، لا dependency)
- **لا GSAP** — هذه صفحة marketing بسيطة، مش Awwwards showcase
- **Intersection Observer** يُكتب مرة كـ utility ثم يُستخدم في كل block
- **`prefers-reduced-motion`** يلغي كل الـ animations لمن يحتاجها
- **Mobile first** — الـ stagger delays أقصر على موبايل (80ms بدل 120ms)

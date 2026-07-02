# Showcase Homepage — 3D Redesign Plan
# آخر تحديث: 2026-06-30 | القرار النهائي بعد مراجعة

---

## ⚠️ قرار مهم — تحديث 2026-06-30

**المشكلة الجوهرية مع النقاط الملونة:**
- `TextParticles.jsx` و`RoomReveal.jsx` تستخدم 400-600 جسيم تشكّل نصاً — النتيجة بشعة
- المستخدم طلب مكاتب حقيقية وممرات كما في الصورة المرفقة

**القرار:** نستخدم **CSS Photo Layer** عند دخول الغرف — لا particle walls

---

## الهيكل المقرر

```
خارج المبنى (p < 0.28):
  → 3D Canvas كامل (مدينة + برج + أنيميشن)
  → كل شيء يبقى كما هو

دخول غرفة (p 0.28 → 0.32 → 0.46):
  → 3D Canvas يتلاشى تدريجياً (opacity: 1 → 0.1)
  → Layer صورة مكتب تظهر بدله (CSS opacity: 0 → 1)
  → الصورة تتحرك بالماوس (parallax خفيف)
  → UI Overlay شفاف يظهر فوق الصورة

خروج من الغرفة:
  → عملية عكسية — 3D Canvas يعود
```

---

## الملفات التقنية المطلوبة

### 1. ملف جديد: `frontend/src/pages/showcase/canvas/RoomEnvironment.jsx`

HTML component (ليس R3F) — يظهر كـ CSS layer:

```jsx
// CSS position: fixed, inset: 0, z-index: 1 (فوق Canvas z:0)
// صورة المكتب تملأ الشاشة (object-cover)
// mouse parallax: translateX/Y بناءً على scrollState.mouseX/Y
// glassmorphism UI panel يطفو فوق الصورة مع معلومات الطابق
// transition: opacity 0.8s ease

export function RoomEnvironment({ imgSrc, accentColor, title, isVisible }) {
  // visible = false → opacity:0, pointerEvents:none
  // visible = true  → opacity:1, pointerEvents:auto
}
```

### 2. تعديل `frontend/src/pages/showcase/pages/HomePage.jsx`

```jsx
// إضافة 3 RoomEnvironment components
// Canvas style يتغير opacity بناءً على active room

const [activeRoom, setActiveRoom] = useState(null); // null | 'about' | 'services' | 'contact'

// في ScrollTrigger.create onUpdate:
// if (p > 0.32 && p < 0.46) setActiveRoom('about')
// else if (p > 0.57 && p < 0.68) setActiveRoom('services')
// etc.
```

### 3. تعديل `frontend/src/pages/showcase/canvas/scrollState.js`

```js
export const scrollState = {
  progress: 0,
  mouseX:   0,
  mouseY:   0,
  room:     null, // null | 'about' | 'services' | 'contact'
};
```

### 4. حذف `TextParticles.jsx` من `TowerFloor.jsx`

```diff
- import TextParticles from '../TextParticles';
- <TextParticles range={range} titleAr={titleAr} color={color} />
```

### 5. تحسين `BuildingTower.jsx` — مواد واقعية

```jsx
// زجاج الواجهة:
<meshPhysicalMaterial
  transmission={0.7}
  roughness={0.04}
  metalness={0.1}
  color={floorColor}
  opacity={0.5}
  transparent
  envMapIntensity={1.2}
/>

// إطارات معدنية:
<meshStandardMaterial
  color="#1a2433"
  metalness={0.92}
  roughness={0.12}
/>
```

---

## الأصول المطلوبة (أولاً قبل أي كود)

| الملف | الطابق | النمط | المصدر المقترح |
|-------|--------|-------|----------------|
| `public/rooms/floor-about.webp` | من نحن (أزرق) | ممر زجاجي حديث مضاء بارد (مثل الصورة المرسلة) | unsplash/pexels |
| `public/rooms/floor-services.webp` | خدماتنا (ذهبي) | مكتب مفتوح — إضاءة دافئة/كريمية | unsplash/pexels |
| `public/rooms/floor-contact.webp` | تواصل (أخضر) | لوبي/استقبال — نباتات + إضاءة ناعمة | unsplash/pexels |

**المواصفات:**
- 2560×1440px أو أعلى
- JPG أو WebP
- بدون أشخاص (أو مع — حسب الاختيار)
- حقوق مجانية للاستخدام التجاري

---

## UI داخل كل غرفة (فوق الصورة)

```
┌─────────────────────────────────────────────────────┐
│  ● FLOOR_01 // ABOUT                    [← BACK]    │ ← HUD bar
├─────────────────────────────────────────────────────┤
│                                                     │
│  ══════════                                         │
│  من نحن                              [glassmorphism │
│                                       panel شفاف    │
│  نبني أنظمة SaaS عربية              يمين أو يسار]   │
│  لإدارة الحجوزات والمطاعم                           │
│  والمتاجر الإلكترونية.                              │
│                                                     │
│  ○  3+ سنوات خبرة                                  │
│  ○  15+ عميل نشط                                   │
│  ○  WhatsApp مدمج                                   │
│                                                     │
│               [ابدأ مجاناً ←]                      │
└─────────────────────────────────────────────────────┘
```

---

## ترتيب التنفيذ

| # | الخطوة | الملف | الوقت المقدر |
|---|--------|-------|--------------|
| 0 | **أرسل/اختر 3 صور مكاتب** | `public/rooms/` | 10 دق (البحث) |
| 1 | تحديث `scrollState.js` | إضافة `room: null` | 2 دق |
| 2 | تحديث `ShowcaseCameraManager.jsx` | تحديث `scrollState.room` | 5 دق |
| 3 | بناء `RoomEnvironment.jsx` | HTML/CSS layer كامل | 25 دق |
| 4 | تحديث `HomePage.jsx` | ربط 3 rooms + canvas opacity | 15 دق |
| 5 | حذف `TextParticles` من `TowerFloor.jsx` | | 5 دق |
| 6 | تحسين مواد `BuildingTower.jsx` | زجاج PBR حقيقي | 30 دق |

---

## ما يبقى من الكود الحالي (لا يتغيّر)

| الملف | السبب |
|-------|-------|
| `ShowcaseCameraManager.jsx` | مسار الكاميرا ممتاز — فقط نضيف room tracking |
| `BackgroundLife.jsx` | المدينة المتلوّنة الجديدة (من 2026-06-30) — تبقى |
| `AtmosphericClouds.jsx` | الاسم 3D + FadingText — تبقى |
| `BuildingTower.jsx` | نُحسّن المواد فقط، لا نعيد البناء |
| `scrollState.js` | نضيف `room` فقط |
| `ShowcaseScene3D.jsx` | RoomAtmosphere الجديد — يبقى |

---

## ملاحظات مهمة

1. **الصور تُوضع في `public/rooms/`** — Vite يخدمها مباشرة بدون import
2. **parallax داخل الصورة** = `transform: translate(mouseX * 20px, mouseY * 10px)`، الصورة أكبر من viewport بـ 10% لتغطية الحركة
3. **الـ Canvas لا يختفي كلياً** — يبقى بـ opacity:0.1 للإبقاء على الـ fog glow من حواف الشاشة
4. **لا نضيف 3D furniture** — الصورة الواقعية أفضل بكثير بجهد أقل
5. **Mobile fallback** — على الموبايل، nix parallax و`object-position: center` فقط

---

## الخطوة القادمة الفورية

**أرسل لي 3 صور مكاتب** (أو قل "اختر من unsplash" وسأنفّذ كل شيء).
بعدها ننفذ الـ 6 خطوات في جلسة واحدة.

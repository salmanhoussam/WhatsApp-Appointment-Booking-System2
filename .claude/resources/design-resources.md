# Design Resources — SalmanSaaS Frontend
# قرأ هذا الملف قبل أي مهمة UI/Frontend
# آخر تحديث: 2026-06-29

---

## الخلاصة السريعة — ماذا تستخدم لماذا

| الحاجة | الموقع | مجاني؟ | طريقة الاستخدام |
|--------|--------|--------|-----------------|
| Component جاهز (React) | vengenceui.com | ✅ كلياً | `npx vengenceui@latest add <name>` |
| Component متحرك (shadcn) | skiper-ui.com | ✅ 24 مجاني | نسخ الكود أو shadcn CLI |
| Animation effect (HTML/CSS/JS) | animmasterlib.dev | ❌ مدفوع | شراء ثم نسخ لـ AI |
| إلهام بصري | savee.com | ✅ | تصفح + collect |
| Reference لتأثيرات حركة | efecto.app | ✅ | تصفح موقعهم نفسه |
| إعلانات SaaS محللة | adfolio.design | ✅ | تصفح |
| أدوات تصميم | toolfolio.io | ✅ | بحث عن أداة |
| Hero sections | supahero.io | ✅ | تصفح |
| Navbar / Sidebar | navbar.gallery | ✅ | تصفح |
| CTA / Pricing blocks | cta.gallery | ✅ | تصفح |
| Footer | footer.design | ✅ | تصفح |
| 404 page | 404s.design | ✅ | تصفح |

---

## 1. مكتبات الـ Components (كود جاهز للاستخدام)

### VengeanceUI — vengenceui.com
- **الوصف**: 26+ animated component لـ React/Next.js، مبني على Tailwind CSS
- **التكلفة**: مجاني كلياً
- **الاستخدام**:
  ```bash
  npx vengenceui@latest add perspective-grid
  npx vengenceui@latest add animated-hero
  npx vengenceui@latest add glow-border
  ```
- **Components المفيدة لـ SalmanSaaS**:
  - `perspective-grid` → خلفية الـ showcase
  - `animated-hero` → HeroSection upgrade
  - `glow-border` → كروت ServicesSection
  - `book-effect` → لأقسام خاصة
- **ملاحظة**: يُحمّل الكود كـ source file داخل مشروعك — تعدّله بحرية كاملة
- **توافق مع Vite**: ✅ React components قياسية، لا تحتاج Next.js

---

### Skiper UI — skiper-ui.com
- **الوصف**: Un-common components فوق shadcn/ui — scroll effects، interactive cards، micro-interactions
- **التكلفة**: 24 component مجانية + 54 premium مدفوعة
- **الاستخدام**:
  ```bash
  # عبر shadcn CLI
  npx shadcn@latest add "https://skiper-ui.com/r/component-name"
  
  # أو نسخ الكود يدوياً من الموقع
  ```
- **Components المفيدة**:
  - Scroll-reveal cards → قوائم الـ tenants
  - Animated borders → hover effects على الكروت
  - Text scramble → hero text animations
- **توافق مع Vite**: ⚠️ مبني لـ Next.js بشكل أساسي — انسخ الكود وأزل الـ Next.js specifics
- **قاعدة**: إذا فيه `import { useRouter } from 'next/router'` → استبدلها بـ `useNavigate` من react-router

---

### AnimMasterLib — animmasterlib.dev
- **الوصف**: 300+ component (scroll animations, WebGL, hover, page transitions)
- **التكلفة**: ❌ مدفوع (one-time purchase)
- **استراتيجية الاستخدام**: إذا اشتريته، ارفع الـ zip لـ Claude وقل "adapt this effect to React/Framer Motion"
- **الأقسام الأهم**:
  - `/webgl` → WebGL effects للـ showcase
  - `/3d` → Three.js components
  - `/scroll` → scroll-driven animations
- **بديل مجاني**: استخدم vengenceui + skiper-ui أولاً

---

## 2. مواقع الإلهام البصري

### Savee — savee.com
- **الوصف**: مكتبة إلهام بصري مُختارة من مصممين (مثل Pinterest لكن مقتصر على الجودة)
- **الاستخدام**: 
  - ابحث عن "SaaS dashboard", "booking UI", "dark glassmorphism"
  - احفظ ما يعجبك في collections
  - شاركه مع Claude كـ reference قبل البناء
- **البحث الموصى به**: `dark saas`, `glassmorphism 2026`, `arabic ui`, `booking app`

---

### Efecto — efecto.app
- **الوصف**: موقع استوديو إبداعي — موقعهم نفسه مرجع ممتاز لتأثيرات الحركة
- **الاستخدام**: تفحص الانتقالات والـ hover effects في الموقع مباشرة
- **مفيد لـ**: الـ showcase page + الـ section transitions

---

### Adfolio — adfolio.design
- **الوصف**: مكتبة إعلانات B2B SaaS محللة (Meta + LinkedIn + Landing pages)
- **الاستخدام**: ابحث عن "booking", "restaurant SaaS", "Arabic" للإلهام في الـ CTAs والـ messaging
- **مفيد لـ**: كتابة الـ copy للـ Hero sections + CTAs

---

## 3. مراجع تصميم محدد

### Hero Sections — supahero.io
- اذهب هنا قبل بناء أي HeroSection جديدة
- فلتر: "dark", "animated", "SaaS"

### Navigation & Sidebar — navbar.gallery
- مرجع قبل بناء أي Navbar أو Sidebar
- فلتر: "dark mode", "glassmorphism"

### CTA & Pricing — cta.gallery
- قبل بناء CTASection أو PricingSection
- اختر patterns تتوافق مع الـ Gold/Dark GS MAR theme

### Footer — footer.design
- مرجع قبل تعديل Footer أي tenant

### 404 Pages — 404s.design
- إذا احتجت custom 404 page

---

## 4. أدوات مساعدة

### Toolfolio — toolfolio.io
- دليل شامل لأدوات التصميم والإنتاجية
- ابحث هنا إذا احتجت أداة معينة (animation tool, color tool, etc.)
- يحتوي على Skiper UI, Adfolio, وكثير غيرها

---

## 5. قواعد الاستخدام للـ Agent

```
قبل بناء أي UI component:
1. ابحث في vengenceui.com إذا Component جاهز موجود
2. تحقق من skiper-ui.com للـ free tier
3. افتح savee.com للإلهام البصري
4. قارن بمواقع الـ gallery المناسبة (supahero/navbar/cta)

عند نسخ Component:
- أزل كل Next.js specifics (next/router, next/image, etc.)
- استبدل بـ react-router-dom + <img>
- كيّف الـ styling مع GS MAR (dark bg + glassmorphism)
- أضف Framer Motion بدل أي animation library أخرى

ممنوع:
- نسخ component بدون مراجعة الـ license
- استخدام components تحتوي نصوص إنجليزية hardcoded (يجب دعم RTL)
- إضافة npm packages جديدة بدون إذن (قل للمستخدم أولاً)
```

---

## 6. الـ Stack الحالي (لا تضيف ما هو موجود)

```
React 19 + Vite
Framer Motion (animations)
Three.js + @react-three/fiber + @react-three/drei (3D)
@react-three/postprocessing (bloom, vignette)
Tailwind CSS
Zustand (state)
TanStack Query v5 (data fetching)
Lenis (smooth scroll)
GSAP + ScrollTrigger (scroll animations)
```

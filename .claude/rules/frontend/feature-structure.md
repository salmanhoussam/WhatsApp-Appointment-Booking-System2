paths: "frontend/src/**"

# Feature-based Frontend Structure
# Bulletproof React — مكيّف لـ SalmanSaaS Multi-Tenant
# Ref: github.com/alan2207/bulletproof-react

---

## المشكلة التي تحلّها هذه القاعدة

بدون هيكلية واضحة، كل tenant جديد يصبح:
- `sections/` لكل شيء
- `ui/` تحتوي على business logic
- لا مكان واضح للـ shared hooks
- Components تُعاد كتابتها بدل إعادة استخدامها

هذه القاعدة تحدد مكان كل ملف — لا تخمين.

---

## 1. هيكلية الـ Tenant (القاعدة)

```
frontend/src/pages/{slug}/
├── sections/          ← Content UI sections (presentational only)
│   ├── HeroSection.jsx
│   ├── ProductsSection.jsx
│   └── StorySection.jsx
│
├── canvas/            ← WebGL / R3F layer (لا HTML هنا)
│   ├── Scene3D.jsx
│   └── OliveModel.jsx
│
├── ui/                ← Overlays & interaction shells
│   ├── Navigation.jsx
│   ├── CartDrawer.jsx
│   └── Preloader.jsx
│
├── hooks/             ← Domain hooks — useQuery + business logic
│   ├── use{Slug}Config.js      ← tenant config
│   ├── use{Slug}Catalog.js     ← product/menu data
│   └── use{Slug}Booking.js     ← booking mutations
│
├── store/             ← Zustand store (client-side state only)
│   └── use{Slug}Store.js
│
├── context/           ← React Context (scroll, theme, language)
│   └── ScrollProgressContext.jsx
│
├── admin/             ← Admin dashboard (JWT-gated)
│   └── {Slug}AdminDashboard.jsx
│
└── {slug}.css         ← Scoped CSS — body[data-slug="{slug}"] فقط
```

---

## 2. قاعدة الـ `hooks/` مجلد (الجديد)

كل tenant يجب أن يكون له `hooks/` مجلد يحتوي:

| الملف | المحتوى |
|-------|---------|
| `use{Slug}Config.js` | `useQuery` لجلب tenant config (`/client/{slug}/config`) |
| `use{Slug}Catalog.js` | `useQuery` للقائمة أو المنتجات (`/restaurant/menu` أو `/store/catalog`) |
| `use{Slug}Booking.js` | `useMutation` للحجز (`/public/bookings`) |

**لماذا `hooks/` بدل `useEffect` داخل الصفحة؟**
- الـ component يبقى presentational — لا يعرف شيئاً عن publicApi
- نفس الـ hook يُستخدم من أي component داخل الـ tenant
- Testing سهل — الـ hook مستقل

---

## 3. Layer Assignment — كيف تعرف أين تضع الملف

**سؤال:** هل الملف يعرف شيئاً عن publicApi أو HTTP؟
- **نعم** → `hooks/` (data layer)
- **لا** → تابع:

**سؤال:** هل يحتوي على Zustand store calls؟
- **نعم** → `ui/` أو `sections/` (يقرأ من store)
- **لا، وهو canvas/3D** → `canvas/`
- **لا، وهو content section** → `sections/`
- **لا، وهو overlay/nav/drawer** → `ui/`

---

## 4. Shared vs Tenant-specific

### Shared (يخدم كل التنانت)
```
frontend/src/
├── hooks/                    ← hooks مشتركة
│   ├── useTenantConfig.js    ← useQuery على /client/{slug}/config
│   └── usePublicCatalog.js   ← useQuery generic للكاتالوج
│
├── components/               ← components مشتركة
│   ├── ConfigurableHero.jsx
│   └── dynamic-sections/
│
└── design-system/            ← atoms, molecules, organisms
    ├── atoms/
    ├── molecules/
    └── organisms/
```

### Tenant-specific (slug-scoped)
```
frontend/src/pages/{slug}/hooks/     ← overrides أو tenant-specific data shapes
frontend/src/pages/{slug}/sections/  ← لا يُستخدم من tenant آخر
```

**قاعدة:** إذا نفس الـ hook مفيد لـ 2+ tenants → انقله لـ `src/hooks/`.

---

## 5. مثال تطبيقي — Olivello

```
frontend/src/pages/olivello/
├── sections/
│   ├── TreeSection.jsx         ← presentational — يقرأ من props/store فقط
│   ├── ProductsSection.jsx     ← يستدعي useOlivelloCatalog hook
│   └── OlivelloStory.jsx
│
├── canvas/
│   └── OlivelloScene3D.jsx     ← R3F only — لا publicApi هنا
│
├── context/
│   └── ScrollProgressContext.jsx
│
├── hooks/                      ← ✅ NEW — يجب إضافته
│   ├── useOlivelloConfig.js    ← useQuery([slug, 'config'])
│   └── useOlivelloCatalog.js   ← useQuery([slug, 'catalog'])
│
├── ui/
│   └── OlivelloNav.jsx
│
└── store/
    └── useOlivelloStore.js
```

---

## 6. قواعد صارمة (Strict Rules)

```
✅ كل tenant له hooks/ مجلد منفصل
✅ لا publicApi calls داخل sections/ أو canvas/ أو ui/
✅ useQuery keys تبدأ بـ [slug, ...] دائماً
✅ الـ components في design-system/ لا تعرف شيئاً عن slug
✅ CSS مغلف بـ body[data-slug="{slug}"] .className

❌ لا useEffect+fetch داخل section components
❌ لا import publicApi داخل sections/ أو canvas/
❌ لا tenant A يستورد component من tenant B مباشرة
❌ لا hooks مشتركة تحتوي slugs hardcoded
```

---

## 7. Scaffolding Checklist لكل Tenant جديد

عند بناء tenant جديد، أضف هذه الملفات إضافة لـ scaffolding.md:

```
□ src/pages/{slug}/hooks/use{Slug}Config.js     ← useQuery config
□ src/pages/{slug}/hooks/use{Slug}Catalog.js    ← useQuery data (حسب module_key)
□ src/pages/{slug}/hooks/use{Slug}Booking.js    ← useMutation (إذا booking module)
□ تحديث src/hooks/ إذا الـ hook مفيد لكل التنانت
```

---

## 8. التأثير على الـ Code Review

عند review أي PR يضيف tenant:

| Check | Pass |
|-------|------|
| هل يوجد `hooks/` مجلد؟ | ✅ |
| هل الـ sections تستخدم `hooks/` بدل `useEffect`؟ | ✅ |
| هل الـ queryKey يحتوي slug؟ | ✅ |
| هل يوجد `publicApi` import داخل `sections/`؟ | ❌ FAIL |
| هل يوجد `useEffect+fetch` pattern قديم؟ | ❌ FAIL |

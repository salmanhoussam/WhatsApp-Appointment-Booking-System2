# Production Step 3 — Frontend Scaffold Decision

## الهدف
تقرير: هل يحتاج الـ tenant صفحات frontend مخصصة أم يكفيه الـ Generic Demo Page؟

---

## سؤال القرار

```
هل الـ tenant يحتاج تصميم مخصص (custom pages) خارج الـ template؟
```

| الحالة | القرار |
|--------|--------|
| متجر عادي + catalog فقط | ❌ لا scaffold — `/demo/{slug}` يكفي |
| مطعم + قائمة طعام | ❌ لا scaffold — Generic page + catalog |
| عيادة + حجز مواعيد | ❌ لا scaffold — Generic page + booking module |
| تصميم خاص بالكامل (مثل smar) | ✅ scaffold مطلوب |
| طلب صفحة landing مخصصة | ✅ scaffold مطلوب |

**القاعدة:** 90% من الـ tenants لا يحتاجون scaffold — الـ Generic Demo Page + template يكفي.

---

## إذا لم يحتج Scaffold (الغالبية)

الـ Generic Demo Page على `/demo/{slug}` تعمل تلقائياً.
لا تعديل على الـ frontend.

**انتقل مباشرة لـ `04-dns-subdomain.md`**

---

## إذا احتاج Scaffold (استثناء)

نفّذ `/scaffold-tenant {slug}` أو اتبع الخطوات يدوياً:

### Step 3.1 — أنشئ مجلد الصفحات
```
src/pages/{slug}/
├── normal/          ← الصفحة الرئيسية (GenericStorePage.jsx)
├── admin/           ← لوحة التحكم (GenericAdminDashboard.jsx)
└── {slug}.css       ← CSS scoped
```

### Step 3.2 — CSS Scoping (إلزامي)
```css
/* src/pages/{slug}/{slug}.css */
body[data-slug="{slug}"] .hero-title {
  font-family: 'Cairo', sans-serif;
}
body[data-slug="{slug}"] .primary-btn {
  background: var(--primary-color, {primary_color});
}
```

### Step 3.3 — Routes File
```jsx
// src/router/tenants/{slug}.routes.jsx
import { lazy } from 'react'
const GenericStorePage = lazy(() => import('../../pages/{slug}/normal/GenericStorePage'))

export default function {Slug}Routes() {
  return (
    <Routes>
      <Route index element={<Navigate to="home" replace />} />
      <Route path="home" element={<GenericStorePage />} />
    </Routes>
  )
}
```

### Step 3.4 — Registry Entry
```js
// src/router/tenants/index.js — أضف:
{slug}: {
  routes:          lazy(() => import('./{slug}.routes')),
  defaultRedirect: 'home',
  theme:           '{template_key}',
},
```

### Step 3.5 — تحقق من FM12 Rule
أي page تستخدم `useScroll` أو `useTransform` يجب أن تكون **lazy loaded**.
خلاف ذلك → FM12 crash في React 19 → blank `div#root`.

---

## بعد القرار → انتقل لـ `04-dns-subdomain.md`

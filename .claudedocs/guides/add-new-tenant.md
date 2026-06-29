# دليل إضافة Tenant جديد — SalmanSaaS

**متى تستخدم هذا الدليل:** عند إضافة عميل جديد للمنصة بعد استلام بياناته من المحقق كونان.

---

## المصادر المطلوبة قبل البدء

- [ ] ملف `scripts/data/{slug}.json` ممتلئ من المحقق كونان
- [ ] موافقة سلمان على البيانات
- [ ] الـ `.env` يحتوي على `DATABASE_URL` و `DIRECT_URL`

---

## الخطوات — Backend

### 1. تسجيل الـ Client في DB

```bash
python scripts/seed_new_tenant.py --data scripts/data/{slug}.json
```

ما يفعله السكريبت:
- ينشئ row في `clients` table
- ينشئ User record للمالك (TENANT_ADMIN)
- يسيد `client_services` rows بناءً على `service_type`

**تحقق:**
```sql
SELECT slug, status, service_type FROM clients WHERE slug = '{slug}';
SELECT service_key, is_active FROM client_services WHERE client_id = '...';
```

### 2. إنشاء RestaurantConfig (إذا كان restaurant)

```bash
python scripts/seed_restaurant_config.py --slug {slug}
```

أو يدوياً في DB:
```sql
INSERT INTO restaurant_configs (client_id, name_ar, currency, is_active)
VALUES ('{client_id}', '{name_ar}', '{currency}', true);
```

### 3. التحقق من service gate

```bash
curl "http://localhost:8000/api/v1/public/restaurant/menu?client_slug={slug}"
# يجب أن يرجع بيانات (ليس 403)
```

---

## الخطوات — Frontend

### 4. إنشاء مجلد الـ tenant

```
frontend/src/pages/{slug}/
├── normal/         ← الصفحات العامة
├── admin/          ← لوحة الأدمن
├── store/          ← Zustand store
└── {slug}.css      ← CSS variables (--accent, --accent-dim فقط)
```

**نمط CSS:**
```css
body[data-slug="{slug}"] {
  --accent:     #{primary_color};
  --accent-dim: rgba(..., 0.12);
  background:   #0a0a0f;
}
```

### 5. إنشاء Routes file

`frontend/src/router/tenants/{slug}.routes.jsx`

```jsx
export default function {Slug}Routes() {
  return (
    <TenantConfigProvider slug="{slug}">
      <Routes>
        <Route path="..." element={<Lazy component={...} />} />
        <Route path="" element={<Navigate to="..." replace />} />
      </Routes>
    </TenantConfigProvider>
  );
}
```

### 6. تسجيل في Registry

`frontend/src/router/tenants/index.js`:
```js
{slug}: {
  routes:          lazy(() => import('./{slug}.routes')),
  defaultRedirect: '...',
  theme:           '...',
},
```

**القاعدة:** لا تلمس `App.jsx` أو `TenantPages.jsx`.

---

## القواعد الأساسية (لا استثناء)

| القاعدة | التفصيل |
|---------|---------|
| `clientId` في كل query | كل DB query يجب أن تفلتر بـ clientId |
| `require_service()` | أول dependency في كل module endpoint |
| `client_slug` في public requests | كل `publicApi` call يُرسل `params: { client_slug }` |
| Design system فقط | `GlassCard` + `Button` + `Input` + `Badge` + Tailwind |
| Admin: C palette | نفس نمط SmarAdminDashboard — local `C` constant object |
| FM12 rule | أي page تستخدم `useScroll` → lazy import إجباري |

---

## مرجع service_type → services

| service_type | services تُسيد |
|-------------|----------------|
| `booking` / `real_estate` / `hotel` | `booking`, `gallery`, `whatsapp_ordering` |
| `restaurant` | `restaurant`, `whatsapp_ordering` |
| `ecommerce` | `store` |

---

## Checklist نهائي

- [ ] Client row في DB
- [ ] User (TENANT_ADMIN) في DB
- [ ] client_services rows
- [ ] RestaurantConfig (إذا restaurant)
- [ ] `GET /public/{module}/...?client_slug={slug}` → 200 OK
- [ ] `frontend/src/pages/{slug}/` مجلد موجود
- [ ] `{slug}.routes.jsx` موجود
- [ ] Registry entry موجود
- [ ] `python -c "from app.main import app"` → OK
- [ ] Login بـ credentials المالك يشتغل

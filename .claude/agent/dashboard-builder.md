name: dashboard-builder
description: Builds Phase 56 Tenant Admin Dashboard v2 — sidebar layout, stats, orders kanban, reservations tab, activity feed. Uses recharts + @dnd-kit. Call for any GenericAdminDashboard task.
tools: Read, Glob, Grep, Bash, Write

You are the Dashboard Builder for SalmanSaaS Phase 56.

---

## 0. Skills — اقرأ قبل أي مهمة

```
.claude/skills/frontend/admin-dashboard-builder/SKILL.md   ← dark theme + stat cards + tables
.claude/skills/frontend/gs-mar-design-system/SKILL.md      ← glassmorphism tokens
.claude/skills/impeccable/reference/audit.md               ← UX audit checklist
.claude/skills/impeccable/reference/layout.md              ← grid + spacing rules
.claude/skills/impeccable/reference/cognitive-load.md      ← reduce dashboard complexity
```

---

## 1. قبل أي كود — اقرأ

```
frontend/src/pages/generic-admin/GenericAdminDashboard.jsx   ← الملف الحالي (130 سطر)
frontend/src/pages/generic-admin/tabs/CatalogTab.jsx          ← NO TOUCH ✅
frontend/src/pages/generic-admin/tabs/SettingsTab.jsx         ← NO TOUCH ✅
.claude/rules/frontend/architecture.md                        ← 4-Layer rules
frontend/src/hooks/useTenantConfig.js                         ← للـ active_services
```

---

## 2. الـ Layout الجديد

```
[Sidebar]           [Main Content Area]
  Logo              Tab = OverviewTab (default)
  Overview    →     Stats Cards (4)
  Orders      →     Orders Kanban
  Reservations*→    Activity Feed | Top Items
  Catalog ✅  →     (existing CatalogTab — no change)
  Settings ✅  →     (existing SettingsTab — no change)
  Logout

* Reservations tab: تظهر فقط إذا "reservations" في active_services
```

---

## 3. الملفات — الخريطة الكاملة

```
frontend/src/pages/generic-admin/
├── GenericAdminDashboard.jsx   ← REBUILD (sidebar + tab router)
├── tabs/
│   ├── OverviewTab.jsx         ← NEW: stats + kanban + activity
│   ├── OrdersTab.jsx           ← NEW: table + filters + status update
│   ├── ReservationsTab.jsx     ← NEW: conditional calendar + list
│   ├── CatalogTab.jsx          ← NO CHANGE ✅
│   └── SettingsTab.jsx         ← NO CHANGE ✅
└── components/
    ├── KanbanBoard.jsx         ← NEW: @dnd-kit drag & drop
    ├── StatCard.jsx            ← NEW: recharts gauge/number
    ├── ActivityFeed.jsx        ← NEW: polling آخر 10 طلبات
    └── TopItemsWidget.jsx      ← NEW: أكثر 5 مبيعاً
```

---

## 4. Dependencies المطلوبة

```bash
npm install recharts @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

| Package | الاستخدام |
|---------|----------|
| `recharts` | Stats cards — BarChart أو simple number |
| `@dnd-kit/core` | Kanban drag & drop core |
| `@dnd-kit/sortable` | Order cards sorting في column |
| `@dnd-kit/utilities` | CSS transform utilities |

---

## 5. Backend Endpoints

| Endpoint | الحالة | يُستخدم في |
|----------|--------|-----------|
| `GET /admin/reservations/stats` | ✅ موجود | OverviewTab stats |
| `GET /admin/restaurant/orders` | ✅ موجود | OrdersTab + Kanban |
| `GET /admin/store/orders` | ✅ موجود | OrdersTab (store) |
| `PATCH /admin/restaurant/orders/{id}/status` | ❓ تحقق | Kanban drag |
| `PATCH /admin/store/orders/{id}/status` | ❓ تحقق | Kanban drag |
| `GET /admin/reservations/` | ✅ موجود | ReservationsTab |
| `PATCH /admin/reservations/{id}/status` | ✅ موجود | ReservationsTab |

**Reservation statuses:** `pending | confirmed | arrived | cancelled | no_show`

---

## 6. module_key Logic — أي Orders تجلب؟

```js
const { tenant } = useTenantConfig()
const moduleKey = tenant?.module_key

// ✅ صح — يجلب حسب الـ module
if (moduleKey === 'restaurant') {
  orders = await adminApi.get('/admin/restaurant/orders')
} else if (moduleKey === 'store') {
  orders = await adminApi.get('/admin/store/orders')
}
// لا تجلب الاثنين معاً
```

---

## 7. Kanban — 4 Columns

```
معلق (pending) → يُحضَّر (preparing) → جاهز (ready) → تم التسليم (delivered)
```

**Drag & Drop Pattern:**
```js
// عند إسقاط card في column جديد:
1. Optimistic update (حرّك الـ card فوراً)
2. PATCH /admin/{module}/orders/{id}/status
3. إذا فشل الـ API → rollback (أرجع الـ card)
```

---

## 8. Activity Feed — Polling

```js
// polling كل 30 ثانية — لا WebSocket حتى الآن
useEffect(() => {
  const interval = setInterval(fetchRecentActivity, 30000)
  return () => clearInterval(interval)
}, [])
```

يعرض آخر 10 طلبات/حجوزات بـ relative timestamp ("منذ 5 دقائق").

---

## 9. Reservations Tab — Conditional

```jsx
// GenericAdminDashboard.jsx
const activeServices = tenant?.active_services ?? []
const showReservations = activeServices.includes('reservations')

// Sidebar
{showReservations && <NavItem label="الحجوزات" tab="reservations" />}

// Tab router
{activeTab === 'reservations' && showReservations && <ReservationsTab />}
```

---

## 10. CSS — Dark Theme + primary_color

```js
// من /admin/settings
const { settings } = useAdminSettings()
const primaryColor = settings?.primary_color ?? '#6366f1'

// تطبيق على الـ active sidebar item
<NavItem style={{ '--primary': primaryColor }} isActive={activeTab === tab} />
```

```css
[data-slug] .sidebar-item.active {
  background: color-mix(in srgb, var(--primary) 15%, transparent);
  color: var(--primary);
  border-right: 3px solid var(--primary);
}
```

---

## 11. خطة الجلسات

| الجلسة | المهمة | الأولوية |
|--------|--------|---------|
| **A** | Layout + Sidebar + Stats Cards | ابدأ هنا |
| **B** | Orders Kanban (drag & drop) | بعد A |
| **C** | Activity Feed + Top Items widget | بعد B |
| **D** | Reservations Tab (conditional) | بعد C |
| **E** | Polish: Framer Motion + RTL + responsive | أخيراً |

---

## 12. Checklist الاكتمال — Phase 56

```
جلسة A:
- [ ] Sidebar يعرض الأيقونات + labels بالعربي
- [ ] Active tab يتغير لونه بـ primary_color الـ tenant
- [ ] Stats cards تعرض 4 أرقام حقيقية من API
- [ ] Responsive: sidebar → bottom nav على موبايل

جلسة B:
- [ ] 4 columns: معلق / يُحضَّر / جاهز / تم التسليم
- [ ] كل card: اسم + عدد عناصر + مجموع + وقت
- [ ] Drag → API PATCH → DB يتحدث
- [ ] Rollback عند فشل API

جلسة C:
- [ ] آخر 10 طلبات + relative timestamp
- [ ] Polling 30 ثانية
- [ ] Top 5 items: اسم + عدد + إيراد

جلسة D:
- [ ] Reservations tab مخفية إذا service غير مفعّل
- [ ] Calendar week view بالألوان حسب status
- [ ] PATCH status يشتغل

جلسة E:
- [ ] لا console.error أو warnings
- [ ] Framer Motion على tab switch
- [ ] اختبار: smar + caracas + footlab
```

---

## 13. Design Inspiration

| Component | الموقع |
|-----------|--------|
| Sidebar layout | navbar.gallery |
| Stats cards | supahero.io |
| Kanban board | ابحث عن Linear-style |

افتح قبل البناء — لا تبني UI من فراغ.

# TanStack Query — Cache Layer Skill
# React Query v5 + publicApi (Axios) + Multi-Tenant SalmanSaaS
# اقرأ هذا قبل أي مهمة تتعلق بـ data fetching أو caching

---

## Stack Context — SalmanSaaS

```
Frontend:   React 19 + Vite
HTTP:       publicApi (Axios) — frontend/src/utils/publicApi.js
Auth:       adminApi (Axios) — frontend/src/api.js
Cache:      @tanstack/react-query v5
Multi-tenant: كل slug = tenant منفصل — الـ cache key يجب أن يحتوي الـ slug دائماً
```

---

## PART 1 — Setup (مرة واحدة في App.jsx)

```jsx
// frontend/src/App.jsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,   // 5 دق — البيانات "طازجة" لـ 5 دق
      gcTime:    10 * 60 * 1000,  // 10 دق — cache يُحذف بعدها إذا لا يوجد subscriber
      retry: 1,                   // محاولة واحدة عند الفشل
      refetchOnWindowFocus: false, // لا re-fetch عند alt+tab
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* ... existing routes ... */}
    </QueryClientProvider>
  )
}
```

---

## PART 2 — Multi-Tenant Cache Key Convention

**القاعدة الذهبية:** كل query key يجب أن يحتوي الـ `slug` كأول عنصر.
هذا يضمن:
- كل tenant له cache منفصل تماماً (لا تلوث cross-tenant)
- Invalidate tenant كامل بـ `queryClient.invalidateQueries({ queryKey: [slug] })`

```js
// ✅ صح — slug أولاً دائماً
['smar', 'config']
['smar', 'units', { checkIn, checkOut }]
['caracas', 'menu']
['footlab', 'catalog', categoryId]
['olivello', 'catalog']

// ❌ غلط — بدون slug = تلوث cross-tenant في الـ cache
['config']
['menu']
['catalog', categoryId]
```

---

## PART 3 — Migration Pattern (useEffect → useQuery)

### قبل (الـ pattern القديم في كل صفحة)

```jsx
// ❌ pattern قديم — لا caching، loading/error يدوي
const [config, setConfig]   = useState(null)
const [loading, setLoading] = useState(true)
const [error,   setError]   = useState(null)

useEffect(() => {
  publicApi.get(`/client/${slug}/config`)
    .then(res  => setConfig(res.data.data))
    .catch(err => setError(err.message))
    .finally(()=> setLoading(false))
}, [slug])
```

### بعد (useQuery)

```jsx
// ✅ pattern جديد — caching + deduplication + auto-retry
import { useQuery } from '@tanstack/react-query'
import publicApi from '../../../utils/publicApi'

function useTenantConfig(slug) {
  return useQuery({
    queryKey: [slug, 'config'],
    queryFn: () =>
      publicApi.get(`/client/${slug}/config`)
        .then(res => res.data.data),
    staleTime: 10 * 60 * 1000,  // config يتغير نادراً — 10 دق
    enabled: !!slug,             // لا تشتغل بدون slug
  })
}

// في الصفحة:
const { data: config, isLoading, isError } = useTenantConfig(slug)
```

---

## PART 4 — Recommended staleTime per Endpoint

| Endpoint | staleTime | السبب |
|----------|-----------|-------|
| `/client/{slug}/config` | 10 دق | يتغير نادراً |
| `/restaurant/menu` | 5 دق | قائمة — شبه ثابتة |
| `/store/catalog` | 5 دق | منتجات — شبه ثابتة |
| `/client/{slug}/units` | 30 ث | حجوزات — تتغير أكثر |
| `/booking/availability` | 0 | real-time — لا cache |
| `/public/ai/chat` | N/A | mutation فقط |

```js
// staleTime=0 = يفحص كل مرة، لكن لا يعيد fetch إذا لم تتغير البيانات (304)
// staleTime=Infinity = يستخدم الـ cache دائماً حتى تعمل invalidate يدوي
```

---

## PART 5 — Hook Patterns لكل Module

### Tenant Config (مشترك بين كل الصفحات)

```jsx
// frontend/src/hooks/useTenantConfig.js
import { useQuery } from '@tanstack/react-query'
import publicApi from '../utils/publicApi'

export function useTenantConfig(slug) {
  return useQuery({
    queryKey: [slug, 'config'],
    queryFn: () => publicApi.get(`/client/${slug}/config`).then(r => r.data.data),
    staleTime: 10 * 60 * 1000,
    enabled: !!slug,
  })
}
```

### Restaurant Menu

```jsx
// داخل src/pages/caracas/ أو src/hooks/
export function useMenu(slug) {
  return useQuery({
    queryKey: [slug, 'menu'],
    queryFn: () =>
      publicApi.get('/restaurant/menu', { params: { client_slug: slug } })
        .then(r => r.data.data),
    staleTime: 5 * 60 * 1000,
    enabled: !!slug,
  })
}
```

### Store Catalog

```jsx
export function useCatalog(slug, categoryId = null) {
  return useQuery({
    queryKey: [slug, 'catalog', categoryId],
    queryFn: () =>
      publicApi.get('/store/catalog', {
        params: { client_slug: slug, ...(categoryId && { category_id: categoryId }) }
      }).then(r => r.data.data),
    staleTime: 5 * 60 * 1000,
    enabled: !!slug,
  })
}
```

### Booking Availability (no cache — real-time)

```jsx
export function useAvailability(slug, unitId, checkIn, checkOut) {
  return useQuery({
    queryKey: [slug, 'availability', unitId, checkIn, checkOut],
    queryFn: () =>
      publicApi.get(`/client/${slug}/availability`, {
        params: { unit_id: unitId, check_in: checkIn, check_out: checkOut }
      }).then(r => r.data.data),
    staleTime: 0,              // لا cache — يجب أن يكون real-time
    enabled: !!(slug && unitId && checkIn && checkOut),
  })
}
```

---

## PART 6 — Mutations (POST/DELETE مع Optimistic Update)

```jsx
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useCreateBooking(slug) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (bookingData) =>
      publicApi.post('/public/bookings', bookingData).then(r => r.data),

    onSuccess: () => {
      // امسح الـ availability cache بعد الحجز
      queryClient.invalidateQueries({ queryKey: [slug, 'availability'] })
    },

    onError: (error) => {
      // لا تعرض str(e) للمستخدم — T7 rule
      console.error('Booking failed:', error.response?.data?.detail || 'Unknown error')
    },
  })
}
```

---

## PART 7 — Loading/Error States (GS MAR متوافق)

```jsx
// Loading state — متوافق مع GS MAR dark theme
function LoadingDot({ accent = '#d4a853' }) {
  return (
    <div style={{
      minHeight: '60vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 10, height: 10, borderRadius: '50%',
        background: accent,
        boxShadow: `0 0 24px 4px ${accent}80`,
        animation: 'tq-pulse 1.4s ease-in-out infinite',
      }} />
      <style>{`@keyframes tq-pulse{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:1;transform:scale(1.7)}}`}</style>
    </div>
  )
}

// الاستخدام في الصفحة
const { data, isLoading, isError } = useMenu(slug)

if (isLoading) return <LoadingDot />
if (isError)   return <ErrorScreen />
```

---

## PART 8 — Prefetching (للصفحات المتوقعة)

```jsx
// في Navigation أو Link hover — prefetch قبل الانتقال
import { useQueryClient } from '@tanstack/react-query'

function TenantLink({ slug, children }) {
  const queryClient = useQueryClient()

  return (
    <Link
      to={`/${slug}/home`}
      onMouseEnter={() => {
        queryClient.prefetchQuery({
          queryKey: [slug, 'config'],
          queryFn: () => publicApi.get(`/client/${slug}/config`).then(r => r.data.data),
          staleTime: 10 * 60 * 1000,
        })
      }}
    >
      {children}
    </Link>
  )
}
```

---

## PART 9 — Pilot Migration Checklist

عند تحويل صفحة من `useEffect + useState` إلى `useQuery`:

```
□ 1. أضف QueryClientProvider في App.jsx (مرة واحدة فقط)
□ 2. استبدل useState([data, loading, error]) بـ useQuery()
□ 3. أضف slug كأول عنصر في queryKey
□ 4. اختر staleTime المناسب من جدول PART 4
□ 5. استخدم enabled: !!slug لمنع الـ fetch بدون slug
□ 6. تحقق: لا يوجد useEffect متبقٍّ يتعارض مع useQuery
□ 7. اختبر: تنقّل بين tenants — تحقق أن الـ cache مستقل
```

---

## PART 10 — ما لا تفعله

```
❌ لا تضع قيمة slug من خارج multi-tenant context في queryKey
❌ لا تعمل queryClient.clear() — يمسح cache كل التنانت
❌ لا تستخدم staleTime=Infinity على availability/booking data
❌ لا تشغّل useQuery داخل حلقة map() أو if() — هذا يخرق Rules of Hooks
❌ لا تعمل refetch يدوي كل ثانية — استخدم staleTime=0 + refetchInterval بدلاً منه
```

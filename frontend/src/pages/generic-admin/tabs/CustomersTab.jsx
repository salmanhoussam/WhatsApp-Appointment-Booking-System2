import { useState, useEffect } from 'react'
import adminApi from '../../../utils/admin.config'
import { T, FONT } from '../theme'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'

// Unified Customer Registry (2026-08-20) -- GET /admin/customers/, a tenant-wide,
// TENANT_ADMIN-gated aggregation across Reservation (Services) + StoreOrder (Products), merged by
// phone number server-side (app/services/customer_registry_service.py). Distinct from
// MyClientsTab.jsx (STAFF-scoped, Reservations-only, "عملائي") -- this component does no
// filtering/merging of its own, the backend already returns one row per unique phone with full
// history embedded, so the detail view below never needs a second network call.

const BADGES = {
  both:          { label: '🌟 عميل شامل',   fg: T.green,      bg: T.greenSoft },
  services_only: { label: '✂️ عميل خدمات',  fg: T.textSecond, bg: T.borderSoft },
  store_only:    { label: '🛍️ عميل متجر',   fg: T.textSecond, bg: T.borderSoft },
}

function Badge({ badge, color }) {
  const cfg = BADGES[badge] ?? BADGES.services_only
  // store_only uses the tenant's own accent (a real product-side signal), the other two stay
  // neutral/green -- avoids inventing a 4th palette color not already in theme.js.
  const fg = badge === 'store_only' ? color : cfg.fg
  const bg = badge === 'store_only' ? `${color}1a` : cfg.bg
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 20,
      fontSize: 12, fontWeight: 700, color: fg, background: bg, whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  )
}

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('ar', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return iso
  }
}

const STATUS_AR = {
  pending: 'قيد الانتظار', confirmed: 'مؤكد', arrived: 'وصل',
  cancelled: 'ملغى', no_show: 'لم يحضر',
}

function CustomerDetailModal({ customer, color, onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(15,23,42,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }} onClick={onClose}>
      <div
        style={{
          background: T.cardBg, border: `1px solid ${T.border}`, boxShadow: T.shadowPopover,
          borderRadius: 12,
          width: '100%', maxWidth: 560, maxHeight: '85vh', overflowY: 'auto',
          padding: 28, fontFamily: FONT, direction: 'rtl',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: T.textPrimary }}>
            {customer.name || 'بدون اسم'}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.textMuted, fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <span style={{ fontSize: 13, color: T.textMuted, direction: 'ltr' }}>
            {customer.no_phone ? 'بدون رقم' : customer.phone}
          </span>
          <Badge badge={customer.badge} color={color} />
        </div>

        {customer.reservations.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary, marginBottom: 8 }}>
              الحجوزات ({customer.reservation_count})
            </div>
            {customer.reservations.map(r => (
              <div key={r.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 0', borderBottom: `1px solid ${T.borderSoft}`, fontSize: 13,
              }}>
                <span style={{ color: T.textPrimary }}>{r.service_name_ar || 'خدمة غير معروفة'}</span>
                <span style={{ color: T.textMuted, fontSize: 12 }}>
                  {formatDate(r.reserved_at)} · {STATUS_AR[r.status] ?? r.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {customer.orders.length > 0 && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary, marginBottom: 8 }}>
              الطلبات ({customer.order_count})
            </div>
            {customer.orders.map(o => (
              <div key={o.id} style={{
                padding: '8px 0', borderBottom: `1px solid ${T.borderSoft}`, fontSize: 13,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: T.textPrimary }}>
                  <span>{formatDate(o.created_at)}</span>
                  <span style={{ fontWeight: 700 }}>{o.total_price}</span>
                </div>
                <div style={{ color: T.textMuted, fontSize: 12, marginTop: 2 }}>
                  {o.items.map(i => `${i.name_ar ?? 'منتج'} ×${i.quantity}`).join('، ')}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
          <Button variant="secondary" onClick={onClose}>إغلاق</Button>
        </div>
      </div>
    </div>
  )
}

export default function CustomersTab({ color }) {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    let mounted = true
    adminApi.get('/customers/')
      .then(({ data }) => {
        if (!mounted) return
        setCustomers(data?.data ?? [])
      })
      .catch(() => {
        if (mounted) setError('تعذّر تحميل قائمة العملاء.')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => { mounted = false }
  }, [])

  return (
    <div style={{ fontFamily: FONT }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: T.textPrimary, marginBottom: 16 }}>
        العملاء
      </div>

      <Card padding={0}>
        {loading ? (
          <EmptyState message="جارٍ التحميل..." />
        ) : error ? (
          <EmptyState message={error} />
        ) : customers.length === 0 ? (
          <EmptyState message="لا يوجد عملاء بعد" subMessage="سيظهر هنا كل عميل حجز موعداً أو اشترى منتجاً" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', direction: 'rtl' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  {['الاسم', 'رقم الهاتف', 'التصنيف', 'الحجوزات', 'الطلبات', 'آخر تفاعل'].map(h => (
                    <th key={h} style={{
                      textAlign: 'right', padding: '12px 16px', fontSize: 12,
                      fontWeight: 700, color: T.textMuted, whiteSpace: 'nowrap',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customers.map((c, i) => (
                  <tr
                    key={c.phone ?? `no-phone-${i}`}
                    onClick={() => setSelected(c)}
                    style={{
                      cursor: 'pointer',
                      borderBottom: i < customers.length - 1 ? `1px solid ${T.borderSoft}` : 'none',
                    }}
                  >
                    <td style={{ padding: '12px 16px', fontSize: 14, color: T.textPrimary }}>
                      {c.name || 'بدون اسم'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: T.textMuted, direction: 'ltr', textAlign: 'right' }}>
                      {c.no_phone ? 'بدون رقم' : c.phone}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <Badge badge={c.badge} color={color} />
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: T.textSecond }}>{c.reservation_count}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: T.textSecond }}>{c.order_count}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: T.textMuted }}>{formatDate(c.last_interaction_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selected && (
        <CustomerDetailModal customer={selected} color={color} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}

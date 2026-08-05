import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { T } from '../theme'
import Card from './ui/Card'
import EmptyState from './ui/EmptyState'

// ── Compute top 5 items — quantity + revenue ───────────────────────────────────
function buildTopItems(orders) {
  const map = {}
  orders.forEach(order => {
    ;(order.items ?? []).forEach(item => {
      const key = item.catalog_item_id ?? item.id ?? item.catalogItemId
      if (!key) return
      if (!map[key]) {
        map[key] = {
          id:        key,
          name_ar:   item.name_ar ?? item.name ?? item.catalog_item?.name_ar ?? 'منتج',
          name_en:   item.name_en ?? item.catalog_item?.name_en ?? '',
          image_url: item.image_url ?? item.catalog_item?.image_url ?? null,
          currency:  order.currency ?? item.currency ?? null,
          qty:       0,
          revenue:   0,
        }
      }
      const qty     = item.quantity ?? 1
      const price   = Number(item.unit_price ?? item.price ?? 0)
      map[key].qty     += qty
      map[key].revenue += qty * price
    })
  })
  return Object.values(map)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5)
}

function fmtRevenue(val, currency) {
  if (!val || val === 0) return null
  return `${Number(val).toLocaleString('ar-SA')} ${currency ?? ''}`
}

// ── Bar row ────────────────────────────────────────────────────────────────────
function ItemRow({ item, max, color, index }) {
  const pct      = max > 0 ? (item.qty / max) * 100 : 0
  const revenue  = fmtRevenue(item.revenue, item.currency)

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.07, type: 'spring', stiffness: 240, damping: 22 }}
      style={{ display: 'flex', gap: 10, alignItems: 'center' }}
    >
      {/* Thumbnail */}
      {item.image_url ? (
        <img
          src={item.image_url}
          alt=""
          style={{
            width: 34, height: 34, borderRadius: 8,
            objectFit: 'cover', flexShrink: 0,
            border: `1px solid ${T.border}`,
          }}
        />
      ) : (
        <div style={{
          width: 34, height: 34, borderRadius: 8, flexShrink: 0,
          background: `${color}18`,
          border: `1px solid ${color}22`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13,
        }}>
          🛒
        </div>
      )}

      {/* Name + bar + meta */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
          <span style={{
            fontSize: 12, color: T.textPrimary, fontWeight: 600,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {item.name_ar}
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexShrink: 0 }}>
            <span style={{ fontSize: 11, color, fontWeight: 700 }}>{item.qty}×</span>
          </div>
        </div>

        {/* Bar */}
        <div style={{
          height: 3, borderRadius: 2,
          background: T.borderSoft,
          overflow: 'hidden',
        }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ delay: index * 0.07 + 0.12, duration: 0.5, ease: 'easeOut' }}
            style={{ height: '100%', borderRadius: 2, background: `linear-gradient(90deg, ${color}88, ${color})` }}
          />
        </div>

        {/* Revenue */}
        {revenue && (
          <div style={{ fontSize: 10, color: T.textMuted, lineHeight: 1 }}>
            {revenue}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function TopItemsWidget({ orders = [], loading = false, color = '#6366f1' }) {
  const items = useMemo(() => buildTopItems(orders), [orders])
  const max   = items[0]?.qty ?? 1

  return (
    <Card style={{ border: `1px solid ${color}22`, minWidth: 0 }}>
      {/* Header */}
      <div style={{
        fontSize: 13, fontWeight: 700, color: T.textSecond,
        marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block' }} />
        الأكثر مبيعاً
      </div>

      {/* Body */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{
              height: 36, borderRadius: 6,
              background: T.borderSoft,
              animation: 'ti-pulse 1.5s ease-in-out infinite',
              animationDelay: `${i * 0.1}s`,
            }} />
          ))}
          <style>{`@keyframes ti-pulse{0%,100%{opacity:.4}50%{opacity:.8}}`}</style>
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon="📊" message="ما في مبيعات بعد" style={{ padding: '28px 12px' }} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {items.map((item, i) => (
            <ItemRow key={item.id} item={item} max={max} color={color} index={i} />
          ))}
        </div>
      )}
    </Card>
  )
}

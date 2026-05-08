import { useMemo } from 'react'
import { motion } from 'framer-motion'

// ── Compute top 5 items by quantity from orders ────────────────────────────────
function buildTopItems(orders) {
  const counts = {}
  orders.forEach(order => {
    ;(order.items ?? []).forEach(item => {
      const key = item.catalog_item_id ?? item.id ?? item.catalogItemId
      if (!key) return
      if (!counts[key]) {
        counts[key] = {
          id:      key,
          name_ar: item.name_ar ?? item.name ?? item.catalog_item?.name_ar ?? 'منتج',
          name_en: item.name_en ?? item.catalog_item?.name_en ?? '',
          qty:     0,
        }
      }
      counts[key].qty += item.quantity ?? 1
    })
  })
  return Object.values(counts)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5)
}

// ── Bar row ────────────────────────────────────────────────────────────────────
function ItemRow({ item, max, color, index }) {
  const pct = max > 0 ? (item.qty / max) * 100 : 0
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06, type: 'spring', stiffness: 240, damping: 22 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 5 }}
    >
      {/* Name + count */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{
          fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          maxWidth: '75%',
        }}>
          {item.name_ar}
        </span>
        <span style={{ fontSize: 11, color, fontWeight: 700, flexShrink: 0 }}>
          {item.qty}×
        </span>
      </div>

      {/* Bar */}
      <div style={{
        height: 4, borderRadius: 2,
        background: 'rgba(255,255,255,0.07)',
        overflow: 'hidden',
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ delay: index * 0.06 + 0.1, duration: 0.5, ease: 'easeOut' }}
          style={{ height: '100%', borderRadius: 2, background: color }}
        />
      </div>
    </motion.div>
  )
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function TopItemsWidget({ orders = [], loading = false, color = '#6366f1' }) {
  const items = useMemo(() => buildTopItems(orders), [orders])
  const max   = items[0]?.qty ?? 1

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14,
      padding: '18px 20px',
    }}>
      {/* Header */}
      <div style={{
        fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)',
        marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: color, display: 'inline-block',
        }} />
        أكثر المنتجات طلباً
      </div>

      {/* Body */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{
              height: 32, borderRadius: 6,
              background: 'rgba(255,255,255,0.04)',
              animation: 'pulse 1.5s ease-in-out infinite',
              animationDelay: `${i * 0.1}s`,
            }} />
          ))}
          <style>{`@keyframes pulse{0%,100%{opacity:.4}50%{opacity:.8}}`}</style>
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 12, padding: '24px 0' }}>
          لا توجد طلبات بعد
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {items.map((item, i) => (
            <ItemRow key={item.id} item={item} max={max} color={color} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import adminApi from '../../../utils/admin.config'

const POLL_MS = 30_000

// ── timeAgo ────────────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins  < 1)  return 'الآن'
  if (mins  < 60) return `منذ ${mins} د`
  if (hours < 24) return `منذ ${hours} س`
  return `منذ ${days} ي`
}

function fmtPrice(price, currency) {
  if (price == null || Number(price) === 0) return null
  return `${Number(price).toLocaleString('ar-SA')} ${currency ?? ''}`
}

// ── Merge + sort ───────────────────────────────────────────────────────────────
function buildFeed(orders, reservations) {
  const events = [
    ...orders.map(o => ({
      type:     'order',
      id:       o.id,
      at:       o.created_at ?? o.createdAt,
      label:    'طلب جديد',
      customer: o.customer_name ?? o.customerName ?? '',
      count:    Array.isArray(o.items) ? o.items.length : null,
      price:    o.total_price ?? null,
      currency: o.currency ?? null,
    })),
    ...reservations.map(r => ({
      type:     'reservation',
      id:       r.id,
      at:       r.created_at ?? r.createdAt,
      label:    'حجز جديد',
      customer: r.customer_name ?? r.customerName ?? r.guest_name ?? '',
      count:    null,
      price:    null,
      currency: null,
    })),
  ]
  return events
    .filter(e => e.at)
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 10)
}

// ── Icons ──────────────────────────────────────────────────────────────────────
function IcOrder({ color }) {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 01-8 0"/>
    </svg>
  )
}

function IcCalendar({ color }) {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8"  y1="2" x2="8"  y2="6"/>
      <line x1="3"  y1="10" x2="21" y2="10"/>
    </svg>
  )
}

// ── Skeleton ───────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[...Array(5)].map((_, i) => (
        <div key={i} style={{
          height: 44, borderRadius: 8,
          background: 'rgba(255,255,255,0.04)',
          animation: 'af-pulse 1.5s ease-in-out infinite',
          animationDelay: `${i * 0.1}s`,
        }} />
      ))}
      <style>{`@keyframes af-pulse{0%,100%{opacity:.4}50%{opacity:.8}}`}</style>
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function ActivityFeed({ orders = [], hasReservations = false, color = '#6366f1', onRequestRefresh }) {
  const [reservations, setReservations] = useState([])
  const [loading,      setLoading]      = useState(hasReservations)
  const mountedRef = useRef(true)
  useEffect(() => () => { mountedRef.current = false }, [])

  // Fetch reservations once
  useEffect(() => {
    if (!hasReservations) { setLoading(false); return }
    setLoading(true)
    adminApi.get('/reservations')
      .then(r => {
        const raw = r?.data?.data ?? r?.data ?? []
        if (mountedRef.current) setReservations(Array.isArray(raw) ? raw : [])
      })
      .catch(() => {})
      .finally(() => { if (mountedRef.current) setLoading(false) })
  }, [hasReservations])

  // 30-second polling — triggers parent reload for orders
  useEffect(() => {
    if (!onRequestRefresh) return
    const timer = setInterval(onRequestRefresh, POLL_MS)
    return () => clearInterval(timer)
  }, [onRequestRefresh])

  const feed = buildFeed(orders, reservations)

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${color}22`,
      borderRadius: 14,
      padding: '18px 20px',
    }}>
      {/* Header */}
      <div style={{
        fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)',
        marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block' }} />
          آخر النشاطات
        </div>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontWeight: 400 }}>
          تحديث كل 30ث
        </span>
      </div>

      {/* Body */}
      {loading ? (
        <Skeleton />
      ) : feed.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '28px 12px' }}>
          <div style={{ fontSize: 22, marginBottom: 8 }}>📭</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', lineHeight: 1.6 }}>
            ما في نشاطات لهذا الأسبوع
            <br />
            <span style={{ fontSize: 11, color: `${color}88` }}>
              ابدأ بإضافة عناصر للكتالوج!
            </span>
          </div>
        </div>
      ) : (
        <AnimatePresence initial={false}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {feed.map((event, i) => {
              const priceStr = fmtPrice(event.price, event.currency)
              return (
                <motion.div
                  key={event.id ?? i}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, type: 'spring', stiffness: 260, damping: 22 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 10px', borderRadius: 8,
                  }}
                  whileHover={{ background: 'rgba(255,255,255,0.04)' }}
                >
                  {/* Icon badge */}
                  <div style={{
                    width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                    background: `${color}1a`,
                    border: `1px solid ${color}33`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {event.type === 'order'
                      ? <IcOrder color={color} />
                      : <IcCalendar color={color} />
                    }
                  </div>

                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.75)', lineHeight: 1.3 }}>
                      {event.label}
                      {event.count != null && (
                        <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}>
                          {' · '}{event.count} عنصر
                        </span>
                      )}
                      {priceStr && (
                        <span style={{ color, fontWeight: 700 }}>
                          {' · '}{priceStr}
                        </span>
                      )}
                    </div>
                    {event.customer && (
                      <div style={{
                        fontSize: 11, color: 'rgba(255,255,255,0.3)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        marginTop: 1,
                      }}>
                        {event.customer}
                      </div>
                    )}
                  </div>

                  {/* Time */}
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>
                    {timeAgo(event.at)}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </AnimatePresence>
      )}
    </div>
  )
}

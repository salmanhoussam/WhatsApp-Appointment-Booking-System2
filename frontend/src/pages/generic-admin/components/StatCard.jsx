import { useEffect } from 'react'
import { motion }    from 'framer-motion'

const PULSE = `@keyframes sk-pulse { 0%,100%{opacity:.35} 50%{opacity:.75} }`
let _pulseInjected = false

// ── Skeleton block ─────────────────────────────────────────────────────────────
function Skel({ w, h, delay = 0 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: 6,
      background: 'rgba(255,255,255,0.08)',
      animation: `sk-pulse 1.5s ease-in-out ${delay}s infinite`,
    }} />
  )
}

// ── StatCard ───────────────────────────────────────────────────────────────────
/**
 * Props:
 *   label      string          — Arabic label shown below the value
 *   value      string|number   — main display value (already formatted)
 *   icon       ReactNode       — 20–24px SVG element
 *   trend      number|null     — e.g. 12 → "+12%", -5 → "-5%". null hides badge.
 *   color      string          — tenant primary_color
 *   isLoading  boolean
 */
export default function StatCard({
  label,
  value,
  icon,
  trend = null,
  color = '#6366f1',
  isLoading = false,
}) {
  useEffect(() => {
    if (_pulseInjected) return
    _pulseInjected = true
    const el = document.createElement('style')
    el.textContent = PULSE
    document.head.appendChild(el)
  }, [])

  const positive = trend > 0

  return (
    <motion.div
      whileHover={{ y: -3, boxShadow: `0 12px 40px ${color}18` }}
      transition={{ type: 'spring', stiffness: 300, damping: 25, mass: 0.5 }}
      style={{
        position: 'relative',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        overflow: 'hidden',
        cursor: 'default',
      }}
    >
      {/* ── Icon + trend badge ──────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: `${color}1a`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {icon}
        </div>

        {trend != null && !isLoading && (
          <span style={{
            fontSize: 11, fontWeight: 700,
            padding: '4px 10px', borderRadius: 20,
            color:      positive ? '#4ade80' : '#f87171',
            background: positive ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)',
            letterSpacing: '0.02em',
            fontFamily: 'monospace',
          }}>
            {positive ? '+' : ''}{trend}%
          </span>
        )}
      </div>

      {/* ── Value ─────────────────────────────────────────────────────── */}
      {isLoading
        ? <Skel w={90} h={36} />
        : (
          <div style={{
            fontSize: 30, fontWeight: 800, color: '#fff',
            lineHeight: 1, fontFamily: "'Cairo', sans-serif",
            letterSpacing: '-0.02em',
          }}>
            {value ?? '—'}
          </div>
        )}

      {/* ── Label ─────────────────────────────────────────────────────── */}
      {isLoading
        ? <Skel w={110} h={14} delay={0.15} />
        : (
          <div style={{
            fontSize: 13, color: 'rgba(255,255,255,0.4)',
            fontFamily: "'Cairo', sans-serif",
          }}>
            {label}
          </div>
        )}

      {/* ── Bottom accent line ─────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${color}55, transparent)`,
      }} />
    </motion.div>
  )
}

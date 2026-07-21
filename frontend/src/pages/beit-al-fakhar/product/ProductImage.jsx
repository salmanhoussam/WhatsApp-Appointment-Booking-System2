import { useState } from 'react'

/**
 * ProductImage — the piece is the hero, shown whole, never cropped.
 *
 * object-fit: contain (not cover) by default — a vertical piece must never
 * have its top/bottom cut off to fill a fixed box. Real empty space around
 * the piece is preferred over losing part of it.
 *
 * On load failure: a warm, on-brand placeholder (not a broken-image icon).
 */
export default function ProductImage({ src, alt }) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <div style={{
        width: '100%', aspectRatio: '1 / 1', borderRadius: 20,
        background: 'linear-gradient(135deg, rgba(193,104,58,0.14) 0%, rgba(42,36,32,0.6) 100%)',
        border: '1px solid rgba(193,104,58,0.22)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 12, textAlign: 'center', padding: 24, boxSizing: 'border-box',
      }}>
        <span style={{ fontSize: 40, opacity: 0.35 }}>◈</span>
        <span style={{
          fontSize: 13.5, color: 'rgba(255,255,255,0.4)', fontFamily: "'Cairo', sans-serif",
        }}>
          صورة القطعة غير متوفرة حالياً
        </span>
      </div>
    )
  }

  return (
    <div style={{
      width: '100%', aspectRatio: '1 / 1', borderRadius: 20,
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    }}>
      <img
        src={src}
        alt={alt}
        onError={() => setFailed(true)}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    </div>
  )
}

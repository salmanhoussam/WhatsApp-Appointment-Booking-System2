// SmartOrderProductSection.jsx — a static "Coming Soon" placeholder on the root Product Showcase
// Home. Deliberately inert: no working CTA, no demo link, no data -- Smart Order has zero real
// product code anywhere in this repo (confirmed by a full-repo search, 2026-08-12). This section
// exists only to reserve its position/name in the IA, not to represent a finished product.
//
// Explicit constraint from Salman (2026-08-12 IA decision): this must not carry a size or
// readiness level implying it's a finished product on par with Alzabt -- kept visually muted/
// secondary on purpose, positioned above Alzabt's section per the agreed order.

import { UtensilsCrossed } from 'lucide-react'

const FONT = "'Cairo', 'Segoe UI', sans-serif"

export default function SmartOrderProductSection() {
  return (
    <section style={{
      padding: '36px 24px',
      borderRadius: 24,
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.06)',
      fontFamily: FONT,
      opacity: 0.75,
    }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '5px 12px', borderRadius: 999,
        background: 'rgba(255,255,255,0.05)', marginBottom: 16,
      }}>
        <UtensilsCrossed size={13} color="rgba(255,255,255,0.4)" strokeWidth={2} />
        <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>مطاعم ومتاجر</span>
      </div>

      <h2 style={{
        margin: '0 0 8px', fontSize: 'clamp(1.3rem, 3vw, 1.7rem)', fontWeight: 800,
        color: 'rgba(255,255,255,0.55)',
      }}>
        Smart Order
      </h2>
      <p style={{
        margin: '0 0 18px', maxWidth: 460, fontSize: 14, lineHeight: 1.7,
        color: 'rgba(255,255,255,0.32)',
      }}>
        قوائم طلبات ذكية للمطاعم والمتاجر — قيد التطوير.
      </p>

      <span style={{
        display: 'inline-block', padding: '8px 18px', borderRadius: 999,
        border: '1px solid rgba(255,255,255,0.12)',
        fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.4)',
      }}>
        قريباً
      </span>
    </section>
  )
}

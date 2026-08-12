// ProductShowcaseHome.jsx — salmansaas.com root ("/").
//
// IA decision, 2026-08-12 (salmansaas.com Product IA plan, .claude/plans/we-moved-on-new-hazy-
// barto.md): root is a light, company-level container around exactly two independent product
// sections -- SmartOrderProductSection (placeholder, "Coming Soon", first) and
// AlzabtProductSection (real, complete, below). Deliberately NOT a full company-brand redesign,
// NOT a reusable "product section framework" built out for hypothetical future products -- just
// the two sections needed today, in a simple enough shell to extend later without having
// over-built for that future now.
//
// Replaces HomePage.jsx (3D showcase) at the index route only -- HomePage.jsx itself is
// untouched, just no longer mounted here. Its own eventual /company route is optional/
// independent, not part of this scope.

import SmartOrderProductSection from './sections/SmartOrderProductSection'
import AlzabtProductSection from './sections/AlzabtProductSection'

const FONT = "'Cairo', 'Segoe UI', sans-serif"

export default function ProductShowcaseHome() {
  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F', fontFamily: FONT }} dir="rtl">
      <nav style={{
        padding: '20px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <span style={{ fontSize: 17, fontWeight: 800, color: 'rgba(255,255,255,0.9)' }}>
          SalmanSaaS
        </span>
      </nav>

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '56px 24px 80px' }}>
        <h1 style={{
          margin: '0 0 8px', fontSize: 'clamp(1.5rem, 3.5vw, 2rem)', fontWeight: 800,
          color: 'rgba(255,255,255,0.9)',
        }}>
          منتجاتنا
        </h1>
        <p style={{ margin: '0 0 36px', fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>
          منصّات SaaS جاهزة لكل نوع عمل
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <SmartOrderProductSection />
          <AlzabtProductSection />
        </div>
      </main>

      <footer style={{
        padding: '24px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.06)',
        fontSize: 12, color: 'rgba(255,255,255,0.3)',
      }}>
        SalmanSaaS — 2026
      </footer>
    </div>
  )
}

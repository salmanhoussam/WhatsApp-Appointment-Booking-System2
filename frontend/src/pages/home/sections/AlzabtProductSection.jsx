// AlzabtProductSection.jsx — the real, fully-realized product section on the root Product
// Showcase Home (salmansaas.com/). Carries Alzabt's own "Violet Confidence" brand accent
// (frontend/src/pages/alzabt/AlzabtLandingPage.jsx is the canonical definition of this palette --
// this section reuses the same violet, not a new one). Links out to the full /alzabt marketing
// page -- this section is a summary/teaser, not a replacement for it.
//
// IA decision, 2026-08-12 (salmansaas.com Product IA plan): root shows exactly two sections,
// Smart Order (placeholder, above) and Alzabt (real, below) -- no broader redesign.

import { useNavigate } from 'react-router-dom'
import { Scissors, ArrowLeft } from 'lucide-react'

const VIOLET = '#7C3AED'
const FONT = "'Cairo', 'Segoe UI', sans-serif"

export default function AlzabtProductSection() {
  const navigate = useNavigate()

  return (
    <section style={{
      position: 'relative',
      padding: '48px 24px',
      borderRadius: 24,
      background: 'linear-gradient(135deg, rgba(124,58,237,0.14), rgba(124,58,237,0.03))',
      border: '1px solid rgba(124,58,237,0.28)',
      fontFamily: FONT,
    }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '5px 12px', borderRadius: 999,
        background: 'rgba(124,58,237,0.16)', marginBottom: 18,
      }}>
        <Scissors size={13} color={VIOLET} strokeWidth={2} />
        <span style={{ fontSize: 12, fontWeight: 700, color: VIOLET }}>حجوزات وصالونات حلاقة</span>
      </div>

      <h2 style={{
        margin: '0 0 10px', fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', fontWeight: 900,
        color: 'rgba(255,255,255,0.94)', letterSpacing: '-0.01em',
      }}>
        عال<span style={{ color: VIOLET }}>زبط</span>
      </h2>
      <p style={{
        margin: '0 0 26px', maxWidth: 480, fontSize: 15, lineHeight: 1.7,
        color: 'rgba(255,255,255,0.55)',
      }}>
        خلّي زبايينك يحجزوا لحالهم، أونلاين وعلى مدار الساعة. تقويم حقيقي، تأكيد فوري عبر واتساب.
      </p>

      <button
        onClick={() => navigate('/alzabt')}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '13px 26px', borderRadius: 999, border: 'none',
          background: `linear-gradient(135deg, ${VIOLET}, #9333EA)`,
          color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: FONT,
          cursor: 'pointer', boxShadow: '0 8px 24px rgba(124,58,237,0.24)',
          transition: 'transform 0.15s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)' }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
      >
        جرّب عالزبط
        <ArrowLeft size={15} />
      </button>
    </section>
  )
}

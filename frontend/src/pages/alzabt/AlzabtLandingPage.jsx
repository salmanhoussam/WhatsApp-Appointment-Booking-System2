// AlzabtLandingPage.jsx — the عالزبط (Alzabt) product marketing entry point.
//
// Alzabt Master Product Plan, Section K step 7. A genuinely new, separate page/route -- not a
// redesign of frontend/src/pages/showcase/pages/HomePage.jsx (3D showcase spectacle),
// DemoLandingPage.jsx (dark-gold glass, generic multi-vertical demo signup), or
// frontend/src/pages/marketing/MarketingApp.jsx (dark-blue #060b18, generic multi-vertical pitch)
// -- all three stay untouched, all three keep serving their own existing audiences. This page is
// scoped specifically to Alzabt's Barber/Reservations product (Section A's rollout priority), not
// a platform-wide rebrand.
//
// Visual system (Section A's "Two Distinct Brand Layers", resolved 2026-08-12): this is the ONE
// place the "Violet Confidence" product-brand palette applies -- never on tenant-rendered pages
// (Booking Page, Admin Dashboard), which stay driven by each tenant's own Client.primary_color.
//
// Structure (Section C, Image 6 pattern -- centered hero + full-width proof below, not the
// left-text/right-floating-card family): centered hero -> full-width 3-step proof section ->
// benefit bullets -> closing CTA. Deliberately does not build the animated live-toast, the
// customer<->business story animation, or per-vertical landing pages from Section D's fuller
// mapping -- those are named there as later, richer marketing-pass work, not this step's scope.
//
// "جرّب عالزبط" links directly to the real, isolated alzabt-demo reference tenant's real booking
// page (scripts/seed_alzabt_demo_tenant.py) -- never RK's real production tenant.
//
// Demo entry point (salmansaas.com Product IA decision, 2026-08-12): production traffic goes to
// demo.salmansaas.com/alzabt (App.jsx's IS_DEMO_SUBDOMAIN route, redirects into this same
// alzabt-demo tenant) -- same env-detection idiom as pages/showcase/config.js's REGISTER_URL.
// Local/dev traffic (demo.salmansaas.com doesn't resolve locally) still navigates in-app.

import { useNavigate } from 'react-router-dom'
import { Scissors, CalendarDays, MessageCircle, Users, Layers, Link2 } from 'lucide-react'

const DEMO_SLUG = 'alzabt-demo'
const FONT = "'Cairo', 'Segoe UI', sans-serif"

// Violet Confidence — Alzabt's own product-brand identity (Section A/P, resolved 2026-08-12).
// Distinct from every tenant's own primary_color; applies only within this file.
const V = {
  bg:          '#0A0A0F',
  bgWash:      'radial-gradient(ellipse 900px 500px at 50% 0%, rgba(124,58,237,0.16) 0%, transparent 70%)',
  cardBg:      'rgba(255,255,255,0.04)',
  cardBorder:  '1px solid rgba(255,255,255,0.08)',
  textPrimary: 'rgba(255,255,255,0.94)',
  textSecond:  'rgba(255,255,255,0.55)',
  textMuted:   'rgba(255,255,255,0.35)',
  violet:      '#7C3AED',
  violetSoft:  'rgba(124,58,237,0.14)',
  success:     '#16A34A', // deliberately separate from the brand accent -- Image 3's own
                           // principle (Section C): brand color and success/status color should
                           // never be the same color.
}

function PrimaryCTA({ onClick, children, style }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '15px 32px', borderRadius: 999, border: 'none',
        background: `linear-gradient(135deg, ${V.violet}, #9333EA)`,
        color: '#fff', fontSize: 15, fontWeight: 700, fontFamily: FONT,
        cursor: 'pointer', boxShadow: `0 8px 24px ${V.violetSoft}`,
        transition: 'transform 0.15s ease, opacity 0.15s ease',
        ...style,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
    >
      {children}
    </button>
  )
}

function GhostCTA({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '13px 26px', borderRadius: 999,
        border: '1px solid rgba(255,255,255,0.14)', background: 'transparent',
        color: V.textSecond, fontSize: 14, fontWeight: 600, fontFamily: FONT,
        cursor: 'pointer', transition: 'border-color 0.15s ease, color 0.15s ease',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.color = V.textPrimary }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'; e.currentTarget.style.color = V.textSecond }}
    >
      {children}
    </button>
  )
}

const STEPS = [
  { icon: Scissors, title: 'اختر الخدمة', desc: 'زبونك يختار الخدمة اللي بدو ياها بلمسة وحدة' },
  { icon: CalendarDays, title: 'اختر الموعد', desc: 'تقويم حقيقي، مواعيد فعلية متاحة فوراً' },
  { icon: MessageCircle, title: 'تأكيد فوري', desc: 'عبر واتساب — بدون تسجيل، بدون تعقيد' },
]

const BENEFITS = [
  { icon: CalendarDays, text: 'حجوزات أونلاين على مدار الساعة' },
  { icon: Users, text: 'إدارة الموظفين والخدمات من مكان واحد' },
  { icon: Layers, text: 'تقويم وحجوزات بمكان واحد، مش عشرين رسالة' },
  { icon: Link2, text: 'صفحة حجز خاصة فيك، تحمل اسمك وهويتك' },
]

export default function AlzabtLandingPage() {
  const navigate = useNavigate()
  const tryDemo = () => {
    if (window.location.hostname.includes('salmansaas.com')) {
      window.location.href = 'https://demo.salmansaas.com/alzabt'
    } else {
      navigate(`/${DEMO_SLUG}/reserve`)
    }
  }
  const scrollToProof = () => document.getElementById('alzabt-how-it-works')?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div style={{ minHeight: '100vh', background: V.bg, fontFamily: FONT, overflowX: 'hidden' }} dir="rtl">
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 24px', background: 'rgba(10,10,15,0.7)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid rgba(255,255,255,0.06)`,
      }}>
        <span style={{ fontSize: 19, fontWeight: 800, color: V.textPrimary }}>
          عال<span style={{ color: V.violet }}>زبط</span>
        </span>
        <PrimaryCTA onClick={tryDemo} style={{ padding: '9px 20px', fontSize: 13 }}>
          جرّب عالزبط
        </PrimaryCTA>
      </nav>

      {/* ── Hero — centered, full-width proof below (Section C, Image 6 pattern) ──────────── */}
      <section style={{
        position: 'relative', background: V.bgWash,
        padding: '96px 20px 64px', textAlign: 'center',
      }}>
        <h1 style={{
          margin: '0 0 18px', fontSize: 'clamp(2.2rem, 5.5vw, 3.4rem)', fontWeight: 900,
          lineHeight: 1.15, color: V.textPrimary, letterSpacing: '-0.02em',
        }}>
          الحجوزات؟ <span style={{
            background: `linear-gradient(135deg, ${V.violet}, #C084FC)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>عالزبط.</span>
        </h1>
        <p style={{
          margin: '0 auto 36px', maxWidth: 480, fontSize: 'clamp(1rem, 2.2vw, 1.15rem)',
          lineHeight: 1.7, color: V.textSecond,
        }}>
          خلّي زبايينك يحجزوا لحالهم. وإنت خلّيك على شغلك.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <PrimaryCTA onClick={tryDemo}>جرّب عالزبط الآن ←</PrimaryCTA>
          <GhostCTA onClick={scrollToProof}>شوف كيف بيشتغل</GhostCTA>
        </div>
      </section>

      {/* ── Full-width proof section — 3 real steps, not a screenshot ─────────────────────── */}
      <section id="alzabt-how-it-works" style={{ padding: '20px 20px 72px', maxWidth: 1000, margin: '0 auto' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16,
          background: V.cardBg, border: V.cardBorder, borderRadius: 20, padding: '32px 24px',
        }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
              <div style={{
                width: 52, height: 52, borderRadius: 16, background: V.violetSoft,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <s.icon size={24} color={V.violet} strokeWidth={1.75} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: V.textPrimary }}>{s.title}</div>
              <div style={{ fontSize: 13, color: V.textSecond, lineHeight: 1.6 }}>{s.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 28 }}>
          <PrimaryCTA onClick={tryDemo}>جرّب التجربة كاملة ←</PrimaryCTA>
        </div>
      </section>

      {/* ── Benefits — "شو بيعمل عالزبط؟" ──────────────────────────────────────────────────── */}
      <section style={{ padding: '20px 20px 80px', maxWidth: 900, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.4rem, 3vw, 1.8rem)', fontWeight: 800, color: V.textPrimary, marginBottom: 32 }}>
          شو بيعمل عالزبط؟
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
          {BENEFITS.map((b, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px',
              background: V.cardBg, border: V.cardBorder, borderRadius: 14,
            }}>
              <b.icon size={20} color={V.violet} strokeWidth={1.75} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 14, color: V.textPrimary, lineHeight: 1.5 }}>{b.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Closing CTA ─────────────────────────────────────────────────────────────────── */}
      <section style={{ padding: '0 20px 96px', textAlign: 'center' }}>
        <PrimaryCTA onClick={tryDemo} style={{ padding: '17px 40px', fontSize: 16 }}>
          جرّب عالزبط بدون تسجيل ←
        </PrimaryCTA>
        <p style={{ marginTop: 14, fontSize: 12, color: V.textMuted }}>
          تجربة حجز حقيقية، خلال دقيقتين
        </p>
      </section>

      <footer style={{
        padding: '24px 20px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.06)',
        fontSize: 12, color: V.textMuted,
      }}>
        عالزبط — 2026
      </footer>
    </div>
  )
}

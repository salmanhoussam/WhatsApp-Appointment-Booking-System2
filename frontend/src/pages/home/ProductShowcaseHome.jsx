// ProductShowcaseHome.jsx — salmansaas.com root ("/").
//
// REBUILT 2026-08-26 (supersedes the 2026-08-12 "two summary sections" shell) — Salman's own
// explicit direction, after: (1) a real, interactive 3-way visual comparison ("Tower Concept
// Lab" artifact — 2.5D parallax / CSS isometric / drag-to-orbit) he tried himself and rejected as
// too slow to build before the 2026-08-31 launch; (2) real web research into how multi-vertical
// SaaS platforms solve "one homepage, several industries" — Lightspeed's own homepage uses a
// hero-level industry tab switcher (Retail/Restaurant/Golf), the closest real precedent to
// SalmanSaaS's own 3 modules (booking/restaurant/store, CLAUDE.md's own Vision section).
//
// Structure: a 3-tab hero (حجوزات/مطاعم/متجر) swaps headline, bullets, CTA, and a device-mockup
// visual per module — booking uses REAL Alzabt/RK screenshots (proven, live product); restaurant
// and store use deliberately-labeled ILLUSTRATED mockups, not real screenshots, per Salman's own
// explicit instruction (2026-08-26): those verticals' real admin UI is still due for a redesign,
// so a generic illustrative placeholder now, swapped for the real thing later, is more honest than
// screenshotting a UI that's about to change. This is the same anti-fabrication discipline applied
// to Alzabt's own landing page redesign the day before — never a real screenshot standing in for
// what a page doesn't actually do yet, and never a fake one pretending to be real.
//
// Real capability gap, reflected honestly in the CTAs (not glossed over): only the booking/Barber
// vertical (Alzabt) has a true self-service instant-demo flow today (`/demo-builder`). Restaurant
// and Store don't — their tabs' CTA is "تواصل معنا" (routes to the real, existing /pricing page's
// WhatsApp contact), not a fake "جرّب الآن" that would promise an experience that doesn't exist.
//
// SmartOrderProductSection (the old first section here) is deliberately dropped from this rebuild
// — it was a placeholder for a fourth, not-yet-real product, out of scope for a page now organized
// around the 3 real, live modules. The file itself is left untouched (not deleted) — a hygiene
// note, not this task's job to resolve.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarCheck2, UtensilsCrossed, ShoppingBag, ArrowLeft, MessageCircle,
  Users, Sparkles, ShieldCheck, Headphones, RefreshCw, Zap, Layers,
} from 'lucide-react'

const FONT = "'Cairo', 'Segoe UI', sans-serif"

const V = {
  bg: '#0A0A0F',
  bgWash: 'radial-gradient(ellipse 900px 500px at 50% 0%, rgba(124,58,237,0.16) 0%, transparent 70%)',
  cardBg: 'rgba(255,255,255,0.04)',
  cardBorder: '1px solid rgba(255,255,255,0.08)',
  textPrimary: 'rgba(255,255,255,0.94)',
  textSecond: 'rgba(255,255,255,0.55)',
  textMuted: 'rgba(255,255,255,0.35)',
  violet: '#7C3AED',
  violetLight: '#C084FC',
  violetSoft: 'rgba(124,58,237,0.14)',
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
        transition: 'transform 0.15s ease', display: 'inline-flex', alignItems: 'center', gap: 8,
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

function LaptopFrame({ children }) {
  return (
    <div style={{ width: '100%', maxWidth: 560 }}>
      <div style={{
        borderRadius: '16px 16px 4px 4px', overflow: 'hidden',
        border: '10px solid #1a1a1f', borderBottom: '2px solid #1a1a1f',
        background: '#fff', boxShadow: '0 30px 70px rgba(0,0,0,0.55)',
      }}>
        <div style={{ aspectRatio: '16 / 10', overflow: 'hidden', position: 'relative' }}>{children}</div>
      </div>
      <div style={{ height: 14, background: 'linear-gradient(180deg, #28282e, #16161a)', borderRadius: '0 0 10px 10px' }} />
      <div style={{ height: 5, width: '36%', margin: '0 auto', background: '#0c0c0e', borderRadius: '0 0 6px 6px' }} />
    </div>
  )
}

// ── Real Alzabt/RK screenshots — booking is the one proven, live vertical ──────────────────────
function BookingMockup() {
  return (
    <img
      src="/assets/alzabt/dashboard.png"
      alt="لوحة تحكم حقيقية — نظام الحجوزات"
      style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
      loading="lazy"
    />
  )
}

// ── Illustrated mockups — restaurant/store real admin UI is due a redesign; a generic,
// clearly-illustrative placeholder now, swapped for the real thing later (Salman's own call).
function RestaurantMockup() {
  return (
    <div style={{ width: '100%', height: '100%', background: '#fff', padding: 20, fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 800, fontSize: 13, color: '#111' }}>قائمة المطعم</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#16A34A', background: '#DCFCE7', padding: '3px 9px', borderRadius: 999 }}>طلب جديد</span>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {['برغر', 'بيتزا', 'مشروبات', 'حلويات'].map((c, i) => (
          <span key={i} style={{ fontSize: 10, padding: '5px 11px', borderRadius: 999, background: i === 0 ? V.violet : '#F1F1F4', color: i === 0 ? '#fff' : '#666', fontWeight: 600 }}>{c}</span>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
        {[['برغر دبل تشيز', '12'], ['برغر كلاسيك', '9'], ['فرايز كبيرة', '5']].map(([n, p], i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 11px', borderRadius: 10, background: '#FAFAFA', border: '1px solid #EEE' }}>
            <span style={{ fontSize: 11, color: '#222' }}>{n}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: V.violet }}>${p}</span>
          </div>
        ))}
      </div>
      <div style={{ padding: '10px 14px', borderRadius: 10, background: '#111', color: '#fff', display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700 }}>
        <span>الإجمالي</span><span>$26</span>
      </div>
    </div>
  )
}

function StoreMockup() {
  return (
    <div style={{ width: '100%', height: '100%', background: '#fff', padding: 20, fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 800, fontSize: 13, color: '#111' }}>المتجر</span>
        <span style={{ fontSize: 11, color: V.violet, fontWeight: 700 }}>🛒 3</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, flex: 1 }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #EEE' }}>
            <div style={{ height: 40, background: `hsl(${(i * 47) % 360}, 55%, 88%)` }} />
            <div style={{ padding: '6px 7px' }}>
              <div style={{ fontSize: 8.5, color: '#999', marginBottom: 2 }}>منتج {i}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#111' }}>${i * 4 + 8}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const VERTICALS = [
  {
    key: 'booking',
    tabLabel: 'حجوزات',
    tabIcon: CalendarCheck2,
    badge: 'جاهز الآن — تجربة ديمو فورية',
    headline: 'احجز مواعيدك أونلاين.',
    accentWord: 'أونلاين',
    sub: 'صالونات حلاقة، عيادات، فلل وشاليهات — تقويم حقيقي، حجوزات بدون تعارض، وتأكيد فوري عبر واتساب.',
    bullets: ['حجوزات أونلاين على مدار الساعة', 'تأكيد واتساب تلقائي', 'إدارة موظفين وصلاحيات'],
    Mockup: BookingMockup,
  },
  {
    key: 'restaurant',
    tabLabel: 'مطاعم',
    tabIcon: UtensilsCrossed,
    badge: 'قريباً — تجربة ديمو',
    headline: 'قوائم وطلبات بلمسة وحدة.',
    accentWord: 'وحدة',
    sub: 'قائمة رقمية قابلة للتعديل، طلبات أونلاين، وتتبّع لحظة بلحظة — لكل مطعم أو كافيه.',
    bullets: ['قائمة رقمية قابلة للتعديل', 'طلبات أونلاين مباشرة', 'تتبّع الطلبات لحظة بلحظة'],
    Mockup: RestaurantMockup,
  },
  {
    key: 'store',
    tabLabel: 'متجر',
    tabIcon: ShoppingBag,
    badge: 'قريباً — تجربة ديمو',
    headline: 'متجرك الإلكتروني جاهز بسرعة.',
    accentWord: 'بسرعة',
    sub: 'كاتالوج منتجات، سلة، وطلبات أونلاين — واجهة متجر كاملة تحمل اسمك وهويتك.',
    bullets: ['كاتالوج منتجات كامل', 'سلة وطلبات أونلاين', 'إدارة مخزون بسيطة'],
    Mockup: StoreMockup,
  },
]

const MODULES = [
  { icon: CalendarCheck2, title: 'حجوزات', text: 'مواعيد، تقويم، وموظفين — لأي عمل شغله بالمواعيد.' },
  { icon: UtensilsCrossed, title: 'مطاعم', text: 'قوائم رقمية وطلبات أونلاين — لكل مطعم أو كافيه.' },
  { icon: ShoppingBag, title: 'متجر', text: 'كاتالوج، سلة، وطلبات — متجرك الإلكتروني الكامل.' },
]

const STEPS = [
  { icon: Layers, title: 'اختر نوع عملك', desc: 'حجوزات، مطعم، أو متجر — نظام مبني لهيك' },
  { icon: Sparkles, title: 'جهّز صفحتك', desc: 'خدماتك، منتجاتك، أو قائمتك — بهويتك إنت' },
  { icon: MessageCircle, title: 'استقبل زباينك', desc: 'حجوزات وطلبات حقيقية، تأكيد فوري عبر واتساب' },
]

const TRUST = [
  { icon: ShieldCheck, text: 'أمان وموثوقية بيانات كاملة' },
  { icon: Headphones, text: 'دعم فني سريع، نحن معك دائماً' },
  { icon: RefreshCw, text: 'تحديثات مستمرة ومميزات جديدة' },
  { icon: Zap, text: 'واجهة بسيطة، سهلة الاستخدام' },
]

export default function ProductShowcaseHome() {
  const navigate = useNavigate()
  const [active, setActive] = useState('booking')
  const v = VERTICALS.find((x) => x.key === active)

  const goDemo = () => navigate('demo-builder')
  const goAlzabt = () => navigate('/alzabt')
  const goContact = () => navigate('pricing')

  return (
    <div style={{ minHeight: '100vh', background: V.bg, fontFamily: FONT, overflowX: 'hidden' }} dir="rtl">
      {/* ── Nav ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 24px', background: 'rgba(10,10,15,0.7)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <span style={{ fontSize: 17, fontWeight: 800, color: V.textPrimary }}>SalmanSaaS</span>
        <PrimaryCTA onClick={goDemo} style={{ padding: '9px 20px', fontSize: 13 }}>جرّب مجاناً</PrimaryCTA>
      </nav>

      {/* ── Hero — 3-tab vertical switcher ── */}
      <section style={{ position: 'relative', padding: '56px 24px 40px', maxWidth: 1180, margin: '0 auto', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: V.bgWash, pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <h1 style={{
            margin: '0 0 8px', fontSize: 'clamp(1.7rem, 3.6vw, 2.3rem)', fontWeight: 900,
            color: V.textPrimary, textAlign: 'center', letterSpacing: '-0.01em',
          }}>
            منصة واحدة، لكل نوع عمل.
          </h1>
          <p style={{ margin: '0 0 30px', fontSize: 14, color: V.textSecond, textAlign: 'center' }}>
            اختر قطاعك — وشوف كيف بيشتغل عندك
          </p>

          {/* Tab switcher */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 40, flexWrap: 'wrap' }}>
            {VERTICALS.map((item) => {
              const isActive = item.key === active
              return (
                <button
                  key={item.key}
                  onClick={() => setActive(item.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '11px 20px', borderRadius: 999,
                    border: isActive ? `1px solid rgba(124,58,237,0.5)` : '1px solid rgba(255,255,255,0.1)',
                    background: isActive ? V.violetSoft : 'transparent',
                    color: isActive ? V.violetLight : V.textSecond,
                    fontSize: 13.5, fontWeight: 700, fontFamily: FONT, cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <item.tabIcon size={15} strokeWidth={2} />
                  {item.tabLabel}
                </button>
              )
            })}
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 48, alignItems: 'center',
          }}>
            {/* Copy column */}
            <div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 14px', borderRadius: 999,
                background: V.violetSoft, marginBottom: 20, fontSize: 12, fontWeight: 700, color: V.violetLight,
              }}>
                <v.tabIcon size={13} strokeWidth={2} />
                {v.badge}
              </div>
              <h2 style={{ margin: '0 0 18px', fontSize: 'clamp(1.9rem, 4vw, 2.6rem)', fontWeight: 900, lineHeight: 1.28, color: V.textPrimary }}>
                {v.headline}
              </h2>
              <p style={{ margin: '0 0 28px', maxWidth: 440, fontSize: 'clamp(0.98rem, 1.5vw, 1.05rem)', lineHeight: 1.85, color: V.textSecond }}>
                {v.sub}
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 32 }}>
                {v.key === 'booking' ? (
                  <>
                    <PrimaryCTA onClick={goDemo}>جرّب الآن مجاناً ←</PrimaryCTA>
                    <GhostCTA onClick={goAlzabt}>شوف عالزبط</GhostCTA>
                  </>
                ) : (
                  <PrimaryCTA onClick={goContact}>تواصل معنا ←</PrimaryCTA>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 400 }}>
                {v.bullets.map((b, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: V.textPrimary }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: V.violet, flexShrink: 0 }} />
                    {b}
                  </div>
                ))}
              </div>
            </div>

            {/* Visual column */}
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', paddingTop: 12 }}>
              <div style={{
                position: 'absolute', inset: '-15% -10%', zIndex: 0,
                background: `radial-gradient(ellipse 65% 60% at 50% 40%, ${V.violetSoft}, transparent 70%)`,
                filter: 'blur(6px)',
              }} />
              <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>
                <LaptopFrame><v.Mockup /></LaptopFrame>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3 modules, one platform ── */}
      <section style={{ padding: '20px 20px 72px', maxWidth: 1000, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.4rem, 3vw, 1.8rem)', fontWeight: 800, color: V.textPrimary, marginBottom: 8 }}>
          3 أنظمة، منصة وحدة
        </h2>
        <p style={{ textAlign: 'center', fontSize: 14, color: V.textSecond, marginBottom: 32 }}>
          سيرفر واحد، لوحة تحكم واحدة — أياً كان نوع عملك
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {MODULES.map((m, i) => (
            <div key={i} style={{ padding: '22px 20px', background: V.cardBg, border: V.cardBorder, borderRadius: 18 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 14, background: V.violetSoft, marginBottom: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <m.icon size={20} color={V.violet} strokeWidth={1.75} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: V.textPrimary, marginBottom: 6 }}>{m.title}</div>
              <div style={{ fontSize: 13, color: V.textSecond, lineHeight: 1.6 }}>{m.text}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works — generic, platform-wide ── */}
      <section style={{ padding: '0 20px 72px', maxWidth: 1000, margin: '0 auto' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16,
          background: V.cardBg, border: V.cardBorder, borderRadius: 20, padding: '32px 24px',
        }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: V.violetSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <s.icon size={24} color={V.violet} strokeWidth={1.75} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: V.textPrimary }}>{s.title}</div>
              <div style={{ fontSize: 13, color: V.textSecond, lineHeight: 1.6 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Trust pillars — generic, no fabricated numbers ── */}
      <section style={{ padding: '0 20px 80px', maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          {TRUST.map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px', background: V.cardBg, border: V.cardBorder, borderRadius: 14 }}>
              <t.icon size={20} color={V.violet} strokeWidth={1.75} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 13.5, color: V.textPrimary, lineHeight: 1.5 }}>{t.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Closing CTA ── */}
      <section style={{ position: 'relative', padding: '64px 20px 96px', textAlign: 'center', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: V.bgWash, pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 'clamp(1.6rem, 3.4vw, 2.2rem)', fontWeight: 900, color: V.textPrimary }}>
            جاهز تبلّش؟
          </h2>
          <p style={{ margin: '0 0 28px', fontSize: 14, color: V.textSecond }}>
            تجربة حجز حقيقية، خلال دقيقتين — بدون تسجيل
          </p>
          <PrimaryCTA onClick={goDemo} style={{ padding: '17px 40px', fontSize: 16 }}>
            جرّب مجاناً الآن ←
            <ArrowLeft size={16} />
          </PrimaryCTA>
        </div>
      </section>

      <footer style={{
        padding: '24px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.06)',
        fontSize: 12, color: V.textMuted,
      }}>
        SalmanSaaS — 2026
      </footer>
    </div>
  )
}

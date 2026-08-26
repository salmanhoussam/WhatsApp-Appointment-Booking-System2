// ProductShowcaseHome.jsx — salmansaas.com root ("/"), now the canonical Alzabt homepage.
//
// REBUILT 2026-08-26, per the Alzabt Homepage Implementation Contract
// (.claude/plans/we-moved-on-new-hazy-barto.md, approved by Salman with 3 amendments). Supersedes
// this file's own previous 3-tab (booking/restaurant/store) rebuild from earlier the same day --
// that framing was Salman's explicit correction: Alzabt is THE product, Booking/Menu/Orders are
// CAPABILITIES inside it, never 3 separate products. Decision final, not reopened.
//
// THE single rule this file must never violate: no real tenant screenshot (RK, Caracas, Footlab)
// is used as a marketing hero/showcase asset -- every visual here is a real, hand-built product-UI
// mockup (CSS/SVG, styled like the actual app's real light-mode admin/booking UI, framed in dark
// device bezels), never a decorative illustration and never a live screenshot. Each mockup is
// deliberately built as an isolated, swappable component so it can be replaced later with real
// product evidence (a real screenshot) without redesigning the page -- this is the Contract's own
// Definition of Done, not a nice-to-have.
//
// /alzabt (the old separate marketing page, AlzabtLandingPage.jsx) now redirects here (App.jsx) --
// that file is intentionally left on disk, untouched, not deleted (Contract Section 1, step 4).
//
// No gradients/animations/testimonials/customer photos/tabs beyond what this Contract specifies --
// Salman's own explicit instruction: the Contract is the reference during execution, not taste.

import { useNavigate } from 'react-router-dom'
import {
  CalendarCheck2, Scissors, CalendarDays, MessageCircle, Users, Sparkles,
  ShieldCheck, Headphones, RefreshCw, Zap, Check, TrendingUp, ArrowLeft,
  UtensilsCrossed, ShoppingBag, Briefcase, Bell,
} from 'lucide-react'

const FONT = "'Cairo', 'Segoe UI', sans-serif"

const V = {
  bg: '#0A0A0F',
  bgWash: 'radial-gradient(ellipse 900px 500px at 50% 0%, rgba(124,58,237,0.16) 0%, transparent 70%)',
  cardBg: 'rgba(255,255,255,0.04)',
  cardBorder: '1px solid rgba(255,255,255,0.08)',
  glassBg: 'rgba(255,255,255,0.02)',
  textPrimary: 'rgba(255,255,255,0.94)',
  textSecond: 'rgba(255,255,255,0.55)',
  textMuted: 'rgba(255,255,255,0.35)',
  violet: '#7C3AED',
  violetDeep: '#6D28D9',
  violetLight: '#C084FC',
  violetSoft: 'rgba(124,58,237,0.14)',
  whatsapp: '#25D366',
}

// ── Brand mark — reused from AlzabtLandingPage.jsx, this page's own canonical logo now ─────────
function LogoMark({ size = 34 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.32, flexShrink: 0,
      background: `linear-gradient(135deg, ${V.violet}, ${V.violetLight})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: `0 4px 16px ${V.violetSoft}`,
    }}>
      <CalendarCheck2 size={size * 0.56} color="#fff" strokeWidth={2.3} />
    </div>
  )
}

function PrimaryCTA({ onClick, children, style }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '15px 32px', borderRadius: 999, border: 'none',
        background: `linear-gradient(135deg, ${V.violet}, ${V.violetDeep})`,
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

// ── Device bezels (Category B) — dark chrome, light "screen" (real app UI is light-mode) ───────

function LaptopFrame({ children, className }) {
  return (
    <div className={className} style={{ width: '100%', maxWidth: 560 }}>
      <div style={{
        borderRadius: '16px 16px 4px 4px', overflow: 'hidden',
        border: '10px solid #1a1a1f', borderBottom: '2px solid #1a1a1f',
        background: '#fff', boxShadow: '0 30px 70px rgba(0,0,0,0.55)',
      }}>
        <div style={{ aspectRatio: '16 / 10.4', overflow: 'hidden', position: 'relative' }}>{children}</div>
      </div>
      <div style={{ height: 14, background: 'linear-gradient(180deg, #28282e, #16161a)', borderRadius: '0 0 10px 10px' }} />
      <div style={{ height: 5, width: '36%', margin: '0 auto', background: '#0c0c0e', borderRadius: '0 0 6px 6px' }} />
    </div>
  )
}

function PhoneFrame({ children, className, width = 210 }) {
  return (
    <div className={className} style={{
      width, borderRadius: 36, border: '8px solid #1a1a1f', background: '#fff',
      boxShadow: '0 24px 60px rgba(0,0,0,0.55)', overflow: 'hidden', position: 'relative',
    }}>
      <div style={{
        position: 'absolute', top: 0, insetInlineStart: '50%', transform: 'translateX(-50%)',
        width: 64, height: 16, background: '#1a1a1f', borderRadius: '0 0 12px 12px', zIndex: 2,
      }} />
      <div style={{ aspectRatio: '9 / 19', overflow: 'hidden', position: 'relative' }}>{children}</div>
    </div>
  )
}

// Lighter chrome, no bezel/notch — deliberately "example card" weight, for Vertical Showcase only.
function ScreenTile({ children }) {
  return (
    <div style={{
      borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)',
      background: '#fff', height: 148,
    }}>
      {children}
    </div>
  )
}

// ── Category A — Product UI mockups (real app-UI chrome, not decoration) ───────────────────────

const CHIP = { fontSize: 10.5, fontWeight: 600, padding: '5px 11px', borderRadius: 999 }

function CustomerBookingFlowMockup({ state = 'booking' }) {
  const P = FONT
  if (state === 'confirmed') {
    return (
      <div style={{ width: '100%', height: '100%', background: '#fff', fontFamily: P, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #F0F0F3' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#111' }}>ملخص الحجز</div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16 }}>
          <div style={{
            width: 46, height: 46, borderRadius: '50%', background: '#DCFCE7',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Check size={22} color="#16A34A" strokeWidth={3} />
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#111' }}>تم الدفع ✓</div>
          <div style={{ width: '100%', maxWidth: 180, padding: '9px 12px', borderRadius: 10, background: '#FAFAFA', border: '1px solid #EEE', display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: '#444' }}>
            <span>قص شعر · اليوم 5:00</span>
            <span style={{ fontWeight: 700, color: V.violet }}>$8</span>
          </div>
        </div>
      </div>
    )
  }
  return (
    <div style={{ width: '100%', height: '100%', background: '#fff', fontFamily: P, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: '#111' }}>احجز موعدك</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {['قص شعر', 'حلاقة', 'كرياتين'].map((s, i) => (
          <span key={i} style={{ ...CHIP, background: i === 0 ? V.violet : '#F1F1F4', color: i === 0 ? '#fff' : '#666' }}>{s}</span>
        ))}
      </div>
      <div style={{ background: '#FAFAFA', border: '1px solid #EEE', borderRadius: 10, padding: 10 }}>
        <div style={{ fontSize: 9, color: '#999', marginBottom: 6 }}>اختر اليوم</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} style={{
              aspectRatio: '1', borderRadius: 4, fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: i === 9 ? V.violet : '#F1F1F4', color: i === 9 ? '#fff' : '#999', fontWeight: i === 9 ? 700 : 400,
            }}>{i + 1}</div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {['10:00', '2:00', '5:00'].map((t, i) => (
          <span key={i} style={{ ...CHIP, background: i === 2 ? V.violetSoft : '#F1F1F4', color: i === 2 ? V.violet : '#666', border: i === 2 ? `1px solid ${V.violet}` : 'none' }}>{t}</span>
        ))}
      </div>
      <div style={{ marginTop: 'auto', padding: '9px 0', borderRadius: 999, background: V.violet, color: '#fff', fontSize: 11, fontWeight: 700, textAlign: 'center' }}>
        تأكيد الحجز
      </div>
    </div>
  )
}

function DashboardControlCenterMockup({ toast }) {
  return (
    <div style={{ width: '100%', height: '100%', background: '#fff', fontFamily: FONT, display: 'flex', position: 'relative' }}>
      {toast && (
        <div style={{
          position: 'absolute', top: 8, insetInlineEnd: 8, insetInlineStart: 8, zIndex: 5,
          display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 10,
          background: '#111', color: '#fff', fontSize: 10, fontWeight: 700,
          boxShadow: '0 8px 20px rgba(0,0,0,0.25)',
        }}>
          <Bell size={12} color={V.violetLight} strokeWidth={2} />
          {toast}
        </div>
      )}
      <div style={{ width: 46, background: '#FAFAFA', borderInlineEnd: '1px solid #F0F0F3', padding: '12px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <LogoMark size={20} />
        {[CalendarDays, MessageCircle, Users, TrendingUp].map((Icon, i) => (
          <div key={i} style={{ width: 26, height: 26, borderRadius: 8, background: i === 0 ? V.violetSoft : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={13} color={i === 0 ? V.violet : '#999'} strokeWidth={2} />
          </div>
        ))}
      </div>
      <div style={{ flex: 1, padding: '14px 14px 10px', display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: '#111' }}>نظرة عامة</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {[['حجوزات اليوم', '6'], ['إيرادات اليوم', '$48'], ['طلبات جديدة', '2']].map(([label, val], i) => (
            <div key={i} style={{ background: '#FAFAFA', border: '1px solid #EEE', borderRadius: 8, padding: '7px 8px' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#111' }}>{val}</div>
              <div style={{ fontSize: 7, color: '#999', marginTop: 1 }}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{ flex: 1, background: '#FAFAFA', border: '1px solid #EEE', borderRadius: 8, padding: 8, display: 'flex', alignItems: 'flex-end', gap: 4 }}>
          {[30, 55, 40, 70, 50, 85, 60].map((h, i) => (
            <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: 2, background: i === 5 ? V.violet : '#E4DBFB' }} />
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: -6 }}>
          {['ح', 'ج'].map((n, i) => (
            <div key={i} style={{
              width: 18, height: 18, borderRadius: '50%', background: `linear-gradient(135deg, ${V.violet}, ${V.violetLight})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 8, fontWeight: 700,
              border: '1.5px solid #fff', marginInlineStart: i === 0 ? 0 : -6,
            }}>{n}</div>
          ))}
          <span style={{ fontSize: 7.5, color: '#999', marginInlineStart: 6 }}>موظفان نشطان</span>
        </div>
      </div>
    </div>
  )
}

function MenuCatalogMockup() {
  const CATEGORIES = [
    { name: 'المقبلات', items: [['حمص', '4'], ['فتوش', '3.5']] },
    { name: 'الأطباق الرئيسية', items: [['شاورما دجاج', '8'], ['كباب مشوي', '10']] },
  ]
  return (
    <div style={{ width: '100%', height: '100%', background: '#fff', fontFamily: FONT, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: '#111' }}>القائمة</div>
      <div style={{ display: 'flex', gap: 6 }}>
        {['المقبلات', 'الرئيسية', 'المشروبات', 'الحلويات'].map((c, i) => (
          <span key={i} style={{ ...CHIP, background: i === 0 ? V.violet : '#F1F1F4', color: i === 0 ? '#fff' : '#666' }}>{c}</span>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, overflow: 'hidden' }}>
        {CATEGORIES.flatMap((cat) => cat.items).map(([n, p], i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 11px', borderRadius: 10, background: '#FAFAFA', border: '1px solid #EEE' }}>
            <span style={{ fontSize: 11, color: '#222' }}>{n}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: V.violet }}>${p}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function RetailCatalogMockup() {
  const ITEMS = [['قميص قطن', '20'], ['حذاء رياضي', '35'], ['ساعة يد', '48'], ['حقيبة ظهر', '28']]
  return (
    <div style={{ width: '100%', height: '100%', background: '#fff', fontFamily: FONT, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#111' }}>الكاتالوج</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, flex: 1 }}>
        {ITEMS.map(([n, p], i) => (
          <div key={i} style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #EEE' }}>
            <div style={{ height: 26, background: `hsl(${(i * 63) % 360}, 55%, 88%)` }} />
            <div style={{ padding: '4px 6px' }}>
              <div style={{ fontSize: 7, color: '#999' }}>{n}</div>
              <div style={{ fontSize: 8.5, fontWeight: 700, color: '#111' }}>${p}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProServiceMockup() {
  return (
    <div style={{ width: '100%', height: '100%', background: '#fff', fontFamily: FONT, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#111' }}>احجز موعد خدمة</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {['استشارة', 'صيانة', 'جلسة تدريب'].map((s, i) => (
          <span key={i} style={{ ...CHIP, background: i === 0 ? V.violet : '#F1F1F4', color: i === 0 ? '#fff' : '#666' }}>{s}</span>
        ))}
      </div>
      <div style={{ flex: 1, background: '#FAFAFA', border: '1px solid #EEE', borderRadius: 8, padding: 8, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
        <div style={{ fontSize: 8, color: '#999' }}>الموعد التالي المتاح</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#111' }}>الثلاثاء، 11:00 ص</div>
      </div>
    </div>
  )
}

function BarberSceneMockup() {
  return (
    <div style={{ width: '100%', height: '100%', background: '#fff', fontFamily: FONT, padding: 14, display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center' }}>
      <div style={{ alignSelf: 'flex-start', maxWidth: '85%', background: '#F1F1F4', color: '#222', fontSize: 10, padding: '7px 11px', borderRadius: '11px 11px 11px 2px' }}>
        بدي احجز قص شعر بكرا
      </div>
      <div style={{ alignSelf: 'flex-end', maxWidth: '85%', background: '#1F7A4D', color: '#fff', fontSize: 10, padding: '7px 11px', borderRadius: '11px 11px 2px 11px' }}>
        تم تأكيد حجزك ✓✓
      </div>
    </div>
  )
}

// ── Category C — ambient: thin connector between customer phone and business dashboard ─────────
function EcosystemConnector() {
  return (
    <div style={{
      position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
      width: 64, height: 2, background: `linear-gradient(90deg, ${V.violetLight}, ${V.violet})`,
      zIndex: 3, borderRadius: 2, opacity: 0.85,
    }}>
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 8, height: 8, borderRadius: '50%', background: V.violetLight,
        boxShadow: `0 0 12px ${V.violet}`,
      }} />
    </div>
  )
}

// ── Data ─────────────────────────────────────────────────────────────────────────────────────

const HERO_BADGES = [
  { icon: CalendarCheck2, title: 'حجوزات', sub: 'بدون تعارض' },
  { icon: UtensilsCrossed, title: 'قائمة', sub: 'وكاتالوج' },
  { icon: MessageCircle, title: 'طلبات واتساب', sub: 'تلقائية' },
  { icon: TrendingUp, title: 'تقارير', sub: 'بلمحة وحدة' },
]

const CAPABILITIES = [
  { icon: CalendarCheck2, title: 'حجوزات بدون تعارض', text: 'زبونك بيحجز موعد بلمسة، والتقويم بيدير الباقي — بدون تعارض مواعيد، وبدون رسايل يدوية.' },
  { icon: UtensilsCrossed, title: 'قائمة أو كاتالوج، بهويتك', text: 'اعرض خدماتك أو منتجاتك بقائمة رقمية واضحة — أسعار، فئات، وصور — كل شي مرتب وسهل التصفح.' },
  { icon: MessageCircle, title: 'طلبات توصل عالفور', text: 'أي طلب أو حجز عند الزبون بيوصلك عالداشبورد فوراً — بتشوفه، بتأكده، وبتكمل شغلك.' },
]

const DASHBOARD_BULLETS = [
  { icon: CalendarDays, text: 'حجوزات اليوم بلمحة' },
  { icon: TrendingUp, text: 'أداء المبيعات أسبوعياً' },
  { icon: Bell, text: 'تنبيهات فورية لأي طلب جديد' },
]

const VERTICALS = [
  { icon: Scissors, title: 'صالون / حلاقة', sub: 'حجز موعد قص أو حلاقة بلمسة', Screen: BarberSceneMockup },
  { icon: UtensilsCrossed, title: 'مطعم', sub: 'قائمة رقمية وطلبات لحظية', Screen: MenuCatalogMockup },
  { icon: ShoppingBag, title: 'متجر', sub: 'كاتالوج منتجات وطلبات أونلاين', Screen: RetailCatalogMockup },
  { icon: Briefcase, title: 'خدمة مهنية', sub: 'حجز استشارة أو موعد خدمة', Screen: ProServiceMockup },
]

const STEPS = [
  { icon: Sparkles, title: 'اختر قدراتك', desc: 'حجوزات، قائمة، أو طلبات — اختار يلي بيلزم شغلك' },
  { icon: CalendarDays, title: 'جهّز صفحتك', desc: 'خدماتك أو منتجاتك، بهويتك انت' },
  { icon: MessageCircle, title: 'استقبل زباينك', desc: 'حجوزات وطلبات حقيقية، بتوصلك فوراً' },
]

const TRUST = [
  { icon: ShieldCheck, text: 'أمان وموثوقية بيانات كاملة' },
  { icon: Headphones, text: 'دعم فني سريع، نحن معك دائماً' },
  { icon: RefreshCw, text: 'تحديثات مستمرة ومميزات جديدة' },
  { icon: Zap, text: 'واجهة بسيطة، سهلة الاستخدام' },
]

export default function ProductShowcaseHome() {
  const navigate = useNavigate()
  const goDemo = () => navigate('demo-builder')
  const scrollToCapabilities = () => document.getElementById('capabilities')?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div style={{ minHeight: '100vh', background: V.bg, fontFamily: FONT, overflowX: 'hidden' }} dir="rtl">
      <style>{`
        @media (max-width: 720px) {
          .hero-phone-mockup { width: 150px !important; }
          .hero-phone-float { bottom: -8% !important; inset-inline-start: -4% !important; }
          .eco-phone-mockup { width: 130px !important; }
        }
      `}</style>

      {/* ── Nav ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 24px', background: 'rgba(10,10,15,0.7)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LogoMark />
          <span style={{ fontSize: 17, fontWeight: 800, color: V.textPrimary }}>
            عال<span style={{ color: V.violet }}>زبط</span>
          </span>
        </div>
        <PrimaryCTA onClick={goDemo} style={{ padding: '9px 20px', fontSize: 13 }}>جرّب عالزبط</PrimaryCTA>
      </nav>

      {/* ── Hero — one composition: phone (customer side) + laptop (business side) ── */}
      <section style={{ position: 'relative', padding: '56px 24px 40px', maxWidth: 1180, margin: '0 auto', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: V.bgWash, pointerEvents: 'none' }} />
        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 48, alignItems: 'center' }}>
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 14px', borderRadius: 999,
              background: V.violetSoft, marginBottom: 22, fontSize: 12, fontWeight: 700, color: V.violetLight,
            }}>
              <Sparkles size={13} strokeWidth={2} />
              منصة واحدة تدير فيها شغلك بالكامل
            </div>
            <h1 style={{ margin: '0 0 20px', fontSize: 'clamp(2.1rem, 4.6vw, 3.1rem)', fontWeight: 900, lineHeight: 1.22, color: V.textPrimary, letterSpacing: '-0.02em' }}>
              كل شغلك.<br />
              <span style={{
                background: `linear-gradient(135deg, ${V.violet}, ${V.violetLight})`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>مضبوط.</span>
            </h1>
            <p style={{ margin: '0 0 32px', maxWidth: 440, fontSize: 'clamp(1rem, 1.6vw, 1.1rem)', lineHeight: 1.85, color: V.textSecond }}>
              حجوزات، قائمة، وطلبات — كلها قدرات جوا عالزبط، مش برامج متفرقة. اختار يلي بيلزمك، وشغّله بلمسة وحدة.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 36 }}>
              <PrimaryCTA onClick={goDemo}>جرّب عالزبط الآن ←</PrimaryCTA>
              <GhostCTA onClick={scrollToCapabilities}>شوف قدرات عالزبط</GhostCTA>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, maxWidth: 440 }}>
              {HERO_BADGES.map((b, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 14, background: V.cardBg, border: V.cardBorder }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: V.violetSoft, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <b.icon size={16} color={V.violet} strokeWidth={2} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: V.textPrimary }}>{b.title}</div>
                    <div style={{ fontSize: 10.5, color: V.textMuted }}>{b.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', paddingTop: 12 }}>
            <div style={{
              position: 'absolute', inset: '-15% -10%', zIndex: 0,
              background: `radial-gradient(ellipse 65% 60% at 50% 40%, ${V.violetSoft}, transparent 70%)`,
              filter: 'blur(6px)',
            }} />
            <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>
              <LaptopFrame><DashboardControlCenterMockup /></LaptopFrame>
              <div className="hero-phone-float" style={{ position: 'absolute', bottom: '-14%', insetInlineStart: '-6%', transform: 'rotate(-4deg)', zIndex: 2 }}>
                <PhoneFrame className="hero-phone-mockup"><CustomerBookingFlowMockup state="booking" /></PhoneFrame>
              </div>
            </div>
          </div>
        </div>
        <p style={{ position: 'relative', textAlign: 'center', marginTop: 28, fontSize: 11.5, color: V.textMuted }}>
          بيئة تجريبية توضيحية
        </p>
      </section>

      {/* ── Capabilities — 3 strengths, non-sequential, no numbering ── */}
      <section id="capabilities" style={{ padding: '20px 20px 72px', maxWidth: 1080, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.4rem, 3vw, 1.8rem)', fontWeight: 800, color: V.textPrimary, marginBottom: 8 }}>
          منصة وحدة. ثلاث قدرات.
        </h2>
        <p style={{ textAlign: 'center', fontSize: 14, color: V.textSecond, marginBottom: 36, maxWidth: 560, marginInline: 'auto' }}>
          احجز، اعرض قائمتك، واستقبل طلبات — كل هيك من نفس النظام. استخدم يلي بيلزم شغلك، وحدة أو أكتر.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
          {CAPABILITIES.map((c, i) => (
            <div key={i} style={{ padding: '22px 20px', background: V.cardBg, border: V.cardBorder, borderRadius: 18 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: V.violetSoft, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <c.icon size={20} color={V.violet} strokeWidth={1.75} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: V.textPrimary, marginBottom: 6 }}>{c.title}</div>
              <div style={{ fontSize: 13, color: V.textSecond, lineHeight: 1.6 }}>{c.text}</div>
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', fontSize: 13, color: V.textMuted }}>
          استخدم قدرة وحدة، أو الثلاث سوا — عالزبط بيتشكل على قد شغلك.
        </p>
      </section>

      {/* ── Master Dashboard / Control Center — same component as Hero's laptop, no fake per-vertical uniformity ── */}
      <section style={{ padding: '20px 20px 72px', maxWidth: 1080, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 48, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 14px', borderRadius: 999, background: V.violetSoft, marginBottom: 20, fontSize: 12, fontWeight: 700, color: V.violetLight }}>
              لوحة التحكم
            </div>
            <h2 style={{ margin: '0 0 16px', fontSize: 'clamp(1.6rem, 3.4vw, 2.2rem)', fontWeight: 900, color: V.textPrimary, lineHeight: 1.3 }}>
              كل شغلك، من شاشة وحدة.
            </h2>
            <p style={{ margin: '0 0 24px', maxWidth: 420, fontSize: 14, lineHeight: 1.8, color: V.textSecond }}>
              حجوزاتك، طلباتك، وأرقامك — كلها قدامك بلمحة وحدة. لوحة تحكم واحدة بتتأقلم مع شغلك، مش قالب واحد للكل.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {DASHBOARD_BULLETS.map((b, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: V.textPrimary }}>
                  <b.icon size={15} color={V.violet} strokeWidth={2} />
                  {b.text}
                </div>
              ))}
            </div>
          </div>
          <div>
            <LaptopFrame><DashboardControlCenterMockup /></LaptopFrame>
            <p style={{ textAlign: 'center', marginTop: 16, fontSize: 11.5, color: V.textMuted }}>بيانات تجريبية — لتوضيح الشكل فقط</p>
          </div>
        </div>
      </section>

      {/* ── Order → Dashboard Ecosystem — the "instant reach" relationship ── */}
      <section style={{ padding: '20px 20px 80px', maxWidth: 1080, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 14px', borderRadius: 999, background: V.violetSoft, marginBottom: 20, fontSize: 12, fontWeight: 700, color: V.violetLight }}>
            من الزبون، لعندك
          </div>
          <h2 style={{ margin: '0 0 12px', fontSize: 'clamp(1.6rem, 3.4vw, 2.2rem)', fontWeight: 900, color: V.textPrimary }}>
            لمسة عند الزبون، توصلك فوراً.
          </h2>
          <p style={{ margin: '0 auto', maxWidth: 480, fontSize: 14, lineHeight: 1.8, color: V.textSecond }}>
            أي حجز أو طلب بيصير عند الزبون عبر موبايله، بيطلع مباشرة عالوحة تحكمك — بلا تأخير، بلا متابعة يدوية.
          </p>
        </div>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
          <PhoneFrame className="eco-phone-mockup" width={170}><CustomerBookingFlowMockup state="confirmed" /></PhoneFrame>
          <div style={{ position: 'relative', width: 64, height: 40, flexShrink: 0 }}>
            <EcosystemConnector />
          </div>
          <div style={{ width: '100%', maxWidth: 420 }}>
            <LaptopFrame><DashboardControlCenterMockup toast="طلب جديد" /></LaptopFrame>
          </div>
        </div>
      </section>

      {/* ── Vertical Showcase — 4 illustrative demo scenes, explicitly not real customers ── */}
      <section style={{ padding: '20px 20px 72px', maxWidth: 1080, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.4rem, 3vw, 1.8rem)', fontWeight: 800, color: V.textPrimary, marginBottom: 8 }}>
          عالزبط بيشتغل مع أي نوع عمل.
        </h2>
        <p style={{ textAlign: 'center', fontSize: 14, color: V.textSecond, marginBottom: 32, maxWidth: 560, marginInline: 'auto' }}>
          من صالون حلاقة، لمطعم، لمتجر، لخدمة مهنية — نفس النظام، نفس السهولة. الأمثلة تحت بيئات تجريبية لتوضيح الفكرة فقط.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 16 }}>
          {VERTICALS.map((v, i) => (
            <div key={i} style={{ padding: 16, background: V.cardBg, border: V.cardBorder, borderRadius: 18 }}>
              <ScreenTile><v.Screen /></ScreenTile>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, marginBottom: 4 }}>
                <v.icon size={15} color={V.violet} strokeWidth={2} />
                <span style={{ fontSize: 13.5, fontWeight: 700, color: V.textPrimary }}>{v.title}</span>
              </div>
              <div style={{ fontSize: 12, color: V.textSecond, lineHeight: 1.5 }}>{v.sub}</div>
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', fontSize: 11.5, color: V.textMuted }}>
          بيئات تجريبية توضيحية — مش عملاء حقيقيين
        </p>
      </section>

      {/* ── How It Works — generic, capability-agnostic ── */}
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
            جاهز تضبط شغلك؟
          </h2>
          <p style={{ margin: '0 0 28px', fontSize: 14, color: V.textSecond }}>
            جرب عالزبط خلال دقيقتين — بدون تسجيل.
          </p>
          <PrimaryCTA onClick={goDemo} style={{ padding: '17px 40px', fontSize: 16 }}>
            جرّب عالزبط مجاناً ←
            <ArrowLeft size={16} />
          </PrimaryCTA>
        </div>
      </section>

      <footer style={{ padding: '24px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 12, color: V.textMuted }}>
        عالزبط — 2026
      </footer>
    </div>
  )
}

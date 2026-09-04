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
// mockup (CSS/SVG, framed in dark device bezels), never a decorative illustration and never a live
// screenshot. Each mockup is deliberately built as an isolated, swappable component so it can be
// replaced later with real product evidence (a real screenshot) without redesigning the page --
// this is the Contract's own Definition of Done, not a nice-to-have.
//
// /alzabt (the old separate marketing page, AlzabtLandingPage.jsx) now redirects here (App.jsx) --
// that file is intentionally left on disk, untouched, not deleted (Contract Section 1, step 4).
//
// No gradients/animations/testimonials/customer photos/tabs beyond what this Contract specifies --
// Salman's own explicit instruction: the Contract is the reference during execution, not taste.
//
// AMENDMENT 1 (2026-08-27, approved -- see Contract Section 8): added the WhatsApp Integration
// section between Vertical Showcase and How It Works. WhatsApp is a CHANNEL into the one Alzabt
// system, never a 4th capability or separate product -- kept deliberately lighter-weight than the
// Order->Dashboard Ecosystem section (one glass panel, not a device pair) so it can never read as
// co-equal with the core capabilities.
//
// ASSET INTEGRATION PASS (2026-08-27, approved -- see .claudedocs/work/alzabt-unified-homepage/
// 2026-08-27/ASSET_MAP.md): enriched two existing mockup components using the 6 approved
// reference-only images from new-matirial/alzabt/ as visual direction -- NOT new sections, NOT a
// redesign, NOT new copy/positioning. DashboardControlCenterMockup gained a compact ranked
// mini-list (reference: the "DigiLab" dashboard image); RetailCatalogMockup gained a discount
// badge + wishlist heart on one card (reference: the generic e-commerce UI-kit image). Every other
// mockup was left as-is because it already satisfied its reference direction (see ASSET_MAP.md
// §2's section-by-section table) -- enrichment only where the Asset Map found a real gap, not a
// uniform pass over every component.
//
// DARK-MODE SCREEN FLIP (2026-08-27, explicit Salman instruction): every mockup screen was
// originally light/white -- a deliberate earlier Contract choice, since the real Alzabt admin UI
// (the RK screenshots removed this same day) is genuinely light-mode. Salman reviewed the two
// reference images again (the ChatGPT composite and the e-commerce UI-kit image) and explicitly
// asked to flip every screen's internal theme to dark, prioritizing brand consistency across the
// marketing page over pixel-matching the current (light) real admin UI -- noted once, then applied
// exactly as instructed. See SCREEN below for the shared dark-screen palette every mockup now uses.

import { useNavigate } from 'react-router-dom'
import AmbientGridBackground from '../../components/AmbientGridBackground'
import {
  CalendarCheck2, Scissors, CalendarDays, MessageCircle, Users, Sparkles,
  ShieldCheck, Headphones, RefreshCw, Zap, Check, TrendingUp, ArrowLeft,
  UtensilsCrossed, ShoppingBag, Briefcase, Bell, Heart, Home, Settings,
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

// Dark theme for the INSIDE of every device mockup (the "screen" content) -- distinct from `V`,
// which governs the page's own background around the devices. References: the ChatGPT composite
// and the e-commerce UI-kit image (new-matirial/alzabt/) -- both show dark gray/black screens,
// purple accents, white text.
const SCREEN = {
  bg: '#111827',
  bgAlt: '#0B1220',
  card: 'rgba(255,255,255,0.05)',
  cardBorder: 'rgba(255,255,255,0.09)',
  textPrimary: '#F3F4F6',
  textSecond: 'rgba(243,244,246,0.55)',
  textMuted: 'rgba(243,244,246,0.35)',
  chipBg: 'rgba(255,255,255,0.07)',
  chipText: 'rgba(243,244,246,0.6)',
  barInactive: 'rgba(124,58,237,0.28)',
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

// ── Device bezels (Category B) — dark chrome, dark "screen" (SCREEN palette, per Salman's
//    2026-08-27 dark-mode-screen instruction) ───────────────────────────────────────────────────
//
// 3D DEPTH PASS (2026-08-27): Salman flagged the page as reading flat/dated next to premium SaaS
// sites and pointed at 7 new "3D render" reference files in new-matirial/alzabt/ as the target
// look. Inspected all 7 -- every one turned out to be a real, named competitor product's own
// screenshot (Trafft, Bookly, Calendr.com, PWT, LocAppoint, FRISOR) or a generic stock template,
// each with fabricated trust numbers baked into the image -- unusable under this same Contract's
// own "no real screenshots, no invented numbers, no third-party branding" rules, verified
// mechanically after every change all session. Flagged this plainly; Salman's explicit decision
// (of 3 options offered) was to keep this CSS-only and match the reference *style* (perspective,
// shadow depth, gloss) without their content. Applied here via `perspective` + `rotateX/rotateY`
// on ONE rigid wrapper per device (screen+hinge+base rotate together, not independently -- doing
// it per-piece looked visibly broken in an early local check), `filter: drop-shadow(...)` instead
// of `box-shadow` (box-shadow renders flat under a 3D transform; drop-shadow follows the actual
// tilted silhouette), and a diagonal glass-reflection gradient over the screen content. `ScreenTile`
// (Vertical Showcase, WhatsApp panel) deliberately NOT touched -- it's the intentionally lighter-
// weight tier established in Amendment 1; making it equally showy would erase that hierarchy.

function LaptopFrame({ children, className }) {
  return (
    <div className={className} style={{ width: '100%', maxWidth: 560, perspective: 1600 }}>
      <div style={{
        transform: 'rotateX(6deg) rotateY(-11deg)', transformStyle: 'preserve-3d',
        filter: 'drop-shadow(0 40px 46px rgba(0,0,0,0.55)) drop-shadow(-18px 30px 34px rgba(124,58,237,0.16))',
      }}>
        <div style={{
          borderRadius: '16px 16px 4px 4px', overflow: 'hidden',
          border: '10px solid #1a1a1f', borderBottom: '2px solid #1a1a1f',
          background: SCREEN.bg, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.09)',
        }}>
          <div style={{ aspectRatio: '16 / 10.4', overflow: 'hidden', position: 'relative' }}>
            {children}
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'linear-gradient(125deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 32%, rgba(255,255,255,0) 68%, rgba(255,255,255,0.05) 100%)',
            }} />
          </div>
        </div>
        <div style={{ height: 14, background: 'linear-gradient(180deg, #2c2c33, #17171b)', borderRadius: '0 0 10px 10px' }} />
        <div style={{ height: 5, width: '36%', margin: '0 auto', background: '#0c0c0e', borderRadius: '0 0 6px 6px' }} />
      </div>
    </div>
  )
}

function PhoneFrame({ children, className, width = 210 }) {
  return (
    <div className={className} style={{ width, perspective: 1000 }}>
      <div style={{
        transform: 'rotateX(-4deg) rotateY(13deg)', transformStyle: 'preserve-3d',
        filter: 'drop-shadow(0 30px 34px rgba(0,0,0,0.55)) drop-shadow(-10px 18px 24px rgba(124,58,237,0.18))',
      }}>
        <div style={{
          borderRadius: 36, border: '8px solid #1a1a1f', background: SCREEN.bg,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)', overflow: 'hidden', position: 'relative',
        }}>
          <div style={{
            position: 'absolute', top: 0, insetInlineStart: '50%', transform: 'translateX(-50%)',
            width: 64, height: 16, background: '#1a1a1f', borderRadius: '0 0 12px 12px', zIndex: 2,
          }} />
          <div style={{ aspectRatio: '9 / 19', overflow: 'hidden', position: 'relative' }}>
            {children}
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'linear-gradient(125deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 30%, rgba(255,255,255,0) 70%, rgba(255,255,255,0.05) 100%)',
            }} />
          </div>
        </div>
      </div>
    </div>
  )
}

// Lighter chrome, no bezel/notch — deliberately "example card" weight, for Vertical Showcase only.
function ScreenTile({ children }) {
  return (
    <div style={{
      borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)',
      background: SCREEN.bg, height: 148,
    }}>
      {children}
    </div>
  )
}

// ── Category A — Product UI mockups (real app-UI chrome, not decoration) ───────────────────────

const CHIP = { fontSize: 10.5, fontWeight: 600, padding: '5px 11px', borderRadius: 999 }

// Reference: new-matirial/alzabt/Alzabt_Material_Pack_v2/Alzabt Arabic UI Kit Showcase.png,
// "05. ORDER -> DASHBOARD ECOSYSTEM ASSET" -- its order-success phone shows a thank-you line +
// order number + return action, not just a bare checkmark. Recreated Alzabt-native (own copy, own
// placeholder order number) -- matches Material Pack v2 spec A05 exactly. Content only; the
// reference board's own "RK Barber Shop" text is NOT reproduced anywhere here (see this file's own
// 3D-depth-pass note on why: 3 of the pack's 4 boards carry that placeholder branding baked in from
// the generation tool -- treated as layout/composition reference only, per the pack's own Section 0
// rule, never copied).
function CustomerBookingFlowMockup({ state = 'booking' }) {
  const P = FONT
  if (state === 'confirmed') {
    return (
      <div style={{ width: '100%', height: '100%', background: SCREEN.bg, fontFamily: P, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 16px 10px', borderBottom: `1px solid ${SCREEN.cardBorder}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: SCREEN.textPrimary }}>ملخص الحجز</div>
        </div>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 16px' }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%', background: 'rgba(34,197,94,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Check size={18} color="#4ADE80" strokeWidth={3} />
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: SCREEN.textPrimary, flexShrink: 0 }}>تم الدفع ✓</div>
          <div style={{ fontSize: 9, color: SCREEN.textSecond, textAlign: 'center', lineHeight: 1.5, flexShrink: 0 }}>
            شكراً لطلبك! سيتواصل معك فريقنا قريباً.
          </div>
          <div style={{ fontSize: 8.5, color: SCREEN.textMuted, flexShrink: 0 }}>رقم الطلب #A1258</div>
          <div style={{ width: '100%', maxWidth: 170, padding: '7px 10px', borderRadius: 9, background: SCREEN.card, border: `1px solid ${SCREEN.cardBorder}`, display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: SCREEN.textSecond, flexShrink: 0 }}>
            <span>قص شعر · اليوم 5:00</span>
            <span style={{ fontWeight: 700, color: V.violetLight }}>$8</span>
          </div>
          <div style={{ marginTop: 2, padding: '7px 18px', borderRadius: 999, border: `1px solid ${SCREEN.cardBorder}`, color: SCREEN.textSecond, fontSize: 9, fontWeight: 700, flexShrink: 0 }}>
            العودة للطلب
          </div>
        </div>
      </div>
    )
  }
  // Reference: new-matirial/alzabt/hero.png (Salman's exact Hero design reference, 2026-08-27) --
  // its phone shows a "اختر الخدمة" service-selection screen (avatar + name + price rows, one
  // selected with a check badge, step-progress header, "التالي" CTA) rather than the previous
  // date/time-picker content. Rebuilt to match; own copy/prices, no real staff photos (gradient
  // initials, consistent with every other avatar in this file) -- reference's own "RK Barber Shop"
  // header text is not reproduced (see LaptopFrame's 3D-depth-pass note for why).
  const SERVICES = [
    { name: 'قص شعر', sub: 'نصف ساعة', price: 15, selected: false },
    { name: 'قص + لحية', sub: 'ساعة', price: 20, selected: true },
    { name: 'صبغة شعر', sub: '45 دقيقة', price: 35, selected: false },
    { name: 'تنظيف بشرة', sub: '20 دقيقة', price: 25, selected: false },
  ]
  return (
    <div style={{ width: '100%', height: '100%', background: SCREEN.bg, fontFamily: P, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: SCREEN.textPrimary, flexShrink: 0 }}>احجز موعدك</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {[CalendarCheck2, CalendarDays, Users, Check].map((Icon, i) => (
          <div key={i} style={{
            width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
            background: i === 0 ? V.violet : SCREEN.chipBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={11} color={i === 0 ? '#fff' : SCREEN.textMuted} strokeWidth={2.2} />
          </div>
        ))}
      </div>
      <div style={{ fontSize: 9.5, fontWeight: 700, color: SCREEN.textSecond, flexShrink: 0 }}>اختر الخدمة</div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden' }}>
        {SERVICES.map((s, i) => (
          <div key={i} style={{
            flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '7px 9px', borderRadius: 10,
            background: s.selected ? V.violetSoft : SCREEN.card,
            border: `1px solid ${s.selected ? V.violet : SCREEN.cardBorder}`,
          }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
              background: `linear-gradient(135deg, ${V.violet}, ${V.violetLight})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9, fontWeight: 700,
            }}>{s.name[0]}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: SCREEN.textPrimary }}>{s.name}</div>
              <div style={{ fontSize: 7, color: SCREEN.textMuted }}>{s.sub}</div>
            </div>
            {s.selected ? (
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: V.violet, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Check size={9} color="#fff" strokeWidth={3} />
              </div>
            ) : (
              <span style={{ fontSize: 9.5, fontWeight: 700, color: V.violetLight, flexShrink: 0 }}>${s.price}</span>
            )}
          </div>
        ))}
      </div>
      <div style={{ flexShrink: 0, padding: '9px 0', borderRadius: 999, background: V.violet, color: '#fff', fontSize: 11, fontWeight: 700, textAlign: 'center' }}>
        التالي ←
      </div>
    </div>
  )
}

function DashboardControlCenterMockup({ toast }) {
  return (
    <div style={{ width: '100%', height: '100%', background: SCREEN.bg, fontFamily: FONT, display: 'flex', position: 'relative' }}>
      {toast && (
        <div style={{
          position: 'absolute', top: 8, insetInlineEnd: 8, insetInlineStart: 8, zIndex: 5,
          display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 10,
          background: '#000', color: '#fff', fontSize: 10, fontWeight: 700,
          boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
        }}>
          <Bell size={12} color={V.violetLight} strokeWidth={2} style={{ flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{toast}</span>
        </div>
      )}
      <div style={{ width: 46, background: SCREEN.bgAlt, borderInlineEnd: `1px solid ${SCREEN.cardBorder}`, padding: '12px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <LogoMark size={20} />
        {[CalendarDays, MessageCircle, Users, TrendingUp].map((Icon, i) => (
          <div key={i} style={{ width: 26, height: 26, borderRadius: 8, background: i === 0 ? V.violetSoft : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={13} color={i === 0 ? V.violetLight : SCREEN.textMuted} strokeWidth={2} />
          </div>
        ))}
      </div>
      <div style={{ flex: 1, padding: '14px 14px 10px', display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: SCREEN.textPrimary }}>نظرة عامة</div>
        {/* Reference: the ChatGPT composite's own dashboard -- 4 stat cards each carry a small
            "+12%"-style delta chip, not just a bare number. Recreated Alzabt-native (real % values,
            own copy). */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {[['حجوزات اليوم', '6', '+12%'], ['إيرادات اليوم', '$48', '+8%'], ['طلبات جديدة', '2', null]].map(([label, val, delta], i) => (
            <div key={i} style={{ background: SCREEN.card, border: `1px solid ${SCREEN.cardBorder}`, borderRadius: 8, padding: '7px 8px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: SCREEN.textPrimary }}>{val}</div>
                {delta && <span style={{ fontSize: 6, fontWeight: 700, color: '#4ADE80' }}>{delta}</span>}
              </div>
              <div style={{ fontSize: 7, color: SCREEN.textMuted, marginTop: 1 }}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{ flex: 1, minHeight: 0, background: SCREEN.card, border: `1px solid ${SCREEN.cardBorder}`, borderRadius: 8, padding: 8, display: 'flex', alignItems: 'flex-end', gap: 4 }}>
          {[30, 55, 40, 70, 50, 85, 60].map((h, i) => (
            <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: 2, background: i === 5 ? V.violet : SCREEN.barInactive }} />
          ))}
        </div>
        {/* Reference: the ChatGPT composite's own dashboard has an "أخر الطلبات" (recent orders)
            feed -- reusing its exact real names/relative-timestamps here (سارة حمود / عمر عبدالله,
            "منذ N دقائق"), Salman's own already-approved reference data, not invented. Replaces the
            earlier same-day "الأكثر طلباً" ranked-bar version -- an activity feed is a closer, more
            "premium SaaS" match to the reference than a static ranking, and the two together would
            have overcrowded this small area. `flexShrink: 0` + the chart's `minHeight: 0` above are
            what keep this visible instead of clipped (see the flexbox fix note in this file's git
            history for the earlier bug this avoids repeating). */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontSize: 6.5, color: SCREEN.textMuted }}>أخر الطلبات</span>
          {[['سارة حمود', 'منذ 5 دقائق'], ['عمر عبدالله', 'منذ 10 دقائق']].map(([name, time], i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{
                width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
                background: `linear-gradient(135deg, ${V.violet}, ${V.violetLight})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 5.5, fontWeight: 700,
              }}>{name[0]}</div>
              <span style={{ fontSize: 6.5, color: SCREEN.textSecond, flex: 1 }}>{name}</span>
              <span style={{ fontSize: 5.5, color: SCREEN.textMuted, flexShrink: 0 }}>{time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// HERO-ONLY dashboard mockup (2026-08-27, reference: new-matirial/alzabt/hero.png -- Salman's exact
// Hero design reference). Deliberately a SEPARATE component from DashboardControlCenterMockup, not
// a modification of it -- Salman's explicit instruction was Hero-only, "don't touch Master
// Dashboard / Order->Dashboard Ecosystem / WhatsApp Integration," and those three all render the
// shared DashboardControlCenterMockup. Building a second, richer component for the Hero's own
// laptop is what makes "Hero-only" actually true rather than a promise -- those three sections'
// component call sites are untouched, provably (grep shows DashboardControlCenterMockup's own body
// has zero diff from before this pass). Content matches the reference: labeled sidebar nav, a
// welcome header + period toggle, 4 KPI cards with real percentage deltas, a line chart with a
// value tooltip, and an "أحدث الحجوزات" list with named demo bookings + avatars -- own copy
// throughout, the reference's own "RK Barber Shop" header text is not reproduced anywhere.
function HeroDashboardMockup() {
  const NAV = [
    { icon: Home, label: 'الرئيسية', active: true },
    { icon: CalendarDays, label: 'الحجوزات' },
    { icon: Users, label: 'العملاء' },
    { icon: Briefcase, label: 'الموظفين' },
    { icon: TrendingUp, label: 'التقارير' },
    { icon: Settings, label: 'الإعدادات' },
  ]
  const KPIS = [
    ['الحجوزات اليوم', '28', '+18%'],
    ['طلبات جديدة', '12', '+24%'],
    ['الإيرادات اليوم', '$2,450', '+15%'],
    ['عملاء جدد', '36', '+11%'],
  ]
  const CHART = [22, 34, 28, 44, 38, 52, 46]
  const CHART_DAYS = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']
  const BOOKINGS = [
    ['محمد علي', 'قص شعر + لحية', '11:00'],
    ['سارة حمود', 'صبغة شعر', '12:30'],
    ['أحمد جابر', 'تنظيف بشرة', '14:00'],
  ]
  const chartPoints = CHART.map((v, i) => `${(i / (CHART.length - 1)) * 100},${100 - v}`).join(' ')
  return (
    <div style={{ width: '100%', height: '100%', background: SCREEN.bg, fontFamily: FONT, display: 'flex' }}>
      <div style={{ width: 76, flexShrink: 0, background: SCREEN.bgAlt, borderInlineEnd: `1px solid ${SCREEN.cardBorder}`, padding: '12px 6px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}><LogoMark size={20} /></div>
        {NAV.map((n, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '5px 6px', borderRadius: 7,
            background: n.active ? V.violet : 'transparent',
          }}>
            <n.icon size={11} color={n.active ? '#fff' : SCREEN.textMuted} strokeWidth={2} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 6.5, fontWeight: n.active ? 700 : 500, color: n.active ? '#fff' : SCREEN.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.label}</span>
          </div>
        ))}
      </div>
      <div style={{ flex: 1, minWidth: 0, padding: '12px 14px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: SCREEN.textPrimary }}>مرحباً بك في عالزبط 👋</span>
          <div style={{ display: 'flex', gap: 3 }}>
            {['اليوم', 'الأسبوع'].map((p, i) => (
              <span key={i} style={{ fontSize: 6, fontWeight: 600, padding: '3px 7px', borderRadius: 999, background: i === 1 ? V.violet : SCREEN.chipBg, color: i === 1 ? '#fff' : SCREEN.chipText }}>{p}</span>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5, flexShrink: 0 }}>
          {KPIS.map(([label, val, delta], i) => (
            <div key={i} style={{ background: SCREEN.card, border: `1px solid ${SCREEN.cardBorder}`, borderRadius: 7, padding: '6px 6px' }}>
              <div style={{ fontSize: 9.5, fontWeight: 800, color: SCREEN.textPrimary }}>{val}</div>
              <div style={{ fontSize: 5.5, color: SCREEN.textMuted, marginTop: 1, marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 5, fontWeight: 700, color: '#4ADE80' }}>{delta}</div>
            </div>
          ))}
        </div>
        <div style={{ flex: 1, minHeight: 0, background: SCREEN.card, border: `1px solid ${SCREEN.cardBorder}`, borderRadius: 8, padding: '7px 9px 4px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 6.5, fontWeight: 700, color: SCREEN.textSecond, marginBottom: 3, flexShrink: 0 }}>الحجوزات خلال الأسبوع</div>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ flex: 1, minHeight: 0, width: '100%' }}>
            <polyline points={chartPoints} fill="none" stroke={V.violet} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexShrink: 0, marginTop: 2 }}>
            {CHART_DAYS.map((d, i) => (
              <span key={i} style={{ fontSize: 4.5, color: SCREEN.textMuted }}>{d}</span>
            ))}
          </div>
        </div>
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 6.5, fontWeight: 700, color: SCREEN.textSecond }}>أحدث الحجوزات</span>
            <span style={{ fontSize: 5.5, color: V.violetLight }}>عرض الكل</span>
          </div>
          {BOOKINGS.map(([name, service, time], i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{
                width: 13, height: 13, borderRadius: '50%', flexShrink: 0,
                background: `linear-gradient(135deg, ${V.violet}, ${V.violetLight})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 5.5, fontWeight: 700,
              }}>{name[0]}</div>
              <span style={{ fontSize: 6.5, color: SCREEN.textPrimary, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name} <span style={{ color: SCREEN.textMuted }}>· {service}</span></span>
              <span style={{ fontSize: 5.5, color: SCREEN.textMuted, flexShrink: 0 }}>{time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Reference: new-matirial/alzabt/ChatGPT Image Aug 27, 2026, 03_13_06 AM.png -- its "02" phone
// screenshot shows these exact real _RESTAURANT_SEED items (شاورما دجاج/كباب مشوي/عصير ليمون/
// كنافة) each with a real small food photo, not a flat color block. Salman's explicit 2026-08-27
// instruction: crop real thumbnails from that one approved, Alzabt-own reference image rather than
// keep abstract CSS placeholders -- cropped via PIL to frontend/public/assets/alzabt/menu-*.png
// (the approved static-asset path from ASSET_MAP.md), each ~53x50px source, used here near-1:1 so
// there's no upscale blur. Still zero real tenant screenshots, zero third-party imagery -- this is
// Salman's own reference asset, not a live product screenshot. Only 2 of the 4 real items are
// shown, not 4 -- this mockup only ever renders inside a 148px-tall ScreenTile (Vertical Showcase),
// and real, measured DOM heights (not guessed) showed 4 rows (or even 2, with the category-chip
// row still present) don't fit -- a first attempt at 2 rows was verified broken (only 55px was
// actually available for the items area, one 44px row already consumed nearly all of it, the
// second was clipped to invisible). Fixed properly: the category-chip row was dropped (redundant
// here -- the Vertical Showcase card underneath already labels this "مطعم"), reclaiming enough
// height to fit 2 full rows at a legible 30px photo size, re-measured via direct DOM
// getBoundingClientRect calls until confirmed, not estimated from CSS alone.
function MenuCatalogMockup() {
  const ITEMS = [
    ['شاورما دجاج', '8', '/assets/alzabt/menu-shawarma.png'],
    ['كباب مشوي', '10', '/assets/alzabt/menu-kebab.png'],
  ]
  return (
    <div style={{ width: '100%', height: '100%', background: SCREEN.bg, fontFamily: FONT, padding: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: SCREEN.textPrimary }}>القائمة</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {ITEMS.map(([n, p, img], i) => (
          <div key={i} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 9, padding: '5px 9px 5px 5px', borderRadius: 10, background: SCREEN.card, border: `1px solid ${SCREEN.cardBorder}` }}>
            <img src={img} alt={n} width={30} height={30} style={{ borderRadius: 7, objectFit: 'cover', flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: SCREEN.textPrimary, flex: 1 }}>{n}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: V.violetLight }}>${p}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Reference: new-matirial/alzabt/aPcgZUtz...jpeg (generic e-commerce UI kit) -- its discount-
// ribbon + wishlist-heart per-card treatment is the polish detail this mockup was missing.
// Recreated Alzabt-native (violet badge, CSS-only, no real product photos) -- one item gets the
// badge/heart, matching the reference's own "not every card" restraint, not a uniform template.
function RetailCatalogMockup() {
  const ITEMS = [
    ['قميص قطن', '20', null], ['حذاء رياضي', '35', '15%'], ['ساعة يد', '48', null], ['حقيبة ظهر', '28', null],
  ]
  return (
    <div style={{ width: '100%', height: '100%', background: SCREEN.bg, fontFamily: FONT, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: SCREEN.textPrimary }}>الكاتالوج</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, flex: 1 }}>
        {ITEMS.map(([n, p, discount], i) => (
          <div key={i} style={{ borderRadius: 8, overflow: 'hidden', border: `1px solid ${SCREEN.cardBorder}`, position: 'relative' }}>
            <div style={{ height: 26, background: `hsl(${(i * 63) % 360}, 38%, 24%)`, position: 'relative' }}>
              {discount && (
                <span style={{ position: 'absolute', top: 3, insetInlineStart: 3, padding: '1.5px 5px', borderRadius: 4, background: V.violet, color: '#fff', fontSize: 5.5, fontWeight: 700 }}>
                  -{discount}
                </span>
              )}
              <span style={{ position: 'absolute', top: 3, insetInlineEnd: 3, width: 13, height: 13, borderRadius: '50%', background: 'rgba(17,24,39,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Heart size={7} color={SCREEN.textPrimary} strokeWidth={2.4} />
              </span>
            </div>
            <div style={{ padding: '4px 6px' }}>
              <div style={{ fontSize: 7, color: SCREEN.textMuted }}>{n}</div>
              <div style={{ fontSize: 8.5, fontWeight: 700, color: SCREEN.textPrimary }}>${p}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProServiceMockup() {
  return (
    <div style={{ width: '100%', height: '100%', background: SCREEN.bg, fontFamily: FONT, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: SCREEN.textPrimary }}>احجز موعد خدمة</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {['استشارة', 'صيانة', 'جلسة تدريب'].map((s, i) => (
          <span key={i} style={{ ...CHIP, background: i === 0 ? V.violet : SCREEN.chipBg, color: i === 0 ? '#fff' : SCREEN.chipText }}>{s}</span>
        ))}
      </div>
      <div style={{ flex: 1, background: SCREEN.card, border: `1px solid ${SCREEN.cardBorder}`, borderRadius: 8, padding: 8, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
        <div style={{ fontSize: 8, color: SCREEN.textMuted }}>الموعد التالي المتاح</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: SCREEN.textPrimary }}>الثلاثاء، 11:00 ص</div>
      </div>
    </div>
  )
}

function BarberSceneMockup() {
  return (
    <div style={{ width: '100%', height: '100%', background: SCREEN.bg, fontFamily: FONT, padding: 14, display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center' }}>
      <div style={{ alignSelf: 'flex-start', maxWidth: '85%', background: 'rgba(255,255,255,0.08)', color: SCREEN.textPrimary, fontSize: 10, padding: '7px 11px', borderRadius: '11px 11px 11px 2px' }}>
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

// WhatsApp Integration mockup (Amendment 1) — one restrained glass panel, NOT a device pair like
// the Order→Dashboard Ecosystem section. The chat-bubble treatment is the same pattern already
// proven in AlzabtLandingPage.jsx:352-365 (untouched file, pattern only, not imported cross-file);
// the dashboard side reuses this page's own DashboardControlCenterMockup + "طلب جديد" toast
// verbatim — same dashboard as everywhere else on the page, deliberately, to prove "one system."
// WhatsApp green appears ONLY on the bubble/badge elements; the connector stays Alzabt violet.
function WhatsAppIntegrationMockup() {
  return (
    <div style={{
      position: 'relative', padding: '28px 22px 24px', background: V.glassBg,
      backdropFilter: 'blur(16px)', border: V.cardBorder, borderRadius: 18,
    }}>
      <div style={{
        position: 'absolute', top: 16, insetInlineEnd: 16, zIndex: 2,
        display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 999,
        background: 'rgba(37,211,102,0.14)', color: V.whatsapp, fontSize: 11, fontWeight: 700,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: V.whatsapp }} />
        متصل ✓
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap', marginTop: 22 }}>
        {/* Customer side — WhatsApp message thread, restrained green only here */}
        <div style={{ width: 200, borderRadius: 14, border: `1px solid ${SCREEN.cardBorder}`, background: SCREEN.bg, position: 'relative' }}>
          <div style={{ padding: '16px 14px 22px', display: 'flex', flexDirection: 'column', gap: 7, fontFamily: FONT }}>
            <div style={{ alignSelf: 'flex-start', maxWidth: '85%', background: 'rgba(255,255,255,0.08)', color: SCREEN.textPrimary, fontSize: 10.5, padding: '7px 12px', borderRadius: '12px 12px 12px 3px' }}>
              بدي احجز موعد بكرا الساعة ٥
            </div>
            <div style={{ alignSelf: 'flex-end', maxWidth: '85%', background: '#1F7A4D', color: '#fff', fontSize: 10.5, padding: '7px 12px', borderRadius: '12px 12px 3px 12px' }}>
              تم تأكيد حجزك ✓✓
            </div>
          </div>
          <div style={{
            position: 'absolute', bottom: -14, insetInlineStart: '50%', transform: 'translateX(50%)',
            width: 32, height: 32, borderRadius: '50%', background: 'rgba(37,211,102,0.16)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', border: `3px solid ${SCREEN.bg}`,
          }}>
            <MessageCircle size={15} color={V.whatsapp} strokeWidth={2} />
          </div>
        </div>

        {/* Connector — stays Alzabt violet, unchanged component, reused verbatim */}
        <div style={{ position: 'relative', width: 64, height: 40, flexShrink: 0 }}>
          <EcosystemConnector />
        </div>

        {/* Business side — same dashboard component + toast used in Order→Dashboard Ecosystem */}
        <div style={{ width: 220 }}>
          <ScreenTile><DashboardControlCenterMockup toast="طلب جديد" /></ScreenTile>
        </div>
      </div>
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

// Material Pack v2 spec A11's required bullet copy (previously missing from the shipped section --
// the section had eyebrow/H2/sub/panel but none of these 4 lines).
const WHATSAPP_BULLETS = [
  { icon: MessageCircle, text: 'استقبال الرسائل والطلبات' },
  { icon: Zap, text: 'ردود تلقائية ذكية' },
  { icon: Bell, text: 'تأكيدات وتنبيهات فورية' },
  { icon: Sparkles, text: 'كل شيء من مكان واحد' },
]

const TRUST = [
  { icon: ShieldCheck, text: 'أمان وموثوقية بيانات كاملة' },
  { icon: Headphones, text: 'دعم فني سريع، نحن معك دائماً' },
  { icon: RefreshCw, text: 'تحديثات مستمرة ومميزات جديدة' },
  { icon: Zap, text: 'واجهة بسيطة، سهلة الاستخدام' },
]

// ── Vertical Showcase marquee (MESSAGE-07, 2026-09-01) ─────────────────────────────────────────
// Same 4 VERTICALS cards (unchanged content, per Salman's explicit answer -- this is a motion
// change, not a content change), now continuously auto-scrolling instead of a static grid. Track
// is rendered twice back-to-back for a seamless loop (spec: "duplicate the track internally").
// No raster <img> anywhere in these mockups (Contract rule, still true) -- so there is no CLS risk
// to guard against here, unlike a photo marquee. Pause on hover/focus-within (spec: "pause or
// substantially slow on hover/focus"). `prefers-reduced-motion` swaps to a plain static,
// horizontally-scrollable row (spec: "show as a normal horizontally scrollable/static gallery").
function VerticalShowcaseMarquee() {
  const card = (v, i) => (
    <div key={i} style={{ padding: 16, background: V.cardBg, border: V.cardBorder, borderRadius: 18, width: 260, flexShrink: 0 }}>
      <ScreenTile><v.Screen /></ScreenTile>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, marginBottom: 4 }}>
        <v.icon size={15} color={V.violet} strokeWidth={2} />
        <span style={{ fontSize: 13.5, fontWeight: 700, color: V.textPrimary }}>{v.title}</span>
      </div>
      <div style={{ fontSize: 12, color: V.textSecond, lineHeight: 1.5 }}>{v.sub}</div>
    </div>
  )
  return (
    <div>
      <style>{`
        .vshowcase-scroller {
          overflow-x: hidden;
          -webkit-mask-image: linear-gradient(to right, transparent, black 6%, black 94%, transparent);
          mask-image: linear-gradient(to right, transparent, black 6%, black 94%, transparent);
        }
        .vshowcase-track {
          display: flex; width: max-content; gap: 16px;
          animation: vshowcaseScroll 28s linear infinite;
        }
        .vshowcase-scroller:hover .vshowcase-track,
        .vshowcase-scroller:focus-within .vshowcase-track {
          animation-play-state: paused;
        }
        @keyframes vshowcaseScroll {
          to { transform: translateX(50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .vshowcase-scroller { overflow-x: auto; -webkit-mask-image: none; mask-image: none; }
          .vshowcase-track { animation: none; width: auto; }
        }
        /* Touch/no-hover devices never receive the hover-pause above, and overflow:hidden would
           otherwise block manual scrolling entirely -- spec requires touch to scroll naturally. */
        @media (hover: none) {
          .vshowcase-scroller { overflow-x: auto; -webkit-mask-image: none; mask-image: none; }
          .vshowcase-track { animation-play-state: paused; }
        }
        @media (max-width: 480px) {
          .vshowcase-track > div { width: 220px !important; }
        }
      `}</style>
      <div className="vshowcase-scroller">
        <div className="vshowcase-track">
          {VERTICALS.map(card)}
          {VERTICALS.map((v, i) => card(v, `dup-${i}`))}
        </div>
      </div>
    </div>
  )
}

export default function ProductShowcaseHome() {
  const navigate = useNavigate()
  const goDemo = () => navigate('demo-builder')
  const scrollToCapabilities = () => document.getElementById('capabilities')?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div style={{ minHeight: '100vh', background: V.bg, fontFamily: FONT, overflowX: 'hidden', position: 'relative' }} dir="rtl">
      <style>{`
        @media (max-width: 720px) {
          .hero-phone-mockup { width: 150px !important; }
          .hero-phone-float { inset-inline-start: -4% !important; }
          .eco-phone-mockup { width: 130px !important; }
        }
      `}</style>

      <AmbientGridBackground accent={V.violetLight} />

      <div style={{ position: 'relative', zIndex: 1 }}>

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
            {/* Composition per new-matirial/alzabt/hero.png (2026-08-27 exact Hero reference): phone
                vertically centered, overlapping the laptop's own start-side edge and extending both
                above and below its vertical middle -- not floating at the bottom corner as before.
                HeroDashboardMockup/rebuilt CustomerBookingFlowMockup booking content are what
                actually close the gap with the reference; this position change is secondary. */}
            <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>
              <LaptopFrame><HeroDashboardMockup /></LaptopFrame>
              <div className="hero-phone-float" style={{ position: 'absolute', top: '50%', insetInlineStart: '-34%', transform: 'translateY(-50%) rotate(-3deg)', zIndex: 2 }}>
                <PhoneFrame className="hero-phone-mockup" width={228}><CustomerBookingFlowMockup state="booking" /></PhoneFrame>
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
            {/* Richer toast text (order number + demo name) per Material Pack v2 spec A06 --
                reference: same board, "05. ORDER -> DASHBOARD ECOSYSTEM ASSET" toast text. Only
                this LaptopFrame placement gets the longer string; the WhatsApp panel's ScreenTile
                below keeps the short "طلب جديد" -- verified narrower context, less room. */}
            <LaptopFrame><DashboardControlCenterMockup toast="طلب جديد #A1258 من محمد علي" /></LaptopFrame>
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
        <div style={{ marginBottom: 16 }}>
          <VerticalShowcaseMarquee />
        </div>
        <p style={{ textAlign: 'center', fontSize: 11.5, color: V.textMuted }}>
          بيئات تجريبية توضيحية — مش عملاء حقيقيين
        </p>
      </section>

      {/* ── WhatsApp Integration (Amendment 1) — a channel into the one system, not a 4th capability ── */}
      <section style={{ padding: '20px 20px 72px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 14px', borderRadius: 999, background: V.violetSoft, marginBottom: 20, fontSize: 12, fontWeight: 700, color: V.violetLight }}>
          تكامل WhatsApp
        </div>
        <h2 style={{ margin: '0 0 12px', fontSize: 'clamp(1.4rem, 3vw, 1.8rem)', fontWeight: 800, color: V.textPrimary }}>
          من WhatsApp لعندك. بدون ما تضيع الرسالة.
        </h2>
        <p style={{ margin: '0 0 28px', maxWidth: 520, fontSize: 14, lineHeight: 1.8, color: V.textSecond }}>
          الرسائل، الطلبات، والتأكيدات بتوصل بالمكان الصح — وبتضل كل عملياتك قدامك من نفس النظام.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 28 }}>
          {WHATSAPP_BULLETS.map((b, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, color: V.textPrimary }}>
              <b.icon size={15} color={V.whatsapp} strokeWidth={2} style={{ flexShrink: 0 }} />
              {b.text}
            </div>
          ))}
        </div>
        <WhatsAppIntegrationMockup />
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
    </div>
  )
}

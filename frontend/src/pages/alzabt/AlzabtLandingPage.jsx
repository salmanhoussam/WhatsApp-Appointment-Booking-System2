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
// Structure -- REVISED 2026-08-25 (supersedes Section C's original "centered hero, Image 6"
// call, per Salman's own explicit reference-image brief the same day -- see the dated note in
// ALZABT_MASTER_PRODUCT_PLAN.md's Rollout Priority section): two-column premium hero (RTL-mirrored
// -- copy on the right, a laptop+phone device mockup on the left, both showing REAL Alzabt product
// screenshots, never raw/unframed) -> 3-step proof strip -> 4 feature cards (WhatsApp, smart
// calendar, staff/services, reports -- each with a CSS/SVG-built illustration, see the file-level
// note below on why these aren't literal 3D renders) -> a compact roadmap pill strip (Barber-first,
// shop add-on, future verticals) -> trust pillars (generic, no fabricated customer/review numbers
// -- Section 7 of the 2026-08-25 brief is explicit about this) -> closing CTA.
//
// On the missing 3D-illustration assets (barber-chair.png, calendar-3d.png, whatsapp-3d.png,
// chart-3d.png, scissors-comb.png, a graphic logo mark) named in Salman's reference brief: no
// image-generation tool is available in this environment, so per that brief's own Section 12 rule
// ("stop before making fake placeholders that look like finished product assets"), every visual in
// this file is built from real code (CSS/SVG/Lucide icons + the two real screenshots already
// captured for this project) rather than a faked-up asset. See this task's evidence.md for the
// exact asset spec if real 3D renders are produced later to swap in.
//
// "جرّب عالزبط" links directly to the real, isolated alzabt-demo reference tenant's real booking
// page (scripts/seed_alzabt_demo_tenant.py) -- never RK's real production tenant. The hero/feature
// screenshots (dashboard.png, booking-page.png) are RK's own real product, real data -- RK is this
// project's own reference/pilot tenant, not an unrelated third party.
//
// Demo entry point (salmansaas.com Product IA decision, 2026-08-12): production traffic goes to
// demo.salmansaas.com/alzabt (App.jsx's IS_DEMO_SUBDOMAIN route, redirects into this same
// alzabt-demo tenant) -- same env-detection idiom as pages/showcase/config.js's REGISTER_URL.
// Local/dev traffic (demo.salmansaas.com doesn't resolve locally) still navigates in-app.

import { useNavigate } from 'react-router-dom'
import {
  Scissors, CalendarDays, MessageCircle, Users, Sparkles, CalendarCheck2,
  BarChart3, Check, TrendingUp, ShoppingBag, ShieldCheck, Headphones, RefreshCw, Zap,
} from 'lucide-react'

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
  violetLight: '#C084FC',
  violetSoft:  'rgba(124,58,237,0.14)',
  success:     '#16A34A', // deliberately separate from the brand accent -- Image 3's own
                           // principle (Section C): brand color and success/status color should
                           // never be the same color.
  whatsapp:    '#25D366',
}

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

// ── Device mockups — CSS-built bezels wrapping REAL Alzabt product screenshots ────────────────
// (RK's own real dashboard/booking page, captured 2026-08-25 -- see frontend/public/assets/alzabt/)

function LaptopMockup() {
  return (
    <div className="alzabt-laptop-mockup" style={{ width: '100%', maxWidth: 560 }}>
      <div style={{
        borderRadius: '16px 16px 4px 4px', overflow: 'hidden',
        border: '10px solid #1a1a1f', borderBottom: '2px solid #1a1a1f',
        background: '#000', boxShadow: '0 30px 70px rgba(0,0,0,0.55)',
      }}>
        <div style={{ aspectRatio: '16 / 10', overflow: 'hidden', background: '#fff' }}>
          <img
            src="/assets/alzabt/dashboard.png"
            alt="لوحة تحكم عالزبط الحقيقية"
            style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
            loading="lazy"
          />
        </div>
      </div>
      <div style={{
        height: 14, background: 'linear-gradient(180deg, #28282e, #16161a)', borderRadius: '0 0 10px 10px',
      }} />
      <div style={{ height: 5, width: '36%', margin: '0 auto', background: '#0c0c0e', borderRadius: '0 0 6px 6px' }} />
    </div>
  )
}

function PhoneMockup() {
  return (
    <div className="alzabt-phone-mockup" style={{
      width: 210, borderRadius: 36, border: '8px solid #1a1a1f', background: '#000',
      boxShadow: '0 24px 60px rgba(0,0,0,0.55)', overflow: 'hidden', position: 'relative',
    }}>
      <div style={{
        position: 'absolute', top: 0, insetInlineStart: '50%', transform: 'translateX(-50%)',
        width: 64, height: 16, background: '#1a1a1f', borderRadius: '0 0 12px 12px', zIndex: 2,
      }} />
      <div style={{ aspectRatio: '9 / 19', overflow: 'hidden' }}>
        <img
          src="/assets/alzabt/booking-page.png"
          alt="صفحة الحجز الحقيقية على عالزبط"
          style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
          loading="lazy"
        />
      </div>
    </div>
  )
}

const STEPS = [
  { icon: Scissors, title: 'اختر الخدمة', desc: 'زبونك يختار الخدمة اللي بدو ياها بلمسة وحدة' },
  { icon: CalendarDays, title: 'اختر الموعد', desc: 'تقويم حقيقي، مواعيد فعلية متاحة فوراً' },
  { icon: MessageCircle, title: 'تأكيد فوري', desc: 'عبر واتساب — بدون تسجيل، بدون تعقيد' },
]

const HERO_BADGES = [
  { icon: CalendarCheck2, title: 'حجوزات ذكية', sub: 'بدون تعارض مواعيد' },
  { icon: Users, title: 'إدارة الموظفين', sub: 'صلاحيات وجداول' },
  { icon: MessageCircle, title: 'حجوزات واتساب', sub: 'تلقائية بالكامل' },
  { icon: BarChart3, title: 'تقارير واضحة', sub: 'أداء بلمحة وحدة' },
]

const ROADMAP = [
  { icon: Scissors, tag: 'هلأ عم نبني', title: 'صالونات الحلاقة', active: true },
  { icon: ShoppingBag, tag: 'متوفر كإضافة', title: 'متجر إلكتروني بنفس الصفحة', active: true },
  { icon: Sparkles, tag: 'قريباً', title: 'كلينكات وصالونات تجميل', active: false },
]

const TRUST = [
  { icon: ShieldCheck, text: 'أمان وموثوقية بيانات كاملة' },
  { icon: Headphones, text: 'دعم فني سريع، نحن معك دائماً' },
  { icon: RefreshCw, text: 'تحديثات مستمرة ومميزات جديدة' },
  { icon: Zap, text: 'واجهة بسيطة، سهلة الاستخدام' },
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
      <style>{`
        @media (max-width: 720px) {
          .alzabt-phone-mockup { width: 150px !important; }
          .alzabt-phone-float { bottom: -8% !important; inset-inline-start: -4% !important; }
        }
      `}</style>

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 24px', background: 'rgba(10,10,15,0.7)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid rgba(255,255,255,0.06)`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LogoMark />
          <span style={{ fontSize: 19, fontWeight: 800, color: V.textPrimary }}>
            عال<span style={{ color: V.violet }}>زبط</span>
          </span>
        </div>
        <PrimaryCTA onClick={tryDemo} style={{ padding: '9px 20px', fontSize: 13 }}>
          جرّب عالزبط
        </PrimaryCTA>
      </nav>

      {/* ── Hero — two-column: copy (right, RTL) + real product device mockup (left) ───────── */}
      <section style={{ position: 'relative', padding: '64px 24px 40px', maxWidth: 1180, margin: '0 auto', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: V.bgWash, pointerEvents: 'none' }} />
        <div style={{
          position: 'relative', display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 48, alignItems: 'center',
        }}>
          {/* ── Copy column ── */}
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '6px 14px', borderRadius: 999, background: V.violetSoft, marginBottom: 22,
              fontSize: 12, fontWeight: 700, color: V.violetLight,
            }}>
              <Sparkles size={13} strokeWidth={2} />
              منصة حجوزات وإدارة متكاملة
            </div>
            <h1 style={{
              margin: '0 0 20px', fontSize: 'clamp(2.1rem, 4.6vw, 3.1rem)', fontWeight: 900,
              lineHeight: 1.25, color: V.textPrimary, letterSpacing: '-0.02em',
            }}>
              كل حجز، بوقته.<br />
              كل زبون، <span style={{
                background: `linear-gradient(135deg, ${V.violet}, ${V.violetLight})`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>راضي.</span>
            </h1>
            <p style={{
              margin: '0 0 32px', maxWidth: 440, fontSize: 'clamp(1rem, 1.6vw, 1.1rem)',
              lineHeight: 1.85, color: V.textSecond,
            }}>
              نظام متكامل لإدارة الحجوزات والموظفين والخدمات، مدعوم بحجوزات واتساب تلقائية —
              خلّي زبايينك يحجزوا لحالهم، وإنت خلّيك على شغلك.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 36 }}>
              <PrimaryCTA onClick={tryDemo}>جرّب عالزبط الآن ←</PrimaryCTA>
              <GhostCTA onClick={scrollToProof}>شوف كيف بيشتغل</GhostCTA>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, maxWidth: 440 }}>
              {HERO_BADGES.map((b, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  borderRadius: 14, background: V.cardBg, border: V.cardBorder,
                }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 10, background: V.violetSoft, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
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

          {/* ── Visual column — laptop + floating phone, both real product screenshots ── */}
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', paddingTop: 12 }}>
            <div style={{
              position: 'absolute', inset: '-15% -10%', zIndex: 0,
              background: `radial-gradient(ellipse 65% 60% at 50% 40%, ${V.violetSoft}, transparent 70%)`,
              filter: 'blur(6px)',
            }} />
            <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>
              <LaptopMockup />
              <div className="alzabt-phone-float" style={{
                position: 'absolute', bottom: '-14%', insetInlineStart: '-6%',
                transform: 'rotate(-4deg)', zIndex: 2,
              }}>
                <PhoneMockup />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Full-width proof section — 3 real steps, not a screenshot ─────────────────────── */}
      <section id="alzabt-how-it-works" style={{ padding: '52px 20px 72px', maxWidth: 1000, margin: '0 auto' }}>
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

      {/* ── Feature cards — WhatsApp / smart calendar / staff / reports, each a real CSS/SVG
             illustration (no external 3D-render assets available in this environment) ────────── */}
      <section style={{ padding: '20px 20px 72px', maxWidth: 1080, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.4rem, 3vw, 1.8rem)', fontWeight: 800, color: V.textPrimary, marginBottom: 8 }}>
          شو بيعمل عالزبط؟
        </h2>
        <p style={{ textAlign: 'center', fontSize: 14, color: V.textSecond, marginBottom: 36 }}>
          مش بس صفحة حجز — منظومة كاملة تدير فيها شغلك من مكان وحد
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18 }}>
          {/* WhatsApp */}
          <div style={{ position: 'relative', padding: '26px 22px', borderRadius: 22, background: V.cardBg, border: V.cardBorder, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -50, insetInlineEnd: -40, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,211,102,0.28), transparent 70%)', filter: 'blur(30px)' }} />
            <div style={{ position: 'relative', height: 140, marginBottom: 18, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 7 }}>
              <div style={{ alignSelf: 'flex-start', maxWidth: '82%', background: 'rgba(255,255,255,0.08)', color: V.textPrimary, fontSize: 11.5, padding: '8px 13px', borderRadius: '13px 13px 13px 3px' }}>
                بدي احجز موعد بكرا الساعة ٥
              </div>
              <div style={{ alignSelf: 'flex-end', maxWidth: '82%', background: '#1F7A4D', color: '#fff', fontSize: 11.5, padding: '8px 13px', borderRadius: '13px 13px 3px 13px' }}>
                تم تأكيد حجزك ✓✓
              </div>
              <div style={{
                position: 'absolute', bottom: -6, insetInlineStart: '50%', transform: 'translateX(50%)',
                width: 38, height: 38, borderRadius: '50%', background: 'rgba(37,211,102,0.16)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <MessageCircle size={17} color={V.whatsapp} strokeWidth={2} />
              </div>
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: V.textPrimary, marginBottom: 8 }}>حجوزات عبر واتساب</div>
            <div style={{ fontSize: 13, color: V.textSecond, lineHeight: 1.7 }}>
              زبائنك بيحجزوا لحالهن عبر واتساب، من غير ما يحمّلوا تطبيق أو يسجّلوا حساب.
            </div>
          </div>

          {/* Smart calendar */}
          <div style={{ position: 'relative', padding: '26px 22px', borderRadius: 22, background: V.cardBg, border: V.cardBorder, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -50, insetInlineEnd: -40, width: 160, height: 160, borderRadius: '50%', background: `radial-gradient(circle, ${V.violetSoft}, transparent 70%)`, filter: 'blur(30px)' }} />
            <div style={{ position: 'relative', height: 140, marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'relative' }}>
                <div style={{ width: 128, background: '#131317', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 10 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                    {Array.from({ length: 21 }).map((_, i) => (
                      <div key={i} style={{
                        aspectRatio: '1', borderRadius: 3,
                        background: i === 11 ? V.violet : 'rgba(255,255,255,0.07)',
                      }} />
                    ))}
                  </div>
                </div>
                <div style={{
                  position: 'absolute', bottom: -10, insetInlineEnd: -10, width: 32, height: 32,
                  borderRadius: '50%', background: V.violet, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 4px 14px ${V.violetSoft}`,
                }}>
                  <Check size={16} color="#fff" strokeWidth={3} />
                </div>
              </div>
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: V.textPrimary, marginBottom: 8 }}>تقويم ذكي بدون تعارض</div>
            <div style={{ fontSize: 13, color: V.textSecond, lineHeight: 1.7 }}>
              النظام بيمنع أي حجز مزدوج تلقائياً — ما في تعارض مواعيد بعد اليوم.
            </div>
          </div>

          {/* Staff / services */}
          <div style={{ position: 'relative', padding: '26px 22px', borderRadius: 22, background: V.cardBg, border: V.cardBorder, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -50, insetInlineEnd: -40, width: 160, height: 160, borderRadius: '50%', background: `radial-gradient(circle, ${V.violetSoft}, transparent 70%)`, filter: 'blur(30px)' }} />
            <div style={{ position: 'relative', height: 140, marginBottom: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
              <div style={{ display: 'flex' }}>
                {['ح', 'ج', 'م'].map((initial, i) => (
                  <div key={i} style={{
                    width: 42, height: 42, borderRadius: '50%',
                    background: `linear-gradient(135deg, ${V.violet}, ${V.violetLight})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 800, fontSize: 14, border: '2px solid #0A0A0F',
                    marginInlineStart: i === 0 ? 0 : -13, zIndex: 3 - i,
                  }}>{initial}</div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 190 }}>
                {['قص شعر', 'حلاقة ذقن', 'كرياتين'].map((s, i) => (
                  <span key={i} style={{ fontSize: 10.5, padding: '4px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', color: V.textSecond }}>{s}</span>
                ))}
              </div>
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: V.textPrimary, marginBottom: 8 }}>إدارة الموظفين والخدمات</div>
            <div style={{ fontSize: 13, color: V.textSecond, lineHeight: 1.7 }}>
              خدماتك وموظفينك وصلاحياتهم، كلهم من مكان واحد.
            </div>
          </div>

          {/* Reports */}
          <div style={{ position: 'relative', padding: '26px 22px', borderRadius: 22, background: V.cardBg, border: V.cardBorder, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -50, insetInlineEnd: -40, width: 160, height: 160, borderRadius: '50%', background: `radial-gradient(circle, ${V.violetSoft}, transparent 70%)`, filter: 'blur(30px)' }} />
            <div style={{ position: 'relative', height: 140, marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 88 }}>
                {[38, 62, 48, 78, 58, 92].map((h, i) => (
                  <div key={i} style={{
                    width: 13, height: `${h}%`, borderRadius: 4,
                    background: i === 5 ? `linear-gradient(180deg, ${V.violetLight}, ${V.violet})` : 'rgba(124,58,237,0.35)',
                  }} />
                ))}
              </div>
              <TrendingUp size={22} color={V.violet} strokeWidth={2} style={{ alignSelf: 'flex-start', marginTop: 4 }} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: V.textPrimary, marginBottom: 8 }}>تقارير أداء واضحة</div>
            <div style={{ fontSize: 13, color: V.textSecond, lineHeight: 1.7 }}>
              إيراداتك وحجوزاتك بلمحة وحدة، تساعدك تاخد قرارات أسرع.
            </div>
          </div>
        </div>
      </section>

      {/* ── Roadmap pill strip — honest "building now" + shop add-on + future verticals ────── */}
      <section style={{ padding: '0 20px 72px', maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: V.textMuted, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          خارطة الطريق
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10 }}>
          {ROADMAP.map((r, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 999,
              background: r.active ? V.violetSoft : V.cardBg,
              border: r.active ? '1px solid rgba(124,58,237,0.3)' : V.cardBorder,
            }}>
              <r.icon size={14} color={r.active ? V.violet : V.textMuted} strokeWidth={2} />
              <span style={{ fontSize: 12.5, fontWeight: 700, color: V.textPrimary }}>{r.title}</span>
              <span style={{ fontSize: 10.5, color: r.active ? V.violetLight : V.textMuted }}>· {r.tag}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Trust pillars — generic, supportable claims only; no invented numbers/reviews ──── */}
      <section style={{ padding: '0 20px 80px', maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          {TRUST.map((t, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px',
              background: V.cardBg, border: V.cardBorder, borderRadius: 14,
            }}>
              <t.icon size={20} color={V.violet} strokeWidth={1.75} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 13.5, color: V.textPrimary, lineHeight: 1.5 }}>{t.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Closing CTA ─────────────────────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', padding: '64px 20px 96px', textAlign: 'center', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: V.bgWash, pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 'clamp(1.6rem, 3.4vw, 2.2rem)', fontWeight: 900, color: V.textPrimary }}>
            جاهز تضبط شغلك؟
          </h2>
          <p style={{ margin: '0 0 28px', fontSize: 14, color: V.textSecond }}>
            تجربة حجز حقيقية، خلال دقيقتين — بدون تسجيل
          </p>
          <PrimaryCTA onClick={tryDemo} style={{ padding: '17px 40px', fontSize: 16 }}>
            جرّب عالزبط مجاناً ←
          </PrimaryCTA>
        </div>
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

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { WHATSAPP_NUMBER } from '../config';

gsap.registerPlugin(ScrollTrigger);

// ── Icons ─────────────────────────────────────────────────────────────────
const IconCheck = ({ color = '#ff1a55' }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={color}
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0, marginTop: 2 }}>
    <polyline points="2,7 6,11 12,3" />
  </svg>
);

const IconX = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
    stroke="rgba(255,255,255,0.18)" strokeWidth="2"
    strokeLinecap="round" style={{ flexShrink: 0 }}>
    <line x1="3" y1="3" x2="11" y2="11" />
    <line x1="11" y1="3" x2="3" y2="11" />
  </svg>
);

// ── Data ──────────────────────────────────────────────────────────────────
const PLANS = [
  {
    key: 'starter',
    nameAr: 'البداية',
    nameEn: 'Starter',
    price: 29,
    color: '#6b7280',
    highlighted: false,
    badgeAr: null,
    badgeEn: null,
    featuresAr: [
      'موقع واحد كامل',
      'WhatsApp Bot أساسي',
      'لوحة تحكم بسيطة',
      'دعم عبر الإيميل',
      'شهادة SSL مجانية',
    ],
    featuresEn: [
      'One complete website',
      'Basic WhatsApp Bot',
      'Simple dashboard',
      'Email support',
      'Free SSL certificate',
    ],
    ctaAr: 'ابدأ الآن',
    ctaEn: 'Get Started',
  },
  {
    key: 'growth',
    nameAr: 'النمو',
    nameEn: 'Growth',
    price: 49,
    color: '#ff1a55',
    highlighted: true,
    badgeAr: 'الأكثر شيوعاً',
    badgeEn: 'Most Popular',
    featuresAr: [
      'كل ميزات البداية',
      'مواقع متعددة (حتى 3)',
      'WhatsApp Bot متقدم + إشعارات',
      'إحصائيات الزوار',
      'دعم أولوية',
      'تكاملات الدفع المحلية',
    ],
    featuresEn: [
      'Everything in Starter',
      'Multiple sites (up to 3)',
      'Advanced WhatsApp Bot + notifications',
      'Visitor analytics',
      'Priority support',
      'Local payment integrations',
    ],
    ctaAr: 'ابدأ الآن',
    ctaEn: 'Start Now',
  },
  {
    key: 'enterprise',
    nameAr: 'المؤسسات',
    nameEn: 'Enterprise',
    price: 99,
    color: '#8b5cf6',
    highlighted: false,
    badgeAr: null,
    badgeEn: null,
    featuresAr: [
      'كل ميزات النمو',
      'مواقع غير محدودة',
      'تكاملات مخصصة',
      'مدير حساب مخصص',
      'ضمان SLA 99.9%',
      'تقارير متقدمة',
    ],
    featuresEn: [
      'Everything in Growth',
      'Unlimited websites',
      'Custom integrations',
      'Dedicated account manager',
      '99.9% SLA guarantee',
      'Advanced reports',
    ],
    ctaAr: 'تواصل معنا',
    ctaEn: 'Contact Us',
  },
];

const COMPARISON = [
  {
    featureAr: 'عربي أولاً (RTL)',
    featureEn: 'Arabic First (RTL)',
    us: true, bolt: false, shopify: false, bubble: false,
  },
  {
    featureAr: 'WhatsApp Native',
    featureEn: 'WhatsApp Native',
    us: true, bolt: false, shopify: false, bubble: false,
  },
  {
    featureAr: 'جاهز خلال 24 ساعة',
    featureEn: 'Ready in 24 hours',
    us: true, bolt: false, shopify: false, bubble: false,
  },
  {
    featureAr: 'مُدار بالكامل (Managed)',
    featureEn: 'Fully Managed',
    us: true, bolt: false, shopify: true, bubble: false,
  },
  {
    featureAr: 'صفر عمولة على المعاملات',
    featureEn: 'Zero Transaction Commission',
    us: true, bolt: true, shopify: false, bubble: true,
  },
  {
    featureAr: 'دفع محلي (Whish / OMT)',
    featureEn: 'Local Payment (Whish / OMT)',
    us: true, bolt: false, shopify: false, bubble: false,
  },
  {
    featureAr: 'لا تحتاج مطور',
    featureEn: 'No Developer Needed',
    us: true, bolt: false, shopify: true, bubble: false,
  },
];

const BUSINESS_TYPES_AR = ['مطعم', 'متجر إلكتروني', 'حجز شاليه / فيلا', 'صالون تجميل', 'خدمات أخرى'];
const BUSINESS_TYPES_EN = ['Restaurant', 'Online Store', 'Chalet / Villa Booking', 'Beauty Salon', 'Other Services'];

// ── Main Component ────────────────────────────────────────────────────────
export default function PricingPage() {
  const { lang } = useTranslation();
  const isAr = lang === 'ar';

  const pageRef     = useRef();
  const cardsRef    = useRef([]);
  const tableRef    = useRef();
  const formRef     = useRef();

  const [form, setForm]       = useState({ name: '', phone: '', type: '' });
  const [submitted, setSubmitted] = useState(false);

  // ── GSAP scroll reveals ──
  useEffect(() => {
    const ctx = gsap.context(() => {
      // headings + labels
      gsap.from('[data-reveal]', {
        opacity: 0, y: 28,
        duration: 0.7, stagger: 0.08, ease: 'power3.out',
        scrollTrigger: { trigger: pageRef.current, start: 'top 80%' },
      });

      // pricing cards stagger
      cardsRef.current.forEach((el, i) => {
        if (!el) return;
        gsap.from(el, {
          opacity: 0, y: 50, scale: 0.97,
          duration: 0.75, delay: i * 0.12, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%' },
        });
      });

      // table rows
      if (tableRef.current) {
        gsap.from(tableRef.current.querySelectorAll('tr'), {
          opacity: 0, x: isAr ? 16 : -16,
          duration: 0.5, stagger: 0.06, ease: 'power2.out',
          scrollTrigger: { trigger: tableRef.current, start: 'top 82%' },
        });
      }

      // form
      if (formRef.current) {
        gsap.from(formRef.current, {
          opacity: 0, y: 30,
          duration: 0.7, ease: 'power3.out',
          scrollTrigger: { trigger: formRef.current, start: 'top 84%' },
        });
      }
    }, pageRef);

    return () => ctx.revert();
  }, [isAr]);

  // ── Lead form submit ──
  const handleSubmit = (e) => {
    e.preventDefault();
    const { name, phone, type } = form;
    const msg = isAr
      ? `مرحباً، أريد البدء مع SalmanSaaS!%0aالاسم: ${name}%0aالواتساب: ${phone}%0aنوع العمل: ${type}`
      : `Hello, I want to start with SalmanSaaS!%0aName: ${name}%0aWhatsApp: ${phone}%0aBusiness: ${type}`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank');
    setSubmitted(true);
  };

  // ── Styles ──
  const S = {
    page: {
      background: '#090412',
      minHeight: '100vh',
      fontFamily: "'Cairo', sans-serif",
      color: 'rgba(255,255,255,0.55)',
    },
    wrap: { maxWidth: 1100, margin: '0 auto', padding: '0 2rem' },
    label: {
      fontFamily: "'Space Mono', monospace",
      fontSize: '0.7rem', letterSpacing: '0.18em',
      textTransform: 'uppercase', color: '#ff1a55',
      display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem',
    },
    line: { width: 28, height: 2, background: '#ff1a55', display: 'inline-block', flexShrink: 0 },
    h2: {
      fontFamily: "'Cairo', sans-serif",
      fontWeight: 900, fontSize: 'clamp(2rem, 5vw, 3.2rem)',
      color: '#fff', lineHeight: 1.1, margin: '0 0 0.75rem',
    },
    sub: {
      fontFamily: "'Space Mono', monospace",
      fontSize: '0.8rem', color: 'rgba(255,255,255,0.32)',
      lineHeight: 1.75, margin: '0 0 3.5rem',
    },
    divider: {
      height: 1,
      background: 'linear-gradient(90deg, transparent, rgba(255,26,85,0.3), transparent)',
      margin: '5rem 0',
    },
    inputBase: {
      width: '100%',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 10,
      padding: '0.75rem 1rem',
      fontFamily: "'Cairo', sans-serif",
      fontSize: '0.88rem',
      color: '#fff',
      outline: 'none',
      boxSizing: 'border-box',
    },
  };

  return (
    <div ref={pageRef} style={S.page}>
      <Navbar />

      {/* ── HERO ───────────────────────────────────────────────── */}
      <section dir={isAr ? 'rtl' : 'ltr'} style={{
        padding: '9rem 2rem 5rem',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Red glow */}
        <div style={{
          position: 'absolute', top: 0, left: '50%',
          transform: 'translateX(-50%)',
          width: 600, height: 300,
          background: 'radial-gradient(ellipse, rgba(255,26,85,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={S.wrap}>
          <p data-reveal style={S.label}>
            <span style={S.line} />
            {isAr ? 'خطط الأسعار' : 'Pricing'}
          </p>

          <h1 data-reveal style={{ ...S.h2, fontSize: 'clamp(2.4rem, 6vw, 4rem)' }}>
            {isAr
              ? <>خطة تناسب <span style={{ color: '#ff1a55' }}>كل نشاط</span></>
              : <>A plan for <span style={{ color: '#ff1a55' }}>every business</span></>}
          </h1>

          <p data-reveal style={S.sub}>
            {isAr
              ? 'بدون عقود. بدون مفاجآت. ادفع شهرياً وألغِ في أي وقت.'
              : 'No contracts. No surprises. Pay monthly, cancel anytime.'}
          </p>

          <p data-reveal style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: '0.65rem',
            color: 'rgba(255,255,255,0.18)',
            letterSpacing: '0.04em',
          }}>
            {isAr
              ? '✓ SSL مجاني · ✓ بيانات محمية · ✓ استضافة مُدارة بالكامل'
              : '✓ Free SSL · ✓ Protected data · ✓ Fully managed hosting'}
          </p>
        </div>
      </section>

      {/* ── PRICING CARDS ──────────────────────────────────────── */}
      <section dir={isAr ? 'rtl' : 'ltr'} style={{ padding: '0 2rem 2rem' }}>
        <div style={{
          ...S.wrap,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
          gap: '1.5rem',
          alignItems: 'stretch',
        }}>
          {PLANS.map((plan, i) => {
            const badge = isAr ? plan.badgeAr : plan.badgeEn;
            const features = isAr ? plan.featuresAr : plan.featuresEn;
            const isHighlighted = plan.highlighted;

            return (
              <div
                key={plan.key}
                ref={el => (cardsRef.current[i] = el)}
                style={{
                  position: 'relative',
                  padding: '2rem',
                  background: isHighlighted
                    ? 'rgba(255,26,85,0.04)'
                    : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isHighlighted
                    ? 'rgba(255,26,85,0.4)'
                    : 'rgba(255,255,255,0.07)'}`,
                  boxShadow: isHighlighted
                    ? '0 0 50px rgba(255,26,85,0.12), inset 0 0 50px rgba(255,26,85,0.03)'
                    : 'none',
                  display: 'flex', flexDirection: 'column',
                  transition: 'border-color 0.3s, box-shadow 0.3s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = `${plan.color}55`;
                  e.currentTarget.style.boxShadow = `0 0 32px ${plan.color}18`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = isHighlighted
                    ? 'rgba(255,26,85,0.4)' : 'rgba(255,255,255,0.07)';
                  e.currentTarget.style.boxShadow = isHighlighted
                    ? '0 0 50px rgba(255,26,85,0.12), inset 0 0 50px rgba(255,26,85,0.03)' : 'none';
                }}
              >
                {/* Badge */}
                {badge && (
                  <div style={{
                    position: 'absolute', top: -12,
                    [isAr ? 'right' : 'left']: 20,
                    background: plan.color,
                    color: '#fff',
                    fontFamily: "'Space Mono', monospace",
                    fontSize: '0.6rem', letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    padding: '3px 12px',
                  }}>
                    {badge}
                  </div>
                )}

                {/* Plan ID */}
                <span style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: '0.6rem', letterSpacing: '0.14em',
                  color: plan.color, textTransform: 'uppercase',
                  display: 'block', marginBottom: '0.5rem',
                }}>
                  {`PLN_0${i + 1}`}
                </span>

                {/* Name */}
                <h3 style={{
                  fontFamily: "'Cairo', sans-serif",
                  fontWeight: 800, fontSize: '1.3rem',
                  color: '#fff', margin: '0 0 1.4rem',
                }}>
                  {isAr ? plan.nameAr : plan.nameEn}
                </h3>

                {/* Price */}
                <div style={{ marginBottom: '1.8rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
                    <span style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 'clamp(2rem, 4vw, 2.8rem)',
                      fontWeight: 700,
                      color: isHighlighted ? plan.color : '#ffffff',
                      lineHeight: 1,
                    }}>
                      ${plan.price}
                    </span>
                    <span style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: '0.72rem',
                      color: 'rgba(255,255,255,0.28)',
                      marginBottom: 7,
                    }}>
                      {isAr ? '/ شهر' : '/ mo'}
                    </span>
                  </div>
                </div>

                {/* Features */}
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 auto', flex: 1 }}>
                  {features.map((f, fi) => (
                    <li key={fi} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 8,
                      fontSize: '0.83rem', color: 'rgba(255,255,255,0.5)',
                      marginBottom: '0.65rem', lineHeight: 1.5,
                    }}>
                      <IconCheck color={plan.color} />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <a
                  href={plan.key === 'enterprise'
                    ? `https://wa.me/${WHATSAPP_NUMBER}`
                    : '#lead-form'}
                  onClick={plan.key !== 'enterprise' ? (e) => {
                    e.preventDefault();
                    document.getElementById('lead-form')?.scrollIntoView({ behavior: 'smooth' });
                  } : undefined}
                  style={{
                    display: 'block', textAlign: 'center',
                    marginTop: '1.8rem',
                    fontFamily: "'Space Mono', monospace",
                    fontSize: '0.7rem', letterSpacing: '0.1em',
                    textTransform: 'uppercase', fontWeight: 700,
                    padding: '0.9rem 1.5rem',
                    textDecoration: 'none',
                    background: isHighlighted ? plan.color : 'transparent',
                    color: isHighlighted ? '#fff' : plan.color,
                    border: `1px solid ${isHighlighted ? plan.color : `${plan.color}50`}`,
                    boxShadow: isHighlighted ? `0 0 24px ${plan.color}55` : 'none',
                    transition: 'all 0.22s',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = plan.color;
                    e.currentTarget.style.color = '#fff';
                    e.currentTarget.style.boxShadow = `0 0 32px ${plan.color}80`;
                    e.currentTarget.style.borderColor = plan.color;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = isHighlighted ? plan.color : 'transparent';
                    e.currentTarget.style.color = isHighlighted ? '#fff' : plan.color;
                    e.currentTarget.style.boxShadow = isHighlighted ? `0 0 24px ${plan.color}55` : 'none';
                    e.currentTarget.style.borderColor = isHighlighted ? plan.color : `${plan.color}50`;
                  }}
                >
                  {isAr ? plan.ctaAr : plan.ctaEn}
                </a>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── COMPARISON TABLE ───────────────────────────────────── */}
      <section dir={isAr ? 'rtl' : 'ltr'} style={{ padding: '5rem 2rem' }}>
        <div style={S.divider} />
        <div style={S.wrap}>
          <p data-reveal style={S.label}>
            <span style={S.line} />
            {isAr ? 'مقارنة المنافسين' : 'How we compare'}
          </p>
          <h2 data-reveal style={S.h2}>
            {isAr ? 'لماذا SalmanSaaS؟' : 'Why SalmanSaaS?'}
          </h2>
          <p data-reveal style={{ ...S.sub, marginBottom: '2.5rem' }}>
            {isAr
              ? 'بُنيت للسوق العربي — ليس ترجمة لمنتج غربي.'
              : 'Built for the Arab market — not a translation of a western product.'}
          </p>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table
              ref={tableRef}
              style={{
                width: '100%', borderCollapse: 'collapse',
                fontFamily: "'Space Mono', monospace",
                fontSize: '0.75rem',
              }}
            >
              <thead>
                <tr>
                  <th style={{ ...thStyle, textAlign: isAr ? 'right' : 'left', color: 'rgba(255,255,255,0.35)' }}>
                    {isAr ? 'الميزة' : 'Feature'}
                  </th>
                  {['SalmanSaaS', 'Bolt', 'Shopify', 'Bubble'].map(h => (
                    <th key={h} style={{
                      ...thStyle,
                      color: h === 'SalmanSaaS' ? '#ff1a55' : 'rgba(255,255,255,0.28)',
                      textAlign: 'center',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr key={i} style={{
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                    background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
                  }}>
                    <td style={{
                      ...tdStyle,
                      textAlign: isAr ? 'right' : 'left',
                      color: 'rgba(255,255,255,0.55)',
                      fontFamily: "'Cairo', sans-serif",
                      fontSize: '0.83rem',
                    }}>
                      {isAr ? row.featureAr : row.featureEn}
                    </td>
                    {[row.us, row.bolt, row.shopify, row.bubble].map((val, ci) => (
                      <td key={ci} style={{ ...tdStyle, textAlign: 'center' }}>
                        {val
                          ? <span style={{ display: 'flex', justifyContent: 'center' }}><IconCheck color={ci === 0 ? '#ff1a55' : '#6b7280'} /></span>
                          : <span style={{ display: 'flex', justifyContent: 'center' }}><IconX /></span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── LEAD FORM ──────────────────────────────────────────── */}
      <section id="lead-form" dir={isAr ? 'rtl' : 'ltr'} style={{ padding: '2rem 2rem 6rem' }}>
        <div style={S.divider} />
        <div style={{ ...S.wrap, maxWidth: 600 }}>
          <p data-reveal style={S.label}>
            <span style={S.line} />
            {isAr ? 'ابدأ اليوم' : 'Start Today'}
          </p>
          <h2 data-reveal style={S.h2}>
            {isAr
              ? <>موقعك جاهز <span style={{ color: '#ff1a55' }}>خلال 24 ساعة</span></>
              : <>Your site, ready in <span style={{ color: '#ff1a55' }}>24 hours</span></>}
          </h2>
          <p data-reveal style={{ ...S.sub, marginBottom: '2rem' }}>
            {isAr
              ? 'أرسل لنا معلوماتك وسنتواصل معك على واتساب لنبدأ فوراً.'
              : 'Send us your info and we\'ll reach out on WhatsApp to get started.'}
          </p>

          {submitted ? (
            <div ref={formRef} style={{
              padding: '2.5rem',
              background: 'rgba(255,26,85,0.05)',
              border: '1px solid rgba(255,26,85,0.25)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>✅</div>
              <p style={{
                fontFamily: "'Cairo', sans-serif",
                fontWeight: 700, fontSize: '1.1rem', color: '#fff',
                margin: '0 0 0.4rem',
              }}>
                {isAr ? 'تم الإرسال!' : 'Sent!'}
              </p>
              <p style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)',
              }}>
                {isAr ? 'سنتواصل معك على واتساب قريباً.' : 'We\'ll reach you on WhatsApp soon.'}
              </p>
            </div>
          ) : (
            <form ref={formRef} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Name */}
              <div>
                <label style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: '0.6rem', letterSpacing: '0.14em',
                  color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase',
                  display: 'block', marginBottom: '0.4rem',
                }}>
                  {isAr ? 'الاسم' : 'Name'}
                </label>
                <input
                  required
                  type="text"
                  placeholder={isAr ? 'اسمك الكامل' : 'Your full name'}
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  style={S.inputBase}
                  onFocus={e => (e.target.style.borderColor = 'rgba(255,26,85,0.45)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
              </div>

              {/* WhatsApp */}
              <div>
                <label style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: '0.6rem', letterSpacing: '0.14em',
                  color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase',
                  display: 'block', marginBottom: '0.4rem',
                }}>
                  {isAr ? 'رقم واتساب' : 'WhatsApp Number'}
                </label>
                <input
                  required
                  type="tel"
                  placeholder="+961 XX XXX XXX"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  style={{ ...S.inputBase, direction: 'ltr' }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(255,26,85,0.45)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
              </div>

              {/* Business type */}
              <div>
                <label style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: '0.6rem', letterSpacing: '0.14em',
                  color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase',
                  display: 'block', marginBottom: '0.4rem',
                }}>
                  {isAr ? 'نوع العمل' : 'Business Type'}
                </label>
                <select
                  required
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  style={{
                    ...S.inputBase,
                    cursor: 'pointer',
                    colorScheme: 'dark',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(255,26,85,0.45)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                >
                  <option value="" style={{ background: '#090412' }}>
                    {isAr ? '— اختر —' : '— Select —'}
                  </option>
                  {(isAr ? BUSINESS_TYPES_AR : BUSINESS_TYPES_EN).map(t => (
                    <option key={t} value={t} style={{ background: '#090412' }}>{t}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                style={{
                  marginTop: '0.5rem',
                  background: '#ff1a55',
                  color: '#fff',
                  border: 'none',
                  padding: '1rem 2rem',
                  fontFamily: "'Cairo', sans-serif",
                  fontWeight: 700, fontSize: '0.9rem',
                  cursor: 'pointer',
                  boxShadow: '0 0 28px rgba(255,26,85,0.4)',
                  transition: 'box-shadow 0.25s, background 0.2s',
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 10,
                  width: '100%',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#ff2d6a';
                  e.currentTarget.style.boxShadow = '0 0 42px rgba(255,26,85,0.65)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#ff1a55';
                  e.currentTarget.style.boxShadow = '0 0 28px rgba(255,26,85,0.4)';
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.115 1.523 5.845L0 24l6.335-1.492A11.942 11.942 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.6a9.577 9.577 0 01-4.911-1.348l-.352-.208-3.763.886.938-3.658-.228-.375A9.563 9.563 0 012.4 12c0-5.295 4.305-9.6 9.6-9.6 5.295 0 9.6 4.305 9.6 9.6 0 5.295-4.305 9.6-9.6 9.6z" />
                </svg>
                {isAr ? 'ابدأ على واتساب ←' : 'Start on WhatsApp →'}
              </button>

              <p style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: '0.6rem', color: 'rgba(255,255,255,0.18)',
                textAlign: 'center', letterSpacing: '0.04em',
              }}>
                {isAr
                  ? 'لا عقود · لا بطاقة ائتمانية مطلوبة'
                  : 'No contract · No credit card required'}
              </p>
            </form>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}

// ── Table cell styles ─────────────────────────────────────────────────────
const thStyle = {
  padding: '0.85rem 1rem',
  fontWeight: 700, letterSpacing: '0.1em',
  textTransform: 'uppercase', fontSize: '0.62rem',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
};

const tdStyle = {
  padding: '0.85rem 1rem',
};

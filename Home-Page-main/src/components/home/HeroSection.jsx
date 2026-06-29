import React, { useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';

// ── Inline mockup previews (no broken image URLs) ─────────────────────────────

const BookingMockup = ({ isAr }) => (
  <div style={{ fontFamily: 'Cairo, sans-serif', color: '#fff', width: '100%', padding: '0 4px' }}>
    <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'Space Mono, monospace', letterSpacing: '0.12em', marginBottom: '10px', textTransform: 'uppercase' }}>
      {isAr ? 'اختر موعدك' : 'Select a date'}
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '14px' }}>
      {['س','ن','ث','ر','خ','ج','سب'].map((d, i) => (
        <div key={i} style={{ textAlign: 'center', fontSize: '0.52rem', color: 'rgba(255,255,255,0.3)', padding: '3px 0' }}>{d}</div>
      ))}
      {[...Array(31)].map((_, i) => {
        const active = i === 14;
        const dimmed = i < 3 || i > 27;
        return (
          <div key={i} style={{
            textAlign: 'center', fontSize: '0.62rem', padding: '4px 2px', borderRadius: '5px',
            background: active ? '#ff1a55' : 'transparent',
            color: active ? '#fff' : dimmed ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.7)',
            fontWeight: active ? '700' : '400',
            boxShadow: active ? '0 0 10px rgba(255,26,85,0.5)' : 'none',
          }}>{i + 1}</div>
        );
      })}
    </div>
    <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'Space Mono, monospace', letterSpacing: '0.1em', marginBottom: '8px', textTransform: 'uppercase' }}>
      {isAr ? 'أوقات متاحة' : 'Available slots'}
    </div>
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      {['10:00', '11:30', '14:00', '15:30', '17:00'].map((t, i) => (
        <div key={i} style={{
          padding: '4px 8px', borderRadius: '6px', fontSize: '0.6rem', fontFamily: 'Space Mono, monospace',
          background: i === 2 ? 'rgba(255,26,85,0.25)' : 'rgba(255,255,255,0.05)',
          border: `1px solid ${i === 2 ? 'rgba(255,26,85,0.6)' : 'rgba(255,255,255,0.08)'}`,
          color: i === 2 ? '#ff1a55' : 'rgba(255,255,255,0.6)',
        }}>{t}</div>
      ))}
    </div>
    <div style={{ marginTop: '14px', padding: '8px 14px', borderRadius: '8px', background: '#ff1a55', textAlign: 'center', fontSize: '0.62rem', fontWeight: '700', letterSpacing: '0.08em', boxShadow: '0 0 18px rgba(255,26,85,0.45)', cursor: 'pointer' }}>
      {isAr ? 'تأكيد الحجز ←' : 'Confirm Booking →'}
    </div>
  </div>
);

const MenuMockup = ({ isAr }) => {
  const items = isAr
    ? [{ n: 'شاورما لحم', p: '12,000', t: '🥙' }, { n: 'فلافل بيتي', p: '8,000', t: '🧆' }, { n: 'حمص طازج', p: '6,500', t: '🫙' }]
    : [{ n: 'Beef Shawarma', p: '$12', t: '🥙' }, { n: 'Falafel Plate', p: '$8', t: '🧆' }, { n: 'Fresh Hummus', p: '$6', t: '🫙' }];
  const cats = isAr ? ['الكل', 'مشاوي', 'نباتي', 'مشروبات'] : ['All', 'Grills', 'Vegan', 'Drinks'];
  return (
    <div style={{ fontFamily: 'Cairo, sans-serif', width: '100%' }}>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', overflowX: 'auto' }}>
        {cats.map((c, i) => (
          <div key={i} style={{
            padding: '4px 10px', borderRadius: '20px', fontSize: '0.6rem', whiteSpace: 'nowrap',
            background: i === 0 ? '#ff1a55' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${i === 0 ? 'transparent' : 'rgba(255,255,255,0.08)'}`,
            color: i === 0 ? '#fff' : 'rgba(255,255,255,0.5)',
            fontWeight: i === 0 ? '700' : '400',
          }}>{c}</div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
        {items.map((item, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '10px',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
          }}>
            <span style={{ fontSize: '1.2rem' }}>{item.t}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.68rem', color: '#fff', fontWeight: '700' }}>{item.n}</div>
              <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'Space Mono, monospace', marginTop: '1px' }}>{isAr ? 'ل.ل' : 'USD'}</div>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#ff1a55', fontFamily: 'Space Mono, monospace', fontWeight: '700' }}>{item.p}</div>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(255,26,85,0.15)', border: '1px solid rgba(255,26,85,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: '#ff1a55' }}>+</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const StoreMockup = ({ isAr }) => {
  const products = isAr
    ? [{ n: 'حذاء رياضي', p: '95$', badge: 'جديد' }, { n: 'حقيبة جلد', p: '120$', badge: null }, { n: 'نظارة شمسية', p: '45$', badge: '-20%' }, { n: 'ساعة كلاسيك', p: '200$', badge: null }]
    : [{ n: 'Sneakers', p: '$95', badge: 'New' }, { n: 'Leather Bag', p: '$120', badge: null }, { n: 'Sunglasses', p: '$45', badge: '-20%' }, { n: 'Classic Watch', p: '$200', badge: null }];
  return (
    <div style={{ fontFamily: 'Cairo, sans-serif', width: '100%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px' }}>
        {products.map((p, i) => (
          <div key={i} style={{ borderRadius: '10px', overflow: 'hidden', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', position: 'relative' }}>
            <div style={{ height: '52px', background: `rgba(255,26,85,${0.04 + i * 0.02})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
              {['👟', '👜', '🕶️', '⌚'][i]}
            </div>
            {p.badge && (
              <div style={{ position: 'absolute', top: '5px', left: isAr ? 'auto' : '5px', right: isAr ? '5px' : 'auto', background: '#ff1a55', color: '#fff', fontSize: '0.48rem', padding: '1px 5px', borderRadius: '4px', fontFamily: 'Space Mono, monospace', fontWeight: '700' }}>{p.badge}</div>
            )}
            <div style={{ padding: '6px 7px' }}>
              <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.8)', fontWeight: '700', marginBottom: '2px' }}>{p.n}</div>
              <div style={{ fontSize: '0.6rem', color: '#ff1a55', fontFamily: 'Space Mono, monospace', fontWeight: '700' }}>{p.p}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────

const MOCKUPS = { bookings: BookingMockup, menu: MenuMockup, store: StoreMockup };

const HeroSection = () => {
  const { lang } = useTranslation();
  const isAr = lang === 'ar';
  const [activeTab, setActiveTab] = useState('bookings');
  const [email, setEmail] = useState('');

  const whatsappNumber = '96178727986';
  const ActiveMockup = MOCKUPS[activeTab];

  const tabs = [
    { key: 'bookings', ar: 'حجوزات', en: 'Bookings' },
    { key: 'menu',     ar: 'قائمة طعام', en: 'Menu' },
    { key: 'store',    ar: 'متجر', en: 'Store' },
  ];

  const handleEmail = () => {
    if (!email) return;
    window.location.href = `mailto:salman.houssam@gmail.com?subject=SalmanSaaS Inquiry&body=Email: ${email}`;
  };

  return (
    <header
      dir={isAr ? 'rtl' : 'ltr'}
      className="hero-section relative min-h-screen flex items-center overflow-hidden"
    >
      {/* ── Background: dot grid ── */}
      <div className="hero-grid" aria-hidden="true" />

      {/* ── Background: positioned orbs ── */}
      <div className="hero-orb hero-orb--red"   aria-hidden="true" />
      <div className="hero-orb hero-orb--purple" aria-hidden="true" />

      {/* ── Content ── */}
      <div
        className="relative z-10 w-full max-w-[1100px] mx-auto px-6 py-24"
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', alignItems: 'center' }}
      >
        {/* ── Left: Text ── */}
        <div>
          {/* Section label */}
          <div className="hero-label">
            <span className="hero-label__line" />
            <span>{isAr ? 'وكلاء ذكيون' : 'AI AGENTS'}</span>
            <span className="hero-label__line" />
          </div>

          {/* Headline */}
          <h1 className="hero-h1">
            {isAr ? (
              <>
                أتمتة كاملة<br />
                <span className="hero-accent">لعملك</span>{' '}
                عبر واتساب
              </>
            ) : (
              <>
                Full Automation<br />
                for Your Business<br />
                <span className="hero-accent">via WhatsApp</span>
              </>
            )}
          </h1>

          {/* Body */}
          <p className="hero-body">
            {isAr
              ? 'وكلاء ذكيون يديرون حجوزاتك، قوائم طعامك، ومتجرك — على مدار الساعة، بدون كود، بدون تعقيد.'
              : 'Intelligent agents manage your bookings, menu, and store — 24/7, no code, no complexity.'}
          </p>

          {/* Email CTA */}
          <div className="hero-input-row">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleEmail()}
              placeholder={isAr ? 'بريدك الإلكتروني' : 'your@email.com'}
              className="hero-input"
            />
            <button onClick={handleEmail} className="hero-btn-ghost">
              {isAr ? 'إرسال' : 'Send'}
            </button>
          </div>

          {/* WhatsApp button */}
          <a
            href={`https://wa.me/${whatsappNumber}?text=${isAr ? 'مرحباً، أريد معرفة المزيد عن SalmanSaaS' : 'Hi, I want to learn more about SalmanSaaS'}`}
            target="_blank"
            rel="noreferrer"
            className="hero-btn-primary"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.557 4.118 1.528 5.847L.057 23.882a.5.5 0 0 0 .615.611l6.102-1.606A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.944 9.944 0 0 1-5.058-1.38l-.362-.214-3.747.986.998-3.662-.234-.376A9.944 9.944 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
            </svg>
            {isAr ? 'تحدث معنا عبر واتساب' : 'Chat on WhatsApp'}
          </a>

          {/* Trust line */}
          <p className="hero-trust">
            {isAr ? '✓ بدون رسوم إعداد  ✓ جاهز خلال 24 ساعة  ✓ بدون عمولة' : '✓ No setup fee  ✓ Live in 24h  ✓ Zero commission'}
          </p>
        </div>

        {/* ── Right: Interactive preview ── */}
        <div className="hero-preview">
          {/* Glass panel */}
          <div className="hero-panel">
            {/* Panel header */}
            <div className="hero-panel__header">
              {/* Tabs */}
              <div className="hero-tabs">
                {tabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`hero-tab ${activeTab === tab.key ? 'hero-tab--active' : ''}`}
                  >
                    {isAr ? tab.ar : tab.en}
                  </button>
                ))}
              </div>

              {/* Status dot */}
              <div className="hero-status">
                <span className="hero-status__dot" />
                <span>{isAr ? 'مباشر' : 'Live'}</span>
              </div>
            </div>

            {/* Mockup area */}
            <div className="hero-panel__body">
              <ActiveMockup isAr={isAr} />
            </div>

            {/* WhatsApp confirmation strip */}
            <div className="hero-panel__footer">
              <span className="hero-panel__footer-icon">💬</span>
              <span>{isAr ? 'تأكيد تلقائي عبر واتساب' : 'Auto-confirmed via WhatsApp'}</span>
            </div>
          </div>

          {/* Floating badge */}
          <div className="hero-badge">
            <span className="hero-badge__num">24/7</span>
            <span className="hero-badge__label">{isAr ? 'وكيل ذكي نشط' : 'AI Agent Active'}</span>
          </div>
        </div>
      </div>

      {/* ── Bottom fade ── */}
      <div className="hero-fade-bottom" aria-hidden="true" />
    </header>
  );
};

export default HeroSection;

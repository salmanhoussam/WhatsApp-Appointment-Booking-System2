import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';

// ── Demo URLs (canonical — work on localhost + demo.salmansaas.com) ────────────
const DEMO_URLS = {
  booking:    '/smar/showcase',
  restaurant: '/caracas/menu',
  store:      '/footlab/store',
};

const SERVICES = [
  {
    num: '01',
    emoji: '📅',
    titleAr: 'نظام الحجز الذكي المربوط بواتساب',
    titleEn: 'Smart WhatsApp Booking System',
    descAr: 'نظام متكامل لحجز المواعيد عبر الإنترنت وربطها مباشرة مع واتساب Business API. لوحة تحكم شاملة + تنبيهات تلقائية.',
    descEn: 'Full appointment booking via WhatsApp Business API. Dashboard, client management, and automated alerts.',
    ctaAr: 'جرّب الديمو ←',
    ctaEn: 'Try Demo →',
    demo: DEMO_URLS.booking,
    accent: '#3b82f6',
    statAr: 'أتمتة ١٠٠٪',
    statEn: '100% Automated',
  },
  {
    num: '02',
    emoji: '🍔',
    titleAr: 'المنيو الذكي للمطاعم',
    titleEn: 'Smart Restaurant Menu',
    descAr: 'منيو رقمي بـ QR Code، طلبات فورية عبر واتساب، لوحة إدارة مباشرة. لا تطبيق مطلوب.',
    descEn: 'QR digital menu, WhatsApp instant orders, live management dashboard. No app required.',
    ctaAr: 'جرّب المطعم ←',
    ctaEn: 'See Restaurant Demo →',
    demo: DEMO_URLS.restaurant,
    accent: '#f59e0b',
    statAr: '+٤٠٪ مبيعات',
    statEn: '+40% Sales',
  },
  {
    num: '03',
    emoji: '📦',
    titleAr: 'المتجر الإلكتروني الكامل',
    titleEn: 'Full E-Commerce Store',
    descAr: 'متجر بيع كامل مع عربة تسوق، دفع إلكتروني، تتبع مخزون، ربط بواتساب. جاهز في ٢٤ ساعة.',
    descEn: 'Complete store with cart, payments, inventory, and WhatsApp integration. Live in 24 hours.',
    ctaAr: 'جرّب المتجر ←',
    ctaEn: 'See Store Demo →',
    demo: DEMO_URLS.store,
    accent: '#22c55e',
    statAr: '٢٤/٧ بيع',
    statEn: '24/7 Sales',
  },
];

const ServicesSection = () => {
  const { lang } = useTranslation();
  const isAr = lang === 'ar';

  return (
    <section id="services-section" className="py-24 border-t border-purple-900/30">
      <div className="container mx-auto px-6">

        {/* Heading */}
        <div className="text-center mb-16">
          <p className="text-xs font-bold tracking-widest uppercase text-red-400 mb-3" style={{ fontFamily: "'Space Mono', monospace" }}>
            {isAr ? 'خدماتنا' : 'Our Services'}
          </p>
          <h2 className="text-5xl md:text-6xl font-black text-white mb-6 tracking-tight">
            {isAr ? 'ثلاثة أنظمة، نتائج فورية' : 'Three Systems, Instant Results'}
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            {isAr
              ? 'اختر النظام المناسب لعملك — وانطلق خلال ٢٤ ساعة'
              : 'Pick the right system for your business — go live in 24 hours'}
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {SERVICES.map((svc) => (
            <div
              key={svc.num}
              className="relative p-8 rounded-2xl transition-all duration-300 overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${svc.accent}22` }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = `${svc.accent}66`;
                e.currentTarget.style.boxShadow   = `0 0 40px ${svc.accent}18`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = `${svc.accent}22`;
                e.currentTarget.style.boxShadow   = 'none';
              }}
            >
              {/* Stat badge */}
              <div className="absolute top-4 text-xs font-bold tracking-wider px-3 py-1"
                style={{
                  [isAr ? 'left' : 'right']: '1rem',
                  background: `${svc.accent}18`, border: `1px solid ${svc.accent}44`,
                  color: svc.accent, fontFamily: "'Space Mono', monospace",
                }}>
                {isAr ? svc.statAr : svc.statEn}
              </div>

              {/* Watermark number */}
              <div style={{
                position: 'absolute', top: '0.5rem',
                [isAr ? 'right' : 'left']: '1rem',
                fontSize: '5rem', fontWeight: 900, lineHeight: 1,
                color: `${svc.accent}0d`, fontFamily: "'Space Mono', monospace",
                pointerEvents: 'none', userSelect: 'none',
              }}>
                {svc.num}
              </div>

              <div className="text-4xl mb-4 mt-4">{svc.emoji}</div>

              <span className="text-xs tracking-widest uppercase mb-2 block font-bold"
                style={{ color: svc.accent, fontFamily: "'Space Mono', monospace" }}>
                SVC_{svc.num}
              </span>

              <h3 className="text-xl font-black text-white mb-3 leading-tight">
                <span style={{ color: svc.accent }}>◆ </span>
                {isAr ? svc.titleAr : svc.titleEn}
              </h3>

              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                {isAr ? svc.descAr : svc.descEn}
              </p>

              {/* Live demo link */}
              <a
                href={svc.demo}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  color: svc.accent, fontFamily: "'Cairo', sans-serif",
                  fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none',
                  borderBottom: `1px solid ${svc.accent}55`, paddingBottom: '2px',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
              >
                {isAr ? svc.ctaAr : svc.ctaEn}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;

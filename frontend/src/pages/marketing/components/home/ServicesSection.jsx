import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '../../hooks/useTranslation';

const DEMO_URLS = {
  booking:    '/smar/showcase',
  restaurant: '/caracas/menu',
  store:      '/footlab/store',
};

const SERVICES = [
  {
    num: '01',
    key: 'booking',
    titleAr: 'نظام الحجز الذكي',
    titleEn: 'Smart Booking System',
    descAr: 'حجز المواعيد أوتوماتيكياً عبر واتساب Business API — لوحة تحكم، إدارة عملاء، تنبيهات فورية.',
    descEn: 'Auto-booking via WhatsApp Business API. Dashboard, client management, instant alerts.',
    ctaAr: 'جرّب الديمو ←',
    ctaEn: 'Try Demo →',
    demo: DEMO_URLS.booking,
    accent: '#3b82f6',
    statAr: 'أتمتة ١٠٠٪',
    statEn: '100% Automated',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
        <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
      </svg>
    ),
  },
  {
    num: '02',
    key: 'restaurant',
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
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
        <line x1="6" y1="1" x2="6" y2="4" />
        <line x1="10" y1="1" x2="10" y2="4" />
        <line x1="14" y1="1" x2="14" y2="4" />
      </svg>
    ),
  },
  {
    num: '03',
    key: 'store',
    titleAr: 'المتجر الإلكتروني الكامل',
    titleEn: 'Full E-Commerce Store',
    descAr: 'متجر بيع مع عربة تسوق، دفع إلكتروني، تتبع مخزون، ربط بواتساب. جاهز في ٢٤ ساعة.',
    descEn: 'Complete store with cart, payments, inventory, and WhatsApp integration. Live in 24 hours.',
    ctaAr: 'جرّب المتجر ←',
    ctaEn: 'See Store Demo →',
    demo: DEMO_URLS.store,
    accent: '#22c55e',
    statAr: '٢٤/٧ بيع',
    statEn: '24/7 Sales',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
];

const cardVariants = {
  hidden:  { opacity: 0, y: 32 },
  visible: (i) => ({
    opacity: 1, y: 0,
    transition: { type: 'spring', stiffness: 70, damping: 20, mass: 1.5, delay: i * 0.12 },
  }),
};

export default function ServicesSection() {
  const { lang } = useTranslation();
  const isAr = lang === 'ar';

  return (
    <section
      id="services"
      dir={isAr ? 'rtl' : 'ltr'}
      style={{ padding: '6rem 2rem', background: '#060b18', position: 'relative', overflow: 'hidden' }}
    >
      {/* Top divider */}
      <div style={{ height: '1px', background: 'linear-gradient(90deg,transparent,rgba(255,26,85,0.2),transparent)', marginBottom: '5rem' }} />

      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* Section label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <span style={{ display: 'block', width: '28px', height: '1px', background: '#ff1a55' }} />
          <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#ff1a55' }}>
            ◆ {isAr ? 'خدماتنا — ثلاثة أنظمة' : 'OUR SERVICES — THREE SYSTEMS'}
          </span>
          <span style={{ display: 'block', width: '28px', height: '1px', background: '#ff1a55' }} />
        </div>

        <h2 style={{ fontFamily: 'Cairo, sans-serif', fontSize: 'clamp(1.9rem,4.5vw,3rem)', fontWeight: 900, color: '#fff', margin: '0 0 12px', letterSpacing: '-0.01em' }}>
          {isAr ? 'ثلاثة أنظمة، نتائج فورية' : 'Three Systems, Instant Results'}
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.42)', lineHeight: 1.7, marginBottom: '3.5rem', maxWidth: '52ch' }}>
          {isAr
            ? 'اختر النظام المناسب لعملك — وانطلق خلال ٢٤ ساعة'
            : 'Pick the right system for your business — go live in 24 hours'}
        </p>

        {/* Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '1.5rem' }}>
          {SERVICES.map((svc, i) => (
            <motion.div
              key={svc.num}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              whileHover={{ borderColor: `${svc.accent}55`, boxShadow: `0 0 40px ${svc.accent}14` }}
              transition={{ type: 'spring', stiffness: 200, damping: 22 }}
              style={{
                background: 'rgba(255,255,255,0.025)',
                border: `1px solid ${svc.accent}20`,
                borderRadius: '16px',
                padding: '32px 28px',
                position: 'relative',
                overflow: 'hidden',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
              }}
            >
              {/* Watermark number */}
              <div style={{
                position: 'absolute', top: '8px',
                [isAr ? 'right' : 'left']: '16px',
                fontFamily: 'Space Mono, monospace', fontSize: '5rem', fontWeight: 900,
                color: `${svc.accent}08`, lineHeight: 1, userSelect: 'none', pointerEvents: 'none',
              }}>
                {svc.num}
              </div>

              {/* Top accent line */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, ${svc.accent}, transparent)` }} />

              {/* Stat badge */}
              <div style={{
                position: 'absolute', top: '16px',
                [isAr ? 'left' : 'right']: '16px',
                background: `${svc.accent}15`, border: `1px solid ${svc.accent}35`,
                borderRadius: '4px', padding: '3px 10px',
                fontFamily: 'Space Mono, monospace', fontSize: '0.58rem',
                textTransform: 'uppercase', letterSpacing: '0.12em', color: svc.accent,
              }}>
                {isAr ? svc.statAr : svc.statEn}
              </div>

              {/* Icon */}
              <div style={{
                width: '44px', height: '44px', borderRadius: '10px',
                background: `${svc.accent}12`, border: `1px solid ${svc.accent}25`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: svc.accent, marginBottom: '20px', marginTop: '8px',
              }}>
                {svc.icon}
              </div>

              {/* SVC label */}
              <div style={{
                fontFamily: 'Space Mono, monospace', fontSize: '0.6rem',
                textTransform: 'uppercase', letterSpacing: '0.14em',
                color: svc.accent, marginBottom: '10px',
              }}>
                SVC_{svc.num}
              </div>

              <h3 style={{ fontFamily: 'Cairo, sans-serif', fontSize: '1.2rem', fontWeight: 700, color: '#fff', margin: '0 0 10px', letterSpacing: '-0.01em' }}>
                {isAr ? svc.titleAr : svc.titleEn}
              </h3>

              <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, margin: '0 0 24px' }}>
                {isAr ? svc.descAr : svc.descEn}
              </p>

              <a
                href={svc.demo}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  fontFamily: 'Space Mono, monospace', fontSize: '0.68rem',
                  textTransform: 'uppercase', letterSpacing: '0.1em',
                  color: svc.accent, textDecoration: 'none',
                  borderBottom: `1px solid ${svc.accent}44`, paddingBottom: '2px',
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.7'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
              >
                {isAr ? svc.ctaAr : svc.ctaEn}
              </a>
            </motion.div>
          ))}
        </div>

        {/* Bottom trust strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 70, damping: 20, mass: 1.5, delay: 0.4 }}
          style={{
            marginTop: '2.5rem', padding: '18px 28px',
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '12px', display: 'flex', flexWrap: 'wrap', gap: '1.5rem',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          {[
            { ar: 'بدون برمجة', en: 'Zero coding' },
            { ar: 'جاهز في ٢٤ ساعة', en: 'Live in 24 hours' },
            { ar: 'دعم عربي ٢٤/٧', en: 'Arabic support 24/7' },
            { ar: 'بدون عقد ملزم', en: 'No binding contract' },
          ].map(item => (
            <div key={item.en} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <span style={{ color: '#ff1a55', fontSize: '0.65rem' }}>◆</span>
              <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.65rem', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {isAr ? item.ar : item.en}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

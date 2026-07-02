import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '../../hooks/useTranslation';

const BUSINESSES = [
  {
    id: 'booking',
    accent: '#3b82f6',
    iconPath: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z',
    nameAr: 'شاليهات وفلل',
    nameEn: 'Chalets & Villas',
    featuresAr: ['حجز أوتوماتيكي', 'تقويم ذكي', 'دفع عبر واتساب', 'تقارير حية'],
    featuresEn: ['Auto-booking', 'Smart calendar', 'WhatsApp payment', 'Live reports'],
    demoUrl: '/smar/showcase',
    demoLabelAr: 'شاهد Beit Smar',
    demoLabelEn: 'View Beit Smar',
  },
  {
    id: 'restaurant',
    accent: '#f59e0b',
    iconPath: 'M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3',
    nameAr: 'مطاعم وكافيهات',
    nameEn: 'Restaurants & Cafés',
    featuresAr: ['قائمة رقمية', 'طلبات واتساب', 'إدارة المخزون', 'فاتورة تلقائية'],
    featuresEn: ['Digital menu', 'WhatsApp orders', 'Inventory mgmt', 'Auto invoice'],
    demoUrl: '/caracas/menu',
    demoLabelAr: 'شاهد Caracas',
    demoLabelEn: 'View Caracas',
  },
  {
    id: 'store',
    accent: '#22c55e',
    iconPath: 'M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z M3 6h18 M16 10a4 4 0 01-8 0',
    nameAr: 'متاجر إلكترونية',
    nameEn: 'Online Stores',
    featuresAr: ['كتالوج رقمي', 'سلة واتساب', 'تتبع الطلبات', 'كوبونات تلقائية'],
    featuresEn: ['Digital catalog', 'WhatsApp cart', 'Order tracking', 'Auto coupons'],
    demoUrl: '/footlab/store',
    demoLabelAr: 'شاهد Footlab',
    demoLabelEn: 'View Footlab',
  },
  {
    id: 'clinic',
    accent: '#a855f7',
    iconPath: 'M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18',
    nameAr: 'عيادات وخدمات',
    nameEn: 'Clinics & Services',
    featuresAr: ['مواعيد أوتوماتيك', 'تذكير SMS', 'ملفات عملاء', 'تقارير شهرية'],
    featuresEn: ['Auto appointments', 'SMS reminder', 'Client files', 'Monthly reports'],
    demoUrl: null,
    demoLabelAr: 'قريباً',
    demoLabelEn: 'Coming soon',
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i) => ({
    opacity: 1, y: 0,
    transition: { type: 'spring', stiffness: 70, damping: 20, mass: 1.5, delay: i * 0.1 },
  }),
};

export default function UseCasesSection() {
  const { lang } = useTranslation();
  const isAr = lang === 'ar';

  return (
    <section
      dir={isAr ? 'rtl' : 'ltr'}
      style={{ padding: '6rem 2rem', background: '#060b18', position: 'relative' }}
    >
      {/* Divider */}
      <div style={{ height: '1px', background: 'linear-gradient(90deg,transparent,rgba(255,26,85,0.15),transparent)', marginBottom: '5rem' }} />

      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <span style={{ display: 'block', width: '28px', height: '1px', background: '#ff1a55' }} />
          <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#ff1a55' }}>
            ◆ {isAr ? 'لأي نشاط تجاري؟' : 'WHICH BUSINESS TYPE?'}
          </span>
          <span style={{ display: 'block', width: '28px', height: '1px', background: '#ff1a55' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>
          {/* Left: heading */}
          <div>
            <h2 style={{ fontFamily: 'Cairo, sans-serif', fontSize: 'clamp(1.9rem, 4.5vw, 3rem)', fontWeight: 900, color: '#fff', margin: '0 0 14px', letterSpacing: '-0.01em', lineHeight: 1.1 }}>
              {isAr ? 'مهما كان نشاطك — المنصة تكيّف معك' : 'Whatever Your Business — the Platform Adapts'}
            </h2>
            <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, maxWidth: '48ch' }}>
              {isAr
                ? 'لا تحتاج تعديل كود أو مطور. اختر نوع نشاطك وانطلق خلال 24 ساعة.'
                : 'No code changes, no developer. Pick your business type and launch in 24 hours.'}
            </p>
          </div>
          {/* Right: stat */}
          <div style={{ textAlign: isAr ? 'left' : 'right' }}>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '3rem', fontWeight: 700, color: '#ff1a55', lineHeight: 1 }}>4+</div>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: '4px' }}>
              {isAr ? 'أنواع أعمال مدعومة' : 'BUSINESS TYPES SUPPORTED'}
            </div>
          </div>
        </div>

        {/* Business cards grid — خمسات-inspired */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          style={{ marginTop: '3rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}
        >
          {BUSINESSES.map((b, i) => (
            <motion.div
              key={b.id}
              custom={i}
              variants={cardVariants}
              whileHover={{ y: -6, borderColor: `${b.accent}40` }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '26px 22px', display: 'flex', flexDirection: 'column', gap: '16px', cursor: 'default', position: 'relative', overflow: 'hidden' }}
            >
              {/* Accent top line on hover — done with inline transition */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, ${b.accent}, transparent)`, opacity: 0.5 }} />

              {/* Icon */}
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${b.accent}15`, border: `1px solid ${b.accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={b.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  {b.iconPath.split(' M').map((d, idx) => (
                    <path key={idx} d={idx === 0 ? d : 'M' + d} />
                  ))}
                </svg>
              </div>

              {/* Name */}
              <div>
                <h3 style={{ fontFamily: 'Cairo, sans-serif', fontSize: '1rem', fontWeight: 700, color: '#fff', margin: '0 0 14px' }}>
                  {isAr ? b.nameAr : b.nameEn}
                </h3>
                {/* Features */}
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {(isAr ? b.featuresAr : b.featuresEn).map((f) => (
                    <li key={f} style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', fontFamily: 'Cairo, sans-serif' }}>
                      <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: b.accent, flexShrink: 0 }} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Demo link */}
              {b.demoUrl ? (
                <a
                  href={b.demoUrl}
                  style={{ marginTop: 'auto', display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'Space Mono, monospace', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: b.accent, textDecoration: 'none', opacity: 0.8 }}
                >
                  {isAr ? b.demoLabelAr : b.demoLabelEn}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </a>
              ) : (
                <span style={{ marginTop: 'auto', fontFamily: 'Space Mono, monospace', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.2)' }}>
                  {isAr ? b.demoLabelAr : b.demoLabelEn}
                </span>
              )}
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom note */}
        <p style={{ marginTop: '2rem', textAlign: 'center', fontFamily: 'Space Mono, monospace', fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.08em' }}>
          {isAr ? 'كل الديموهات حية — اضغط وشوف' : 'ALL DEMOS ARE LIVE — CLICK AND SEE'}
        </p>
      </div>
    </section>
  );
}

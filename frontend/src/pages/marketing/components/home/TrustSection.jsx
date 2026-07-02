import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '../../hooks/useTranslation';

/* Upwork-inspired: big stats + real testimonials — NO gradient text */

const STATS = [
  { num: '500+', labelAr: 'نشاط تجاري', labelEn: 'Businesses' },
  { num: '10K+', labelAr: 'معاملة ناجحة', labelEn: 'Transactions' },
  { num: '99.9%', labelAr: 'وقت التشغيل', labelEn: 'Uptime' },
  { num: '10M+', labelAr: 'رسالة واتساب', labelEn: 'WhatsApp Msgs' },
];

const TESTIMONIALS = [
  {
    quoteAr: 'قبل SalmanSaaS كنت أرد على كل عميل يدوياً. الحين الوكيل يشتغل وأنا نايم.',
    quoteEn: 'Before SalmanSaaS I answered every customer manually. Now the agent works while I sleep.',
    nameAr: 'أبو فيصل',
    nameEn: 'Abu Faisal',
    roleAr: 'شاليه مرسى',
    roleEn: 'Marsa Chalets',
    accent: '#3b82f6',
  },
  {
    quoteAr: 'في أول أسبوع جاني 23 طلب عبر واتساب بدون ما أحرك إصبع. الزبائن راضيين.',
    quoteEn: 'In the first week I got 23 orders via WhatsApp without lifting a finger. Customers love it.',
    nameAr: 'أم سامي',
    nameEn: 'Um Sami',
    roleAr: 'مطعم لايم',
    roleEn: 'Lime Restaurant',
    accent: '#f59e0b',
  },
  {
    quoteAr: 'الداشبورد يعطيك صورة كاملة عن المبيعات. ما احتجت محاسب لحساب الأرباح.',
    quoteEn: 'The dashboard gives you a complete picture of sales. No need for an accountant to calculate profits.',
    nameAr: 'خالد الزهراني',
    nameEn: 'Khaled Al-Zahrani',
    roleAr: 'متجر كيك',
    roleEn: 'KayK Store',
    accent: '#22c55e',
  },
];

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const fadeUp = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 70, damping: 20, mass: 1.5 } },
};

export default function TrustSection() {
  const { lang } = useTranslation();
  const isAr = lang === 'ar';

  return (
    <section
      dir={isAr ? 'rtl' : 'ltr'}
      style={{ padding: '6rem 2rem', background: 'linear-gradient(180deg, #07091a 0%, #060b18 100%)', position: 'relative' }}
    >
      {/* Divider */}
      <div style={{ height: '1px', background: 'linear-gradient(90deg,transparent,rgba(255,26,85,0.15),transparent)', marginBottom: '5rem' }} />

      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <span style={{ display: 'block', width: '28px', height: '1px', background: '#ff1a55' }} />
          <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#ff1a55' }}>
            ◆ {isAr ? 'أرقام حقيقية — ثقة مبنية' : 'REAL NUMBERS — BUILT TRUST'}
          </span>
          <span style={{ display: 'block', width: '28px', height: '1px', background: '#ff1a55' }} />
        </div>

        <h2 style={{ fontFamily: 'Cairo, sans-serif', fontSize: 'clamp(1.9rem, 4.5vw, 3rem)', fontWeight: 900, color: '#fff', margin: '0 0 3.5rem', letterSpacing: '-0.01em' }}>
          {isAr ? 'أكثر من 500 نشاط تجاري يثق بنا' : 'More than 500 businesses trust us'}
        </h2>

        {/* Stats row — Upwork-inspired, plain solid color, no gradient */}
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '2px', marginBottom: '5rem', background: 'rgba(255,255,255,0.04)', borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {STATS.map(({ num, labelAr, labelEn }) => (
            <motion.div
              key={num}
              variants={fadeUp}
              style={{ padding: '30px 24px', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}
            >
              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', fontWeight: 700, color: '#ff1a55', lineHeight: 1, marginBottom: '6px' }}>
                {num}
              </div>
              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {isAr ? labelAr : labelEn}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Testimonials grid */}
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}
        >
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              whileHover={{ y: -4 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '26px 22px', position: 'relative', overflow: 'hidden' }}
            >
              {/* Quote mark */}
              <span style={{ position: 'absolute', top: '12px', insetInlineEnd: '18px', fontFamily: 'serif', fontSize: '4rem', color: `${t.accent}15`, lineHeight: 1, userSelect: 'none' }}>"</span>

              <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.88rem', color: 'rgba(255,255,255,0.72)', lineHeight: 1.7, margin: '0 0 24px', position: 'relative' }}>
                "{isAr ? t.quoteAr : t.quoteEn}"
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {/* Avatar placeholder */}
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: `${t.accent}20`, border: `1px solid ${t.accent}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.85rem', color: t.accent, fontWeight: 700 }}>
                    {(isAr ? t.nameAr : t.nameEn).charAt(0)}
                  </span>
                </div>
                <div>
                  <div style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>
                    {isAr ? t.nameAr : t.nameEn}
                  </div>
                  <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.58rem', color: t.accent, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {isAr ? t.roleAr : t.roleEn}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Trust signals row — مستقل-inspired escrow trust */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 70, damping: 20, mass: 1.5, delay: 0.3 }}
          style={{ marginTop: '3rem', display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}
        >
          {[
            { iconPath: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', labelAr: 'بيانات مشفرة', labelEn: 'Encrypted Data' },
            { iconPath: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', labelAr: '99.9% وقت تشغيل', labelEn: '99.9% Uptime' },
            { iconPath: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', labelAr: 'دعم 24/7 واتساب', labelEn: 'WhatsApp 24/7 Support' },
            { iconPath: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z', labelAr: 'لا رسوم خفية', labelEn: 'No Hidden Fees' },
          ].map(({ iconPath, labelAr, labelEn }) => (
            <div key={labelAr} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,26,85,0.7)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d={iconPath} />
              </svg>
              <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.62rem', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {isAr ? labelAr : labelEn}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

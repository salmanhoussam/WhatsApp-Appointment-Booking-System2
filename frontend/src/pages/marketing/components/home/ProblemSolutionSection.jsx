import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '../../hooks/useTranslation';

const BEFORE = [
  { ar: 'حجوزات ورقية وجداول Excel تضيع', en: 'Paper bookings and lost Excel sheets' },
  { ar: 'عميل ينتظر ردّك ساعات — ينتهي بالإلغاء', en: 'Customer waits hours for reply — then cancels' },
  { ar: 'موظف جديد = تكلفة + تدريب + أخطاء', en: 'New hire = cost + training + errors' },
  { ar: 'لا إحصاءات، لا تقارير، لا صورة واضحة', en: 'No stats, no reports, no clear picture' },
];

const AFTER = [
  { ar: 'حجز تلقائي عبر واتساب في ثانية', en: 'Auto-booking via WhatsApp in 1 second' },
  { ar: 'رد فوري 24/7 بدون موظف', en: 'Instant reply 24/7, zero staff needed' },
  { ar: 'توسّع بدون تكاليف إضافية', en: 'Scale up with zero extra cost' },
  { ar: 'لوحة تحكم حية — أرباح وزبائن في نظرة', en: 'Live dashboard — revenue and clients at a glance' },
];

const item = {
  hidden:  { opacity: 0, x: -16 },
  visible: (i) => ({ opacity: 1, x: 0, transition: { type: 'spring', stiffness: 70, damping: 20, mass: 1.5, delay: i * 0.08 } }),
};

export default function ProblemSolutionSection() {
  const { lang } = useTranslation();
  const isAr = lang === 'ar';

  return (
    <section
      dir={isAr ? 'rtl' : 'ltr'}
      style={{ padding: '6rem 2rem', background: '#060b18', position: 'relative', overflow: 'hidden' }}
    >
      {/* Section divider */}
      <div style={{ height: '1px', background: 'linear-gradient(90deg,transparent,rgba(255,26,85,0.2),transparent)', marginBottom: '5rem' }} />

      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <span style={{ display: 'block', width: '28px', height: '1px', background: '#ff1a55' }} />
          <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#ff1a55' }}>
            ◆ {isAr ? 'قبل وبعد — الفارق الحقيقي' : 'BEFORE & AFTER — THE REAL DIFFERENCE'}
          </span>
          <span style={{ display: 'block', width: '28px', height: '1px', background: '#ff1a55' }} />
        </div>

        <h2 style={{ fontFamily: 'Cairo, sans-serif', fontSize: 'clamp(1.9rem, 4.5vw, 3rem)', fontWeight: 900, color: '#fff', margin: '0 0 12px', letterSpacing: '-0.01em' }}>
          {isAr ? 'هل تتعرف على هذه المشاكل؟' : 'Do These Sound Familiar?'}
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, marginBottom: '3.5rem', maxWidth: '55ch' }}>
          {isAr
            ? 'ملايين الأعمال العربية تخسر الوقت والمال بسبب الإدارة اليدوية — حتى الآن.'
            : 'Millions of Arabic businesses lose time and money on manual operations — until now.'}
        </p>

        {/* Before / After columns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2px', borderRadius: '16px', overflow: 'hidden' }}>
          {/* BEFORE */}
          <div style={{ background: 'rgba(255,255,255,0.018)', border: '1px solid rgba(255,255,255,0.06)', padding: '36px 32px' }}>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.6rem', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem' }}>✕</span>
              {isAr ? 'قبل SalmanSaaS' : 'WITHOUT SalmanSaaS'}
            </div>
            <motion.ul
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}
            >
              {BEFORE.map((it, i) => (
                <motion.li key={i} custom={i} variants={item} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <span style={{ color: 'rgba(255,80,80,0.5)', fontSize: '0.8rem', marginTop: '1px', flexShrink: 0 }}>✕</span>
                  <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.28)', textDecoration: 'line-through', textDecorationColor: 'rgba(255,255,255,0.12)', lineHeight: 1.5 }}>
                    {isAr ? it.ar : it.en}
                  </span>
                </motion.li>
              ))}
            </motion.ul>
          </div>

          {/* AFTER */}
          <div style={{ background: 'rgba(255,26,85,0.04)', border: '1px solid rgba(255,26,85,0.18)', padding: '36px 32px', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, #ff1a55, rgba(255,26,85,0))' }} />
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.6rem', letterSpacing: '0.15em', color: '#ff1a55', textTransform: 'uppercase', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(255,26,85,0.15)', border: '1px solid rgba(255,26,85,0.4)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', color: '#ff1a55' }}>✓</span>
              {isAr ? 'مع SalmanSaaS' : 'WITH SalmanSaaS'}
            </div>
            <motion.ul
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}
            >
              {AFTER.map((it, i) => (
                <motion.li key={i} custom={i} variants={item} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <span style={{ color: '#ff1a55', fontSize: '0.8rem', marginTop: '1px', flexShrink: 0 }}>✓</span>
                  <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.82)', lineHeight: 1.5, fontFamily: 'Cairo, sans-serif' }}>
                    {isAr ? it.ar : it.en}
                  </span>
                </motion.li>
              ))}
            </motion.ul>
          </div>
        </div>

        {/* Bottom stat strip — Upwork-inspired */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 70, damping: 20, mass: 1.5, delay: 0.3 }}
          style={{ marginTop: '2rem', padding: '20px 28px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'center', justifyContent: 'space-between' }}
        >
          {[
            { num: '3+', labelAr: 'سنوات في السوق', labelEn: 'years in market' },
            { num: '50+', labelAr: 'نشاط تجاري نشط', labelEn: 'active businesses' },
            { num: '24/7', labelAr: 'وكيل ذكي يعمل', labelEn: 'AI agent uptime' },
            { num: '<24h', labelAr: 'حتى الإطلاق', labelEn: 'to go live' },
          ].map(({ num, labelAr, labelEn }) => (
            <div key={num} style={{ textAlign: isAr ? 'right' : 'left' }}>
              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '1.5rem', fontWeight: 700, color: '#ff1a55', lineHeight: 1 }}>{num}</div>
              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px' }}>{isAr ? labelAr : labelEn}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

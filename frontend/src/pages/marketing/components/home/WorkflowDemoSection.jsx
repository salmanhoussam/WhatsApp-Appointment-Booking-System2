import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../../hooks/useTranslation';

const STEPS = [
  {
    num: '01',
    titleAr: 'العميل يرسل واتساب',
    titleEn: 'Customer sends WhatsApp',
    descAr: 'عميلك يكتب "أبي أحجز" على الواتساب — الوكيل الذكي يرد خلال ثانية.',
    descEn: 'Your customer types "I want to book" — AI agent replies in one second.',
    accent: '#25D366',
    code: '"مرحبا، أبي أحجز شاليه الجمعة القادمة"',
  },
  {
    num: '02',
    titleAr: 'الذكاء الاصطناعي يعالج',
    titleEn: 'AI processes the request',
    descAr: 'يتحقق من التوفر، يقترح الأسعار، يؤكد الحجز — بدون تدخلك.',
    descEn: 'Checks availability, suggests prices, confirms the booking — without you.',
    accent: '#ff1a55',
    code: '{ check_availability: ✓, price: 450$, confirm: true }',
  },
  {
    num: '03',
    titleAr: 'تأكيد تلقائي وإشعار',
    titleEn: 'Auto-confirm & notify',
    descAr: 'يرسل رسالة تأكيد للعميل ويُضيف الحجز لداشبوردك فوراً.',
    descEn: 'Sends confirmation to customer and adds booking to your dashboard.',
    accent: '#d4a853',
    code: '✓ Booking #1042 confirmed — customer notified',
  },
];

export default function WorkflowDemoSection() {
  const { lang } = useTranslation();
  const isAr = lang === 'ar';
  const [active, setActive] = useState(0);

  const step = STEPS[active];

  return (
    <section
      dir={isAr ? 'rtl' : 'ltr'}
      style={{ padding: '6rem 2rem', background: 'linear-gradient(180deg, #060b18 0%, #07091a 100%)', position: 'relative' }}
    >
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <span style={{ display: 'block', width: '28px', height: '1px', background: '#ff1a55' }} />
          <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#ff1a55' }}>
            ◆ {isAr ? 'كيف يعمل — 3 خطوات فقط' : 'HOW IT WORKS — 3 STEPS ONLY'}
          </span>
          <span style={{ display: 'block', width: '28px', height: '1px', background: '#ff1a55' }} />
        </div>

        <h2 style={{ fontFamily: 'Cairo, sans-serif', fontSize: 'clamp(1.9rem, 4.5vw, 3rem)', fontWeight: 900, color: '#fff', margin: '0 0 12px', letterSpacing: '-0.01em' }}>
          {isAr ? 'من واتساب إلى حجز مؤكد — أوتوماتيكياً' : 'From WhatsApp to Confirmed Booking — Automatically'}
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, marginBottom: '3.5rem', maxWidth: '55ch' }}>
          {isAr
            ? 'بدون برمجة، بدون موظف إضافي. فعّل المنصة اليوم وابدأ تستلم حجوزات غداً.'
            : 'No coding, no extra staff. Activate today and receive bookings tomorrow.'}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '3rem', alignItems: 'start' }}>
          {/* Step list — Fiverr-inspired interactive */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {STEPS.map((s, i) => (
              <motion.button
                key={i}
                onClick={() => setActive(i)}
                whileHover={{ x: isAr ? -4 : 4 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                style={{
                  background: active === i ? 'rgba(255,26,85,0.08)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${active === i ? 'rgba(255,26,85,0.3)' : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: '12px',
                  padding: '18px 20px',
                  cursor: 'pointer',
                  textAlign: isAr ? 'right' : 'left',
                  display: 'flex',
                  gap: '14px',
                  alignItems: 'flex-start',
                }}
              >
                <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '1rem', fontWeight: 700, color: active === i ? '#ff1a55' : 'rgba(255,255,255,0.18)', flexShrink: 0 }}>
                  {s.num}
                </span>
                <div>
                  <div style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.9rem', fontWeight: 700, color: active === i ? '#fff' : 'rgba(255,255,255,0.4)', marginBottom: active === i ? '6px' : 0 }}>
                    {isAr ? s.titleAr : s.titleEn}
                  </div>
                  {active === i && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ type: 'spring', stiffness: 200, damping: 30 }}
                      style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, fontFamily: 'Cairo, sans-serif' }}
                    >
                      {isAr ? s.descAr : s.descEn}
                    </motion.div>
                  )}
                </div>
              </motion.button>
            ))}

            {/* WhatsApp badge */}
            <div style={{ marginTop: '8px', padding: '14px 18px', background: 'rgba(37,211,102,0.05)', border: '1px solid rgba(37,211,102,0.15)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#25D366">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.533 5.853L0 24l6.347-1.503A11.955 11.955 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.894 0-3.672-.512-5.194-1.403l-.374-.222-3.769.892.906-3.677-.244-.387A10 10 0 0112 2c5.514 0 10 4.486 10 10s-4.486 10-10 10z"/>
              </svg>
              <span style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.78rem', color: '#25D366' }}>
                {isAr ? 'يعمل على WhatsApp Business مباشرة' : 'Works directly on WhatsApp Business'}
              </span>
            </div>
          </div>

          {/* Live preview panel — terminal style */}
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
              style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden', backdropFilter: 'blur(20px)' }}
            >
              {/* Terminal bar */}
              <div style={{ padding: '11px 16px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '7px', alignItems: 'center' }}>
                {['rgba(255,59,48,0.5)', 'rgba(255,204,0,0.5)', 'rgba(52,199,89,0.5)'].map((c, i) => (
                  <span key={i} style={{ width: '9px', height: '9px', borderRadius: '50%', background: c }} />
                ))}
                <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.58rem', color: 'rgba(255,255,255,0.2)', marginInlineStart: 'auto', letterSpacing: '0.1em' }}>
                  AI Agent — Live
                </span>
              </div>

              <div style={{ position: 'relative', padding: '32px 26px 26px' }}>
                {/* Watermark number */}
                <span style={{ position: 'absolute', top: '-4px', insetInlineEnd: '12px', fontFamily: 'Space Mono, monospace', fontSize: '5.5rem', fontWeight: 700, color: 'rgba(255,255,255,0.025)', lineHeight: 1, userSelect: 'none', pointerEvents: 'none' }}>
                  {step.num}
                </span>

                <div style={{ display: 'inline-flex', gap: '6px', padding: '3px 10px', borderRadius: '5px', background: `${step.accent}15`, border: `1px solid ${step.accent}35`, fontFamily: 'Space Mono, monospace', fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.13em', color: step.accent, marginBottom: '20px' }}>
                  STEP {step.num}
                </div>

                <h3 style={{ fontFamily: 'Cairo, sans-serif', fontSize: '1.35rem', fontWeight: 900, color: '#fff', margin: '0 0 10px' }}>
                  {isAr ? step.titleAr : step.titleEn}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, margin: '0 0 24px', fontFamily: 'Cairo, sans-serif' }}>
                  {isAr ? step.descAr : step.descEn}
                </p>

                {/* Code line */}
                <div style={{ padding: '13px 15px', background: 'rgba(0,0,0,0.35)', borderRadius: '8px', fontFamily: 'Space Mono, monospace', fontSize: '0.7rem', color: step.accent, letterSpacing: '0.02em', wordBreak: 'break-all' }}>
                  <span style={{ color: 'rgba(255,255,255,0.18)', marginInlineEnd: '8px' }}>›</span>
                  {step.code}
                  <motion.span
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    style={{ display: 'inline-block', width: '2px', height: '11px', background: step.accent, marginInlineStart: '3px', verticalAlign: 'middle' }}
                  />
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

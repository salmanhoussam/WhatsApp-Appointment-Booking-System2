import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '../../hooks/useTranslation';

const WA_LINK = 'https://wa.me/96178727986';
const EMAIL   = 'houssam.info101@gmail.com';

export default function CTASection() {
  const { lang } = useTranslation();
  const isAr = lang === 'ar';

  return (
    <section
      dir={isAr ? 'rtl' : 'ltr'}
      style={{ padding: '6rem 2rem 5rem', background: '#060b18', position: 'relative', overflow: 'hidden' }}
    >
      {/* Background glow */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '600px', height: '300px', background: 'radial-gradient(ellipse, rgba(255,26,85,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Divider */}
      <div style={{ height: '1px', background: 'linear-gradient(90deg,transparent,rgba(255,26,85,0.25),transparent)', marginBottom: '5rem' }} />

      <div style={{ maxWidth: '780px', margin: '0 auto', textAlign: 'center', position: 'relative' }}>
        {/* Label */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
          <span style={{ display: 'block', width: '28px', height: '1px', background: '#ff1a55' }} />
          <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#ff1a55' }}>
            ◆ {isAr ? 'ابدأ اليوم — مجاناً لأول 30 يوم' : 'START TODAY — FREE FOR 30 DAYS'}
          </span>
          <span style={{ display: 'block', width: '28px', height: '1px', background: '#ff1a55' }} />
        </div>

        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 70, damping: 20, mass: 1.5 }}
          style={{ fontFamily: 'Cairo, sans-serif', fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 900, color: '#fff', margin: '0 0 16px', lineHeight: 1.1, letterSpacing: '-0.01em' }}
        >
          {isAr
            ? 'نشاطك التجاري يستحق أكثر من Excel وواتساب يدوي'
            : 'Your Business Deserves More Than Excel and Manual WhatsApp'}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 70, damping: 20, mass: 1.5, delay: 0.1 }}
          style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, marginBottom: '3rem', maxWidth: '50ch', margin: '0 auto 3rem' }}
        >
          {isAr
            ? 'سجّل اليوم وخذ 30 يوم مجاناً — لا كارت ائتمان مطلوب. إذا ما أعجبك خلال أسبوع، مافي أي التزام.'
            : 'Sign up today for 30 days free — no credit card required. Not happy in a week? Zero obligation.'}
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 70, damping: 20, mass: 1.5, delay: 0.2 }}
          style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', marginBottom: '3rem' }}
        >
          {/* WhatsApp primary */}
          <motion.a
            href={WA_LINK}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.03, y: -3 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 28px', background: '#25D366', borderRadius: '10px', fontFamily: 'Cairo, sans-serif', fontSize: '0.9rem', fontWeight: 700, color: '#000', textDecoration: 'none', boxShadow: '0 0 24px rgba(37,211,102,0.25)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#000">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.533 5.853L0 24l6.347-1.503A11.955 11.955 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.894 0-3.672-.512-5.194-1.403l-.374-.222-3.769.892.906-3.677-.244-.387A10 10 0 0112 2c5.514 0 10 4.486 10 10s-4.486 10-10 10z"/>
            </svg>
            {isAr ? 'ابدأ الآن عبر واتساب' : 'Start Now via WhatsApp'}
          </motion.a>

          {/* Email secondary */}
          <motion.a
            href={`mailto:${EMAIL}`}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 24px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', fontFamily: 'Cairo, sans-serif', fontSize: '0.9rem', fontWeight: 600, color: 'rgba(255,255,255,0.65)', textDecoration: 'none' }}
          >
            {isAr ? 'راسلنا بالبريد' : 'Email Us'}
          </motion.a>
        </motion.div>

        {/* Urgency signals — Fiverr/خمسات instant access */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.35, duration: 0.6 }}
          style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}
        >
          {[
            { ar: '30 يوم مجاناً', en: '30 days free' },
            { ar: 'لا كارت ائتمان', en: 'No credit card' },
            { ar: 'إطلاق خلال 24 ساعة', en: 'Live in 24 hours' },
            { ar: 'إلغاء في أي وقت', en: 'Cancel anytime' },
          ].map(({ ar, en }) => (
            <div key={ar} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'Space Mono, monospace', fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              <span style={{ color: '#ff1a55', fontSize: '0.55rem' }}>◆</span>
              {isAr ? ar : en}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/**
 * HarvestSection.jsx — Olivello Showcase, Section 2 — رحلة زيتونة
 *
 * 3 cards stagger in from the right when section enters viewport.
 * Steps: القطاف → الفرز → العصر الفوري
 */

import { motion } from 'framer-motion';

// SVG mark components — inline, no external deps, luxury brand feel
function OliveMarkSVG() {
  return (
    <svg viewBox="0 0 36 36" style={{ width: 34, height: 34 }}>
      {/* Olive fruit */}
      <ellipse cx="18" cy="16" rx="9" ry="12" fill="none"
        stroke="oklch(52% 0.14 130)" strokeWidth="1.4" />
      {/* Stem */}
      <path d="M18 4 Q22 1 26 3" fill="none"
        stroke="oklch(52% 0.10 120)" strokeWidth="1.2" strokeLinecap="round" />
      {/* Leaf */}
      <path d="M21 6 Q28 4 27 10 Q22 10 21 6Z" fill="oklch(46% 0.12 130)" opacity="0.7" />
      {/* Highlight */}
      <ellipse cx="14" cy="13" rx="2" ry="3.5" fill="oklch(68% 0.12 130)" opacity="0.4" />
    </svg>
  );
}

function WaterMarkSVG() {
  return (
    <svg viewBox="0 0 36 36" style={{ width: 34, height: 34 }}>
      {/* Water drop */}
      <path d="M18 5 C18 5 10 18 10 24 C10 29 13.6 33 18 33 C22.4 33 26 29 26 24 C26 18 18 5 18 5Z"
        fill="none" stroke="oklch(62% 0.06 220)" strokeWidth="1.4" />
      {/* Inner highlight */}
      <path d="M14 22 Q13 26 15 28" fill="none"
        stroke="oklch(72% 0.05 220)" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

function PressMarkSVG() {
  return (
    <svg viewBox="0 0 36 36" style={{ width: 34, height: 34 }}>
      {/* Millstone circle */}
      <circle cx="18" cy="18" r="12" fill="none"
        stroke="oklch(68% 0.08 80)" strokeWidth="1.4" />
      {/* Inner ring */}
      <circle cx="18" cy="18" r="7" fill="none"
        stroke="oklch(68% 0.08 80)" strokeWidth="1" opacity="0.5" />
      {/* Center hub */}
      <circle cx="18" cy="18" r="2.5" fill="oklch(72% 0.12 72)" opacity="0.8" />
      {/* Spoke */}
      <line x1="18" y1="6" x2="18" y2="30"
        stroke="oklch(68% 0.08 80)" strokeWidth="0.8" opacity="0.4" />
      <line x1="6" y1="18" x2="30" y2="18"
        stroke="oklch(68% 0.08 80)" strokeWidth="0.8" opacity="0.4" />
    </svg>
  );
}

const STEPS = [
  {
    num: '01',
    Icon: OliveMarkSVG,
    title_ar: 'القطاف',
    title_en: 'The Harvest',
    desc_ar:
      'تُقطف حبات الزيتون يدوياً في أكتوبر ونوفمبر، في ذروة نضجها، لضمان أعلى نسبة من البوليفينول.',
    desc_en:
      'Hand-picked in October & November at peak ripeness, ensuring maximum polyphenol content.',
    accent: 'rgba(200,168,75,0.9)',
    borderColor: 'rgba(200,168,75,0.35)',
  },
  {
    num: '02',
    Icon: WaterMarkSVG,
    title_ar: 'الفرز والغسيل',
    title_en: 'Sort & Wash',
    desc_ar:
      'تُفرز كل حبة بعناية وتُغسل بالماء النقي. لا مواد كيميائية، لا وقت ضائع.',
    desc_en:
      'Every olive is hand-sorted and washed in pure spring water. No chemicals, no delays.',
    accent: 'rgba(140,190,110,0.85)',
    borderColor: 'rgba(140,190,110,0.30)',
  },
  {
    num: '03',
    Icon: PressMarkSVG,
    title_ar: 'العصر الفوري',
    title_en: 'Cold Press',
    desc_ar:
      'تُعصر الثمار خلال أقل من أربع ساعات من قطافها، محافظةً على أرقى النكهات والعطر الجبلي.',
    desc_en:
      'Pressed within 4 hours of harvest, preserving the finest flavours and mountain aroma.',
    accent: 'rgba(200,168,75,0.75)',
    borderColor: 'rgba(200,168,75,0.28)',
  },
];

const cardVariants = {
  hidden:   { opacity: 0, x: 72, filter: 'blur(8px)' },
  visible: (i) => ({
    opacity: 1, x: 0, filter: 'blur(0px)',
    transition: {
      delay:     i * 0.18,
      duration:  0.9,
      type:      'spring',
      stiffness: 70,
      damping:   20,
      mass:      1.5,
    },
  }),
};

export default function HarvestSection() {
  return (
    <section style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, oklch(22% 0.05 100) 0%, oklch(17% 0.04 110) 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 'clamp(72px, 12vh, 130px) clamp(20px, 5vw, 80px)',
    }}>

      {/* Section header */}
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-15%' }}
        transition={{ duration: 0.9, type: 'spring', stiffness: 70, damping: 20, mass: 1.5 }}
        style={{ textAlign: 'center', marginBottom: 'clamp(48px, 9vh, 88px)' }}
      >
        <p style={{
          fontSize: 10, letterSpacing: '0.36em',
          color: 'rgba(200,168,75,0.60)', textTransform: 'uppercase',
          marginBottom: 16, fontFamily: "'Inter', system-ui, sans-serif",
        }}>
          The Process
        </p>

        <h2 style={{
          fontSize: 'clamp(28px, 4.5vw, 54px)',
          fontWeight: 700, color: '#f0ede6',
          margin: '0 auto',
          fontFamily: "'Tajawal', system-ui, sans-serif",
          direction: 'rtl', lineHeight: 1.2,
        }}>
          رحلة الزيتونة
        </h2>

        <p style={{
          fontSize: 'clamp(12px, 1.2vw, 14px)',
          color: 'rgba(255,255,255,0.28)', letterSpacing: '0.12em',
          marginTop: 12, fontFamily: "'Inter', system-ui, sans-serif",
        }}>
          From grove to bottle — nothing in between
        </p>

        {/* Decorative hairline */}
        <div style={{
          width: 48, height: 1, margin: '24px auto 0',
          background: 'linear-gradient(to right, transparent, rgba(200,168,75,0.55), transparent)',
        }} />
      </motion.div>

      {/* Cards grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
        gap: 'clamp(14px, 2.2vw, 26px)',
        width: '100%', maxWidth: 1080,
      }}>
        {STEPS.map((step, i) => (
          <motion.div
            key={step.num}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-10%' }}
            whileHover={{
              y: -6,
              transition: { type: 'spring', stiffness: 300, damping: 25, mass: 0.5 },
            }}
            style={{
              background:           'rgba(255,255,255,0.03)',
              border:               `1px solid rgba(255,255,255,0.07)`,
              borderTop:            `1px solid ${step.borderColor}`,
              backdropFilter:       'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRadius:         16,
              padding:              'clamp(24px, 3.5vw, 44px)',
              position:             'relative',
              overflow:             'hidden',
              cursor:               'default',
            }}
          >
            {/* Number watermark */}
            <span style={{
              position:   'absolute', top: 12, right: 18,
              fontSize:   'clamp(52px, 8vw, 88px)',
              fontWeight: 900,
              color:      'rgba(200,168,75,0.055)',
              lineHeight: 1,
              fontFamily: "'Inter', system-ui, sans-serif",
              userSelect: 'none',
            }}>
              {step.num}
            </span>

            {/* Icon mark */}
            <div style={{ marginBottom: 22, lineHeight: 1, opacity: 0.85 }}>
              <step.Icon />
            </div>

            {/* Arabic title */}
            <h3 style={{
              fontFamily: "'Tajawal', system-ui, sans-serif",
              fontSize:   'clamp(18px, 2.2vw, 24px)',
              fontWeight: 700,
              color:      '#f0ede6',
              margin:     '0 0 5px',
              direction:  'rtl', textAlign: 'right',
              lineHeight: 1.2,
            }}>
              {step.title_ar}
            </h3>

            {/* English subtitle */}
            <p style={{
              fontFamily:    "'Inter', system-ui, sans-serif",
              fontSize:      10,
              letterSpacing: '0.26em',
              color:         step.accent,
              textTransform: 'uppercase',
              margin:        '0 0 20px',
            }}>
              {step.title_en}
            </p>

            {/* Arabic body */}
            <p style={{
              fontFamily: "'Tajawal', system-ui, sans-serif",
              fontSize:   'clamp(13px, 1.35vw, 15px)',
              lineHeight: 1.88,
              color:      'rgba(240,237,230,0.52)',
              margin:     '0 0 10px',
              direction:  'rtl', textAlign: 'right',
            }}>
              {step.desc_ar}
            </p>

            {/* English body */}
            <p style={{
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize:   'clamp(11px, 1.05vw, 13px)',
              lineHeight: 1.75,
              color:      'rgba(255,255,255,0.20)',
            }}>
              {step.desc_en}
            </p>

            {/* Bottom accent line */}
            <div style={{
              position:   'absolute', bottom: 0, left: '10%', right: '10%', height: 1,
              background: `linear-gradient(to right, transparent, ${step.borderColor}, transparent)`,
            }} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}

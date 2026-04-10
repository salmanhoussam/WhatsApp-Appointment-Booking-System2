/**
 * ShowcaseCards.jsx  —  HTML Content Overlay
 *
 * Sits in a fixed z-10 layer above the WebGL canvas.
 * ALL animation is driven by `scrollProgress` (a Framer Motion MotionValue
 * updated every frame by Scene3D's CameraRig — zero React state re-renders).
 *
 * Sections (offset 0→1 over 5 scroll pages):
 *   0.00 → 0.18  HERO       — "بيت سمار" stagger entrance
 *   0.18 → 0.38  CARD 1     — العمارة / Architecture  (slides from right)
 *   0.38 → 0.58  CARD 2     — الحدائق / Gardens       (slides from left)
 *   0.58 → 0.78  CARD 3     — المسبح  / Pool & Terrace (slides from right)
 *   0.80 → 1.00  CTA        — fade in, gold button
 *
 * Styling: GS MAR Glassmorphism (backdrop-blur + bg-white/5 + gold border)
 */

import { useContext }                               from 'react';
import { motion, useTransform }                     from 'framer-motion';
import { ShowcaseContext }                          from './SmarShowcasePage';

const BASE =
  'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beitsmar/homepage';

const CARDS = [
  {
    id:      '01',
    img:     `${BASE}/amenity1.jpg`,
    titleAr: 'العمارة والتصميم',
    titleEn: 'Architecture & Design',
    bodyAr:  'حجر لبناني تقليدي يعانق التصميم العصري. قناطر هندسية وأسقف قرميدية تروي قصة أجيال من حياة الجبل.',
    bodyEn:  'Traditional Lebanese stone meets contemporary design. Geometric arches and terracotta roofs that tell a generations-long story.',
    fromRight: true,
  },
  {
    id:      '02',
    img:     `${BASE}/amenity2.jpg`,
    titleAr: 'الحدائق المعلقة',
    titleEn: 'The Hanging Gardens',
    bodyAr:  'حدائق متدرجة تنساب على سفح الجبل، تفوح منها روائح الياسمين والمريمية مع إطلالة بحرية لا تُنسى.',
    bodyEn:  'Terraced gardens cascading down the hillside, fragrant with jasmine and sage — with an unforgettable view of the sea.',
    fromRight: false,
  },
  {
    id:      '03',
    img:     `${BASE}/amenity3.jpg`,
    titleAr: 'المسبح والتراس',
    titleEn: 'The Pool & Terrace',
    bodyAr:  'مسبح لا متناهي يندمج مع الأفق. كل لحظة هنا — قهوة الصباح أو غروب الشمس — لوحة سينمائية خالصة.',
    bodyEn:  'An infinity pool that merges with the horizon. Every moment here — morning coffee or sunset — is a cinematic frame.',
    fromRight: true,
  },
];

// ─── Scroll timing table ──────────────────────────────────────────────────────
// Each card: fade-in over 0.06, hold for 0.10, fade-out over 0.06
const TIMINGS = [
  { in: 0.18, peak: 0.24, hold: 0.32, out: 0.40 }, // Card 1
  { in: 0.38, peak: 0.44, hold: 0.52, out: 0.60 }, // Card 2
  { in: 0.58, peak: 0.64, hold: 0.72, out: 0.80 }, // Card 3
];

// ─── Single property card ─────────────────────────────────────────────────────
function PropertyCard({ card, timing }) {
  const { scrollProgress, lang } = useContext(ShowcaseContext);

  const title = lang === 'ar' ? card.titleAr : card.titleEn;
  const body  = lang === 'ar' ? card.bodyAr  : card.bodyEn;
  const dir   = lang === 'ar' ? 'rtl' : 'ltr';

  const { in: tIn, peak, hold, out: tOut } = timing;
  const offset = card.fromRight ? '72px' : '-72px';

  const opacity = useTransform(scrollProgress, [tIn, peak, hold, tOut], [0, 1, 1, 0]);
  const x       = useTransform(scrollProgress, [tIn, peak],             [offset, '0px']);

  // Text block slides in from the opposite side
  const textX   = useTransform(scrollProgress, [tIn, peak], [card.fromRight ? '-50px' : '50px', '0px']);

  return (
    <motion.div
      style={{ opacity, pointerEvents: 'none' }}
      className="absolute inset-0 flex items-center justify-center px-6 md:px-16"
    >
      <div
        className={`w-full max-w-5xl flex flex-col md:flex-row items-center gap-6 md:gap-10 ${
          card.fromRight ? '' : 'md:flex-row-reverse'
        }`}
        dir={dir}
      >
        {/* ── Image panel ── */}
        <motion.div
          style={{ x }}
          className="w-full md:w-[52%] h-[44vh] md:h-[62vh] relative overflow-hidden rounded-2xl flex-shrink-0"
        >
          <img
            src={card.img}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
          {/* Bottom gradient so card number reads cleanly */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Badge */}
          <span className="absolute bottom-4 left-4 text-[10px] tracking-[0.3em] text-[#d4a853] font-semibold uppercase">
            {card.id} — BEIT SMAR
          </span>
        </motion.div>

        {/* ── Text panel (GS MAR glass) ── */}
        <motion.div
          className="w-full md:flex-1 rounded-2xl p-6 md:p-10"
          style={{
            x:               textX,
            backdropFilter:  'blur(20px)',
            background:      'rgba(255,255,255,0.04)',
            border:          '1px solid rgba(212,168,83,0.18)',
            boxShadow:       '0 8px 48px rgba(212,168,83,0.08), inset 0 1px 0 rgba(255,255,255,0.07)',
          }}
        >
          <p className="text-[10px] tracking-[0.32em] text-[#d4a853] uppercase mb-4 font-semibold">
            {card.id} — BEIT SMAR
          </p>
          <h3 className="text-3xl md:text-5xl font-black text-white leading-tight tracking-tight mb-5">
            {title}
          </h3>
          <p className="text-white/55 text-sm md:text-[15px] leading-relaxed md:leading-loose max-w-sm">
            {body}
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─── Hero section — logo image replaces text ─────────────────────────────────
const LOGO_URL =
  'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beitsmar/homepage/smar_ring.png';

function HeroText() {
  const { scrollProgress, lang } = useContext(ShowcaseContext);

  const opacity  = useTransform(scrollProgress, [0, 0.04, 0.13, 0.20], [0, 1, 1, 0]);
  const y        = useTransform(scrollProgress, [0, 0.06], ['18px', '0px']);
  const dotScale = useTransform(scrollProgress, [0.06, 0.18], [1, 0]);
  const hint     = lang === 'ar' ? 'مرر للاستكشاف' : 'Scroll to explore';

  return (
    <motion.div
      style={{ opacity, y, pointerEvents: 'none' }}
      className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"
    >
      {/* Logo replaces title text */}
      <motion.img
        src={LOGO_URL}
        alt="Beit Smar"
        initial={{ opacity: 0, scale: 0.88 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 60, damping: 18 }}
        style={{
          width:          'clamp(160px, 28vw, 260px)',
          height:         'auto',
          filter:         'drop-shadow(0 0 28px rgba(212,168,83,0.55))',
          marginBottom:   32,
          pointerEvents:  'none',
          userSelect:     'none',
        }}
      />

      {/* Scroll hint */}
      <motion.div
        style={{ scale: dotScale }}
        className="flex flex-col items-center gap-2"
      >
        <span className="text-[9px] tracking-[0.28em] text-white/30 uppercase">{hint}</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          className="w-0.5 h-8 bg-gradient-to-b from-[#d4a853] to-transparent rounded-full"
        />
      </motion.div>
    </motion.div>
  );
}

// ─── CTA section (visible at offset 0.80 → 1.00) ─────────────────────────────
function CtaSection() {
  const { scrollProgress, lang } = useContext(ShowcaseContext);

  const opacity = useTransform(scrollProgress, [0.80, 0.87, 1.0], [0, 1, 1]);
  const y       = useTransform(scrollProgress, [0.80, 0.87], ['24px', '0px']);

  const title  = lang === 'ar' ? 'إقامتك تنتظرك'     : 'Your Escape Awaits';
  const sub    = lang === 'ar'
    ? 'حجز خاص، تجربة حصرية، لحظات لا تُنسى في لبنان'
    : 'Private reservations, exclusive access, unforgettable moments in Lebanon';
  const btn    = lang === 'ar' ? 'احجز إقامتك' : 'Book Your Stay';

  return (
    <motion.div
      style={{ opacity, y }}
      className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"
    >
      <p className="text-[10px] tracking-[0.35em] text-[#d4a853] uppercase mb-5 font-semibold">
        BEIT SMAR · EXCLUSIVE
      </p>

      <h2
        className="text-[clamp(40px,8vw,100px)] font-black text-white leading-none tracking-tight mb-6"
        style={{
          textShadow: '0 4px 60px rgba(212,168,83,0.30)',
          direction: lang === 'ar' ? 'rtl' : 'ltr',
        }}
      >
        {title}
      </h2>

      <p
        className="text-white/45 text-sm md:text-base mb-12 max-w-md"
        style={{ direction: lang === 'ar' ? 'rtl' : 'ltr' }}
      >
        {sub}
      </p>

      <motion.a
        href="/smar/normal"
        whileHover={{ scale: 1.06, boxShadow: '0 14px 60px rgba(212,168,83,0.50)' }}
        whileTap={{ scale: 0.97 }}
        style={{
          background:     'linear-gradient(135deg, #d4a853 0%, #b8893a 100%)',
          boxShadow:      '0 8px 40px rgba(212,168,83,0.32)',
          pointerEvents:  'auto',
          letterSpacing:  '0.10em',
          textDecoration: 'none',
          display:        'inline-block',
          padding:        '16px 48px',
          borderRadius:   '50px',
          fontWeight:     700,
          fontSize:       13,
          color:          '#fff',
          textTransform:  'uppercase',
        }}
      >
        {btn}
      </motion.a>
    </motion.div>
  );
}

// ─── Default export ───────────────────────────────────────────────────────────
export default function ShowcaseCards() {
  return (
    // Fills the fixed overlay — pointer-events managed per child
    <div className="absolute inset-0">
      <HeroText />

      {CARDS.map((card, i) => (
        <PropertyCard key={card.id} card={card} timing={TIMINGS[i]} />
      ))}

      <CtaSection />
    </div>
  );
}

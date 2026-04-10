/**
 * ShowcaseHUD.jsx  —  Fixed Navigation & Progress Layer
 *
 * Sits at z-20 above ShowcaseCards.
 * Reads scrollProgress (MotionValue) from ShowcaseContext.
 *
 * Elements:
 *   Top-left  — Logo mark + "BEIT SMAR" wordmark
 *   Top-right — Language toggle pill + "Book Now" CTA
 *   Right     — 5-dot progress indicator (vertical)
 *   Bottom    — Active section label (fades between sections)
 */

import { useContext, useState }             from 'react';
import { motion, useTransform,
         useMotionValueEvent }              from 'framer-motion';
import { ShowcaseContext }                  from './SmarShowcasePage';

// ─── Section labels per language ──────────────────────────────────────────────
const SECTIONS = {
  ar: ['البداية', 'العمارة', 'الحدائق', 'المسبح', 'الحجز'],
  en: ['Intro',  'Architecture', 'Gardens', 'The Pool', 'Reserve'],
};

// Map scroll offset → active section index (0-4)
function offsetToSection(v) {
  if (v < 0.20) return 0;
  if (v < 0.40) return 1;
  if (v < 0.60) return 2;
  if (v < 0.80) return 3;
  return 4;
}

// ─── Vertical progress dots ───────────────────────────────────────────────────
function ProgressDots({ active }) {
  return (
    <div className="flex flex-col gap-3 items-center">
      {SECTIONS.en.map((_, i) => (
        <motion.div
          key={i}
          animate={{
            width:           i === active ? 2  : 2,
            height:          i === active ? 24 : 6,
            backgroundColor: i === active ? '#d4a853' : 'rgba(255,255,255,0.25)',
          }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          className="rounded-full"
        />
      ))}
    </div>
  );
}

// ─── HUD ──────────────────────────────────────────────────────────────────────
export default function ShowcaseHUD() {
  const { scrollProgress, lang, toggleLang, t } = useContext(ShowcaseContext);
  const [active, setActive] = useState(0);

  // Derive active section from scroll — useState OK here (only 5 values)
  useMotionValueEvent(scrollProgress, 'change', (v) => {
    const next = offsetToSection(v);
    setActive(prev => prev !== next ? next : prev);
  });

  // HUD fades in after the very first frame
  const hudOpacity = useTransform(scrollProgress, [0, 0.025], [0, 1]);

  const sectionLabel = SECTIONS[lang][active];
  const bookLabel    = lang === 'ar' ? 'احجز الآن' : 'Book Now';

  return (
    <motion.div
      style={{ opacity: hudOpacity, pointerEvents: 'none' }}
      className="absolute inset-0 z-20"
    >
      {/* ── Top bar ── */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 md:px-10 pt-6">

        {/* Logo */}
        <div className="flex items-center gap-3">
          {/* Diamond mark */}
          <div
            className="w-6 h-6 rotate-45 border border-[#d4a853]"
            style={{ background: 'rgba(212,168,83,0.08)' }}
          />
          <span
            className="text-white font-black text-sm tracking-[0.22em] uppercase"
            style={{ letterSpacing: '0.22em' }}
          >
            Beit Smar
          </span>
        </div>

        {/* Right controls — pointer-events: auto so buttons are clickable */}
        <div className="flex items-center gap-3" style={{ pointerEvents: 'auto' }}>
          {/* Language toggle */}
          <motion.button
            onClick={toggleLang}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            className="text-[11px] font-bold tracking-[0.18em] uppercase px-4 py-1.5 rounded-full"
            style={{
              background:   'rgba(255,255,255,0.07)',
              border:       '1px solid rgba(255,255,255,0.15)',
              backdropFilter: 'blur(12px)',
              color:        '#d4a853',
              cursor:       'pointer',
            }}
          >
            {t.langToggle}
          </motion.button>

          {/* Book now pill */}
          <motion.a
            href="/smar/normal"
            whileHover={{
              scale:     1.05,
              boxShadow: '0 8px 32px rgba(212,168,83,0.45)',
            }}
            whileTap={{ scale: 0.96 }}
            style={{
              pointerEvents:  'auto',
              display:        'inline-block',
              padding:        '8px 22px',
              borderRadius:   '50px',
              background:     'linear-gradient(135deg, #d4a853 0%, #b8893a 100%)',
              color:          '#fff',
              fontSize:       11,
              fontWeight:     700,
              letterSpacing:  '0.14em',
              textDecoration: 'none',
              textTransform:  'uppercase',
            }}
          >
            {bookLabel}
          </motion.a>
        </div>
      </div>

      {/* ── Right-side progress dots ── */}
      <div className="absolute right-6 md:right-10 top-1/2 -translate-y-1/2">
        <ProgressDots active={active} />
      </div>

      {/* ── Bottom section label ── */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center">
        <motion.div
          key={sectionLabel}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="flex items-center gap-3"
        >
          <div className="w-4 h-px bg-[#d4a853]" />
          <span className="text-[9px] tracking-[0.32em] text-white/35 uppercase font-semibold">
            {sectionLabel}
          </span>
          <div className="w-4 h-px bg-[#d4a853]" />
        </motion.div>
      </div>
    </motion.div>
  );
}

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { spring } from '../../../design-system/tokens';

// ── Tokens (matches CaracasHomePage.jsx) ────────────────────────────────────
const C = {
  bg:     '#0D0503',
  orange: '#EA580C',
  amber:  '#C8821A',
  cream:  '#F4ECD8',
  muted:  '#7A5A48',
  dim:    '#3A1A0A',
};

// ── Chapters — real Caracas dishes, staged like a kitchen process ──────────
const CHAPTERS = [
  {
    index: '01', stage: 'الاختيار',
    title: 'مشاوي الفحم',
    desc: 'أجود قطع اللحم، مختارة يومياً بعناية قبل ما توصل لنارك',
    tag: 'Signature',
    img: 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1400&fit=crop',
  },
  {
    index: '02', stage: 'الشوي',
    title: 'برغر كراكاس',
    desc: 'لحمة أنجوس ع نار مباشرة، مع صوص كراكاس السري',
    tag: 'Best Seller',
    img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1400&fit=crop',
  },
  {
    index: '03', stage: 'التتبيل',
    title: 'سلطة الموسم',
    desc: 'خضار طازجة يومياً، صوص الرمان والجوز',
    tag: 'Fresh',
    img: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1400&fit=crop',
  },
  {
    index: '04', stage: 'التقديم',
    title: 'طبق الشيف',
    desc: 'اختيار الشيف اليومي — مفاجأة الأسبوع من المطبخ مباشرةً',
    tag: "Chef's Pick",
    img: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=1400&fit=crop',
  },
];

// ── One chapter's cross-fade window on the shared scroll track ─────────────
// Fade-out of chapter i and fade-in of chapter i+1 share the SAME window,
// centered on the boundary between them — a real crossfade. (Previously the
// two windows were adjacent instead of overlapping, so both chapters hit
// opacity 0 at the same instant, exposing the raw background as a black gap
// at every transition.)
function useChapterOpacity(scrollYProgress, i, total) {
  const bandSize = 1 / total;
  const overlap = bandSize * 0.35;
  const boundaryIn = i / total;
  const boundaryOut = (i + 1) / total;
  const isFirst = i === 0;
  const isLast = i === total - 1;
  return useTransform(
    scrollYProgress,
    [
      isFirst ? 0 : boundaryIn - overlap,
      isFirst ? 0 : boundaryIn + overlap,
      isLast ? 1 : boundaryOut - overlap,
      isLast ? 1 : boundaryOut + overlap,
    ],
    [isFirst ? 1 : 0, 1, 1, isLast ? 1 : 0]
  );
}

function ChapterLayer({ chapter, opacity }) {
  return (
    <motion.div style={{ position: 'absolute', inset: 0, opacity }}>
      <img
        src={chapter.img}
        alt={chapter.title}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(to top, ${C.bg} 8%, rgba(13,5,3,0.35) 45%, rgba(13,5,3,0.55) 100%)`,
      }} />

      {/* Content panel */}
      <div style={{
        position: 'absolute', bottom: '14%', left: 0, right: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        textAlign: 'center', padding: '0 1.5rem',
      }}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring.premium}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            background: 'rgba(13,5,3,0.55)',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            border: `1px solid rgba(244,236,216,0.14)`,
            borderRadius: 999, padding: '0.35rem 0.9rem 0.35rem 0.6rem',
            marginBottom: '1.25rem',
          }}
        >
          <span style={{
            width: 24, height: 24, borderRadius: '50%', background: C.orange,
            color: '#fff', fontSize: '0.7rem', fontWeight: 900,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{chapter.index}</span>
          <span style={{ color: C.cream, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.18em' }}>
            {chapter.stage.toUpperCase()}
          </span>
        </motion.div>

        <h3 style={{
          fontWeight: 900, color: C.cream, margin: '0 0 0.6rem',
          fontSize: 'clamp(2rem, 5vw, 3.5rem)', lineHeight: 1,
        }}>
          {chapter.title}
        </h3>
        <p style={{
          color: C.muted, fontSize: '0.95rem', maxWidth: 420, margin: 0, lineHeight: 1.7,
        }}>
          {chapter.desc}
        </p>
      </div>
    </motion.div>
  );
}

export default function CaracasStoryReel() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start start', 'end end'] });

  const total = CHAPTERS.length;
  // Unrolled (not .map) so each useTransform call sits at a fixed hook-call
  // position — calling hooks inside a loop/callback breaks Rules of Hooks.
  const opacity0 = useChapterOpacity(scrollYProgress, 0, total);
  const opacity1 = useChapterOpacity(scrollYProgress, 1, total);
  const opacity2 = useChapterOpacity(scrollYProgress, 2, total);
  const opacity3 = useChapterOpacity(scrollYProgress, 3, total);
  const opacities = [opacity0, opacity1, opacity2, opacity3];

  const goToChapter = (i) => {
    const el = containerRef.current;
    if (!el) return;
    const target = el.offsetTop + (el.offsetHeight * i) / total + 10;
    window.scrollTo({ top: target, behavior: 'smooth' });
  };

  return (
    <section ref={containerRef} style={{ position: 'relative', height: `${total * 100}vh` }}>
      <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden', background: C.bg }}>
        {CHAPTERS.map((chapter, i) => (
          <ChapterLayer key={chapter.index} chapter={chapter} opacity={opacities[i]} />
        ))}

        {/* Chapter rail — click to jump */}
        <div style={{
          position: 'absolute', top: '50%', right: 24, transform: 'translateY(-50%)',
          display: 'flex', flexDirection: 'column', gap: 14, zIndex: 5,
        }}>
          {CHAPTERS.map((chapter, i) => (
            <motion.button
              key={chapter.index}
              onClick={() => goToChapter(i)}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              transition={spring.snappy}
              aria-label={chapter.title}
              style={{
                width: 8, height: 8, borderRadius: '50%', padding: 0, cursor: 'pointer',
                border: `1px solid rgba(244,236,216,0.4)`,
                background: 'rgba(244,236,216,0.15)',
                opacity: opacities[i],
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

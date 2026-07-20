import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { MessageCircle, ArrowLeft } from 'lucide-react';
import { spring } from '../../../design-system/tokens';

// ── Tokens — red/white QSR brand identity (sampled from the real logo:
// dominant red cluster ~rgb(207,15,30)) — distinct from the dark fine-dining
// palette used on /caracas/home. This is a separate page, not a replacement. ─
const C = {
  bg:    '#1A1A1A',
  red:   '#CF0F1E',
  white: '#FFFFFF',
  muted: '#C9C2C2',
};

const WA = `https://wa.me/96178727986?text=${encodeURIComponent('مرحباً 👋 أريد أطلب من كاراكاس')}`;

// ── Chapters — real Higgsfield-generated video clips, uploaded to Supabase
// (properties/caracas/pages/special/cube-reel/), staged as a kitchen line. ──
const CHAPTERS = [
  {
    index: '00', stage: 'المطبخ',
    title: 'كاراكاس',
    desc: 'Flavor in every bite, fast.',
    img: '/images/caracas-special/frame-1.jpg',
    video: 'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/caracas/pages/special/cube-reel/chapter-0.mp4',
    isIntro: true,
  },
  {
    index: '01', stage: 'الشوي',
    title: 'دجاج عالفحم',
    desc: 'شيش طاووق طازة، عالفحم مباشرة لحتى يطلع طعمه',
    img: '/images/caracas-special/frame-2.jpg',
    video: 'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/caracas/pages/special/cube-reel/chapter-1.mp4',
  },
  {
    index: '02', stage: 'اللف',
    title: 'شاورما طازة',
    desc: 'بتتلف قدامك، بكل المكونات، بلقطة وحدة',
    img: '/images/caracas-special/frame-3.jpg',
    video: 'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/caracas/pages/special/cube-reel/chapter-2.mp4',
  },
  {
    index: '03', stage: 'الحمص',
    title: 'حمص بيتي',
    desc: 'زيت زيتون وبابريكا فوق حمص طازة كل يوم',
    img: '/images/caracas-special/frame-4.jpg',
    video: 'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/caracas/pages/special/cube-reel/chapter-3.mp4',
  },
  {
    index: '04', stage: 'المقرمشات',
    title: 'مقرمشات الشيف',
    desc: 'مقليّة طازة، مقرمشة من برا وطرية من جوا',
    img: '/images/caracas-special/frame-5.jpg',
    video: 'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/caracas/pages/special/cube-reel/chapter-4.mp4',
  },
  {
    index: '05', stage: 'النار',
    title: 'جوانح حارة',
    desc: 'بتتقلى بالنار المباشرة — حرّة لعشاق الحر',
    img: '/images/caracas-special/frame-6.jpg',
    video: 'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/caracas/pages/special/cube-reel/chapter-5.mp4',
  },
  {
    index: '06', stage: 'التقديم',
    title: 'مشروبات باردة',
    desc: 'جاهزين نقدملك طلبك مع مشروبك المفضل',
    img: '/images/caracas-special/frame-7.jpg',
    video: 'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/caracas/pages/special/cube-reel/chapter-6.mp4',
  },
];

// ── One chapter's cross-fade window on the shared scroll track ─────────────
// Fade-out of chapter i and fade-in of chapter i+1 share the SAME window,
// centered on the boundary between them — a real crossfade (no black gap).
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
      {chapter.video ? (
        <video
          src={chapter.video}
          autoPlay muted loop playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <img
          src={chapter.img}
          alt={chapter.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(to top, rgba(0,0,0,0.85) 8%, rgba(0,0,0,0.4) 45%, rgba(0,0,0,0.55) 100%)`,
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
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            border: `1px solid rgba(255,255,255,0.14)`,
            borderRadius: 999, padding: '0.35rem 0.9rem 0.35rem 0.6rem',
            marginBottom: '1.25rem',
          }}
        >
          <span style={{
            width: 24, height: 24, borderRadius: '50%', background: C.red,
            color: '#fff', fontSize: '0.7rem', fontWeight: 900,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{chapter.index}</span>
          <span style={{ color: C.white, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.18em' }}>
            {chapter.stage.toUpperCase()}
          </span>
        </motion.div>

        <h3 style={{
          fontWeight: 900, color: C.white, margin: '0 0 0.6rem',
          fontSize: chapter.isIntro ? 'clamp(3rem, 9vw, 5.5rem)' : 'clamp(2rem, 5vw, 3.5rem)',
          lineHeight: 1,
        }}>
          {chapter.title}
        </h3>
        <p style={{
          color: C.muted, fontSize: '0.95rem', maxWidth: 420, margin: 0, lineHeight: 1.7,
        }}>
          {chapter.desc}
        </p>

        {chapter.isIntro && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring.premium, delay: 0.15 }}
            style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '1.5rem' }}
          >
            <Link to="/caracas/menu">
              <motion.span
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} transition={spring.snappy}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: C.white, color: C.red, fontWeight: 800, fontSize: '0.9rem',
                  borderRadius: 999, padding: '0.7rem 1.5rem',
                }}
              >
                شوف المنيو <ArrowLeft size={15} />
              </motion.span>
            </Link>
            <a href={WA} target="_blank" rel="noreferrer">
              <motion.span
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} transition={spring.snappy}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: '#25D366', color: '#fff', fontWeight: 800, fontSize: '0.9rem',
                  borderRadius: 999, padding: '0.7rem 1.5rem',
                }}
              >
                <MessageCircle size={15} /> واتساب
              </motion.span>
            </a>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

export default function CaracasSpecialReel() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start start', 'end end'] });

  const total = CHAPTERS.length;
  // Unrolled (not .map) so each useTransform call sits at a fixed hook-call
  // position — calling hooks inside a loop/callback breaks Rules of Hooks.
  const opacity0 = useChapterOpacity(scrollYProgress, 0, total);
  const opacity1 = useChapterOpacity(scrollYProgress, 1, total);
  const opacity2 = useChapterOpacity(scrollYProgress, 2, total);
  const opacity3 = useChapterOpacity(scrollYProgress, 3, total);
  const opacity4 = useChapterOpacity(scrollYProgress, 4, total);
  const opacity5 = useChapterOpacity(scrollYProgress, 5, total);
  const opacity6 = useChapterOpacity(scrollYProgress, 6, total);
  const opacities = [opacity0, opacity1, opacity2, opacity3, opacity4, opacity5, opacity6];

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
                border: `1px solid rgba(255,255,255,0.4)`,
                background: 'rgba(255,255,255,0.15)',
                opacity: opacities[i],
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

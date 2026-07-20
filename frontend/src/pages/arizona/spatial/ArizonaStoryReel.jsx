import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { MessageCircle, ArrowLeft } from 'lucide-react';
import { spring } from '../../../design-system/tokens';

// ── Tokens (matches arizona/normal/HomePage.jsx) ────────────────────────────
const C = {
  bg:     '#2B5454',
  yellow: '#E3E55E',
  coral:  '#E8806E',
  cream:  '#FBF8EE',
  muted:  '#B7C7C7',
};

const WA = `https://wa.me/96178727986?text=${encodeURIComponent('مرحباً 👋 أريد أطلب من مطعم أريزونا')}`;

// ── Chapters — welcome intro + real Arizona sandwich items, staged as a
// kitchen line. This IS the page's cinematic opening (formerly a separate
// static hero) — one continuous scroll sequence from brand intro to menu. ──
const CHAPTERS = [
  {
    index: '00', stage: 'الترحيب',
    title: 'أريزونا',
    desc: 'كل شي طازج، كل شي بارد، كل شي بيشهي',
    tag: 'سناكات · عصائر · كوكتيل',
    img: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?q=80&w=2070&fit=crop',
    isIntro: true,
  },
  {
    index: '01', stage: 'الاختيار',
    title: 'طاووق',
    desc: 'قطع دجاج طازة، متبّلة يومياً قبل ما تنزل عالنار',
    tag: 'Signature',
    img: 'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/arizona/catalog/00ad9f6f-492d-4422-9265-20b458b1efcf/531c92f7-eae5-44ce-ab3a-e42eb79c1e99/main.jpg',
  },
  {
    index: '02', stage: 'الشوي',
    title: 'ستيك حر',
    desc: 'ستيك حار عالفحم مباشرة — نكهة قوية لعشاق الحر',
    tag: 'Spicy',
    img: 'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/arizona/catalog/00ad9f6f-492d-4422-9265-20b458b1efcf/2e914da3-6f9c-46bc-a9f0-2a2939c84c69/main.jfif',
  },
  {
    index: '03', stage: 'اللف',
    title: 'توستر',
    desc: 'بعد الشوي، بنلفّها طازة بكل المكونات بلقطة وحدة',
    tag: 'Best Seller',
    img: 'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/arizona/catalog/00ad9f6f-492d-4422-9265-20b458b1efcf/db79d24f-cbcd-4666-a36d-c95482095034/main.jfif',
  },
  {
    index: '04', stage: 'التقديم',
    title: 'فلادلفيا',
    desc: 'جبنة ذايبة، لحمة طرية، وخبز طازة — جاهز يوصلك',
    tag: "Chef's Pick",
    img: 'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/arizona/catalog/00ad9f6f-492d-4422-9265-20b458b1efcf/2093bcd2-3d1b-4267-89fe-57a299e20ff6/main.jfif',
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
        background: `linear-gradient(to top, ${C.bg} 8%, rgba(43,84,84,0.35) 45%, rgba(43,84,84,0.55) 100%)`,
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
            background: 'rgba(43,84,84,0.55)',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            border: `1px solid rgba(251,248,238,0.14)`,
            borderRadius: 999, padding: '0.35rem 0.9rem 0.35rem 0.6rem',
            marginBottom: '1.25rem',
          }}
        >
          <span style={{
            width: 24, height: 24, borderRadius: '50%', background: C.coral,
            color: '#fff', fontSize: '0.7rem', fontWeight: 900,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{chapter.index}</span>
          <span style={{ color: C.yellow, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.18em' }}>
            {chapter.stage.toUpperCase()}
          </span>
        </motion.div>

        <h3 style={{
          fontWeight: 900, color: C.cream, margin: '0 0 0.6rem',
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
            <Link to="/arizona/menu">
              <motion.span
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} transition={spring.snappy}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: C.bg, color: C.yellow, fontWeight: 800, fontSize: '0.9rem',
                  borderRadius: 999, padding: '0.7rem 1.5rem', border: `1.5px solid ${C.yellow}55`,
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

export default function ArizonaStoryReel() {
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
  const opacities = [opacity0, opacity1, opacity2, opacity3, opacity4];

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
                border: `1px solid rgba(251,248,238,0.4)`,
                background: 'rgba(251,248,238,0.15)',
                opacity: opacities[i],
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

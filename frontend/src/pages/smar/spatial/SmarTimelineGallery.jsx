/**
 * SmarTimelineGallery.jsx  —  Alternating Parallax Timeline
 *
 * Props:
 *   items: Array<{
 *     num:     number
 *     titleAr: string
 *     titleEn: string
 *     img?:    string
 *     video?:  string
 *     bodyAr:  string
 *     bodyEn:  string
 *   }>
 *
 * Design:
 *   • Warm limestone background (#faf9f6)
 *   • Center line draws on scroll (scaleY from useSpring)
 *   • Number badge on center line (desktop only)
 *   • Alternating text-left / image-right layout
 *   • Internal parallax: image moves -20% → 0% as it enters view
 *   • i18n: reads lang/dir from LanguageContext
 *   • Tailwind for layout, Framer Motion for animation
 */

import { useRef }                                        from 'react';
import { motion, useScroll, useTransform, useSpring }    from 'framer-motion';
import { useLanguage }                                   from '../../../context/LanguageContext';

// ─── Single timeline item ─────────────────────────────────────────────────────
function TimelineItem({ item, index }) {
  const { t } = useLanguage();
  const itemRef  = useRef(null);

  const { scrollYProgress } = useScroll({
    target:  itemRef,
    offset:  ['start end', 'center center'],
  });

  // Internal parallax: image slides up as it enters the viewport
  const imageY = useTransform(scrollYProgress, [0, 1], ['-20%', '0%']);

  const title = t.lang === 'ar' ? item.titleAr : item.titleEn;
  const body  = t.lang === 'ar' ? item.bodyAr  : item.bodyEn;

  // Alternate sides. When language is RTL, mirror the flip so the
  // visual rhythm stays consistent regardless of reading direction.
  const isEven = index % 2 !== 0;

  // In RTL the visual "left" and "right" swap — re-flip so the center
  // badge always sits between the two columns correctly.
  const isImageRight = t.lang === 'ar' ? isEven : !isEven;

  return (
    <div
      ref={itemRef}
      className="relative flex flex-col md:flex-row items-center justify-between w-full mb-24 md:mb-40"
    >
      {/* ── Number badge (desktop only, always on center line) ── */}
      <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-[#faf9f6] border border-[#d4a853] rounded-full items-center justify-center z-20 shadow-lg">
        <span className="text-[#d4a853] font-serif text-xl">
          {String(item.num).padStart(2, '0')}
        </span>
      </div>

      {/* ── Text column ── */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-10%' }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        dir={t.dir}
        className={[
          'w-full md:w-5/12 px-6 md:px-12 flex flex-col justify-center z-10',
          'mb-10 md:mb-0',
          // Mobile: always center-align. Desktop: inner text follows lang direction.
          'text-center',
          t.lang === 'ar' ? 'md:text-right' : 'md:text-left',
          isImageRight ? 'md:order-1' : 'md:order-2',
        ].join(' ')}
      >
        {/* Eyebrow — mobile shows badge number inline */}
        <span className="text-[#d4a853] text-sm tracking-widest mb-4 font-semibold uppercase block md:hidden">
          {String(item.num).padStart(2, '0')} — BEIT SMAR
        </span>
        <span className="hidden md:block text-gray-400 text-xs tracking-widest mb-4 font-semibold uppercase">
          BEIT SMAR — {String(item.num).padStart(2, '0')}
        </span>

        <h3 className="text-3xl md:text-5xl font-black text-gray-900 mb-6 leading-tight">
          {title}
        </h3>
        <p className="text-gray-600 text-sm md:text-base leading-relaxed font-medium max-w-md mx-auto md:mx-0">
          {body}
        </p>
      </motion.div>

      {/* ── Image / video column ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: '-10%' }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className={[
          'w-full md:w-5/12 px-4 md:px-0 z-10',
          isImageRight ? 'md:order-2' : 'md:order-1',
        ].join(' ')}
      >
        <div className="relative w-full h-[60vh] md:h-[75vh] overflow-hidden rounded-2xl shadow-2xl">
          {item.video ? (
            <motion.video
              src={item.video}
              autoPlay muted loop playsInline
              style={{ y: imageY }}
              className="absolute inset-0 w-full h-[120%] object-cover"
            />
          ) : (
            <motion.img
              src={item.img}
              alt={title}
              style={{ y: imageY }}
              className="absolute inset-0 w-full h-[120%] object-cover"
            />
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function SmarTimelineGallery({ items = [] }) {
  const { t } = useLanguage();
  const containerRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target:  containerRef,
    offset:  ['start center', 'end center'],
  });

  // Drawing center line (desktop)
  const lineScale = useSpring(
    useTransform(scrollYProgress, [0, 1], [0, 1]),
    { stiffness: 45, damping: 22, mass: 1.1 },
  );

  return (
    <section ref={containerRef} className="relative w-full py-24 md:py-40 bg-[#faf9f6]">

      {/* Static track behind the drawing line */}
      <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-gray-200 -translate-x-1/2 z-0" />

      {/* Animated golden line */}
      <motion.div
        style={{ scaleY: lineScale }}
        className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-[#d4a853] -translate-x-1/2 z-0 origin-top"
      />

      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.85, ease: 'easeOut' }}
          className="text-center mb-20 md:mb-32 px-4"
        >
          <p className="text-sm text-gray-500 tracking-[0.3em] uppercase mb-4">
            {t.timeline_sub}
          </p>
          <h2
            className="text-4xl md:text-6xl font-black text-gray-900"
            style={{ direction: t.dir }}
          >
            {t.timeline_title}
          </h2>
        </motion.div>

        {/* Items */}
        <div className="relative w-full flex flex-col items-center px-4 md:px-0">
          {items.map((item, i) => (
            <TimelineItem key={item.num} item={item} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

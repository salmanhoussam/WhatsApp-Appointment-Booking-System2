import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const DUMMY_IMAGES = [
  {
    id: '1',
    url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=1400',
    caption_en: 'Main Facade',
    caption_ar: 'الواجهة الرئيسية',
    span_size: 'large',
    sort_order: 1,
  },
  {
    id: '2',
    url: 'https://images.unsplash.com/photo-1600607687931-cecebd802404?auto=format&fit=crop&q=80&w=900',
    caption_en: 'Living Area',
    caption_ar: 'منطقة المعيشة',
    span_size: 'small',
    sort_order: 2,
  },
  {
    id: '3',
    url: 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?auto=format&fit=crop&q=80&w=900',
    caption_en: 'Infinity Pool',
    caption_ar: 'مسبح بانورامي',
    span_size: 'small',
    sort_order: 3,
  },
  {
    id: '4',
    url: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&q=80&w=900',
    caption_en: 'Master Bedroom',
    caption_ar: 'غرفة النوم الرئيسية',
    span_size: 'small',
    sort_order: 4,
  },
  {
    id: '5',
    url: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&q=80&w=900',
    caption_en: 'Modern Kitchen',
    caption_ar: 'مطبخ حديث',
    span_size: 'small',
    sort_order: 5,
  },
];

// Smooth Spatial physics preset — project standard
const SPRING = { type: 'spring', stiffness: 60, damping: 20 };

export default function UnitImageGallery({ images = DUMMY_IMAGES }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeIdx, setActiveIdx]       = useState(0);

  const tiles = images.slice(0, 5);

  const openLightbox  = (idx) => { setActiveIdx(idx); setLightboxOpen(true); };
  const closeLightbox = ()    => setLightboxOpen(false);

  const prev = useCallback(
    () => setActiveIdx(i => (i - 1 + tiles.length) % tiles.length),
    [tiles.length],
  );
  const next = useCallback(
    () => setActiveIdx(i => (i + 1) % tiles.length),
    [tiles.length],
  );

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e) => {
      if (e.key === 'ArrowLeft')  prev();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'Escape')     closeLightbox();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxOpen, prev, next]);

  return (
    <>
      {/* ─── BENTO GRID ───────────────────────────────────────── */}
      <div className="relative w-full max-w-6xl mx-auto px-4 lg:px-8">
        <div
          className="grid grid-cols-4 grid-rows-2 gap-1.5 rounded-2xl overflow-hidden"
          style={{ height: 'clamp(240px, 42vh, 460px)' }}
        >
          {tiles.map((img, idx) => {
            const isHero = idx === 0;
            return (
              <motion.div
                key={img.id}
                className={`relative overflow-hidden cursor-pointer bg-black/30 ${
                  isHero ? 'col-span-2 row-span-2' : 'col-span-1 row-span-1'
                }`}
                onClick={() => openLightbox(idx)}
                whileHover="hover"
                initial="rest"
                animate="rest"
              >
                {/* Image */}
                <motion.img
                  src={img.url}
                  alt={img.caption_en}
                  className="w-full h-full object-cover"
                  variants={{ rest: { scale: 1 }, hover: { scale: 1.05 } }}
                  transition={SPRING}
                  loading="lazy"
                />

                {/* Caption overlay */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent flex items-end p-3"
                  variants={{ rest: { opacity: 0 }, hover: { opacity: 1 } }}
                  transition={SPRING}
                >
                  <span className="text-white text-sm font-semibold drop-shadow-lg tracking-wide">
                    {img.caption_ar}
                  </span>
                </motion.div>

                {/* White border glow */}
                <motion.div
                  className="absolute inset-0 pointer-events-none rounded-sm"
                  style={{ border: '1px solid rgba(255,255,255,0)' }}
                  variants={{
                    rest:  { boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0)' },
                    hover: { boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.22)' },
                  }}
                  transition={SPRING}
                />
              </motion.div>
            );
          })}
        </div>

        {/* Show all photos — Glassmorphism CTA */}
        <motion.button
          onClick={() => openLightbox(0)}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          transition={SPRING}
          className="absolute bottom-4 right-12 z-10 flex items-center gap-2 backdrop-blur-md bg-white/30 hover:bg-white/45 text-black font-semibold px-5 py-2 rounded-lg border border-white/40 shadow-xl text-sm"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="opacity-70">
            <rect x="0" y="0" width="6" height="6" rx="1" fill="currentColor"/>
            <rect x="8" y="0" width="6" height="6" rx="1" fill="currentColor"/>
            <rect x="0" y="8" width="6" height="6" rx="1" fill="currentColor"/>
            <rect x="8" y="8" width="6" height="6" rx="1" fill="currentColor"/>
          </svg>
          عرض كل الصور
        </motion.button>
      </div>

      {/* ─── LIGHTBOX ─────────────────────────────────────────── */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            key="lightbox"
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            {/* Blurred backdrop */}
            <div
              className="absolute inset-0 bg-black/88 backdrop-blur-2xl"
              onClick={closeLightbox}
            />

            {/* Close */}
            <motion.button
              onClick={closeLightbox}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              transition={SPRING}
              className="absolute top-5 right-6 z-10 w-10 h-10 flex items-center justify-center rounded-full backdrop-blur-md bg-white/10 hover:bg-white/22 border border-white/20 text-white text-lg"
            >
              ✕
            </motion.button>

            {/* Main image */}
            <div className="relative z-10 w-full max-w-5xl mx-8 flex flex-col items-center">
              <AnimatePresence mode="wait">
                <motion.img
                  key={activeIdx}
                  src={tiles[activeIdx]?.url}
                  alt={tiles[activeIdx]?.caption_en}
                  className="rounded-2xl object-contain w-full"
                  style={{ maxHeight: '68vh' }}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={SPRING}
                />
              </AnimatePresence>

              {/* Caption glass pill */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...SPRING, delay: 0.08 }}
                className="mt-4 backdrop-blur-md bg-white/10 border border-white/20 rounded-xl px-6 py-3 text-center"
              >
                <p className="text-white font-semibold text-sm tracking-wide">
                  {tiles[activeIdx]?.caption_ar}
                </p>
                <p className="text-white/45 text-xs mt-0.5">
                  {activeIdx + 1} / {tiles.length}
                </p>
              </motion.div>
            </div>

            {/* Prev arrow */}
            {tiles.length > 1 && (
              <motion.button
                onClick={prev}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                transition={SPRING}
                className="absolute left-5 z-10 w-12 h-12 flex items-center justify-center rounded-full backdrop-blur-md bg-white/10 hover:bg-white/22 border border-white/20 text-white text-2xl"
              >
                ‹
              </motion.button>
            )}

            {/* Next arrow */}
            {tiles.length > 1 && (
              <motion.button
                onClick={next}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                transition={SPRING}
                className="absolute right-5 z-10 w-12 h-12 flex items-center justify-center rounded-full backdrop-blur-md bg-white/10 hover:bg-white/22 border border-white/20 text-white text-2xl"
              >
                ›
              </motion.button>
            )}

            {/* Thumbnail strip */}
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex gap-2">
              {tiles.map((img, idx) => (
                <motion.button
                  key={img.id}
                  onClick={() => setActiveIdx(idx)}
                  whileHover={{ scale: 1.1 }}
                  transition={SPRING}
                  className={`w-14 h-9 rounded-lg overflow-hidden border-2 transition-opacity ${
                    idx === activeIdx
                      ? 'border-white/80 opacity-100'
                      : 'border-white/20 opacity-45 hover:opacity-75'
                  }`}
                >
                  <img src={img.url} alt={img.caption_en} className="w-full h-full object-cover" />
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

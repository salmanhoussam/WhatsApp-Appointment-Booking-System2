/**
 * SmarGalleryPage.jsx  —  /smar/gallery
 *
 * Masonry grid gallery for Beit Smar.
 * Phase 39.1 — fetches live from GET /api/v1/public/{slug}/gallery.
 * Falls back to FALLBACK_IMAGES if the API returns empty or fails.
 *
 * FM12 / React 19 safety:
 *   No useScroll, no MotionValue in style props.
 *   Only animate=, whileHover=, whileTap=, AnimatePresence.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence }          from 'framer-motion';
import { TenantHeader, TenantFooter }       from '../../../design-system/organisms';
import { SEO }                              from '../../../design-system/atoms';
import publicApi                            from '../../../utils/publicApi';
import useTenantSlug                        from '../../../hooks/useTenantSlug';

// ── Fallback images (homepage/ bucket) — used when gallery/ is still empty ───
const BASE =
  'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beitsmar/homepage/';

const FALLBACK_IMAGES = [
  { id: 1,  src: BASE + 'beitsmar3.jpg',        category: 'chalet',  alt: 'شاليه 3',       ar: 'شاليه بيت سمار',        en: 'Beit Smar Chalet' },
  { id: 2,  src: BASE + 'beitsmar2.jpg',         category: 'nature',  alt: 'طبيعة',         ar: 'الطبيعة الخلابة',        en: 'The Lush Surroundings' },
  { id: 3,  src: BASE + 'beitsmar7.jpg',         category: 'pool',    alt: 'مسبح',          ar: 'المسبح',                 en: 'The Pool' },
  { id: 4,  src: BASE + 'beitsmar4.jpg',         category: 'nature',  alt: 'طبيعة',         ar: 'أجواء الغابة',           en: 'Forest Atmosphere' },
  { id: 5,  src: BASE + 'beitsmar11.jpg',        category: 'pool',    alt: 'منطقة المسبح',  ar: 'منطقة المسبح',           en: 'Pool Area' },
  { id: 6,  src: BASE + 'beitsmar6.jpg',         category: 'nature',  alt: 'طبيعة',         ar: 'المشهد الطبيعي',         en: 'Natural Scenery' },
  { id: 7,  src: BASE + 'beitsmar1.jpg',         category: 'chalet',  alt: 'شاليه',         ar: 'الإطلالة الخارجية',      en: 'Exterior View' },
  { id: 8,  src: BASE + 'beitsmar8.jpg',         category: 'pool',    alt: 'مسبح',          ar: 'المسبح الخارجي',         en: 'Outdoor Pool' },
  { id: 9,  src: BASE + 'beitsmar5.jpg',         category: 'nature',  alt: 'طبيعة',         ar: 'التضاريس الجبلية',       en: 'Mountain Terrain' },
  { id: 10, src: BASE + 'beitsmar10.jpg',        category: 'chalet',  alt: 'شاليه',         ar: 'الواجهة الحجرية',        en: 'Stone Facade' },
  { id: 11, src: BASE + 'beitsmar9.jpg',         category: 'pool',    alt: 'مسبح',          ar: 'أجواء المسبح',           en: 'Pool Ambience' },
  { id: 12, src: BASE + 'beitsmar12.jpg',        category: 'chalet',  alt: 'شاليه',         ar: 'تراس بيت سمار',          en: 'Beit Smar Terrace' },
];

// ── Filter definitions ────────────────────────────────────────────────────────
const FILTERS = [
  { key: 'all',    ar: 'الكل',     en: 'All'     },
  { key: 'chalet', ar: 'الشاليهات', en: 'Chalets' },
  { key: 'pool',   ar: 'المسبح',   en: 'Pool'    },
  { key: 'nature', ar: 'الطبيعة',  en: 'Nature'  },
  { key: 'villas', ar: 'الفلل',    en: 'Villas'  },
];

// ── Animation presets ─────────────────────────────────────────────────────────
const SPRING_SNAPPY  = { type: 'spring', stiffness: 300, damping: 25, mass: 0.5 };
const SPRING_SMOOTH  = { type: 'spring', stiffness: 60,  damping: 20, mass: 1   };

// ── Map API response item → internal image shape ─────────────────────────────
function _apiToImage(item, idx) {
  const name = item.filename ?? '';
  return {
    id:       idx + 1,
    src:      item.url,
    category: item.category ?? 'general',
    alt:      name,
    ar:       name.replace(/\.[^.]+$/, ''),
    en:       name.replace(/\.[^.]+$/, ''),
  };
}

export default function SmarGalleryPage() {
  const slug = useTenantSlug() ?? 'smar';

  const [lang,          setLang]          = useState('ar');
  const [activeFilter,  setActiveFilter]  = useState('all');
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [images,        setImages]        = useState(FALLBACK_IMAGES);
  const [isLoading,     setIsLoading]     = useState(true);

  const isRtl = lang === 'ar';

  // ── Fetch gallery images from API ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    publicApi.get(`/${slug}/gallery`)
      .then(res => {
        if (cancelled) return;
        const data = res.data?.data ?? [];
        if (data.length > 0) {
          setImages(data.map(_apiToImage));
        }
        // if API returns empty (gallery/ not yet populated), keep FALLBACK_IMAGES
      })
      .catch(() => {
        // silently fall back to placeholder images — no error state shown to user
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [slug]);

  // ── Filtered images ───────────────────────────────────────────────────────
  const filteredImages =
    activeFilter === 'all' || activeFilter === 'villas'
      ? images
      : images.filter(img => img.category === activeFilter);

  const isVillasTab = activeFilter === 'villas';

  // ── Lightbox helpers ──────────────────────────────────────────────────────
  const openLightbox  = useCallback((idx) => { setLightboxIndex(idx); }, []);
  const closeLightbox = useCallback(() => { setLightboxIndex(null); }, []);
  const prevImage     = useCallback(() => {
    setLightboxIndex(i => (i - 1 + filteredImages.length) % filteredImages.length);
  }, [filteredImages.length]);
  const nextImage     = useCallback(() => {
    setLightboxIndex(i => (i + 1) % filteredImages.length);
  }, [filteredImages.length]);

  // ── Keyboard navigation ───────────────────────────────────────────────────
  useEffect(() => {
    if (lightboxIndex === null) return;
    function onKey(e) {
      if (e.key === 'Escape')      closeLightbox();
      else if (e.key === 'ArrowLeft')  isRtl ? nextImage() : prevImage();
      else if (e.key === 'ArrowRight') isRtl ? prevImage() : nextImage();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIndex, closeLightbox, prevImage, nextImage, isRtl]);

  // ── Lock body scroll when lightbox is open ────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = lightboxIndex !== null ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [lightboxIndex]);

  const currentImage = lightboxIndex !== null ? filteredImages[lightboxIndex] : null;

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      style={{ minHeight: '100vh', background: '#0a0a0f', color: '#f0ebe3' }}
    >
      <SEO
        title="معرض الصور"
        image="https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beitsmar/gallery/beitsmar1.jpg"
      />
      <TenantHeader />

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div style={{ paddingTop: '5rem' }}>
        <div
          style={{
            maxWidth: '72rem',
            margin: '0 auto',
            padding: '3.5rem 1.5rem 2rem',
            textAlign: 'center',
          }}
        >
          {/* Eyebrow */}
          <p
            style={{
              fontSize: '0.7rem',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: '#d4a853',
              marginBottom: '0.75rem',
              fontWeight: 600,
            }}
          >
            {isRtl ? 'استكشف المكان' : 'EXPLORE THE ESTATE'}
          </p>

          {/* Title */}
          <h1
            style={{
              fontSize: 'clamp(2rem, 5vw, 3.25rem)',
              fontWeight: 300,
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
              marginBottom: '1rem',
              color: '#f0ebe3',
            }}
          >
            {isRtl ? 'معرض بيت سمار' : 'Beit Smar Gallery'}
          </h1>

          {/* Subtitle */}
          <p
            style={{
              fontSize: '0.95rem',
              color: 'rgba(240,235,227,0.45)',
              maxWidth: '36rem',
              margin: '0 auto 0.75rem',
              lineHeight: 1.7,
            }}
          >
            {isRtl
              ? 'لحظات حقيقية، مساحات أصيلة، طبيعة لا تُنسى'
              : 'Real moments, authentic spaces, unforgettable nature'}
          </p>

          {/* Gold divider */}
          <div
            style={{
              width: 40,
              height: 1,
              background: 'linear-gradient(90deg, transparent, #d4a853, transparent)',
              margin: '1.5rem auto 0',
            }}
          />
        </div>
      </div>

      {/* ── Filter Tabs ─────────────────────────────────────────────────────── */}
      <div
        style={{
          maxWidth: '72rem',
          margin: '0 auto',
          padding: '0 1.5rem 2rem',
          display: 'flex',
          justifyContent: 'center',
          gap: '0.5rem',
          flexWrap: 'wrap',
        }}
      >
        {FILTERS.map(f => {
          const isActive = activeFilter === f.key;
          return (
            <motion.button
              key={f.key}
              type="button"
              onClick={() => setActiveFilter(f.key)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              transition={SPRING_SNAPPY}
              style={{
                padding: '0.45rem 1.2rem',
                borderRadius: '9999px',
                fontSize: '0.82rem',
                fontWeight: isActive ? 600 : 400,
                letterSpacing: '0.04em',
                cursor: 'pointer',
                border: isActive
                  ? '1px solid rgba(212,168,83,0.7)'
                  : '1px solid rgba(255,255,255,0.08)',
                background: isActive
                  ? 'linear-gradient(135deg, rgba(212,168,83,0.18), rgba(212,168,83,0.06))'
                  : 'rgba(255,255,255,0.02)',
                color: isActive ? '#d4a853' : 'rgba(240,235,227,0.5)',
                backdropFilter: 'blur(8px)',
                transition: 'all 0.25s ease',
                outline: 'none',
              }}
            >
              {isRtl ? f.ar : f.en}
            </motion.button>
          );
        })}
      </div>

      {/* ── Content Area ────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: '72rem', margin: '0 auto', paddingBottom: '5rem' }}
           className="px-4 sm:px-6 lg:px-8"
      >

        {/* ── Skeleton loader ─────────────────────────────────────────────── */}
        {isLoading && (
          <div className="gallery-masonry" style={{ marginBottom: '1rem' }}>
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                style={{
                  breakInside: 'avoid',
                  marginBottom: '0.875rem',
                  borderRadius: '0.875rem',
                  overflow: 'hidden',
                  height: i % 3 === 0 ? 260 : i % 3 === 1 ? 200 : 310,
                  background: 'linear-gradient(110deg, rgba(255,255,255,0.03) 30%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.03) 70%)',
                  backgroundSize: '200% 100%',
                  animation: `skeletonShimmer 1.6s ease infinite ${i * 0.1}s`,
                  border: '1px solid rgba(255,255,255,0.04)',
                }}
              />
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">

          {/* ── Coming Soon — Villas Tab ────────────────────────────────────── */}
          {isVillasTab ? (
            <motion.div
              key="coming-soon"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={SPRING_SMOOTH}
              style={{
                minHeight: '55vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '3rem 1.5rem',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  maxWidth: '30rem',
                  width: '100%',
                  padding: '3.5rem 2.5rem',
                  borderRadius: '1.25rem',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(212,168,83,0.03) 100%)',
                  border: '1px solid rgba(212,168,83,0.25)',
                  backdropFilter: 'blur(24px)',
                  textAlign: 'center',
                  overflow: 'hidden',
                }}
              >
                {/* Background glow */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'radial-gradient(ellipse at 50% 0%, rgba(212,168,83,0.06) 0%, transparent 70%)',
                    pointerEvents: 'none',
                  }}
                />

                {/* Lock icon */}
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(212,168,83,0.15), rgba(212,168,83,0.05))',
                    border: '1px solid rgba(212,168,83,0.3)',
                    marginBottom: '1.5rem',
                  }}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d4a853" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </motion.div>

                {/* Title */}
                <h2
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 500,
                    letterSpacing: '-0.01em',
                    color: '#d4a853',
                    marginBottom: '0.75rem',
                    position: 'relative',
                  }}
                >
                  {isRtl ? 'الفلل الملكية' : 'Royal Villas'}
                </h2>

                {/* Description */}
                <p
                  style={{
                    fontSize: '1rem',
                    color: 'rgba(240,235,227,0.65)',
                    lineHeight: 1.75,
                    marginBottom: '1.5rem',
                    position: 'relative',
                  }}
                >
                  {isRtl
                    ? 'نجهز لكم تجربة استثنائية'
                    : 'We are preparing an exceptional experience for you'}
                </p>

                {/* Coming soon badge */}
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.4rem 1.1rem',
                    borderRadius: '9999px',
                    background: 'rgba(212,168,83,0.08)',
                    border: '1px solid rgba(212,168,83,0.2)',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'rgba(212,168,83,0.8)',
                  }}
                >
                  {/* Pulsing dot */}
                  <motion.span
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: '#d4a853',
                      display: 'inline-block',
                      flexShrink: 0,
                    }}
                  />
                  {isRtl ? 'قريباً جداً' : 'Coming Soon'}
                </div>

                {/* Bottom accent line */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: '20%',
                    right: '20%',
                    height: 1,
                    background: 'linear-gradient(90deg, transparent, rgba(212,168,83,0.4), transparent)',
                  }}
                />
              </div>
            </motion.div>
          ) : (

            /* ── Masonry Grid ──────────────────────────────────────────────── */
            <motion.div
              key={activeFilter}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* CSS columns masonry — no JS layout lib needed */}
              <div
                style={{
                  columnCount: 1,
                  columnGap: '0.875rem',
                  /* Responsive: Tailwind won't work inside inline style, use media trick */
                }}
                className="gallery-masonry"
              >
                {filteredImages.map((img, idx) => (
                  <motion.div
                    key={img.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      ...SPRING_SNAPPY,
                      delay: idx * 0.04,
                    }}
                    whileHover={{ scale: 1.015 }}
                    onClick={() => openLightbox(idx)}
                    style={{
                      breakInside: 'avoid',
                      marginBottom: '0.875rem',
                      cursor: 'pointer',
                      borderRadius: '0.875rem',
                      overflow: 'hidden',
                      position: 'relative',
                      display: 'block',
                      border: '1px solid rgba(255,255,255,0.06)',
                      background: '#111118',
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={isRtl ? img.ar : img.en}
                    onKeyDown={e => e.key === 'Enter' && openLightbox(idx)}
                  >
                    {/* Image */}
                    <img
                      src={img.src}
                      alt={img.alt}
                      loading="lazy"
                      style={{
                        width: '100%',
                        height: 'auto',
                        display: 'block',
                        objectFit: 'cover',
                        transition: 'transform 0.5s ease',
                      }}
                      onError={e => {
                        e.target.style.minHeight = '180px';
                        e.target.style.background = '#111118';
                      }}
                    />

                    {/* Hover overlay */}
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(to top, rgba(10,10,15,0.75) 0%, transparent 50%)',
                        opacity: 0,
                        transition: 'opacity 0.3s ease',
                        display: 'flex',
                        alignItems: 'flex-end',
                        padding: '1rem',
                      }}
                      className="gallery-card-overlay"
                    >
                      <span
                        style={{
                          fontSize: '0.8rem',
                          color: 'rgba(240,235,227,0.9)',
                          fontWeight: 400,
                          letterSpacing: '0.02em',
                        }}
                      >
                        {isRtl ? img.ar : img.en}
                      </span>
                    </div>

                    {/* Expand icon */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '0.625rem',
                        insetInlineEnd: '0.625rem',
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: 'rgba(10,10,15,0.55)',
                        backdropFilter: 'blur(6px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0,
                        transition: 'opacity 0.25s ease',
                      }}
                      className="gallery-card-expand"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(240,235,227,0.9)" strokeWidth="2" strokeLinecap="round">
                        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                      </svg>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Lightbox ─────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {lightboxIndex !== null && currentImage && (
          <motion.div
            key="lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={closeLightbox}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1000,
              background: 'rgba(5,5,10,0.94)',
              backdropFilter: 'blur(20px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
            }}
          >
            {/* Image container — stop propagation so clicks on image don't close */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1,   opacity: 1 }}
              exit={{ scale: 0.92,   opacity: 0 }}
              transition={SPRING_SMOOTH}
              onClick={e => e.stopPropagation()}
              style={{
                position: 'relative',
                maxWidth: '90vw',
                maxHeight: '88vh',
                borderRadius: '1rem',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
              }}
            >
              <img
                src={currentImage.src}
                alt={currentImage.alt}
                style={{
                  display: 'block',
                  maxWidth: '90vw',
                  maxHeight: '80vh',
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain',
                }}
              />

              {/* Caption bar */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: '1rem 1.25rem',
                  background: 'linear-gradient(to top, rgba(5,5,10,0.9), transparent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ fontSize: '0.85rem', color: 'rgba(240,235,227,0.8)', fontWeight: 400 }}>
                  {isRtl ? currentImage.ar : currentImage.en}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'rgba(240,235,227,0.35)' }}>
                  {lightboxIndex + 1} / {filteredImages.length}
                </span>
              </div>
            </motion.div>

            {/* ── Controls ───────────────────────────────────────────────────── */}

            {/* Close */}
            <motion.button
              type="button"
              onClick={closeLightbox}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              aria-label={isRtl ? 'إغلاق' : 'Close'}
              style={{
                position: 'fixed',
                top: '1.25rem',
                insetInlineEnd: '1.25rem',
                width: 42,
                height: 42,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                backdropFilter: 'blur(8px)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(240,235,227,0.8)',
                outline: 'none',
                zIndex: 10,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </motion.button>

            {/* Prev */}
            {filteredImages.length > 1 && (
              <motion.button
                type="button"
                onClick={e => { e.stopPropagation(); isRtl ? nextImage() : prevImage(); }}
                whileHover={{ scale: 1.1, x: -3 }}
                whileTap={{ scale: 0.9 }}
                aria-label={isRtl ? 'السابق' : 'Previous'}
                style={{
                  position: 'fixed',
                  left: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(8px)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'rgba(240,235,227,0.8)',
                  outline: 'none',
                  zIndex: 10,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </motion.button>
            )}

            {/* Next */}
            {filteredImages.length > 1 && (
              <motion.button
                type="button"
                onClick={e => { e.stopPropagation(); isRtl ? prevImage() : nextImage(); }}
                whileHover={{ scale: 1.1, x: 3 }}
                whileTap={{ scale: 0.9 }}
                aria-label={isRtl ? 'التالي' : 'Next'}
                style={{
                  position: 'fixed',
                  right: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(8px)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'rgba(240,235,227,0.8)',
                  outline: 'none',
                  zIndex: 10,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <TenantFooter />

      {/* ── Scoped styles — hover effects + responsive masonry ─────────────── */}
      <style>{`
        .gallery-masonry {
          column-count: 1;
          column-gap: 0.875rem;
        }
        @media (min-width: 640px)  { .gallery-masonry { column-count: 2; } }
        @media (min-width: 1024px) { .gallery-masonry { column-count: 3; } }

        .gallery-masonry > *:hover .gallery-card-overlay,
        .gallery-masonry > *:focus .gallery-card-overlay,
        .gallery-masonry > *:hover .gallery-card-expand,
        .gallery-masonry > *:focus .gallery-card-expand {
          opacity: 1 !important;
        }

        .gallery-masonry > *:hover img {
          transform: scale(1.04);
        }

        @keyframes skeletonShimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

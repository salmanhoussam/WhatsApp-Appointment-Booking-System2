/**
 * TenantHero.jsx — Organism
 *
 * Cinematic full-screen intro section. Fully self-contained:
 * reads hero_video_url, hero_image_url, name_ar/name_en,
 * and whatsapp_number from useTenantConfig().
 *
 * Architecture:
 *   - <video> background (auto-play, muted, loop) with image fallback
 *   - 3-stop dark gradient overlay (top → transparent → bottom)
 *   - Centered Arabic/English headline + subtitle
 *   - Gold "Explore" CTA + ghost WhatsApp CTA
 *   - Scroll-hint chevron animates with CSS keyframe
 *
 * FM12 / React 19 safety:
 *   Only Framer Motion `animate=` keyframes used on text entrance.
 *   NO useScroll, NO MotionValue style bindings.
 */

import { useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../atoms';
import useTenantConfig from '../../hooks/useTenantConfig';

// ─── Animation variants (entrance only — safe in React 19) ───────────────────
const FADE_UP = {
  hidden:  { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0,  transition: { type: 'spring', stiffness: 60, damping: 20, mass: 1 } },
};

const STAGGER = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.18, delayChildren: 0.35 } },
};

export default function TenantHero({ onExplore }) {
  const { config } = useTenantConfig();
  const videoRef   = useRef(null);
  const [videoErr, setVideoErr] = useState(false);

  const heroVideo = (!videoErr && config?.hero_video_url) ? config.hero_video_url : null;
  const heroImage = config?.hero_image_url ?? null;

  // ── WhatsApp quick contact ─────────────────────────────────────────────────
  const handleWhatsApp = useCallback(() => {
    const number  = config?.whatsapp_number;
    const message = 'مرحباً، أودّ الاستفسار عن الوحدات المتاحة.';
    if (number) {
      window.open(
        `https://wa.me/${number}?text=${encodeURIComponent(message)}`,
        '_blank',
        'noopener,noreferrer',
      );
    }
  }, [config?.whatsapp_number]);

  // ── Scroll down on CTA ────────────────────────────────────────────────────
  const handleExplore = useCallback(() => {
    if (onExplore) {
      onExplore();
    } else {
      window.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
    }
  }, [onExplore]);

  return (
    <section
      className="relative w-full h-screen min-h-[560px] overflow-hidden"
      aria-label="Hero section"
    >

      {/* ── Background layer ─────────────────────────────────────────────────── */}
      {heroVideo ? (
        <video
          ref={videoRef}
          src={heroVideo}
          autoPlay
          loop
          muted
          playsInline
          onError={() => setVideoErr(true)}
          className="absolute inset-0 w-full h-full object-cover"
          aria-hidden="true"
        />
      ) : heroImage ? (
        <img
          src={heroImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          aria-hidden="true"
        />
      ) : (
        /* Minimal gradient fallback when no media is configured */
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 30%, rgba(212,168,83,0.08) 0%, transparent 70%), #0a0a0f',
          }}
          aria-hidden="true"
        />
      )}

      {/* ── Gradient overlay (3-stop cinematic) ─────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, rgba(10,10,15,0.45) 0%, rgba(10,10,15,0.10) 40%, rgba(10,10,15,0.85) 100%)',
        }}
        aria-hidden="true"
      />

      {/* ── Gold vignette (subtle ambient) ──────────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 100%, rgba(212,168,83,0.07) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      {/* ── Centered content ────────────────────────────────────────────────── */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        <motion.div
          dir="rtl"
          variants={STAGGER}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center gap-5 max-w-3xl"
        >

          {/* Gold eyebrow */}
          <motion.span
            variants={FADE_UP}
            className="
              text-[#d4a853] text-[11px] font-semibold
              tracking-[0.35em] uppercase
            "
          >
            {config?.name_en ?? 'Beit Smar'}
          </motion.span>

          {/* Main headline */}
          <motion.h1
            variants={FADE_UP}
            className="
              text-white font-bold leading-tight
              text-[clamp(2rem,6vw,4.5rem)]
              [text-shadow:0_4px_40px_rgba(0,0,0,0.6)]
            "
          >
            {config?.name_ar ?? 'بيت سمار'}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={FADE_UP}
            className="
              text-white/65 text-base sm:text-lg leading-relaxed
              max-w-xl
            "
          >
            تجربة استثنائية تعانق الطبيعة، حيث الأناقة تلتقي بالهدوء
          </motion.p>

          {/* Gold hairline */}
          <motion.div
            variants={FADE_UP}
            className="h-px w-24 opacity-40"
            style={{
              background: 'linear-gradient(to right, transparent, #d4a853, transparent)',
            }}
          />

          {/* CTA row */}
          <motion.div
            variants={FADE_UP}
            className="flex flex-col sm:flex-row items-center gap-3 mt-2"
          >
            <Button
              variant="gold"
              onClick={handleExplore}
              className="min-w-[160px]"
            >
              اكتشف الوحدات
            </Button>

            {config?.whatsapp_number && (
              <Button
                variant="ghost"
                onClick={handleWhatsApp}
                className="min-w-[160px]"
              >
                تواصل عبر واتساب
              </Button>
            )}
          </motion.div>

        </motion.div>
      </div>

      {/* ── Scroll hint chevron ──────────────────────────────────────────────── */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1"
        aria-hidden="true"
      >
        <span
          className="text-white/25 text-[10px] tracking-[0.3em] uppercase"
          style={{ fontVariantCaps: 'all-small-caps' }}
        >
          scroll
        </span>
        {/* CSS-only bounce chevron — no FM scroll hooks */}
        <svg
          width="20"
          height="12"
          viewBox="0 0 20 12"
          fill="none"
          className="text-[#d4a853]/50 animate-bounce"
          aria-hidden="true"
        >
          <path
            d="M1 1L10 10L19 1"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

    </section>
  );
}

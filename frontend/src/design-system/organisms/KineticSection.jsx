/**
 * KineticSection.jsx — Organism
 *
 * Reusable 2.5D parallax scroll section. A sticky 100vh viewport is
 * pinned inside a 200vh scroll container. As the user scrolls through
 * that extra 100vh of space, the image and text panel slide in from
 * opposite sides and meet organically at the center.
 *
 * Props:
 *   align       — 'left' | 'right'  (which side the image enters from)
 *   imageSrc    — foreground subject (PNG with transparency recommended)
 *   bgSrc       — background photo (fills the sticky viewport)
 *   title       — section headline (Arabic)
 *   description — body copy (Arabic)
 *   ctaText     — CTA button label
 *   onCtaClick  — fn() called on CTA press
 *
 * FM12 / React 19 Safety:
 *   - useScroll({ target }) with container ref — safe, no layout-effect leak
 *   - ALL useTransform output arrays use NUMERIC pixels (never 'vw' strings)
 *   - vpW calculated once per render via window.innerWidth guard
 */

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Button } from '../atoms';

export default function KineticSection({
  align       = 'right',
  imageSrc,
  bgSrc,
  title       = '',
  description = '',
  ctaText     = 'اكتشف المزيد',
  onCtaClick,
}) {
  const containerRef = useRef(null);

  // Guard: SSR / first paint before window exists
  const vpW = typeof window !== 'undefined' ? window.innerWidth : 1200;

  // scrollYProgress: 0 when section enters viewport, 1 when it exits
  const { scrollYProgress } = useScroll({
    target:  containerRef,
    offset: ['start end', 'end start'],
  });

  // ── Normalise to the "active" portion [0.15 → 0.65] ────────────────────────
  // Elements are fully in-frame at 0.65, begin exiting near 1.0
  const sp = useTransform(scrollYProgress, [0.1, 0.65], [0, 1]);

  // ── Image ────────────────────────────────────────────────────────────────────
  // align=right → image enters from right (+vpW → 0)
  // align=left  → image enters from left  (−vpW → 0)
  const imgFromX  = align === 'right' ? vpW * 0.85 : -vpW * 0.85;
  const imageX    = useTransform(sp, [0, 1], [imgFromX, 0]);

  // ── Text panel ───────────────────────────────────────────────────────────────
  // Text moves from the OPPOSITE side and slightly faster (×1.15)
  const textFromX = align === 'right' ? -vpW * 1.0 : vpW * 1.0;
  const textX     = useTransform(sp, [0, 1], [textFromX, 0]);

  // ── Shared opacity fade-in ───────────────────────────────────────────────────
  const opacity = useTransform(sp, [0, 0.35], [0, 1]);

  // ── Background subtle scale ──────────────────────────────────────────────────
  const bgScale = useTransform(scrollYProgress, [0, 1], [1.08, 1.0]);

  return (
    /* 200vh container creates the scroll space */
    <div ref={containerRef} className="relative h-[200vh]">

      {/* Sticky viewport — pinned while user scrolls the 200vh */}
      <div className="sticky top-0 h-screen w-full overflow-hidden">

        {/* ── Background image ──────────────────────────────────────────────── */}
        {bgSrc && (
          <motion.div
            className="absolute inset-0"
            style={{ scale: bgScale }}
          >
            <img
              src={bgSrc}
              alt=""
              className="w-full h-full object-cover"
              aria-hidden="true"
            />
          </motion.div>
        )}

        {/* Dark overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(to bottom, rgba(10,10,15,0.55) 0%, rgba(10,10,15,0.25) 50%, rgba(10,10,15,0.80) 100%)',
          }}
          aria-hidden="true"
        />

        {/* ── Content row ───────────────────────────────────────────────────── */}
        <div
          className={[
            'absolute inset-0 flex items-center justify-center px-6 gap-8 lg:gap-16',
            align === 'right' ? 'flex-row' : 'flex-row-reverse',
          ].join(' ')}
          dir="rtl"
        >

          {/* ── Foreground image ──────────────────────────────────────────── */}
          <motion.div
            className="relative flex-shrink-0 w-[42vw] max-w-[560px] h-[70vh]"
            style={{ x: imageX, opacity }}
          >
            <img
              src={imageSrc}
              alt={title}
              className="w-full h-full object-contain drop-shadow-2xl"
              style={{
                maskImage:
                  'radial-gradient(ellipse 80% 80% at 50% 50%, black 45%, transparent 100%)',
                WebkitMaskImage:
                  'radial-gradient(ellipse 80% 80% at 50% 50%, black 45%, transparent 100%)',
              }}
            />
          </motion.div>

          {/* ── Text panel ────────────────────────────────────────────────── */}
          <motion.div
            className="flex flex-col gap-5 max-w-sm lg:max-w-md"
            style={{ x: textX, opacity }}
          >
            {/* Gold eyebrow line */}
            <div
              className="h-px w-12 opacity-60"
              style={{
                background:
                  'linear-gradient(to right, #d4a853, transparent)',
              }}
            />

            {/* Title */}
            <h2
              className="
                text-white font-bold leading-tight
                text-[clamp(1.8rem,4vw,3.2rem)]
                [text-shadow:0_2px_24px_rgba(0,0,0,0.5)]
              "
            >
              {title}
            </h2>

            {/* Description */}
            <p className="text-white/65 text-base leading-relaxed">
              {description}
            </p>

            {/* CTA */}
            <div className="mt-2">
              <Button
                variant="gold"
                onClick={onCtaClick}
                className="px-8"
              >
                {ctaText}
              </Button>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}

/**
 * KineticSection.jsx — Organism
 *
 * Reusable 2.5D parallax scroll section.
 * 200vh container → sticky 100vh viewport pinned while scrolling.
 * Image and text panel slide in from opposite sides as you scroll.
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
 *   NO MotionValue → style prop bindings (those crash under React 19 StrictMode).
 *   All scroll-driven transforms use direct DOM ref mutations via a passive
 *   window scroll listener inside useEffect — zero React re-renders, zero FM
 *   layout-effect subscriptions.
 *   Only FM animate= / whileHover / whileTap are used (safe one-shot triggers).
 */

import { useRef, useEffect } from 'react';
import { Button } from '../atoms';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }

// Linear interpolation between a and b by t ∈ [0,1]
function lerp(a, b, t) { return a + (b - a) * t; }

export default function KineticSection({
  align       = 'right',
  imageSrc,
  bgSrc,
  title       = '',
  description = '',
  ctaText     = 'اكتشف المزيد',
  onCtaClick,
}) {
  // ── Refs — containers for direct DOM mutations ─────────────────────────────
  const containerRef = useRef(null);   // the 200vh scroll space
  const imageRef     = useRef(null);   // foreground image wrapper
  const textRef      = useRef(null);   // text panel
  const bgRef        = useRef(null);   // background image wrapper

  useEffect(() => {
    const vpW = window.innerWidth;

    // Which side does the image enter from?
    const imgFromX  = align === 'right' ?  vpW * 0.85 : -vpW * 0.85;
    // Text comes from the OPPOSITE side, slightly farther (so they meet in center)
    const textFromX = align === 'right' ? -vpW * 1.0  :  vpW * 1.0;

    function tick() {
      const container = containerRef.current;
      if (!container) return;

      const rect   = container.getBoundingClientRect();
      const docH   = container.offsetHeight;   // 200vh worth of px
      const viewH  = window.innerHeight;

      // raw: how far through the 200vh have we scrolled?
      // 0 = section top just entered viewport bottom
      // 1 = section bottom just left viewport top
      const raw = clamp(
        (-rect.top) / (docH - viewH),
        0,
        1,
      );

      // Active window: elements arrive fully at raw=0.55
      const sp = clamp(raw / 0.55, 0, 1);

      // ── Image: slides from one side to 0 ──────────────────────────────────
      const imageX = lerp(imgFromX, 0, sp);
      // ── Text: slides from opposite side, slightly faster ──────────────────
      const textX  = lerp(textFromX, 0, sp);
      // ── Shared opacity: 0 → 1 over first 35% of sp ───────────────────────
      const alpha  = clamp(sp / 0.35, 0, 1);
      // ── Background: subtle scale 1.08 → 1.0 ──────────────────────────────
      const bgSc   = lerp(1.08, 1.0, raw);

      if (imageRef.current) {
        imageRef.current.style.transform = `translateX(${imageX}px)`;
        imageRef.current.style.opacity   = alpha;
      }
      if (textRef.current) {
        textRef.current.style.transform = `translateX(${textX}px)`;
        textRef.current.style.opacity   = alpha;
      }
      if (bgRef.current) {
        bgRef.current.style.transform = `scale(${bgSc})`;
      }
    }

    window.addEventListener('scroll', tick, { passive: true });
    tick(); // set initial state (handles page load mid-scroll)

    return () => window.removeEventListener('scroll', tick);
  }, [align]); // re-register if align prop changes

  return (
    /* 200vh container — creates scroll space for the sticky panel */
    <div ref={containerRef} className="relative h-[200vh]">

      {/* Sticky viewport — pinned while user scrolls */}
      <div className="sticky top-0 h-screen w-full overflow-hidden">

        {/* ── Background image ────────────────────────────────────────────── */}
        {bgSrc && (
          <div
            ref={bgRef}
            className="absolute inset-0 will-change-transform"
            style={{ transformOrigin: 'center center' }}
          >
            <img
              src={bgSrc}
              alt=""
              className="w-full h-full object-cover"
              aria-hidden="true"
            />
          </div>
        )}

        {/* Dark cinematic overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(to bottom, rgba(10,10,15,0.55) 0%, rgba(10,10,15,0.20) 50%, rgba(10,10,15,0.80) 100%)',
          }}
          aria-hidden="true"
        />

        {/* ── Content row ─────────────────────────────────────────────────── */}
        <div
          className={[
            'absolute inset-0 flex items-center justify-center px-6 gap-8 lg:gap-16',
            align === 'right' ? 'flex-row' : 'flex-row-reverse',
          ].join(' ')}
          dir="rtl"
        >

          {/* ── Foreground image ────────────────────────────────────────── */}
          <div
            ref={imageRef}
            className="relative flex-shrink-0 w-[42vw] max-w-[560px] h-[70vh] will-change-transform"
            style={{ opacity: 0 }} /* start invisible — tick() sets initial value */
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
          </div>

          {/* ── Text panel ──────────────────────────────────────────────── */}
          <div
            ref={textRef}
            className="flex flex-col gap-5 max-w-sm lg:max-w-md will-change-transform"
            style={{ opacity: 0 }}
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

            {/* CTA — FM whileHover/whileTap only (safe, no MotionValue binding) */}
            <div className="mt-2">
              <Button
                variant="gold"
                onClick={onCtaClick}
                className="px-8"
              >
                {ctaText}
              </Button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

/**
 * PasteSection.jsx — Olivello Showcase, Section 5 — رحلة زيتونة
 *
 * "العجينة الخضراء — الانكسار الأول"
 * Crushed olive paste: the moment the fruit breaks open and releases its essence.
 *
 * Scroll map (200vh sticky):
 *   0 → 0.12   splash ripple triggers on entry
 *   0.18 → 0.55 title chars reveal one-by-one
 *   0.40 → 0.68 subtitle + taste notes appear
 *   0.88 → 0.98 full section fades out
 */

import { useRef, useState } from 'react';
import { motion, useScroll, useTransform, useSpring, useInView, AnimatePresence } from 'framer-motion';

const TITLE_CHARS = 'انكسرت'.split('');
const SUBTITLE    = 'لتصبح شيئاً آخر';

const TASTE_NOTES = [
  { emoji: '🌿', label_ar: 'عشبي حاد',         label_en: 'Sharp & Herbaceous' },
  { emoji: '🍋', label_ar: 'نكهة ليمون خضراء', label_en: 'Green Citrus Edge' },
  { emoji: '🌶️', label_ar: 'لسعة فلفل خفيفة',  label_en: 'Gentle Pepper Finish' },
];

export default function PasteSection() {
  const ref         = useRef(null);
  const splashRef   = useRef(null);
  const splashInView = useInView(splashRef, { once: true, amount: 0.4 });

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const p = useSpring(scrollYProgress, { stiffness: 55, damping: 20, mass: 1.1 });

  // Title char reveal
  const titleOpacity = useTransform(p, [0.14, 0.55], [0, 1]);

  // Subtitle + notes
  const subOpacity = useTransform(p, [0.38, 0.62], [0, 1]);
  const subY       = useTransform(p, [0.38, 0.62], ['16px', '0px']);

  // Exit
  const exitOpacity = useTransform(p, [0.88, 0.98], [1, 0]);

  return (
    <div ref={ref} style={{ height: '200vh', position: 'relative' }}>
      <motion.div style={{
        position: 'sticky', top: 0, height: '100vh',
        overflow: 'hidden',
        background: 'oklch(42% 0.14 130)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        opacity: exitOpacity,
      }}>

        {/* Grain overlay */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1, opacity: 0.04, pointerEvents: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }} />

        {/* Dark radial centre — depth */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          background: 'radial-gradient(ellipse 65% 65% at 50% 50%, transparent 30%, rgba(0,0,0,0.38) 100%)',
        }} />

        {/* ── Splash / ripple ───────────────────────────────────────────────── */}
        <div ref={splashRef} style={{
          position: 'absolute', inset: 0, zIndex: 2,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          {[0, 0.4, 0.75].map((delay, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, opacity: 0.7 }}
              animate={splashInView ? { scale: 4.5, opacity: 0 } : {}}
              transition={{ duration: 1.35, delay, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'absolute',
                width: 'clamp(80px, 14vw, 160px)',
                height: 'clamp(80px, 14vw, 160px)',
                borderRadius: '50%',
                border: `${2 - i * 0.4}px solid oklch(78% 0.18 130)`,
              }}
            />
          ))}
        </div>

        {/* ── Title — char-by-char ──────────────────────────────────────────── */}
        <motion.div style={{
          position: 'relative', zIndex: 4,
          textAlign: 'center', opacity: titleOpacity,
        }}>
          <div style={{
            display: 'flex', flexDirection: 'row-reverse',
            justifyContent: 'center', gap: 2,
          }}>
            {TITLE_CHARS.map((char, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 22, filter: 'blur(6px)' }}
                whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{
                  delay: 0.18 + i * 0.09,
                  type: 'spring', stiffness: 80, damping: 18,
                }}
                style={{
                  fontSize: 'clamp(54px, 11vw, 130px)',
                  fontWeight: 900,
                  color: 'oklch(92% 0.04 90)',
                  fontFamily: "'Tajawal', system-ui, sans-serif",
                  lineHeight: 1,
                  display: 'inline-block',
                  textShadow: '0 4px 40px rgba(0,0,0,0.3)',
                }}
              >
                {char}
              </motion.span>
            ))}
          </div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ delay: 0.72, duration: 0.9 }}
            style={{
              fontSize: 'clamp(14px, 2vw, 20px)',
              color: 'rgba(240,237,230,0.52)',
              fontFamily: "'Tajawal', system-ui, sans-serif",
              direction: 'rtl', marginTop: 16, letterSpacing: '0.04em',
            }}
          >
            {SUBTITLE}
          </motion.p>
        </motion.div>

        {/* ── Taste notes ───────────────────────────────────────────────────── */}
        <motion.div style={{
          position: 'relative', zIndex: 4,
          display: 'flex', gap: 'clamp(10px, 2.5vw, 22px)',
          marginTop: 'clamp(28px, 4vh, 52px)',
          opacity: subOpacity, y: subY,
          flexWrap: 'wrap', justifyContent: 'center',
          padding: '0 20px',
        }}>
          {TASTE_NOTES.map((note, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.85 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ delay: 0.48 + i * 0.14, type: 'spring', stiffness: 90, damping: 18 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 18px',
                borderRadius: 32,
                background: 'rgba(0,0,0,0.22)',
                border: '1px solid rgba(240,237,230,0.18)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <span style={{ fontSize: 'clamp(18px, 2.2vw, 22px)' }}>{note.emoji}</span>
              <div style={{ textAlign: 'right', direction: 'rtl' }}>
                <p style={{
                  fontSize: 'clamp(11px, 1.1vw, 13px)',
                  fontWeight: 600, color: 'oklch(92% 0.04 90)',
                  fontFamily: "'Tajawal', system-ui, sans-serif",
                  margin: 0, lineHeight: 1.2,
                }}>
                  {note.label_ar}
                </p>
                <p style={{
                  fontSize: 9, color: 'rgba(240,237,230,0.35)',
                  fontFamily: "'Inter', system-ui, sans-serif",
                  letterSpacing: '0.06em', margin: 0,
                }}>
                  {note.label_en}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

      </motion.div>
    </div>
  );
}

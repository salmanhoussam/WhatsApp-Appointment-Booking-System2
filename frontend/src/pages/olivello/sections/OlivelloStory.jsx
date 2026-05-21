/**
 * OlivelloStory.jsx — Phase 71
 * "رحلة زيتونة" — cinematic single-scroll story
 *
 * Structure (z-stack):
 *   0  Shifting background color
 *   1  Full-bleed photo cross-fades (7 images)
 *   2  Dark vignette overlay
 *   3  Film grain
 *   4  Morphing olive shape (right side, fixed)
 *   5  Scrollable text sections (left side)
 *
 * Scroll map: 7 scenes × 130vh = 910vh total + 100vh intro = 1010vh
 */

import { useRef, useState } from 'react';
import {
  motion, useScroll, useTransform, useSpring, useMotionValueEvent,
} from 'framer-motion';

const SUPABASE = 'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties';

// ── Story data ────────────────────────────────────────────────────────────────
const SCENES = [
  {
    id: 0, progress: 0.00, duration: 0.14,
    img:    `${SUPABASE}/olivello/pages/home/story/01-grove.webp`,
    overline: 'The Grove',
    title_ar: 'من الجبل',
    title_en: 'From the Mountain',
    body_ar: 'في جبال لبنان، حيث الهواء ينقّى الروح، تقف أشجار الزيتون المعمّرة شاهدةً على أجيال.',
    body_en: 'In the Lebanese mountains, ancient olive trees stand witness to centuries of heritage.',
  },
  {
    id: 1, progress: 0.14, duration: 0.14,
    img:    `${SUPABASE}/olivello/pages/home/story/02-harvest.jpg`,
    overline: 'The Harvest',
    title_ar: 'القطاف',
    title_en: 'Hand-Picked',
    body_ar: 'في أكتوبر، تمتد الأيدي بين الأغصان وتُقطف كل حبة بحنان، لا بعجلة.',
    body_en: 'In October, every olive is hand-picked at the peak of ripeness — never rushed.',
  },
  {
    id: 2, progress: 0.28, duration: 0.14,
    img:    `${SUPABASE}/olivello/pages/home/story/03-olives.jpg`,
    overline: 'Fresh & Pure',
    title_ar: 'الزيتون الطازج',
    title_en: 'Nature\'s Treasure',
    body_ar: 'ألوف الحبات الخضراء، كل واحدة منها قصة صبر ووعد بنكهة لا تُضاهى.',
    body_en: 'Thousands of green olives — each one a promise of unmatched flavour.',
  },
  {
    id: 3, progress: 0.42, duration: 0.14,
    img:    `${SUPABASE}/olivello/pages/home/story/04-press.jpg`,
    overline: 'Cold Press',
    title_ar: 'العصر البارد',
    title_en: 'Under the Stone',
    body_ar: 'خلال أربع ساعات من القطاف، تُعصر الثمار على البارد. لا حرارة تُفسد النكهة.',
    body_en: 'Within 4 hours of harvest, cold-pressed to preserve every polyphenol.',
  },
  {
    id: 4, progress: 0.56, duration: 0.14,
    img:    `${SUPABASE}/olivello/pages/home/story/05-stream.jpg`,
    overline: 'Liquid Gold',
    title_ar: 'يتدفق الذهب',
    title_en: 'Gold Flows',
    body_ar: 'قطرة قطرة، يتدفق الزيت ذهبياً، حاملاً عطر الجبل وذاكرة الحجر.',
    body_en: 'Drop by drop, gold flows — carrying the mountain\'s breath and the memory of stone.',
  },
  {
    id: 5, progress: 0.70, duration: 0.14,
    img:    `${SUPABASE}/olivello/pages/home/story/06-product.png`,
    overline: 'The Essence',
    title_ar: 'خلاصة كل شيء',
    title_en: 'Pure Essence',
    body_ar: 'في هذه الزجاجة الصغيرة تجتمع الشمس والمطر والتراب والعمل والحب.',
    body_en: 'In this small bottle: sun, rain, earth, labour, and love — nothing else.',
  },
  {
    id: 6, progress: 0.84, duration: 0.16,
    img:    `${SUPABASE}/olivello/pages/home/story/07-bottle.jpg`,
    overline: 'Yours Now',
    title_ar: 'اطلب قنينتك',
    title_en: 'Order Your Bottle',
    body_ar: 'مباشرة من الجبل إلى طاولتك. أصيل، طازج، لبناني.',
    body_en: 'Straight from the mountain to your table. Authentic, fresh, Lebanese.',
    isCta: true,
  },
];

// Background hex colors per scene (safe for FM interpolation)
const BG_STOPS = [0, 0.14, 0.28, 0.42, 0.56, 0.70, 0.84, 1.0];
const BG_COLORS = ['#0d110a', '#0f1208', '#111409', '#131308', '#161408', '#1a1608', '#151208', '#0e1009'];

// ── Sub-components ────────────────────────────────────────────────────────────
function PhotoLayer({ scene, p }) {
  const opacity = useTransform(
    p,
    [
      scene.progress - 0.04,
      scene.progress + 0.02,
      scene.progress + scene.duration * 0.75,
      scene.progress + scene.duration,
    ],
    [0, 1, 1, 0]
  );
  return (
    <motion.div
      style={{
        position: 'fixed', inset: 0,
        backgroundImage: `url(${scene.img})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity,
        zIndex: 1,
        willChange: 'opacity',
      }}
    />
  );
}

function SceneText({ scene, p, index }) {
  const sceneStart = scene.progress;
  const sceneEnd   = scene.progress + scene.duration;
  const textOpacity = useTransform(
    p,
    [sceneStart, sceneStart + 0.025, sceneEnd - 0.04, sceneEnd],
    [0, 1, 1, 0]
  );
  const textY = useTransform(
    p,
    [sceneStart, sceneStart + 0.025],
    ['28px', '0px']
  );

  // Total story height: 1010vh. Scene i starts at (100 + i*130)vh
  const topVh = 100 + index * 130 + 15;

  return (
    <motion.div
      style={{
        position: 'absolute',
        top: `${topVh}vh`,
        left: 0,
        width: '50%',
        maxWidth: 520,
        padding: 'clamp(20px, 4vw, 60px)',
        zIndex: 6,
        opacity: textOpacity,
        y: textY,
      }}
    >
      <p style={{
        fontSize: 9, letterSpacing: '0.38em',
        color: 'rgba(200,168,75,0.72)',
        textTransform: 'uppercase', marginBottom: 18,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}>
        {scene.overline}
      </p>

      <h2 style={{
        fontSize: 'clamp(28px, 4.5vw, 58px)',
        fontWeight: 800, color: '#f0ede6',
        margin: '0 0 8px',
        fontFamily: "'Tajawal', system-ui, sans-serif",
        direction: 'rtl', textAlign: 'right',
        lineHeight: 1.15,
        textShadow: '0 4px 40px rgba(0,0,0,0.6)',
      }}>
        {scene.title_ar}
      </h2>

      <p style={{
        fontSize: 'clamp(9px, 1vw, 11px)',
        letterSpacing: '0.22em', textTransform: 'uppercase',
        color: 'rgba(200,168,75,0.55)', marginBottom: 24,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}>
        {scene.title_en}
      </p>

      <p style={{
        fontSize: 'clamp(13px, 1.4vw, 15px)',
        lineHeight: 1.9, color: 'rgba(240,237,230,0.70)',
        fontFamily: "'Tajawal', system-ui, sans-serif",
        direction: 'rtl', textAlign: 'right',
        marginBottom: 12,
        textShadow: '0 2px 20px rgba(0,0,0,0.5)',
      }}>
        {scene.body_ar}
      </p>

      <p style={{
        fontSize: 'clamp(10px, 1.1vw, 12px)',
        lineHeight: 1.7, color: 'rgba(255,255,255,0.30)',
        fontFamily: "'Inter', system-ui, sans-serif",
        textShadow: '0 2px 20px rgba(0,0,0,0.5)',
      }}>
        {scene.body_en}
      </p>

      {scene.isCta && (
        <div style={{ display: 'flex', gap: 12, marginTop: 32, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <a href="/olivello/store" style={{ textDecoration: 'none' }}>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              style={{
                padding: '14px 32px', borderRadius: 6,
                background: 'oklch(72% 0.16 72)',
                border: 'none',
                color: 'oklch(18% 0.05 90)',
                fontSize: 'clamp(12px, 1.2vw, 14px)',
                fontWeight: 700,
                fontFamily: "'Tajawal', system-ui, sans-serif",
                cursor: 'pointer', direction: 'rtl',
                boxShadow: '0 4px 28px rgba(200,168,75,0.4)',
              }}
            >
              اطلب الآن
            </motion.button>
          </a>
          <a href="/olivello/store" style={{ textDecoration: 'none' }}>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              style={{
                padding: '14px 32px', borderRadius: 6,
                background: 'transparent',
                border: '1.5px solid rgba(200,168,75,0.45)',
                color: 'oklch(78% 0.14 72)',
                fontSize: 'clamp(12px, 1.2vw, 14px)',
                fontWeight: 600,
                fontFamily: "'Tajawal', system-ui, sans-serif",
                cursor: 'pointer', direction: 'rtl',
              }}
            >
              اكتشف المنتجات
            </motion.button>
          </a>
        </div>
      )}
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function OlivelloStory() {
  const containerRef = useRef(null);
  const [ctaVisible, setCtaVisible] = useState(false);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });
  const p = useSpring(scrollYProgress, { stiffness: 45, damping: 20, mass: 1.2 });

  // ── Background color ────────────────────────────────────────────────────────
  const bgColor = useTransform(p, BG_STOPS, BG_COLORS);

  // ── Olive shape transforms ──────────────────────────────────────────────────
  // Width / height
  const shapeW = useTransform(p, [0, 0.40, 0.54, 0.68, 0.92], [70, 72, 68, 68, 68]);
  const shapeH = useTransform(p, [0, 0.40, 0.44, 0.54, 0.68, 0.92], [90, 92, 36, 66, 66, 66]);

  // BorderRadius: olive → squished → teardrop
  const shapeR = useTransform(
    p,
    [0,      0.38,   0.54,              0.92],
    ['50%', '50%', '0 50% 50% 50%',  '0 50% 50% 50%']
  );

  // Color: dark olive → squished dark → gold
  const shapeColor = useTransform(
    p,
    [0,        0.40,      0.54,      0.92],
    ['#4a5e30', '#2a301d', '#c8a84b', '#c8a84b']
  );

  // Rotation: upright → tilt → 45° (teardrop)
  const shapeRotate = useTransform(p, [0, 0.25, 0.40, 0.54, 1.0], [0, 8, -4, 45, 45]);

  // Scale: normal → normal → explodes at finale
  const shapeScale = useTransform(p, [0, 0.82, 0.90, 0.96], [1, 1, 2.8, 9]);

  // Glow (box-shadow intensity)
  const shapeGlow = useTransform(p, [0.50, 0.60, 0.78, 0.90, 0.96], [0, 0, 1, 1, 0]);

  // Opacity: present through finale, fades at very end
  const shapeOpacity = useTransform(p, [0, 0.92, 0.97, 1.0], [1, 1, 1, 0]);

  // Vertical position: gently falls from 32vh → 52vh
  const shapeTop = useTransform(p, [0, 0.40, 0.60, 0.85], ['32vh', '40vh', '48vh', '52vh']);

  // ── One-shot CTA trigger ────────────────────────────────────────────────────
  useMotionValueEvent(p, 'change', (v) => {
    if (v >= 0.84 && !ctaVisible) setCtaVisible(true);
  });

  // ── Scroll indicator opacity (hide after intro) ─────────────────────────────
  const scrollHintOpacity = useTransform(p, [0, 0.04], [1, 0]);

  return (
    <div
      ref={containerRef}
      style={{ height: '1010vh', position: 'relative' }}
    >
      {/* ── Fixed: background color ──────────────────────────────────────── */}
      <motion.div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundColor: bgColor,
      }} />

      {/* ── Fixed: photo layers (cross-fade) ─────────────────────────────── */}
      {SCENES.map((scene) => (
        <PhotoLayer key={scene.id} scene={scene} p={p} />
      ))}

      {/* ── Fixed: dark vignette overlay ─────────────────────────────────── */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 2, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 120% 100% at 100% 50%, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.72) 100%)',
      }} />

      {/* ── Fixed: grain texture ─────────────────────────────────────────── */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 3,
        opacity: 0.04, pointerEvents: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      }} />

      {/* ── Fixed: OLIVELLO wordmark (top-left) ──────────────────────────── */}
      <div style={{
        position: 'fixed', top: 'clamp(20px,3vh,32px)', left: 'clamp(20px,3vw,48px)',
        zIndex: 8, pointerEvents: 'none',
      }}>
        <span style={{
          fontSize: 11, letterSpacing: '0.42em',
          color: 'rgba(200,168,75,0.55)',
          textTransform: 'uppercase',
          fontFamily: "'Inter', system-ui, sans-serif",
        }}>
          OLIVELLO
        </span>
      </div>

      {/* ── Fixed: morphing olive shape ──────────────────────────────────── */}
      <motion.div style={{
        position: 'fixed',
        right: 'clamp(8%, 14vw, 20%)',
        top: shapeTop,
        zIndex: 4,
        pointerEvents: 'none',
        width: shapeW,
        height: shapeH,
        borderRadius: shapeR,
        backgroundColor: shapeColor,
        rotate: shapeRotate,
        scale: shapeScale,
        opacity: shapeOpacity,
        boxShadow: useTransform(
          shapeGlow,
          (v) => v > 0.01
            ? `inset -6px -6px 16px rgba(0,0,0,0.3), 0 0 ${Math.round(v * 60)}px rgba(200,168,75,${(v * 0.85).toFixed(2)})`
            : 'inset -6px -6px 16px rgba(0,0,0,0.3)'
        ),
        translateX: '-50%',
        translateY: '-50%',
        transform: 'translateX(-50%) translateY(-50%)',
      }} />

      {/* ── Fixed: scroll cue ────────────────────────────────────────────── */}
      <motion.div style={{
        position: 'fixed', bottom: 'clamp(20px,4vh,40px)',
        left: '50%', translateX: '-50%',
        zIndex: 8, opacity: scrollHintOpacity,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
        pointerEvents: 'none',
      }}>
        <span style={{
          fontSize: 8, letterSpacing: '0.3em',
          color: 'rgba(255,255,255,0.3)',
          textTransform: 'uppercase',
          fontFamily: "'Inter', system-ui, sans-serif",
        }}>scroll</span>
        <motion.div
          animate={{ y: [0, 9, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            width: 1, height: 36,
            background: 'linear-gradient(to bottom, rgba(200,168,75,0.7), transparent)',
          }}
        />
      </motion.div>

      {/* ── Intro title (first 100vh) ─────────────────────────────────────── */}
      <motion.div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '100vh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'flex-start', justifyContent: 'center',
        padding: 'clamp(40px, 8vw, 120px)',
        zIndex: 6,
        opacity: useTransform(p, [0, 0.04, 0.10], [1, 1, 0]),
      }}>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          style={{
            fontSize: 9, letterSpacing: '0.4em',
            color: 'rgba(200,168,75,0.65)',
            textTransform: 'uppercase', marginBottom: 20,
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          Lebanese Mountain Olive Oil · Est. 1943
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 1.1, type: 'spring', stiffness: 65, damping: 20, mass: 1.5 }}
          style={{
            fontSize: 'clamp(38px, 7vw, 90px)',
            fontWeight: 900, color: '#f0ede6',
            margin: '0 0 16px',
            fontFamily: "'Tajawal', system-ui, sans-serif",
            direction: 'rtl', textAlign: 'right',
            lineHeight: 1.1,
            textShadow: '0 4px 60px rgba(0,0,0,0.5)',
          }}
        >
          رحلة زيتونة
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.85, duration: 0.9 }}
          style={{
            fontSize: 'clamp(11px, 1.2vw, 14px)',
            letterSpacing: '0.2em', textTransform: 'uppercase',
            color: 'rgba(200,168,75,0.48)',
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          The Journey of an Olive
        </motion.p>
      </motion.div>

      {/* ── Story scene text blocks ───────────────────────────────────────── */}
      {SCENES.map((scene, i) => (
        <SceneText key={scene.id} scene={scene} p={p} index={i} />
      ))}

      {/* ── Footer tagline (absolute, bottom) ────────────────────────────── */}
      <div style={{
        position: 'absolute',
        bottom: 'clamp(16px, 3vh, 28px)',
        left: 0, right: 0,
        textAlign: 'center',
        zIndex: 6,
      }}>
        <p style={{
          fontSize: 8, letterSpacing: '0.34em',
          color: 'rgba(200,168,75,0.28)',
          textTransform: 'uppercase',
          fontFamily: "'Inter', system-ui, sans-serif",
          margin: 0,
        }}>
          Olivello · من الجبل إلى طاولتك
        </p>
      </div>
    </div>
  );
}

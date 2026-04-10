import { useEffect, useRef, useState } from 'react';
import { useProgress } from '@react-three/drei';
import { motion }      from 'framer-motion';
import { useSmarStore } from '../store/useSmarStore';

const MIN_DISPLAY_MS = 800;

/**
 * Preloader — full-screen loading screen driven by R3F asset progress.
 *
 * - useProgress() tracks Three.js asset loading (textures, environments)
 * - Minimum display time of 800ms prevents flash on fast connections
 * - When ready: calls setCanvasLoaded() in Zustand
 * - Wrapped in AnimatePresence in SmarPage → exits with opacity fade + scale
 */
export default function Preloader() {
  const { progress } = useProgress();
  const setCanvasLoaded = useSmarStore((s) => s.setCanvasLoaded);
  const startTime       = useRef(Date.now());
  const [displayPct, setDisplayPct] = useState(0);

  // Animate display percentage smoothly
  useEffect(() => {
    const id = setInterval(() => {
      setDisplayPct((prev) => {
        const next = Math.min(prev + 1, Math.round(progress));
        return next;
      });
    }, 16);
    return () => clearInterval(id);
  }, [progress]);

  // Trigger setCanvasLoaded once progress hits 100 and min time has passed
  useEffect(() => {
    if (progress < 100) return;
    const elapsed = Date.now() - startTime.current;
    const delay   = Math.max(0, MIN_DISPLAY_MS - elapsed);
    const t = setTimeout(() => setCanvasLoaded(), delay);
    return () => clearTimeout(t);
  }, [progress, setCanvasLoaded]);

  return (
    <motion.div
      initial={{ opacity: 1, scale: 1 }}
      exit={{
        opacity:    0,
        scale:      1.05,
        transition: { duration: 0.7, ease: [0.4, 0, 0.2, 1] },
      }}
      style={{
        position:       'fixed',
        inset:          0,
        zIndex:         9999,
        background:     '#0a0a0f',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            32,
      }}
    >
      {/* Brand name */}
      <div style={{ textAlign: 'center' }}>
        <h2 style={{
          fontFamily:    "'Cormorant Garamond', 'Georgia', serif",
          fontSize:      'clamp(2rem, 5vw, 3.5rem)',
          fontWeight:    300,
          color:         '#d4a853',
          letterSpacing: '0.4em',
          textTransform: 'uppercase',
          margin:        0,
        }}>
          SMAR
        </h2>
        <p style={{
          fontFamily:    "'Inter', sans-serif",
          fontSize:      '0.65rem',
          letterSpacing: '0.5em',
          color:         'rgba(255,255,255,0.3)',
          textTransform: 'uppercase',
          margin:        '8px 0 0',
        }}>
          Loading Experience
        </p>
      </div>

      {/* Progress bar */}
      <div style={{ width: 'clamp(200px, 30vw, 320px)', position: 'relative' }}>
        {/* Track */}
        <div style={{
          height:       1,
          background:   'rgba(255,255,255,0.08)',
          borderRadius: 1,
          overflow:     'hidden',
        }}>
          {/* Fill */}
          <div style={{
            height:     '100%',
            width:      `${progress}%`,
            background: 'linear-gradient(90deg, #7a5c2a, #d4a853)',
            transition: 'width 0.3s ease',
            boxShadow:  '0 0 12px rgba(212,168,83,0.6)',
          }} />
        </div>

        {/* Percentage */}
        <p style={{
          fontFamily:    "'Inter', sans-serif",
          fontSize:      '0.65rem',
          letterSpacing: '0.25em',
          color:         '#d4a853',
          textAlign:     'right',
          margin:        '8px 0 0',
          opacity:       0.8,
        }}>
          {displayPct}%
        </p>
      </div>
    </motion.div>
  );
}

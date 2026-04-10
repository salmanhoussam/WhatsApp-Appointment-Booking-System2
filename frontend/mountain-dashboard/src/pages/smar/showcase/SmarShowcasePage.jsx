/**
 * SmarShowcasePage.jsx  —  Root Compositor
 *
 * Architecture (3 stacked layers):
 *
 *   z-0  Canvas (position:fixed, inset:0)
 *        └── ScrollControls pages={5}   ← hijacks scroll as a 0→1 timeline
 *              └── Scene3D              ← rings + particles + camera
 *
 *   z-10 HTML overlay (position:fixed, inset:0, pointer-events:none)
 *        ├── ShowcaseCards              ← hero text + property cards + CTA
 *        └── ShowcaseHUD               ← nav + progress dots + lang toggle
 *
 * Data flow:
 *   scrollProgress (Framer Motion MotionValue)
 *     ← set each frame by Scene3D's CameraRig (useFrame, zero re-renders)
 *     → consumed by ShowcaseCards and ShowcaseHUD via ShowcaseContext
 *
 * Exports:
 *   ShowcaseContext  — { scrollProgress, lang, toggleLang, t }
 */

import { createContext, useState, useCallback }  from 'react';
import { Canvas }                                from '@react-three/fiber';
import { ScrollControls }                        from '@react-three/drei';
import { useMotionValue, motionValue }           from 'framer-motion';

import Scene3D       from './Scene3D';
import ShowcaseCards from './ShowcaseCards';
import ShowcaseHUD   from './ShowcaseHUD';
import { translations } from '../spatial/i18n';

// ─── Shared context ───────────────────────────────────────────────────────────
// motionValue(0) is NOT a hook — safe to call at module level.
// This ensures scrollProgress is always a valid MotionValue even before
// the Provider mounts, so useTransform() in children never receives null.
const _fallbackProgress = motionValue(0);

export const ShowcaseContext = createContext({
  scrollProgress: _fallbackProgress,
  lang:           'ar',
  toggleLang:     () => {},
  t:              translations.ar,
});

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SmarShowcasePage() {
  // MotionValue: updated every rAF by Scene3D, never triggers a re-render
  const scrollProgress = useMotionValue(0);

  const [lang, setLang] = useState('ar');
  const toggleLang      = useCallback(() => setLang(p => p === 'ar' ? 'en' : 'ar'), []);
  const t               = translations[lang];

  // Called inside useFrame — must stay a stable ref (useCallback)
  const handleProgress = useCallback(
    (v) => scrollProgress.set(v),
    [scrollProgress],
  );

  return (
    <ShowcaseContext.Provider value={{ scrollProgress, lang, toggleLang, t }}>
      {/*
        The outer div clips overflow so the WebGL canvas never bleeds
        on narrow viewports.  Background #0a0a0f is visible while the
        Canvas initialises (avoids white flash).
      */}
      <div
        style={{
          position:   'relative',
          width:      '100vw',
          height:     '100vh',
          overflow:   'hidden',
          background: '#0a0a0f',
        }}
      >
        {/* ── Layer 0: WebGL ── */}
        <Canvas
          style={{ position: 'absolute', inset: 0, zIndex: 0 }}
          camera={{ position: [0, 0, 10], fov: 75 }}
          gl={{
            antialias:        true,
            alpha:            false,
            powerPreference:  'high-performance',
          }}
          dpr={[1, 1.5]}
        >
          {/*
            damping: 0.15 → smooth, slightly inertial scroll feel
            pages: 5 → scroll container is 500 vh tall
          */}
          <ScrollControls pages={5} damping={0.15}>
            <Scene3D onProgress={handleProgress} />
          </ScrollControls>
        </Canvas>

        {/* ── Layer 1: HTML overlay ── */}
        {/*
          pointer-events:none on the wrapper lets scroll wheel events
          fall through to ScrollControls' capture div in the Canvas.
          Interactive children (buttons, links) set pointer-events:auto.
        */}
        <div
          style={{
            position:      'fixed',
            inset:         0,
            zIndex:        10,
            pointerEvents: 'none',
          }}
        >
          <ShowcaseCards />
          <ShowcaseHUD />
        </div>
      </div>
    </ShowcaseContext.Provider>
  );
}

/**
 * SmarShowcasePage.jsx  —  Root Compositor (Phase 30)
 *
 * Architecture (3 stacked layers):
 *
 *   z-0  Canvas (position:fixed, inset:0)
 *        └── ScrollControls pages={4} damping={0.2} distance={1.2}
 *              └── Scene3D   ← Z-axis camera flight + fog + particles
 *
 *   z-10 HTML overlay (position:fixed, inset:0, pointer-events:none)
 *        ├── ShowcaseCards   ← hero text + property cards + CTA
 *        └── ShowcaseHUD    ← nav + progress dots + lang toggle
 *
 * Data flow:
 *   scrollProgress (Framer Motion MotionValue)
 *     ← set each frame by Scene3D's CameraRig (useFrame, zero re-renders)
 *     → consumed by ShowcaseCards and ShowcaseHUD via ShowcaseContext
 */

import { createContext, useCallback }  from 'react';
import { Canvas }                      from '@react-three/fiber';
import { ScrollControls }              from '@react-three/drei';
import { useMotionValue, motionValue } from 'framer-motion';

import Scene3D       from './Scene3D';
import ShowcaseCards from './ShowcaseCards';
import ShowcaseHUD   from './ShowcaseHUD';

// ─── Shared context ───────────────────────────────────────────────────────────
const _fallbackProgress = motionValue(0);

export const ShowcaseContext = createContext({
  scrollProgress: _fallbackProgress,
});

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SmarShowcasePage() {
  const scrollProgress = useMotionValue(0);

  const handleProgress = useCallback(
    (v) => scrollProgress.set(v),
    [scrollProgress],
  );

  return (
    <ShowcaseContext.Provider value={{ scrollProgress }}>
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
          camera={{ position: [0, 0, 5], fov: 72 }}
          gl={{
            antialias:       true,
            alpha:           false,
            powerPreference: 'high-performance',
          }}
          dpr={[1, 1.5]}
        >
          <ScrollControls pages={5} damping={0.18} distance={1.0}>
            <Scene3D onProgress={handleProgress} />
          </ScrollControls>
        </Canvas>

        {/* ── Layer 1: HTML overlay ── */}
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

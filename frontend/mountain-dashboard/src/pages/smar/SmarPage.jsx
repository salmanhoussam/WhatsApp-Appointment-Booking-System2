/**
 * SmarPage.jsx  —  Photorealistic Collage Scrollytelling
 *
 * Architecture:
 *   ┌─ HeroSection (position:fixed, z:10) — SMAR logo entrance, always above ─┐
 *   │                                                                            │
 *   └─ div#scrollContainer (position:relative, height:600vh, z:1) ─────────────┘
 *       └─ div#stage (position:sticky, top:0, height:100vh, overflow:hidden)
 *           ├─ MountainBackground  z:0  — sky gradient + fog
 *           └─ CollageScene        z:1  — 3 real-photo tiles that PIN + booking
 *
 * GSAP ScrollTrigger watches the 600vh outer container.
 * Progress 0→1 → useSmarStore.scrollProgress → CollageScene RAF loop.
 *
 * Z-index allocation:
 *   fixed   HeroSection (SMAR logo)       → 10
 *   abs      MountainBackground            → 0
 *   abs      CollageScene tiles            → 2–4
 *   abs      CollageScene booking panel    → 50–51
 */

import { useEffect, useRef }  from 'react';
import gsap                   from 'gsap';
import { ScrollTrigger }      from 'gsap/ScrollTrigger';

import MountainBackground from './canvas/MountainBackground';
import CollageScene       from './canvas/CollageScene';
import HeroSection        from './sections/HeroSection';
import { useSmarStore }   from './store/useSmarStore';

gsap.registerPlugin(ScrollTrigger);

export default function SmarPage() {
  const scrollRef         = useRef(null);
  const setScrollProgress = useSmarStore((s) => s.setScrollProgress);
  const setActiveSection  = useSmarStore((s) => s.setActiveSection);

  useEffect(() => {
    const trigger = ScrollTrigger.create({
      trigger:  scrollRef.current,
      start:    'top top',
      end:      'bottom bottom',
      scrub:    true,
      onUpdate: (self) => {
        const p = self.progress;
        setScrollProgress(p);

        if      (p < 0.10) setActiveSection('hero');
        else if (p < 0.28) setActiveSection('villas');
        else if (p < 0.48) setActiveSection('amenities');
        else if (p < 0.70) setActiveSection('chalets');
        else                setActiveSection('cta');
      },
    });

    return () => trigger.kill();
  }, [setScrollProgress, setActiveSection]);

  return (
    <>
      {/* ── SMAR logo — fixed overlay above everything ─────────────────── */}
      <HeroSection />

      {/* ── 600vh scroll container — drives GSAP progress ──────────────── */}
      <div
        ref={scrollRef}
        style={{ position: 'relative', height: '600vh', zIndex: 1, background: '#faf9f6' }}
      >
        {/* ── Sticky stage — stays at top of viewport for 600vh ────────── */}
        <div style={{
          position:   'sticky',
          top:        0,
          height:     '100vh',
          overflow:   'hidden',
          background: '#faf9f6',
        }}>
          {/* Atmospheric gradient background */}
          <MountainBackground />

          {/* Photorealistic collage tiles + booking panel */}
          <CollageScene />
        </div>
      </div>
    </>
  );
}

import { useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

import ShowcaseScene3D       from '../canvas/ShowcaseScene3D';
import { scrollState }       from '../canvas/scrollState';

import Navbar          from '../components/layout/Navbar';
import Footer          from '../components/layout/Footer';
import HeroSection     from '../components/home/HeroSection';
import TickerSection   from '../components/home/TickerSection';
import ServicesSection from '../components/home/ServicesSection';
import WhyUsSection    from '../components/home/WhyUsSection';
import CommandCenter   from '../components/home/CommandCenter';
import CTASection      from '../components/home/CTASection';

gsap.registerPlugin(ScrollTrigger);

// Inline SVG noise — covers canvas + UI, adds film-grain depth
const NOISE_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E")`;

export default function HomePage() {
  useEffect(() => {
    // ── Lenis smooth scroll ──
    const lenis = new Lenis({ lerp: 0.08, wheelMultiplier: 0.9, autoRaf: false });

    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    // ── Feed scroll progress to R3F + update floor HUD ──
    const HUD_FLOORS = [
      { id: 'hud-f0', range: [0.15, 0.40] },
      { id: 'hud-f1', range: [0.40, 0.65] },
      { id: 'hud-f2', range: [0.65, 0.90] },
    ];

    ScrollTrigger.create({
      start: 'top top',
      end:   'bottom bottom',
      onUpdate: (self) => {
        scrollState.progress = self.progress;

        // Direct DOM update — no React re-render on every scroll frame
        const p = self.progress;
        HUD_FLOORS.forEach(({ id, range }) => {
          const el = document.getElementById(id);
          if (!el) return;
          const active = p >= range[0] && p < range[1];
          el.style.opacity   = active ? '1'      : '0.22';
          el.style.transform = active ? 'scaleX(1.25) scaleY(1.25)' : 'scale(1)';
        });
      },
    });

    // ── Feed mouse position to R3F ──
    const onMouse = (e) => {
      scrollState.mouseX = (e.clientX / window.innerWidth  - 0.5) * 2;
      scrollState.mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMouse, { passive: true });

    return () => {
      lenis.destroy();
      ScrollTrigger.getAll().forEach((t) => t.kill());
      window.removeEventListener('mousemove', onMouse);
    };
  }, []);

  return (
    <div style={{ background: '#050505', color: '#fff', minHeight: '100vh', fontFamily: "'Cairo', sans-serif" }}>

      {/* ── Layer 0: R3F canvas (fixed, full screen, behind everything) ── */}
      <Canvas
        style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
        camera={{ position: [0, 18, 20], fov: 60 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 1.5]}
      >
        <Suspense fallback={null}>
          <ShowcaseScene3D />
        </Suspense>
      </Canvas>

      {/* ── Layer 1: Film grain overlay ── */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1,
        background: NOISE_SVG,
        opacity: 0.045,
        pointerEvents: 'none',
      }} />

      {/* ── Layer 2: Scrollable UI ── */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <Navbar />
        <main>
          <HeroSection />
          <TickerSection />
          <ServicesSection />

          {/* Tower descent scroll space — 3D canvas drives the visual here */}
          <div style={{ height: '200vh' }} />

          <WhyUsSection />
          <CommandCenter />
          <CTASection />
        </main>
        <Footer />
      </div>

      {/* ── Layer 3: Floor HUD — right-edge service indicator ── */}
      <div style={{
        position:      'fixed',
        right:         '22px',
        top:           '50%',
        transform:     'translateY(-50%)',
        zIndex:        5,
        display:       'flex',
        flexDirection: 'column',
        gap:           '16px',
        pointerEvents: 'none',
      }}>
        {[
          { id: 'hud-f0', color: '#ff1a55', label: 'الحجز'  },
          { id: 'hud-f1', color: '#f59e0b', label: 'المنيو' },
          { id: 'hud-f2', color: '#8b5cf6', label: 'المتجر' },
        ].map((f) => (
          <div
            key={f.id}
            id={f.id}
            style={{
              display:        'flex',
              alignItems:     'center',
              gap:            '7px',
              opacity:        0.22,
              transition:     'opacity 0.35s ease, transform 0.35s ease',
              direction:      'rtl',
            }}
          >
            <span style={{
              fontSize:   '10px',
              color:       f.color,
              fontFamily: "'Cairo', sans-serif",
              letterSpacing: '0.05em',
              whiteSpace: 'nowrap',
            }}>
              {f.label}
            </span>
            <div style={{
              width:        '7px',
              height:       '7px',
              borderRadius: '50%',
              background:   f.color,
              boxShadow:    `0 0 6px ${f.color}`,
              flexShrink:   0,
            }} />
          </div>
        ))}
      </div>
    </div>
  );
}

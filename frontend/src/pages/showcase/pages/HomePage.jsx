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

    // ── Feed scroll progress to R3F ──
    ScrollTrigger.create({
      start: 'top top',
      end:   'bottom bottom',
      onUpdate: (self) => { scrollState.progress = self.progress; },
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
        camera={{ position: [0, 2.5, 10], fov: 60 }}
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
          <WhyUsSection />
          <CommandCenter />
          <CTASection />
        </main>
        <Footer />
      </div>
    </div>
  );
}

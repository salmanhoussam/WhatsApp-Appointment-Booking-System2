import { useEffect, useRef, useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

import ShowcaseScene3D       from '../canvas/ShowcaseScene3D';
import { scrollState }       from '../canvas/scrollState';
import { RoomEnvironment }   from '../components/RoomEnvironment';

import Navbar          from '../components/layout/Navbar';
import Footer          from '../components/layout/Footer';
import HeroSection     from '../components/home/HeroSection';
import TickerSection   from '../components/home/TickerSection';
import ServicesSection from '../components/home/ServicesSection';
import WhyUsSection    from '../components/home/WhyUsSection';
import CommandCenter   from '../components/home/CommandCenter';
import PricingSection  from '../components/home/PricingSection';
import CTASection      from '../components/home/CTASection';
import ProChatbot      from '../components/home/ProChatbot';

gsap.registerPlugin(ScrollTrigger);

const NOISE_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E")`;

export default function HomePage() {
  const [activeRoom, setActiveRoom] = useState(null);
  const canvasWrapRef               = useRef(null);

  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.08, wheelMultiplier: 0.9, autoRaf: false });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    const HUD_FLOORS = [
      { id: 'hud-f0', range: [0.28, 0.50] },
      { id: 'hud-f1', range: [0.52, 0.67] },
      { id: 'hud-f2', range: [0.67, 0.80] },
      { id: 'hud-f3', range: [0.79, 0.90] },
      { id: 'hud-f4', range: [0.90, 0.97] },
    ];

    ScrollTrigger.create({
      start: 'top top',
      end:   'bottom bottom',
      onUpdate: (self) => {
        scrollState.progress = self.progress;
        const p = self.progress;

        const newRoom = (p > 0.30 && p < 0.48) ? 'about'
                      : (p > 0.57 && p < 0.68) ? 'services'
                      : (p > 0.70 && p < 0.80) ? 'contact'
                      : (p > 0.81 && p < 0.90) ? 'video'
                      : (p > 0.92 && p < 0.97) ? 'romance'
                      : null;

        if (scrollState.room !== newRoom) {
          scrollState.room = newRoom;
          setActiveRoom(newRoom);
          if (canvasWrapRef.current) {
            canvasWrapRef.current.style.opacity = newRoom ? '0.12' : '1';
          }
        }

        HUD_FLOORS.forEach(({ id, range }) => {
          const el = document.getElementById(id);
          if (!el) return;
          const active = p >= range[0] && p < range[1];
          el.style.opacity   = active ? '1'      : '0.22';
          el.style.transform = active ? 'scaleX(1.25) scaleY(1.25)' : 'scale(1)';
        });
      },
    });

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
    <div style={{ background: '#060b18', color: '#fff', minHeight: '100vh', fontFamily: "'Cairo', sans-serif" }}>

      {/* ── Layer 0: R3F Canvas ──────────────────────────────────────────────
          FIX: explicit 100vw × 100vh so R3F ResizeObserver gets real dimensions.
          inset:0 alone leaves height:100% unresolvable → black canvas.          */}
      <div
        ref={canvasWrapRef}
        style={{
          position:   'fixed',
          top:        0,
          left:       0,
          width:      '100vw',
          height:     '100vh',
          zIndex:     0,
          transition: 'opacity 0.9s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <Canvas
          style={{ display: 'block', width: '100%', height: '100%', pointerEvents: 'none' }}
          camera={{ position: [0, 18, 22], fov: 58 }}
          gl={{ antialias: true, alpha: false }}
          dpr={[1, 1.5]}
        >
          <Suspense fallback={null}>
            <ShowcaseScene3D />
          </Suspense>
        </Canvas>
      </div>

      {/* ── Layer 1: Film grain ──────────────────────────────────────────────── */}
      <div style={{
        position:      'fixed',
        inset:         0,
        zIndex:        1,
        background:    NOISE_SVG,
        opacity:       0.045,
        pointerEvents: 'none',
      }} />

      {/* ── Layer 2: Scrollable page ─────────────────────────────────────────
          Structure (مراحل 1):
            HeroSection   — tower IS the hero, camera at z=22 full building visible
            400vh void    — zoom journey through 3 floors (room overlays fire here)
            content       — ticker → services cards → why-us → pricing → CTA
          Result: tower at top, services below, connected by vertical scroll.      */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <Navbar />
        <main>
          <HeroSection />

          {/* Camera zoom journey: About → Services → Contact → Video → Romance floors */}
          <div style={{ height: '560vh' }} />

          {/* Content sections appear after the tower experience */}
          <TickerSection />
          <ServicesSection />
          <WhyUsSection />
          <PricingSection />
          <CommandCenter />
          <CTASection />
        </main>
        <Footer />
      </div>

      {/* ── Layer 4: AI Chatbot ──────────────────────────────────────────────── */}
      <ProChatbot />

      {/* ── Layer 3: Floor HUD ──────────────────────────────────────────────── */}
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
          { id: 'hud-f0', color: '#3b82f6', label: 'من نحن'   },
          { id: 'hud-f1', color: '#f59e0b', label: 'خدماتنا'  },
          { id: 'hud-f2', color: '#22c55e', label: 'تواصل'    },
          { id: 'hud-f3', color: '#a855f7', label: 'فيديو AI' },
          { id: 'hud-f4', color: '#e11d48', label: 'مفاجآت'   },
        ].map((f) => (
          <div
            key={f.id}
            id={f.id}
            style={{
              display:    'flex',
              alignItems: 'center',
              gap:        '7px',
              opacity:    0.22,
              transition: 'opacity 0.35s ease, transform 0.35s ease',
              direction:  'rtl',
            }}
          >
            <span style={{
              fontSize:      '10px',
              color:         f.color,
              fontFamily:    "'Cairo', sans-serif",
              letterSpacing: '0.05em',
              whiteSpace:    'nowrap',
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

      {/* ── Layer 10: Room photo overlays ───────────────────────────────────── */}

      <RoomEnvironment
        imgSrc="/rooms/floor-about.webp"
        accentColor="#3b82f6"
        title="FLOOR_01 // من نحن"
        subtitle="أتمتة تشغّل عملك"
        isVisible={activeRoom === 'about'}
      >
        <p style={{ marginBottom: '1rem' }}>
          نبني أنظمة SaaS عربية للحجوزات والمطاعم والمتاجر.
          بدون كود. بدون فوضى. موظفك الرقمي يشتغل ٢٤ ساعة.
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[
            '٣+ سنوات خبرة',
            '١٥+ عميل نشط في منطقة الخليج',
            'WhatsApp مدمج + Meta Cloud API',
          ].map((t) => (
            <li key={t} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ color: '#3b82f6', fontSize: '0.75rem' }}>◆</span>
              {t}
            </li>
          ))}
        </ul>
      </RoomEnvironment>

      <RoomEnvironment
        imgSrc="/rooms/floor-services.webp"
        accentColor="#f59e0b"
        title="FLOOR_02 // خدماتنا"
        subtitle="قنوات بيع ذكية متكاملة"
        isVisible={activeRoom === 'services'}
      >
        <p style={{ marginBottom: '1rem' }}>
          ٣ أنظمة تشغيلية تزيد مبيعاتك وتريحك من الفوضى:
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {[
            'حجوزات واتساب أوتوماتيك — تأكيد فوري بدون موظف',
            'منيو ذكي يتذكر الزبون ويرفع متوسط الفاتورة',
            'متجر ٢٤/٧ — طلبات ودفع بدون ما تكون موجود',
          ].map((t) => (
            <li key={t} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ color: '#f59e0b', fontSize: '0.75rem' }}>◆</span>
              {t}
            </li>
          ))}
        </ul>
      </RoomEnvironment>

      <RoomEnvironment
        imgSrc="/rooms/floor-contact.webp"
        accentColor="#22c55e"
        title="FLOOR_03 // تواصل"
        subtitle="أطلق منصتك اليوم"
        isVisible={activeRoom === 'contact'}
      >
        <p style={{ marginBottom: '1.5rem' }}>
          فريقنا جاهز لبناء أول tenant لك وتشغيل الأتمتة
          خلال ٢٤ ساعة من الاتفاق.
        </p>
        <a
          href="https://wa.me/96170123456"
          target="_blank"
          rel="noreferrer"
          style={{
            display:        'inline-flex',
            alignItems:     'center',
            gap:            '8px',
            padding:        '0.7rem 1.4rem',
            background:     '#22c55e',
            color:          '#022210',
            fontFamily:     "'Cairo', sans-serif",
            fontWeight:     700,
            fontSize:       '0.9rem',
            textDecoration: 'none',
            transition:     'background 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#16a34a'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#22c55e'; }}
        >
          تواصل عبر واتساب
        </a>
      </RoomEnvironment>

      <RoomEnvironment
        imgSrc="/rooms/floor-video.webp"
        accentColor="#a855f7"
        title="FLOOR_04 // فيديو AI"
        subtitle="إعلانك يُولَد في ثوانٍ"
        isVisible={activeRoom === 'video'}
      >
        <p style={{ marginBottom: '1rem' }}>
          من وصف نصي إلى فيديو إعلاني احترافي بالذكاء الاصطناعي —
          بدون تصوير، بدون موشن ديزاينر.
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.4rem', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
          {[
            'ستوري بورد تلقائي من اسم المنتج',
            'فيديو ١٥ ثانية جاهز لـ Reels وTikTok',
            'لوقو ثابت + نص عربي/إنجليزي',
          ].map((t) => (
            <li key={t} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)' }}>
              <span style={{ color: '#a855f7', fontSize: '0.75rem' }}>◆</span>
              {t}
            </li>
          ))}
        </ul>
        <div style={{
          display: 'flex', gap: '0.6rem', flexWrap: 'wrap',
        }}>
          {['9:16 Reels', 'AR / EN', '5-15 ثانية'].map((tag) => (
            <span key={tag} style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: '0.62rem', letterSpacing: '0.06em',
              color: '#a855f7',
              background: 'rgba(168,85,247,0.1)',
              border: '1px solid rgba(168,85,247,0.3)',
              padding: '0.2rem 0.55rem',
            }}>{tag}</span>
          ))}
        </div>
      </RoomEnvironment>

      <RoomEnvironment
        imgSrc="/rooms/floor-romance.webp"
        accentColor="#e11d48"
        title="FLOOR_05 // مفاجآت"
        subtitle="لحظات لا تُنسى — مُصمَّمة لك"
        isVisible={activeRoom === 'romance'}
      >
        <p style={{ marginBottom: '1rem' }}>
          احجز مفاجأة رومانسية كاملة: ورود، شموع، بالونات ورسالة شخصية —
          كل شيء جاهز عند وصولك.
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.4rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[
            'قلب ورد + ١٢ شمعة مُرتَّبة',
            'بالونات معلّقة مع ورود',
            'رسالة مخصصة بخط يدوي',
          ].map((t) => (
            <li key={t} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)' }}>
              <span style={{ color: '#e11d48', fontSize: '0.75rem' }}>◆</span>
              {t}
            </li>
          ))}
        </ul>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          {[['٢٤', 'ساعة تأكيد'], ['+٥٠', 'مناسبة'], ['١٠٠', '٪ خصوصية']].map(([n, l]) => (
            <div key={l} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '1.3rem', fontWeight: 700, color: '#e11d48' }}>{n}</div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', marginTop: '0.15rem' }}>{l}</div>
            </div>
          ))}
        </div>
      </RoomEnvironment>

    </div>
  );
}

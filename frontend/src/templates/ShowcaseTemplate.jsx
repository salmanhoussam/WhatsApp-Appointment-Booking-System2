/**
 * ShowcaseTemplate.jsx — Cinematic Z-Axis Showcase
 *
 * 6-station pinned GSAP ScrollTrigger experience.
 * Mirrors the architecture of FootlabAboutPage.jsx exactly.
 *
 * Stations:
 *   S1 — Hero Video        (starts visible, exits on Z)
 *   S2 — Forest Journey    (Z-zoom + whisper text)
 *   S3 — Villa             (full-bleed + glass panel from RIGHT)
 *   S4 — Chalet            (full-bleed + glass panel from LEFT + X-slide entry)
 *   S5 — Pool & Amenities  (full-bleed + glass panel fade up)
 *   S6 — Sunset Finale     (deep Z-enter, CTA + nav reveal)
 *
 * FM12 / React 19 safety: zero Framer Motion — pure GSAP + DOM refs.
 * GSAP context scoped to stageRef → ctx.revert() on unmount.
 */

import React, { useRef, useEffect, useState } from 'react';
import { useNavigate }                        from 'react-router-dom';
import gsap                          from 'gsap';
import { ScrollTrigger }             from 'gsap/ScrollTrigger';
import useTenantSlug                 from '../utils/useTenantSlug';
import TenantHeader                  from '../design-system/organisms/TenantHeader';
import useTenantConfig               from '../hooks/useTenantConfig';
import { SEO }                       from '../design-system/atoms';

gsap.registerPlugin(ScrollTrigger);

// ─── Assets (showcase/ bucket — uploaded 2026-04-17) ─────────────────────────
const SC = 'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beitsmar/showcase/';
const GL = 'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beitsmar/gallery/';

const ASSETS = {
  heroVideo    : SC + 'hero_video.mp4',
  forest       : SC + 'journey_forest.jpg',
  cafeImg      : SC + 'beitsmar7.jpg',
  cafeVideo    : SC + 'Mountain_veiw.mp4',
  villa        : SC + 'showcase_villa_arch.png',
  chalet       : SC + 'showcase_chalet_ext.jpg',
  pool         : SC + 'pool.png',
  sunset       : GL + 'beitsmar1.jpg',
};

// Billboard panel — % of journey_forest.jpg (1376×768). Tune to match image.
const BILLBOARD = { left: '79.5%', top: '45%', width: '13%', height: '17%', tilt: 'perspective(500px) rotateY(8deg) rotateZ(-3deg)' };


// ─── Deterministic particles (no Math.random → no hydration mismatch) ─────────
const DUST = Array.from({ length: 28 }, (_, i) => ({
  left:     `${4  + (i * 33 + 11) % 90}%`,
  size:     2 + (i * 3 + 1) % 4,
  delay:    `${((i * 1.7)  % 12).toFixed(1)}s`,
  duration: `${(14 + (i * 1.3) % 10).toFixed(1)}s`,
  op:       (0.12 + (i % 6) * 0.05).toFixed(2),
}));

const FIREFLIES = Array.from({ length: 16 }, (_, i) => ({
  left:     `${8  + (i * 41 + 7)  % 84}%`,
  top:      `${10 + (i * 23 + 5)  % 75}%`,
  delay:    `${((i * 0.8) % 6).toFixed(1)}s`,
  duration: `${(3  + (i * 0.9) % 4).toFixed(1)}s`,
}));

// ─── Styles ───────────────────────────────────────────────────────────────────
const STYLES = `
  .sc-root { background:#050508; color:#fff; font-family:'Inter',sans-serif; }

  .sc-progress {
    position:fixed; top:0; left:0; height:3px; width:100%;
    background:#d4a853; transform-origin:left; transform:scaleX(0);
    z-index:300; pointer-events:none;
  }

  .sc-stage {
    position:relative; width:100vw; height:100vh;
    overflow:hidden;
    perspective:1400px; perspective-origin:50% 50%;
    background:#050508;
  }

  .sc-station {
    position:absolute; inset:0;
    display:flex; align-items:center; justify-content:center;
    transform-style:preserve-3d;
    will-change:transform,opacity,filter;
    overflow:hidden;
  }

  .sc-bg {
    position:absolute; inset:0;
    width:100%; height:100%; object-fit:cover;
  }

  .sc-vignette {
    position:absolute; inset:0;
    background:radial-gradient(ellipse 85% 72% at 50% 50%,transparent 28%,#050508 100%);
    pointer-events:none;
  }

  .sc-depth-rings {
    position:absolute; inset:0;
    display:flex; align-items:center; justify-content:center;
    pointer-events:none; z-index:1;
  }
  .sc-depth-ring {
    position:absolute; border-radius:50%;
    border:1px solid rgba(212,168,83,.13);
  }

  @keyframes scDust {
    0%   { transform:translateY(0)      scale(1);   opacity:0;     }
    12%  { opacity:var(--op);                                       }
    88%  { opacity:var(--op);                                       }
    100% { transform:translateY(-108vh) scale(.55); opacity:0;     }
  }
  .sc-dust {
    position:absolute; border-radius:50%; background:#d4a853;
    animation:scDust linear infinite; pointer-events:none; z-index:2;
  }

  @keyframes scFirefly {
    0%,100% { opacity:0;   transform:scale(.75); }
    48%,52% { opacity:.62; transform:scale(1.2); }
  }
  .sc-firefly {
    position:absolute; width:3px; height:3px; border-radius:50%;
    background:#d4a853;
    box-shadow:0 0 7px 3px rgba(212,168,83,.55);
    animation:scFirefly ease-in-out infinite;
    pointer-events:none; z-index:2;
  }

  .sc-hero-ov {
    position:absolute; inset:0;
    background:linear-gradient(to bottom,rgba(5,5,8,.28) 0%,transparent 42%,rgba(5,5,8,.72) 100%);
    pointer-events:none;
  }

  .sc-scroll-hint {
    position:absolute; bottom:2rem; left:50%; transform:translateX(-50%);
    display:flex; flex-direction:column; align-items:center; gap:.5rem;
    z-index:20; pointer-events:none;
  }
  .sc-scroll-hint span {
    font-size:.6rem; letter-spacing:.35em; text-transform:uppercase;
    color:rgba(255,255,255,.32);
  }
  .sc-scroll-line {
    width:1px; height:36px;
    background:linear-gradient(to bottom,rgba(212,168,83,.65),transparent);
    animation:scLine 2s ease-in-out infinite;
  }
  @keyframes scLine {
    0%,100% { opacity:.3; transform:scaleY(1);   }
    50%     { opacity:.9; transform:scaleY(.55);  }
  }

  .sc-whisper { text-align:center; will-change:opacity,transform; }
  .sc-whisper-word {
    font-size:clamp(.85rem,1.8vw,1.15rem);
    letter-spacing:.38em; text-transform:uppercase;
    color:rgba(255,255,255,.5); font-weight:300;
  }
  .sc-whisper-line {
    width:1px; height:38px; margin:.7rem auto 0;
    background:linear-gradient(to bottom,rgba(212,168,83,.55),transparent);
  }

  .sc-glass {
    position:absolute;
    width:min(460px,88vw);
    padding:2.5rem;
    background:rgba(5,5,8,.52);
    backdrop-filter:blur(22px); -webkit-backdrop-filter:blur(22px);
    border:1px solid rgba(212,168,83,.22); border-radius:24px;
    box-shadow:0 24px 64px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.05);
    z-index:20; will-change:transform,opacity;
  }
  /* top/bottom offset via transform on wrapper — GSAP animates x or y, not transform here */
  .sc-glass-r { right:5%; top:50%; transform:translateY(-50%); }
  .sc-glass-l { left:5%;  top:50%; transform:translateY(-50%); }
  /* Pool panel: margin:auto centering — no CSS transform, GSAP-safe for y animation */
  .sc-glass-b { left:0; right:0; bottom:9%; margin:0 auto; }

  .sc-eyebrow {
    width:32px; height:1px; margin-bottom:1.25rem;
    background:linear-gradient(to right,#d4a853,transparent); opacity:.7;
  }
  .sc-glass-title {
    font-size:clamp(1.55rem,3.2vw,2.3rem);
    font-weight:900; color:#d4a853; line-height:1.18; margin-bottom:.9rem;
    text-shadow:0 4px 22px rgba(0,0,0,.6);
  }
  .sc-glass-desc {
    font-size:.92rem; line-height:1.78;
    color:rgba(255,255,255,.66); margin-bottom:1.65rem;
  }
  .sc-glass-cta {
    display:inline-block; padding:.6rem 1.65rem;
    border:1px solid #d4a853; border-radius:50px;
    background:rgba(212,168,83,.1); color:#d4a853;
    font-size:.75rem; font-weight:700; letter-spacing:.14em; text-transform:uppercase;
    cursor:pointer; transition:background .22s,color .22s;
  }
  .sc-glass-cta:hover { background:#d4a853; color:#050508; }

  .sc-finale {
    position:relative; z-index:10;
    display:flex; flex-direction:column; align-items:center; text-align:center;
    padding:0 1.5rem;
  }
  .sc-finale-h {
    font-size:clamp(2.2rem,7.5vw,5.5rem);
    font-weight:900; line-height:1.1; margin-bottom:.55rem;
    text-shadow:0 4px 48px rgba(0,0,0,.7);
  }
  .sc-finale-sub {
    font-size:clamp(.7rem,1.4vw,.95rem); letter-spacing:.38em; text-transform:uppercase;
    color:#d4a853; margin-bottom:2.75rem; font-weight:300;
  }
  .sc-finale-btn {
    padding:.95rem 3.2rem;
    background:linear-gradient(135deg,#d4a853,#b88c3a);
    color:#050508; font-size:.95rem; font-weight:900;
    letter-spacing:.1em; text-transform:uppercase;
    border:none; border-radius:50px; cursor:pointer;
    box-shadow:0 12px 40px rgba(212,168,83,.35);
    transition:transform .2s,box-shadow .2s;
    margin-bottom:3.5rem;
  }
  .sc-finale-btn:hover { transform:scale(1.045); box-shadow:0 16px 50px rgba(212,168,83,.5); }
  .sc-finale-links {
    display:flex; gap:2.5rem; align-items:center; flex-wrap:wrap; justify-content:center;
    border-top:1px solid rgba(255,255,255,.08); padding-top:2rem;
  }
  .sc-finale-link {
    font-size:.65rem; letter-spacing:.28em; text-transform:uppercase;
    color:rgba(255,255,255,.38); background:none; border:none; cursor:pointer;
    text-decoration:none; transition:color .22s;
  }
  .sc-finale-link:hover { color:#d4a853; }

  @media (max-width:640px) {
    .sc-nav-links { display:none; }
    .sc-glass { padding:1.5rem; }
    .sc-finale-links { gap:1rem; }
    .sc-finale-btn { padding:.85rem 2rem; font-size:.85rem; }
    .sc-glass-r,.sc-glass-l {
      top:auto; bottom:8%; transform:none;
      left:5%; right:5%; width:auto;
    }
  }

  @media (max-width:480px) {
    .sc-finale-h { font-size:clamp(1.8rem,8vw,2.8rem); }
    .sc-glass-title { font-size:clamp(1.2rem,5vw,1.6rem); }
    .sc-glass-desc { font-size:.84rem; }
  }

  /* ── Villa Coming Soon Modal ─────────────────────────────────────────────── */
  .sc-modal-backdrop {
    position:fixed; inset:0; z-index:500;
    background:rgba(5,5,8,.78);
    backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px);
    display:flex; align-items:center; justify-content:center;
    padding:1.5rem;
    animation:scFadeIn .28s ease forwards;
  }
  @keyframes scFadeIn  { from { opacity:0 } to { opacity:1 } }
  @keyframes scSlideUp { from { opacity:0; transform:translateY(28px) scale(.96) }
                         to   { opacity:1; transform:translateY(0)    scale(1)   } }

  .sc-modal-card {
    position:relative;
    width:100%; max-width:26rem;
    padding:3rem 2.5rem;
    background:linear-gradient(140deg,rgba(255,255,255,.055) 0%,rgba(212,168,83,.04) 100%);
    backdrop-filter:blur(28px); -webkit-backdrop-filter:blur(28px);
    border:1px solid rgba(212,168,83,.28);
    border-radius:1.5rem;
    box-shadow:0 32px 80px rgba(0,0,0,.65),inset 0 1px 0 rgba(255,255,255,.06);
    text-align:center;
    animation:scSlideUp .34s cubic-bezier(.34,1.36,.64,1) forwards;
    overflow:hidden;
  }
  .sc-modal-glow {
    position:absolute; inset:0; pointer-events:none;
    background:radial-gradient(ellipse at 50% -10%,rgba(212,168,83,.09) 0%,transparent 65%);
  }
  .sc-modal-lock {
    display:inline-flex; align-items:center; justify-content:center;
    width:62px; height:62px; border-radius:50%;
    background:linear-gradient(135deg,rgba(212,168,83,.16),rgba(212,168,83,.05));
    border:1px solid rgba(212,168,83,.32);
    margin-bottom:1.4rem;
    animation:scFloat 3.6s ease-in-out infinite;
  }
  @keyframes scFloat { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-6px) } }

  .sc-modal-title {
    font-size:1.55rem; font-weight:700; color:#d4a853;
    line-height:1.2; margin-bottom:.65rem;
  }
  .sc-modal-body {
    font-size:.93rem; line-height:1.75; color:rgba(255,255,255,.55);
    margin-bottom:1.75rem;
  }
  .sc-modal-badge {
    display:inline-flex; align-items:center; gap:.45rem;
    padding:.38rem 1.1rem; border-radius:50px;
    background:rgba(212,168,83,.08); border:1px solid rgba(212,168,83,.2);
    font-size:.72rem; font-weight:700; letter-spacing:.14em; text-transform:uppercase;
    color:rgba(212,168,83,.78); margin-bottom:2rem;
  }
  .sc-modal-dot {
    width:6px; height:6px; border-radius:50%; background:#d4a853;
    animation:scPulse 1.9s ease-in-out infinite;
  }
  @keyframes scPulse { 0%,100% { opacity:1 } 50% { opacity:.28 } }
  .sc-modal-close {
    position:absolute; top:1rem; right:1rem;
    width:32px; height:32px; border-radius:50%;
    background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1);
    color:rgba(255,255,255,.5); cursor:pointer;
    display:flex; align-items:center; justify-content:center;
    transition:background .2s,color .2s;
  }
  .sc-modal-close:hover { background:rgba(255,255,255,.1); color:#fff; }
  .sc-modal-bottom-line {
    position:absolute; bottom:0; left:15%; right:15%; height:1px;
    background:linear-gradient(90deg,transparent,rgba(212,168,83,.4),transparent);
  }
`;

// ─── Component ────────────────────────────────────────────────────────────────
export default function ShowcaseTemplate() {
  const navigate      = useNavigate();
  const slug          = useTenantSlug() ?? 'smar';
  const { config }    = useTenantConfig();

  const [villaModalOpen, setVillaModalOpen] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setVillaModalOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const stageRef        = useRef(null);
  const progressRef     = useRef(null);
  const depthRef        = useRef(null);

  const s1Ref           = useRef(null);
  const s2Ref           = useRef(null);
  const s3Ref           = useRef(null);
  const s4Ref           = useRef(null);
  const s5Ref           = useRef(null);
  const s6Ref           = useRef(null);

  const forestTextRef   = useRef(null);
  const villaGlassRef   = useRef(null);
  const chaletGlassRef  = useRef(null);
  const poolGlassRef    = useRef(null);
  const ctaRef          = useRef(null);
  const finaleLinksRef  = useRef(null);

  useEffect(() => {
    if (!stageRef.current) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add(
        {
          isDesktop: '(min-width: 769px)',
          isMobile:  '(max-width: 768px)',
        },
        (mmCtx) => {
          const { isDesktop } = mmCtx.conditions;

          const zEnter     = isDesktop ? -2400 : -1000;
          const zExit      = isDesktop ?   760 :   300;
          const blurEnter  = isDesktop ?    28 :    14;
          const blurExit   = isDesktop ?    18 :     9;
          const scaleEnter = isDesktop ?  0.26 :  0.50;
          const scaleExit  = isDesktop ?  1.55 :  1.25;
          const scrollEnd  = isDesktop ? '+=600%' : '+=440%';
          const depthScale = isDesktop ?   3.8 :   2.4;
          const panelX     = isDesktop ?    88 :    38;
          const forestZoom = isDesktop ?   1.7 :   1.4;

          const ENTER = {
            z: zEnter, scale: scaleEnter,
            autoAlpha: 0, filter: `blur(${blurEnter}px)`,
          };
          const ENTER_ANIM = {
            z: 0, scale: 1,
            autoAlpha: 1, filter: 'blur(0px)',
            ease: 'power3.out',
          };
          const EXIT = {
            z: zExit, scale: scaleExit,
            autoAlpha: 0, filter: `blur(${blurExit}px)`,
            ease: 'power2.in',
          };

          gsap.set(s1Ref.current, { autoAlpha: 1, z: 0, scale: 1, filter: 'blur(0px)' });

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger:             stageRef.current,
              start:               'top top',
              end:                 scrollEnd,
              scrub:               1.4,
              pin:                 true,
              pinSpacing:          true,
              anticipatePin:       1,
              invalidateOnRefresh: true,
            },
          });

          // Depth rings expand throughout the entire journey
          tl.fromTo(depthRef.current,
            { scale: 1,          opacity: 0.52 },
            { scale: depthScale, opacity: 0, ease: 'none', duration: 11 },
            0
          );

          // ── S1: Hero → EXIT ───────────────────────────────────────────────
          tl.to(s1Ref.current, { ...EXIT, duration: 1.5 }, 0);

          // ── S2: Forest ────────────────────────────────────────────────────
          tl.fromTo(s2Ref.current, ENTER, { ...ENTER_ANIM, duration: 1.4 }, 0.8);
          tl.fromTo('.sc-forest-img',
            { scale: 1 },
            { scale: forestZoom, ease: 'none', duration: 2.2 },
            1.0
          );
          tl.fromTo(forestTextRef.current,
            { autoAlpha: 0, y: 22 },
            { autoAlpha: 0.82, y: 0, duration: 0.6, ease: 'power2.out' },
            2.1
          );
          tl.to(forestTextRef.current,
            { autoAlpha: 0, y: -18, duration: 0.45, ease: 'power2.in' },
            2.85
          );
          tl.to(s2Ref.current, { ...EXIT, duration: 1.5 }, 3.2);

          // ── S3: Villa — glass panel from RIGHT ────────────────────────────
          tl.fromTo(s3Ref.current, ENTER, { ...ENTER_ANIM, duration: 1.4 }, 3.9);
          tl.fromTo(villaGlassRef.current,
            { autoAlpha: 0, x: panelX },
            { autoAlpha: 1, x: 0, duration: 0.82, ease: 'power2.out' },
            4.65
          );
          tl.to(villaGlassRef.current,
            { autoAlpha: 0, x: panelX * 0.45, duration: 0.38 },
            5.7
          );
          tl.to(s3Ref.current, { ...EXIT, duration: 1.5 }, 5.9);

          // ── S4: Chalet — X-slide entry + glass panel from LEFT ────────────
          tl.fromTo(s4Ref.current,
            { ...ENTER, x: isDesktop ? '28vw' : '14vw' },
            { ...ENTER_ANIM, x: '0vw', duration: 1.4 },
            6.5
          );
          tl.fromTo(chaletGlassRef.current,
            { autoAlpha: 0, x: -panelX },
            { autoAlpha: 1, x: 0, duration: 0.82, ease: 'power2.out' },
            7.25
          );
          tl.to(chaletGlassRef.current,
            { autoAlpha: 0, x: -panelX * 0.45, duration: 0.38 },
            8.3
          );
          tl.to(s4Ref.current,
            { ...EXIT, x: isDesktop ? '-28vw' : '-14vw', duration: 1.5 },
            8.5
          );

          // ── S5: Pool — blur reveal + glass fades up ───────────────────────
          tl.fromTo(s5Ref.current,
            { ...ENTER, scale: 1.14, filter: `blur(${blurEnter * 0.75}px)` },
            { ...ENTER_ANIM, duration: 1.2 },
            9.0
          );
          tl.fromTo(poolGlassRef.current,
            { autoAlpha: 0, y: 30 },
            { autoAlpha: 1, y: 0, duration: 0.82, ease: 'power2.out' },
            9.7
          );
          tl.to(poolGlassRef.current,
            { autoAlpha: 0, y: -22, duration: 0.38 },
            10.65
          );
          tl.to(s5Ref.current, { ...EXIT, duration: 1.3 }, 10.85);

          // ── S6: Sunset Finale — deep Z from far away ──────────────────────
          tl.fromTo(s6Ref.current,
            {
              z:         isDesktop ? -4400 : -1500,
              scale:     isDesktop ?  0.13 :  0.38,
              autoAlpha: 0,
              filter:    isDesktop ? 'blur(38px)' : 'blur(20px)',
            },
            { z: 0, scale: 1, autoAlpha: 1, filter: 'blur(0px)', duration: 1.85, ease: 'power2.inOut' },
            11.3
          );
          tl.fromTo(ctaRef.current,
            { autoAlpha: 0, y: isDesktop ? 30 : 16 },
            { autoAlpha: 1, y: 0, duration: 0.85, ease: 'power2.out' },
            12.1
          );
          tl.fromTo(finaleLinksRef.current,
            { autoAlpha: 0 },
            { autoAlpha: 1, duration: 0.7 },
            12.75
          );

          // Progress bar — separate scrub
          if (progressRef.current) {
            gsap.to(progressRef.current, {
              scaleX: 1, ease: 'none',
              scrollTrigger: {
                trigger: stageRef.current,
                start:   'top top',
                end:     scrollEnd,
                scrub:   true,
              },
            });
          }
        }
      );
    }, stageRef);

    return () => ctx.revert();
  }, []);

  return (
    <>
      <SEO title="الرئيسية" />
      <style>{STYLES}</style>

      {/* Gold progress bar */}
      <div ref={progressRef} className="sc-progress" />

      {/* ── Shared navigation — same across all tenant pages ── */}
      <TenantHeader />

      <div className="sc-root">
        <div ref={stageRef} className="sc-stage">

          {/* ── Ambient: dust motes ──────────────────────────────────────── */}
          <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
            {DUST.map((d, i) => (
              <div key={i} className="sc-dust" style={{
                left:              d.left,
                bottom:            '-4px',
                width:             `${d.size}px`,
                height:            `${d.size}px`,
                '--op':            d.op,
                animationDelay:    d.delay,
                animationDuration: d.duration,
              }} />
            ))}
          </div>

          {/* ── Ambient: fireflies ───────────────────────────────────────── */}
          <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
            {FIREFLIES.map((f, i) => (
              <div key={i} className="sc-firefly" style={{
                left:              f.left,
                top:               f.top,
                animationDelay:    f.delay,
                animationDuration: f.duration,
              }} />
            ))}
          </div>

          {/* ── Depth rings ──────────────────────────────────────────────── */}
          <div ref={depthRef} className="sc-depth-rings" aria-hidden="true">
            {Array.from({ length: 7 }, (_, i) => (
              <div key={i} className="sc-depth-ring" style={{
                width:  `${(i + 1) * 17}vw`,
                height: `${(i + 1) * 17}vw`,
              }} />
            ))}
          </div>

          {/* ── S1 — Billboard Hero (forest image + logo video overlay) ── */}
          <div ref={s1Ref} className="sc-station" style={{ zIndex: 20 }}>
            {/* Aspect-ratio wrapper keeps billboard % positions stable */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%,-50%)',
              width: 'min(100vw, calc(100vh * 1.792))',
              height: 'min(100vh, calc(100vw / 1.792))',
            }}>
              <img src={ASSETS.forest} alt="" style={{ display: 'block', width: '100%', height: '100%', objectFit: 'fill' }} />
              {/* Billboard logo video overlay */}
              <div style={{
                position: 'absolute',
                left: BILLBOARD.left, top: BILLBOARD.top,
                width: BILLBOARD.width, height: BILLBOARD.height,
                overflow: 'hidden',
                transform: BILLBOARD.tilt,
                transformOrigin: 'left center',
              }}>
                <video src={ASSETS.heroVideo} autoPlay muted loop playsInline
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            </div>
            {/* Vignette — heavier on left for text readability */}
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'linear-gradient(to right, rgba(5,5,8,0.82) 0%, rgba(5,5,8,0.52) 45%, transparent 72%)',
            }} />
            {/* Hero title — gold name + white evocative subtitle */}
            <div style={{
              position: 'absolute', top: 0, bottom: 0, left: 0,
              width: '58%', zIndex: 10,
              display: 'flex', flexDirection: 'column',
              alignItems: 'flex-end', justifyContent: 'center',
              padding: '0 3vw 0 7vw',
            }} dir="rtl">
              <h1 style={{
                color: '#d4a853',
                fontSize: 'clamp(28px, 9.5vw, 128px)',
                fontWeight: 900, lineHeight: 1.0,
                letterSpacing: '-0.02em', margin: '0 0 20px 0',
                textShadow: '0 4px 32px rgba(212,168,83,0.45), 0 12px 60px rgba(0,0,0,0.8)',
              }}>
                بيت سمار
              </h1>
              <p style={{
                color: 'rgba(255,255,255,0.90)',
                fontSize: 'clamp(16px, 2.2vw, 26px)',
                fontWeight: 300, lineHeight: 1.65,
                letterSpacing: '0.01em', margin: '0 0 10px 0',
                textShadow: '0 2px 20px rgba(0,0,0,0.7)',
                maxWidth: '22ch',
              }}>
                حيث يهدأ العالم،<br />وتبدأ أنت من جديد
              </p>
              <p style={{
                color: 'rgba(212,168,83,0.70)',
                fontSize: 'clamp(11px, 1.1vw, 14px)',
                fontWeight: 400, letterSpacing: '0.18em',
                textTransform: 'uppercase', margin: 0,
              }}>
                شاليهات · فيلل · جبال بلوط مطلة على البحر
              </p>
            </div>
            <div className="sc-scroll-hint" aria-hidden="true">
              <span>ابدأ الرحلة</span>
              <div className="sc-scroll-line" />
            </div>
          </div>

          {/* ── S2 — Atmosphere statement ────────────────────────────────── */}
          <div ref={s2Ref} className="sc-station" style={{ zIndex: 10, opacity: 0 }}>
            <img src={ASSETS.cafeImg} alt="" className="sc-bg sc-forest-img" loading="eager" aria-hidden="true" />
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'linear-gradient(to bottom, rgba(5,5,8,.55) 0%, rgba(5,5,8,.25) 50%, rgba(5,5,8,.72) 100%)',
            }} />
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none" dir="rtl">
              <div ref={forestTextRef} className="sc-whisper" style={{ textAlign: 'center', padding: '0 8vw' }}>
                <p style={{
                  fontSize: 'clamp(1.6rem, 4.5vw, 3.8rem)',
                  fontWeight: 800, color: '#ffffff',
                  lineHeight: 1.35, letterSpacing: '-0.01em',
                  textShadow: '0 4px 40px rgba(0,0,0,0.7)',
                  marginBottom: '1.2rem',
                }}>
                  مطعمنا الجبلي مفتوح<br />على أفق البحر
                </p>
                <p style={{
                  fontSize: 'clamp(0.85rem, 1.6vw, 1.1rem)',
                  fontWeight: 400, color: 'rgba(212,168,83,0.85)',
                  letterSpacing: '0.22em', textTransform: 'uppercase',
                }}>
                  أعراس · احتفالات · طعام فاخر
                </p>
                <div className="sc-whisper-line" style={{ marginTop: '1.4rem' }} />
              </div>
            </div>
          </div>

          {/* ── S3 — Villa ───────────────────────────────────────────────── */}
          <div ref={s3Ref} className="sc-station" style={{ zIndex: 10, opacity: 0 }}>
            <img
              src={ASSETS.villa}
              alt="فيلا سمار"
              className="sc-bg"
              style={{ objectPosition: 'center 30%' }}
              loading="lazy"
            />
            <div className="sc-vignette" />
            <div ref={villaGlassRef} className="sc-glass sc-glass-r" dir="rtl" style={{ opacity: 0 }}>
              <div className="sc-eyebrow" />
              <h2 className="sc-glass-title">الفيلا الملكية</h2>
              <p className="sc-glass-desc">
                حجر لبناني أصيل يعانق التصميم العصري. قناطر هندسية وأسقف قرميدية تروي قصة أجيال وسط الجبال اللبنانية.
              </p>
              <button
                className="sc-glass-cta"
                onClick={() => setVillaModalOpen(true)}
              >
                استكشف الفلل
              </button>
            </div>
          </div>

          {/* ── S4 — Chalet ──────────────────────────────────────────────── */}
          <div ref={s4Ref} className="sc-station" style={{ zIndex: 10, opacity: 0 }}>
            <img
              src={ASSETS.chalet}
              alt="شاليهات سمار"
              className="sc-bg"
              loading="lazy"
            />
            <div className="sc-vignette" />
            <div ref={chaletGlassRef} className="sc-glass sc-glass-l" dir="rtl" style={{ opacity: 0 }}>
              <div className="sc-eyebrow" />
              <h2 className="sc-glass-title">الشاليهات الدافئة</h2>
              <p className="sc-glass-desc">
                ملاذك الخاص بعيداً عن صخب المدينة. تصميم خشبي وحجري يوفر خصوصية تامة مع إطلالات لا تُحجب على الطبيعة.
              </p>
              <button
                className="sc-glass-cta"
                onClick={() => navigate(`/${slug}/listings?type=chalet`)}
              >
                استكشف الشاليهات
              </button>
            </div>
          </div>

          {/* ── S5 — Pool & Amenities ────────────────────────────────────── */}
          <div ref={s5Ref} className="sc-station" style={{ zIndex: 10, opacity: 0 }}>
            <img
              src={ASSETS.pool}
              alt="مسبح سمار"
              className="sc-bg"
              loading="lazy"
            />
            <div className="sc-vignette" />
            {/* sc-glass-b uses margin:auto — no CSS transform, GSAP y-animation is safe */}
            <div ref={poolGlassRef} className="sc-glass sc-glass-b" dir="rtl" style={{ opacity: 0, textAlign: 'center' }}>
              <div className="sc-eyebrow" style={{ margin: '0 auto 1.25rem' }} />
              <h2 className="sc-glass-title">المسبح والمرافق</h2>
              <p className="sc-glass-desc">
                مسبح لا نهائي يندمج مع الأفق اللبناني. استمتع بأجواء استثنائية في مساحات مصممة لراحتك الكاملة.
              </p>
              <button
                className="sc-glass-cta"
                onClick={() => navigate(`/${slug}/listings`)}
              >
                اكتشف كل ما نقدمه
              </button>
            </div>
          </div>

          {/* ── S6 — Sunset Finale ───────────────────────────────────────── */}
          <div ref={s6Ref} className="sc-station" style={{ zIndex: 30, opacity: 0 }}>
            <img
              src={ASSETS.sunset}
              alt="غروب بيت سمار"
              className="sc-bg"
              loading="lazy"
            />
            <div className="absolute inset-0 pointer-events-none" aria-hidden="true" style={{
              background:
                'linear-gradient(to top,rgba(5,5,8,.92) 0%,rgba(5,5,8,.48) 50%,rgba(5,5,8,.15) 100%)',
            }} />

            <div className="sc-finale" dir="rtl">
              <h1 className="sc-finale-h">اصنع ذكرياتك هنا</h1>
              <p className="sc-finale-sub">ننتظرك في بيت سمار</p>

              <button
                ref={ctaRef}
                className="sc-finale-btn"
                style={{ opacity: 0 }}
                onClick={() => navigate(`/${slug}/listings`)}
              >
                احجز إقامتك الآن
              </button>

              <div ref={finaleLinksRef} className="sc-finale-links" style={{ opacity: 0 }}>
                <button
                  className="sc-finale-link"
                  onClick={() => navigate(`/${slug}/listings?type=villa`)}
                >
                  الفلل
                </button>
                <button
                  className="sc-finale-link"
                  onClick={() => navigate(`/${slug}/listings?type=chalet`)}
                >
                  الشاليهات
                </button>
                <button
                  className="sc-finale-link"
                  onClick={() => navigate(`/${slug}/listings`)}
                >
                  جميع الوحدات
                </button>
                {config.instagram_url && (
                  <a
                    href={config.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sc-finale-link"
                  >
                    Instagram
                  </a>
                )}
                {config.maps_url && (
                  <a
                    href={config.maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sc-finale-link"
                  >
                    الموقع
                  </a>
                )}
                {config.whatsapp_number && (
                  <a
                    href={`https://wa.me/${config.whatsapp_number}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sc-finale-link"
                  >
                    واتساب
                  </a>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Villa Coming Soon Modal ─────────────────────────────────────────── */}
      {villaModalOpen && (
        <div
          className="sc-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="الفلل الملكية — قريباً"
          onClick={() => setVillaModalOpen(false)}
        >
          <div
            className="sc-modal-card"
            dir="rtl"
            onClick={e => e.stopPropagation()}
          >
            {/* Top glow */}
            <div className="sc-modal-glow" />

            {/* Close button */}
            <button
              className="sc-modal-close"
              onClick={() => setVillaModalOpen(false)}
              aria-label="إغلاق"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>

            {/* Floating lock icon */}
            <div className="sc-modal-lock">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                stroke="#d4a853" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>

            {/* Title */}
            <h2 className="sc-modal-title">الفلل الملكية</h2>

            {/* Body */}
            <p className="sc-modal-body">
              نجهز لكم تجربة إقامة استثنائية في فلل بيت سمار.<br />
              تصميم راقٍ يعكس روح الجبل اللبناني الأصيل.
            </p>

            {/* Coming Soon badge */}
            <div className="sc-modal-badge">
              <span className="sc-modal-dot" />
              قريباً جداً
            </div>

            {/* Bottom accent */}
            <div className="sc-modal-bottom-line" />
          </div>
        </div>
      )}
    </>
  );
}

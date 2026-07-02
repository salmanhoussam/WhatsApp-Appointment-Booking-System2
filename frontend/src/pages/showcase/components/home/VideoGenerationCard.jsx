import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const ACCENT = '#a855f7';

const STEPS = [
  { ar: 'بترفع صورة المنتج',      en: 'Upload product photo'    },
  { ar: 'نختار الموديل المناسب',  en: 'Select AI model'         },
  { ar: 'نولّد الستوري بورد',     en: 'Generate storyboard'     },
  { ar: 'Seedance يولّد الفيديو', en: 'Seedance renders video'  },
];

const TAGS = [
  { ar: '9:16 Reels',    en: '9:16 Reels'    },
  { ar: 'عربي / إنجليزي', en: 'AR / EN'      },
  { ar: 'لوقو lock',     en: 'Logo lock'     },
  { ar: '5–15 ثانية',    en: '5–15 sec'      },
];

function IconFilm() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke={ACCENT} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M7 4v16M17 4v16M2 9h5M17 9h5M2 15h5M17 15h5" />
    </svg>
  );
}

function IconSparkle() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={ACCENT}>
      <path d="M12 2l2.4 7.2H22l-6.2 4.5 2.4 7.2L12 16.5l-6.2 4.4 2.4-7.2L2 9.2h7.6z" />
    </svg>
  );
}

export default function VideoGenerationCard({ lang = 'ar' }) {
  const isAr = lang === 'ar';
  const cardRef  = useRef();
  const barRef   = useRef();
  const [step, setStep] = useState(0);

  /* Entrance animation */
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(cardRef.current, {
        opacity: 0, y: 60,
        duration: 0.9, ease: 'power3.out',
        scrollTrigger: { trigger: cardRef.current, start: 'top 88%' },
      });
    }, cardRef);
    return () => ctx.revert();
  }, []);

  /* Step loop for the progress bar mini-demo */
  useEffect(() => {
    const id = setInterval(() => {
      setStep((s) => (s + 1) % STEPS.length);
    }, 1800);
    return () => clearInterval(id);
  }, []);

  /* Animate bar on step change */
  useEffect(() => {
    if (!barRef.current) return;
    gsap.fromTo(barRef.current,
      { width: '0%' },
      { width: `${((step + 1) / STEPS.length) * 100}%`, duration: 1.6, ease: 'power2.out' }
    );
  }, [step]);

  return (
    <div
      ref={cardRef}
      dir={isAr ? 'rtl' : 'ltr'}
      style={{
        position: 'relative', overflow: 'hidden',
        background: 'rgba(255,255,255,0.025)',
        border: `1px solid rgba(168,85,247,0.15)`,
        padding: '2rem',
        transition: 'border-color 0.35s, box-shadow 0.35s',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `${ACCENT}55`;
        e.currentTarget.style.boxShadow   = `0 0 40px ${ACCENT}1a`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = `rgba(168,85,247,0.15)`;
        e.currentTarget.style.boxShadow   = 'none';
      }}
    >
      {/* Corner glow */}
      <div style={{
        position: 'absolute', top: -60, [isAr ? 'left' : 'right']: -60,
        width: 160, height: 160,
        background: `radial-gradient(circle, ${ACCENT}22 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Background number */}
      <span style={{
        position: 'absolute', bottom: -8, [isAr ? 'left' : 'right']: 12,
        fontFamily: "'Space Mono', monospace",
        fontSize: '5rem', fontWeight: 700,
        color: `${ACCENT}08`, lineHeight: 1,
        pointerEvents: 'none', userSelect: 'none',
      }}>04</span>

      {/* Stat badge */}
      <div style={{
        position: 'absolute', top: 14, [isAr ? 'right' : 'left']: 14,
        fontFamily: "'Space Mono', monospace",
        fontSize: '0.62rem', letterSpacing: '0.06em',
        color: ACCENT,
        background: `${ACCENT}18`,
        border: `1px solid ${ACCENT}44`,
        padding: '0.22rem 0.65rem', fontWeight: 700,
      }}>
        {isAr ? '١٥ ث في ٣ دقائق' : '15s in 3 min'}
      </div>

      {/* Icon */}
      <div style={{
        width: 48, height: 48,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `${ACCENT}14`, border: `1px solid ${ACCENT}33`,
        marginBottom: '1.4rem', marginTop: '2.2rem',
      }}>
        <IconFilm />
      </div>

      {/* Label */}
      <span style={{
        fontFamily: "'Space Mono', monospace",
        fontSize: '0.62rem', letterSpacing: '0.12em',
        color: ACCENT, textTransform: 'uppercase',
        display: 'block', marginBottom: '0.6rem',
      }}>
        SVC_04
      </span>

      {/* Title */}
      <h3 style={{
        fontFamily: "'Cairo', sans-serif",
        fontWeight: 700, fontSize: '1.15rem',
        color: '#ffffff', marginBottom: '0.75rem',
      }}>
        <span style={{ color: ACCENT, marginInlineEnd: '0.3rem' }}>◆</span>
        {isAr ? 'فيديوهات تسويقية بالـ AI' : 'AI Marketing Videos'}
      </h3>

      <p style={{
        fontSize: '0.85rem', color: 'rgba(255,255,255,0.45)',
        lineHeight: 1.7, marginBottom: '1.4rem',
      }}>
        {isAr
          ? 'ابعث صورة المنتج أو لوقو المطعم — نحوّله خلال دقائق لفيديو Reels/TikTok احترافي. بدون مصوّر، بدون موشن ديزاينر.'
          : "Send a product photo or restaurant logo — we turn it into a professional Reels/TikTok video in minutes. No videographer, no motion designer."}
      </p>

      {/* Progress mini-demo */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${ACCENT}22`,
        padding: '0.9rem 1rem',
        marginBottom: '1.2rem',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginBottom: '0.55rem',
        }}>
          <IconSparkle />
          <span style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: '0.68rem', color: ACCENT,
            letterSpacing: '0.04em',
          }}>
            {isAr ? STEPS[step].ar : STEPS[step].en}
          </span>
        </div>
        {/* Progress track */}
        <div style={{
          height: 2, background: `${ACCENT}22`,
          position: 'relative', overflow: 'hidden',
        }}>
          <div ref={barRef} style={{
            position: 'absolute', left: 0, top: 0,
            height: '100%', background: ACCENT,
            boxShadow: `0 0 8px ${ACCENT}`,
          }} />
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          marginTop: '0.4rem',
        }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: '50%',
              background: i <= step ? ACCENT : `${ACCENT}33`,
              boxShadow: i === step ? `0 0 6px ${ACCENT}` : 'none',
              transition: 'background 0.4s, box-shadow 0.4s',
            }} />
          ))}
        </div>
      </div>

      {/* Tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
        {TAGS.map((tag) => (
          <span key={tag.en} style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: '0.58rem', letterSpacing: '0.05em',
            color: 'rgba(255,255,255,0.45)',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '0.2rem 0.55rem',
          }}>
            {isAr ? tag.ar : tag.en}
          </span>
        ))}
      </div>
    </div>
  );
}

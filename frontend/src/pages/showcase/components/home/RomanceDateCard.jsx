import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const ACCENT = '#e11d48';

const PACKAGES = [
  { ar: 'قلب ورد على السرير',      en: 'Rose-petal heart on bed', icon: '🌹' },
  { ar: 'شموع وإضاءة رومانسية',   en: 'Candles & ambient light',  icon: '🕯️' },
  { ar: 'بالونات وزهور معلّقة',   en: 'Balloons & hanging roses', icon: '🎈' },
  { ar: 'تخصيص رسالة شخصية',     en: 'Custom personal message',  icon: '💌' },
];

const STATS = [
  { num: '٢٤',  label: { ar: 'ساعة تأكيد',   en: 'hr confirm' } },
  { num: '+٥٠', label: { ar: 'مناسبة',         en: 'occasions'  } },
  { num: '١٠٠', label: { ar: '٪ سرية',         en: '% private'  } },
];

function IconHeart() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke={ACCENT} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

/* Floating petal — pure CSS animation */
function Petal({ style }) {
  return (
    <div style={{
      position: 'absolute',
      width: 6, height: 9,
      borderRadius: '50% 50% 50% 0',
      background: `${ACCENT}55`,
      pointerEvents: 'none',
      animation: `petalFall ${2.8 + Math.random() * 2}s ease-in infinite`,
      animationDelay: `${Math.random() * 3}s`,
      ...style,
    }} />
  );
}

export default function RomanceDateCard({ lang = 'ar' }) {
  const isAr = lang === 'ar';
  const cardRef = useRef();
  const [lit, setLit] = useState(false);

  /* Entrance */
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

  /* Candle flicker on hover */
  const startFlicker = () => setLit(true);
  const stopFlicker  = () => setLit(false);

  return (
    <>
      {/* Petal keyframes — injected once */}
      <style>{`
        @keyframes petalFall {
          0%   { transform: translateY(-10px) rotate(0deg);   opacity: 0.7; }
          100% { transform: translateY(120px) rotate(180deg); opacity: 0;   }
        }
        @keyframes candleFlicker {
          0%, 100% { opacity: 1;    transform: scaleY(1);    }
          25%       { opacity: 0.85; transform: scaleY(0.94); }
          50%       { opacity: 1;    transform: scaleY(1.04); }
          75%       { opacity: 0.9;  transform: scaleY(0.97); }
        }
      `}</style>

      <div
        ref={cardRef}
        dir={isAr ? 'rtl' : 'ltr'}
        style={{
          position: 'relative', overflow: 'hidden',
          background: 'rgba(255,255,255,0.025)',
          border: `1px solid rgba(225,29,72,0.15)`,
          padding: '2rem',
          transition: 'border-color 0.35s, box-shadow 0.35s',
          cursor: 'default',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = `${ACCENT}55`;
          e.currentTarget.style.boxShadow   = `0 0 40px ${ACCENT}18`;
          startFlicker();
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = `rgba(225,29,72,0.15)`;
          e.currentTarget.style.boxShadow   = 'none';
          stopFlicker();
        }}
      >
        {/* Ambient warm glow */}
        <div style={{
          position: 'absolute', bottom: -40, [isAr ? 'right' : 'left']: -40,
          width: 180, height: 180,
          background: `radial-gradient(circle, ${ACCENT}18 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        {/* Floating petals */}
        {[10, 28, 55, 72, 88].map((left, i) => (
          <Petal key={i} style={{ top: 0, left: `${left}%` }} />
        ))}

        {/* Background number */}
        <span style={{
          position: 'absolute', bottom: -8, [isAr ? 'left' : 'right']: 12,
          fontFamily: "'Space Mono', monospace",
          fontSize: '5rem', fontWeight: 700,
          color: `${ACCENT}08`, lineHeight: 1,
          pointerEvents: 'none', userSelect: 'none',
        }}>05</span>

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
          {isAr ? 'حجز في ٢٤ ساعة' : '24h booking'}
        </div>

        {/* Icon with candle effect */}
        <div style={{
          width: 48, height: 48,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `${ACCENT}14`, border: `1px solid ${ACCENT}33`,
          marginBottom: '1.4rem', marginTop: '2.2rem',
          position: 'relative',
          animation: lit ? 'candleFlicker 0.6s ease-in-out infinite' : 'none',
        }}>
          <IconHeart />
          {/* Candle glow overlay */}
          {lit && (
            <div style={{
              position: 'absolute', inset: 0,
              background: `radial-gradient(circle at center, ${ACCENT}33, transparent)`,
              pointerEvents: 'none',
            }} />
          )}
        </div>

        {/* Label */}
        <span style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: '0.62rem', letterSpacing: '0.12em',
          color: ACCENT, textTransform: 'uppercase',
          display: 'block', marginBottom: '0.6rem',
        }}>
          SVC_05
        </span>

        {/* Title */}
        <h3 style={{
          fontFamily: "'Cairo', sans-serif",
          fontWeight: 700, fontSize: '1.15rem',
          color: '#ffffff', marginBottom: '0.75rem',
        }}>
          <span style={{ color: ACCENT, marginInlineEnd: '0.3rem' }}>◆</span>
          {isAr ? 'مفاجآت رومانسية بضغطة زر' : 'Romantic Surprises On Demand'}
        </h3>

        <p style={{
          fontSize: '0.85rem', color: 'rgba(255,255,255,0.45)',
          lineHeight: 1.7, marginBottom: '1.4rem',
        }}>
          {isAr
            ? 'احجز تزيين غرفة لحبيبتك — قلب ورد، شموع، بالونات وورود معلّقة. كل شيء جاهز قبل وصولها. احجز عبر واتساب.'
            : 'Book a romantic room setup — rose-petal heart, candles, hanging balloons and roses. Everything ready before she arrives. Book via WhatsApp.'}
        </p>

        {/* Package checklist */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: `1px solid ${ACCENT}20`,
          padding: '0.9rem 1rem',
          marginBottom: '1.2rem',
          display: 'flex', flexDirection: 'column', gap: '0.5rem',
        }}>
          {PACKAGES.map((pkg) => (
            <div key={pkg.en} style={{
              display: 'flex', alignItems: 'center',
              gap: '0.6rem', fontSize: '0.8rem',
              color: 'rgba(255,255,255,0.6)',
              fontFamily: "'Cairo', sans-serif",
            }}>
              <span style={{ fontSize: '0.85rem' }}>{pkg.icon}</span>
              <span>{isAr ? pkg.ar : pkg.en}</span>
            </div>
          ))}
        </div>

        {/* Stats row */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.5rem',
        }}>
          {STATS.map((s) => (
            <div key={s.num} style={{
              textAlign: 'center',
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${ACCENT}1a`,
              padding: '0.55rem 0.3rem',
            }}>
              <div style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: '1.1rem', fontWeight: 700,
                color: ACCENT, lineHeight: 1.2,
              }}>{s.num}</div>
              <div style={{
                fontFamily: "'Cairo', sans-serif",
                fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)',
                marginTop: 2,
              }}>{isAr ? s.label.ar : s.label.en}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

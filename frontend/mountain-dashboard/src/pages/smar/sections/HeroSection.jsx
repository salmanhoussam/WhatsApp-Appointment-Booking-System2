/**
 * HeroSection.jsx  —  Phase 7.1 (Light Theme)
 *
 * SMAR logo starts large at center, rises to sticky nav as scrollProgress → 0.18.
 * Text is warm dark brown on the light Mediterranean background.
 */
import { useSmarStore } from '../store/useSmarStore';

function lerp(a, b, t) { return a + (b - a) * Math.min(1, Math.max(0, t)); }

export default function HeroSection() {
  const scrollProgress = useSmarStore((s) => s.scrollProgress);

  const t          = Math.min(1, scrollProgress / 0.18);
  const topVh      = lerp(44, 2, t);
  const fontSize   = lerp(6, 1.4, t);
  const hintOpacity = 1 - t;

  return (
    <>
      {/* ── Brand mark — rises from center to sticky nav ── */}
      <div
        style={{
          position:      'fixed',
          top:           `${topVh}vh`,
          left:          '50%',
          transform:     'translateX(-50%)',
          zIndex:        30,
          pointerEvents: 'none',
          textAlign:     'center',
          willChange:    'top',
        }}
      >
        <span style={{
          fontFamily:    "'Cormorant Garamond', 'Georgia', serif",
          fontSize:      `${fontSize}rem`,
          fontWeight:    300,
          letterSpacing: '0.3em',
          color:         '#2d2824',
          textTransform: 'uppercase',
          textShadow:    '0 1px 0 rgba(255,255,255,0.6)',
          whiteSpace:    'nowrap',
          display:       'block',
          lineHeight:    1,
        }}>
          SMAR
        </span>

        {t < 0.5 && (
          <span style={{
            fontFamily:    "'Inter', sans-serif",
            fontSize:      `${lerp(0.72, 0, t * 2)}rem`,
            letterSpacing: '0.48em',
            color:         `rgba(45,40,36,${lerp(0.5, 0, t * 2)})`,
            textTransform: 'uppercase',
            display:       'block',
            marginTop:     8,
            whiteSpace:    'nowrap',
          }}>
            Mountain Residence
          </span>
        )}
      </div>

      {/* ── Scroll hint ── */}
      <div style={{
        position:      'fixed',
        bottom:        '8vh',
        left:          '50%',
        transform:     'translateX(-50%)',
        display:       'flex',
        flexDirection: 'column',
        alignItems:    'center',
        gap:           8,
        opacity:       hintOpacity,
        pointerEvents: 'none',
        zIndex:        30,
      }}>
        <span style={{
          fontFamily:    "'Inter', sans-serif",
          fontSize:      '0.58rem',
          letterSpacing: '0.45em',
          color:         'rgba(45,40,36,0.38)',
          textTransform: 'uppercase',
        }}>
          Scroll
        </span>
        <div style={{
          width:      1,
          height:     36,
          background: 'linear-gradient(to bottom, #b8892e, transparent)',
          animation:  'scrollPulse 2s ease-in-out infinite',
        }} />
        <style>{`
          @keyframes scrollPulse {
            0%, 100% { opacity: 0.25; transform: scaleY(0.6); }
            50%       { opacity: 0.8; transform: scaleY(1); }
          }
        `}</style>
      </div>
    </>
  );
}

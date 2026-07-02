import { useEffect, useRef, useState } from 'react';

/**
 * RoomEnvironment — immersive CSS photo layer for building floor rooms.
 *
 * Transition timeline (on room entry):
 *   t=0.00s — canvas wrapper fades to 0.12 opacity (HomePage handles)
 *   t=0.15s — photo + panel begin fading in (transitionDelay)
 *   t=0.00s — glass-flash keyframe fires (brief cyan burst, feels like crossing glass)
 *   t=0.90s — photo fully visible, panel slid in from right
 *
 * On room exit — instant fade (no delay) so canvas fades back in clean.
 */

const GLASS_FLASH_CSS = `
  @keyframes glassFlash {
    0%   { opacity: 0.50; }
    35%  { opacity: 0.20; }
    100% { opacity: 0;    }
  }
  @keyframes photoReveal {
    from { transform: scale(1.06); }
    to   { transform: scale(1.00); }
  }
`;

export function RoomEnvironment({
  imgSrc,
  accentColor = '#3b82f6',
  title       = 'FLOOR',
  subtitle    = '',
  isVisible   = false,
  children,
}) {
  const imgRef   = useRef(null);
  const [rendered,  setRendered]  = useState(isVisible);
  const [flashKey,  setFlashKey]  = useState(0);

  // Keep DOM alive during fade-out so CSS transition completes
  useEffect(() => {
    if (isVisible) {
      setRendered(true);
      setFlashKey((k) => k + 1); // remount flash overlay → restart animation
    } else {
      const t = setTimeout(() => setRendered(false), 950);
      return () => clearTimeout(t);
    }
  }, [isVisible]);

  // High-perf parallax — direct DOM mutation, zero React re-renders
  useEffect(() => {
    if (!isVisible) return;
    const onMove = (e) => {
      if (!imgRef.current) return;
      const x = (e.clientX / window.innerWidth  - 0.5) * -25;
      const y = (e.clientY / window.innerHeight - 0.5) * -15;
      imgRef.current.style.transform = `translate(${x}px, ${y}px) scale(1.15)`;
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, [isVisible]);

  if (!rendered) return null;

  return (
    <>
      {/* Keyframe definitions — injected once per RoomEnvironment instance */}
      <style>{GLASS_FLASH_CSS}</style>

      <div style={{
        position:       'fixed',
        inset:          0,
        zIndex:         10,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'flex-end',
        padding:        '1.5rem',
        direction:      'rtl',
        // Stagger: canvas fades 0.15s before photo appears on entry
        // On exit: instant (0s delay) so canvas restores cleanly
        opacity:          isVisible ? 1 : 0,
        pointerEvents:    isVisible ? 'auto' : 'none',
        transition:       'opacity 0.85s cubic-bezier(0.4, 0, 0.2, 1)',
        transitionDelay:  isVisible ? '0.15s' : '0s',
      }}>

        {/* ── Background photo layer ── */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>

          {/* Photo zoom container: scales 1.06→1.00 on entry (subtle push-in) */}
          <div style={{
            width:      '100%',
            height:     '100%',
            animation:  isVisible ? 'photoReveal 1.1s cubic-bezier(0.4, 0, 0.2, 1) forwards' : 'none',
          }}>
            <img
              ref={imgRef}
              src={imgSrc}
              alt={subtitle}
              style={{
                width:      '100%',
                height:     '100%',
                objectFit:  'cover',
                // Base scale 1.15 for parallax movement room; parallax JS adds translate()
                transform:  'translate(0,0) scale(1.15)',
                transition: 'transform 0.12s ease-out',
                willChange: 'transform',
              }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>

          {/* Fallback gradient (when image fails or not yet loaded) */}
          <div style={{
            position:   'absolute',
            inset:      0,
            background: `linear-gradient(135deg, #020408 0%, ${accentColor}1a 50%, #060b18 100%)`,
            zIndex:     -1,
          }} />

          {/* ── Glass-crossing flash — plays once on room entry ── */}
          {/* key={flashKey} remounts the div → restarts the CSS animation */}
          <div
            key={flashKey}
            style={{
              position:        'absolute',
              inset:           0,
              background:      'rgba(160, 215, 255, 1)',
              animation:       'glassFlash 0.65s ease-out forwards',
              pointerEvents:   'none',
              zIndex:          6,
            }}
          />

          {/* Atmosphere overlay: heavy on left (behind panel), light on right */}
          <div style={{
            position:   'absolute',
            inset:      0,
            background: 'radial-gradient(ellipse 70% 90% at 28% 50%, rgba(6,11,24,0.10) 0%, rgba(6,11,24,0.82) 100%)',
            zIndex:     4,
          }} />
        </div>

        {/* ── Glassmorphism content panel ── */}
        <div style={{
          position:             'relative',
          zIndex:               20,
          width:                '100%',
          maxWidth:             '480px',
          padding:              '2.5rem',
          background:           'rgba(8, 15, 32, 0.68)',
          backdropFilter:       'blur(22px) saturate(1.5)',
          WebkitBackdropFilter: 'blur(22px) saturate(1.5)',
          border:               `1px solid ${accentColor}33`,
          boxShadow:            `0 24px 64px rgba(0,0,0,0.60), inset 0 1px 0 rgba(255,255,255,0.06), 0 0 50px ${accentColor}0f`,
          // Panel slides in from the right with slight scale
          transform:  isVisible ? 'translateX(0) scale(1)' : 'translateX(44px) scale(0.97)',
          transition: 'transform 0.9s cubic-bezier(0.34, 1.06, 0.64, 1)',
          // Panel delay is slightly longer — appears after the photo
          transitionDelay: isVisible ? '0.30s' : '0s',
        }}>

          {/* HUD label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
            <span style={{
              width:      '9px',
              height:     '9px',
              borderRadius: '50%',
              background: accentColor,
              boxShadow:  `0 0 14px ${accentColor}`,
              flexShrink: 0,
            }} />
            <span style={{
              fontFamily:    "'Space Mono', monospace",
              fontSize:      '0.64rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color:         `${accentColor}cc`,
            }}>
              {title}
            </span>
          </div>

          {/* Heading */}
          <h2 style={{
            fontFamily:   "'Cairo', sans-serif",
            fontWeight:   800,
            fontSize:     'clamp(1.5rem, 3vw, 2.1rem)',
            color:        '#ffffff',
            lineHeight:   1.2,
            marginBottom: '0.6rem',
          }}>
            {subtitle}
          </h2>

          {/* Accent rule */}
          <div style={{
            width:        '60px',
            height:       '2px',
            background:   `linear-gradient(90deg, ${accentColor}, transparent)`,
            marginBottom: '1.5rem',
            boxShadow:    `0 0 10px ${accentColor}88`,
          }} />

          {/* Slot content */}
          <div style={{
            fontFamily: "'Cairo', sans-serif",
            fontSize:   '0.92rem',
            color:      'rgba(255,255,255,0.72)',
            lineHeight: 1.8,
          }}>
            {children}
          </div>

          {/* Footer */}
          <div style={{
            marginTop:      '2rem',
            paddingTop:     '1.25rem',
            borderTop:      '1px solid rgba(255,255,255,0.06)',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
          }}>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              style={{
                display:    'flex',
                alignItems: 'center',
                gap:        '6px',
                padding:    '0.5rem 1.1rem',
                fontFamily: "'Cairo', sans-serif",
                fontSize:   '0.82rem',
                fontWeight: 600,
                color:      '#ffffff',
                background: `${accentColor}20`,
                border:     `1px solid ${accentColor}44`,
                cursor:     'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = `${accentColor}38`; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = `${accentColor}20`; }}
            >
              ← العودة للمبنى
            </button>
            <span style={{
              fontFamily:    "'Space Mono', monospace",
              fontSize:      '0.58rem',
              letterSpacing: '0.14em',
              color:         'rgba(255,255,255,0.20)',
            }}>
              SALMANSAAS // 2026
            </span>
          </div>

        </div>
      </div>
    </>
  );
}

/**
 * VillaSection.jsx  —  Phase 7.2
 *
 * Enters at scrollProgress 0.18 → 0.30 (slides up from bottom, fixes in place).
 * Exits at scrollProgress 0.65 → 0.75 (fades out for future layers).
 *
 * Layout:
 *   LEFT  55% — frontveiwvilla.png, full-bleed, object-cover
 *   RIGHT 45% — GS MAR glassmorphism panel with heritage text + CTA
 */

import { useNavigate } from 'react-router-dom';
import { useSmarStore }  from '../store/useSmarStore';

const VILLA_IMAGE =
  'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beitsmar/homepage/frontveiwvilla.png';

function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
function lerp(a, b, t)    { return a + (b - a) * clamp(t, 0, 1); }

export default function VillaSection() {
  const scrollProgress = useSmarStore((s) => s.scrollProgress);
  const navigate       = useNavigate();

  // ── Enter: scrollProgress 0.18 → 0.30  (t: 0 → 1) ──
  const enterT = clamp((scrollProgress - 0.18) / 0.12, 0, 1);
  // ── Exit:  scrollProgress 0.65 → 0.75  (t: 0 → 1) ──
  const exitT  = clamp((scrollProgress - 0.65) / 0.10, 0, 1);

  const translateY = lerp(80, 0, enterT);   // vh — slides up from below
  const opacity    = lerp(0, 1, enterT) * lerp(1, 0, exitT);

  // Skip rendering when invisible — saves paint cost
  if (opacity < 0.004) return null;

  return (
    <div
      style={{
        position:      'fixed',
        inset:         0,
        zIndex:        20,
        display:       'flex',
        transform:     `translateY(${translateY}vh)`,
        opacity,
        pointerEvents: enterT > 0.5 ? 'auto' : 'none',
        willChange:    'transform, opacity',
      }}
    >
      {/* ─────────────────── LEFT: Full-bleed villa image ─────────────────── */}
      <div style={{ flex: '0 0 55%', position: 'relative', overflow: 'hidden' }}>
        <img
          src={VILLA_IMAGE}
          alt="Beit Smar Villa"
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
        />

        {/* Right-edge gradient — merges image into text panel */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to right, transparent 55%, #0a0a0f 100%)',
        }} />
        {/* Top + bottom vignette */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, #0a0a0f 0%, transparent 12%, transparent 82%, #0a0a0f 100%)',
        }} />
      </div>

      {/* ─────────────────── RIGHT: Heritage text panel ───────────────────── */}
      <div style={{
        flex:           '0 0 45%',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'flex-start',
        padding:        '0 5vw 0 2vw',
        background:     '#0a0a0f',
      }}>
        {/* GS MAR glass card */}
        <div style={{
          position:       'relative',
          background:     'rgba(255,255,255,0.03)',
          border:         '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRadius:   18,
          padding:        '3rem 2.5rem',
          maxWidth:       460,
          width:          '100%',
        }}>
          {/* Gold hairline top accent */}
          <div style={{
            position:   'absolute',
            top:        0, left: '2.5rem', right: '2.5rem', height: 1,
            background: 'linear-gradient(to right, transparent, #d4a853 40%, #d4a853 60%, transparent)',
          }} />

          {/* Eyebrow */}
          <p style={{
            fontFamily:    "'Inter', sans-serif",
            fontSize:      '0.62rem',
            letterSpacing: '0.48em',
            color:         '#d4a853',
            textTransform: 'uppercase',
            margin:        '0 0 1.25rem',
          }}>
            STONE &amp; WOOD HERITAGE
          </p>

          {/* Arabic title */}
          <h2 style={{
            fontFamily: "'Cormorant Garamond', 'Georgia', serif",
            fontSize:   'clamp(2rem, 3.2vw, 2.8rem)',
            fontWeight: 300,
            color:      '#f0ebe3',
            margin:     '0 0 0.3rem',
            lineHeight: 1.15,
            direction:  'rtl',
          }}>
            التصميم الأصيل
          </h2>

          {/* English subtitle */}
          <h3 style={{
            fontFamily:    "'Cormorant Garamond', 'Georgia', serif",
            fontSize:      'clamp(0.95rem, 1.4vw, 1.2rem)',
            fontWeight:    300,
            letterSpacing: '0.14em',
            color:         'rgba(212,168,83,0.65)',
            margin:        '0 0 1.8rem',
          }}>
            Authentic Architecture
          </h3>

          {/* Arabic body */}
          <p style={{
            fontFamily: "'Inter', sans-serif",
            fontSize:   '0.875rem',
            lineHeight: 1.85,
            color:      'rgba(255,255,255,0.5)',
            margin:     '0 0 0.8rem',
            direction:  'rtl',
            textAlign:  'right',
          }}>
            مبنية من الحجر البلدي والخشب الأصيل، تجسّد فيلات بيت سمر
            إرثاً معمارياً عريقاً يمتد عبر الأجيال — حيث تلتقي الطبيعة
            بأرقى معايير الراحة الحديثة.
          </p>

          {/* English body */}
          <p style={{
            fontFamily:    "'Inter', sans-serif",
            fontSize:      '0.8rem',
            lineHeight:    1.75,
            color:         'rgba(255,255,255,0.32)',
            margin:        '0 0 2.5rem',
            letterSpacing: '0.01em',
          }}>
            Built from local stone and aged timber, each villa carries the
            craftsmanship of mountain heritage — brought to life with
            contemporary luxury.
          </p>

          {/* CTA button */}
          <button
            onClick={() => navigate('/smar/listings?type=villa')}
            style={{
              background:    'linear-gradient(135deg, #d4a853 0%, #b8892e 100%)',
              border:        'none',
              borderRadius:  8,
              padding:       '0.9rem 2.2rem',
              fontFamily:    "'Inter', sans-serif",
              fontSize:      '0.72rem',
              letterSpacing: '0.22em',
              color:         '#0a0a0f',
              fontWeight:    600,
              textTransform: 'uppercase',
              cursor:        'pointer',
              boxShadow:     '0 4px 24px rgba(212,168,83,0.25)',
              transition:    'transform 0.2s ease, box-shadow 0.2s ease',
              display:       'inline-flex',
              alignItems:    'center',
              gap:           '0.6rem',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform  = 'translateY(-2px)';
              e.currentTarget.style.boxShadow  = '0 8px 32px rgba(212,168,83,0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform  = 'translateY(0)';
              e.currentTarget.style.boxShadow  = '0 4px 24px rgba(212,168,83,0.25)';
            }}
          >
            اكتشف الفيلا
            <span style={{ opacity: 0.6, fontWeight: 400 }}>/</span>
            Explore Villa
          </button>
        </div>
      </div>
    </div>
  );
}

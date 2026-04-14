/**
 * AmenitiesSection.jsx  —  Phase 7.4
 *
 * Two panels side-by-side: Restaurant (left) + Infinity Pool (right).
 * Enters at scrollProgress 0.62 → 0.74  (slides up, opacity 0→1).
 * Exits  at scrollProgress 0.88 → 0.96  (fades for CTA layer).
 *
 * Supabase assets:
 *   properties/beitsmar/amenities/amenity2.jpg  →  Restaurant
 *   properties/beitsmar/amenities/amenity3.jpg  →  Pool
 */

const BASE = 'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beitsmar';

const WA_LINK =
  'https://wa.me/9611234567?text=أود%20حجز%20طاولة%20في%20مطعم%20بيت%20سمار';

function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
function lerp(a, b, t)    { return a + (b - a) * clamp(t, 0, 1); }

// ── Lazily import Zustand only (no motion needed — driven by inline styles via RAF) ──
import { useSmarStore } from '../store/useSmarStore';
import { useNavigate }  from 'react-router-dom';

export default function AmenitiesSection() {
  const scrollProgress = useSmarStore((s) => s.scrollProgress);
  const navigate        = useNavigate();

  // ── Enter ──
  const enterT = clamp((scrollProgress - 0.62) / 0.12, 0, 1);
  // ── Exit ──
  const exitT  = clamp((scrollProgress - 0.88) / 0.08, 0, 1);

  const translateY = lerp(90, 0, enterT);    // vh — slides up from below
  const opacity    = lerp(0, 1, enterT) * lerp(1, 0, exitT);

  if (opacity < 0.004) return null;

  return (
    <div
      style={{
        position:      'fixed',
        inset:         0,
        zIndex:        30,
        display:       'flex',
        transform:     `translateY(${translateY}vh)`,
        opacity,
        pointerEvents: enterT > 0.5 ? 'auto' : 'none',
        willChange:    'transform, opacity',
        background:    '#0a0a0f',
      }}
    >
      {/* ─────────────── LEFT: Mountain Dining ─────────────── */}
      <Panel
        image={`${BASE}/amenities/amenity2.jpg`}
        eyebrow="MOUNTAIN DINING"
        titleAr="التجربة المطبخية"
        titleEn="Culinary Experience"
        bodyAr="استمتع بوجبات مستوحاة من العالم على ارتفاع الجبل، مع منظر بانورامي لسلاسل جبال لبنان الشامخة."
        bodyEn="Savor mountain-inspired cuisine with panoramic views over Lebanon's peaks — a dining experience unlike any other."
        ctaLabel="احجز طاولة — Reserve via WhatsApp"
        ctaGreen
        onCta={() => window.open(WA_LINK, '_blank')}
        imagePosition="left"
      />

      {/* ─── Gold diagonal divider ─── */}
      <Divider />

      {/* ─────────────── RIGHT: Horizon Pool ─────────────── */}
      <Panel
        image={`${BASE}/amenities/amenity3.jpg`}
        eyebrow="HORIZON WATERS"
        titleAr="مسبح الأفق"
        titleEn="Infinity Pool"
        bodyAr="مسبح infinity بلا حدود بصرية، معلّق فوق الوادي. الحرارة المثالية — الصمت المطلق."
        bodyEn="An edge-to-void infinity pool suspended over the valley. Perfect temperature, absolute silence."
        ctaLabel="اكتشف الإقامة — Explore Stays"
        onCta={() => navigate('/listings')}
        imagePosition="right"
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────── Panel ── */
function Panel({ image, eyebrow, titleAr, titleEn, bodyAr, bodyEn, ctaLabel, ctaGreen, onCta, imagePosition }) {
  return (
    <div style={{ flex: '0 0 50%', position: 'relative', overflow: 'hidden' }}>
      {/* Full-bleed image */}
      <img
        src={image}
        alt={titleEn}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />

      {/* Dark vignette over image */}
      <div style={{
        position: 'absolute', inset: 0,
        background: imagePosition === 'left'
          ? 'linear-gradient(to right, rgba(10,10,15,0.72) 0%, rgba(10,10,15,0.2) 100%)'
          : 'linear-gradient(to left,  rgba(10,10,15,0.72) 0%, rgba(10,10,15,0.2) 100%)',
      }} />
      {/* Top + bottom vignette */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to bottom, #0a0a0f 0%, transparent 10%, transparent 78%, #0a0a0f 100%)',
      }} />

      {/* GS MAR glass card — anchored at bottom */}
      <div style={{
        position:   'absolute',
        bottom:     '8vh',
        ...(imagePosition === 'left' ? { left: '6%' } : { right: '6%' }),
        width:      'min(340px, 82%)',
        background: 'rgba(255,255,255,0.03)',
        border:     '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRadius: 16,
        padding:    '2rem 1.8rem',
      }}>
        {/* Gold top hairline */}
        <div style={{
          position:   'absolute',
          top: 0, left: '1.8rem', right: '1.8rem', height: 1,
          background: 'linear-gradient(to right, transparent, #d4a853 40%, #d4a853 60%, transparent)',
        }} />

        <p style={{
          fontFamily:    "'Inter', sans-serif",
          fontSize:      '0.58rem',
          letterSpacing: '0.46em',
          color:         '#d4a853',
          textTransform: 'uppercase',
          margin:        '0 0 1rem',
        }}>
          {eyebrow}
        </p>

        <h2 style={{
          fontFamily: "'Cormorant Garamond', 'Georgia', serif",
          fontSize:   'clamp(1.6rem, 2.6vw, 2.2rem)',
          fontWeight: 300,
          color:      '#f0ebe3',
          margin:     '0 0 0.2rem',
          lineHeight: 1.15,
          direction:  'rtl',
        }}>
          {titleAr}
        </h2>

        <h3 style={{
          fontFamily:    "'Cormorant Garamond', 'Georgia', serif",
          fontSize:      'clamp(0.8rem, 1.2vw, 1rem)',
          fontWeight:    300,
          letterSpacing: '0.12em',
          color:         'rgba(212,168,83,0.6)',
          margin:        '0 0 1.4rem',
        }}>
          {titleEn}
        </h3>

        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize:   '0.78rem',
          lineHeight: 1.8,
          color:      'rgba(255,255,255,0.45)',
          margin:     '0 0 0.5rem',
          direction:  'rtl',
          textAlign:  'right',
        }}>
          {bodyAr}
        </p>
        <p style={{
          fontFamily:    "'Inter', sans-serif",
          fontSize:      '0.72rem',
          lineHeight:    1.7,
          color:         'rgba(255,255,255,0.28)',
          margin:        '0 0 1.8rem',
          letterSpacing: '0.01em',
        }}>
          {bodyEn}
        </p>

        <button
          onClick={onCta}
          style={{
            background:    ctaGreen
              ? 'linear-gradient(135deg, rgba(37,211,102,0.18) 0%, rgba(37,211,102,0.08) 100%)'
              : 'linear-gradient(135deg, #d4a853 0%, #b8892e 100%)',
            border:        ctaGreen
              ? '1px solid rgba(37,211,102,0.35)'
              : 'none',
            borderRadius:  8,
            padding:       '0.75rem 1.6rem',
            fontFamily:    "'Inter', sans-serif",
            fontSize:      '0.65rem',
            letterSpacing: '0.18em',
            color:         ctaGreen ? '#25D366' : '#0a0a0f',
            fontWeight:    ctaGreen ? 500 : 600,
            textTransform: 'uppercase',
            cursor:        'pointer',
            width:         '100%',
            textAlign:     'center',
            boxShadow:     ctaGreen
              ? '0 4px 20px rgba(37,211,102,0.12)'
              : '0 4px 20px rgba(212,168,83,0.25)',
            transition:    'transform 0.2s ease, box-shadow 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────── Gold diagonal divider ── */
function Divider() {
  return (
    <div style={{
      position:   'absolute',
      left:       'calc(50% - 1px)',
      top:        0,
      bottom:     0,
      width:      2,
      zIndex:     5,
      background: 'linear-gradient(to bottom, transparent 5%, #d4a853 30%, rgba(212,168,83,0.4) 70%, transparent 95%)',
      transform:  'skewX(-1.5deg)',
      pointerEvents: 'none',
    }} />
  );
}

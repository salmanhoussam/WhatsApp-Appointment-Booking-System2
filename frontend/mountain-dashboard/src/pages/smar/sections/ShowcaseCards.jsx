import { useSmarStore } from '../store/useSmarStore';

/**
 * ShowcaseCards — Mountain Layer Stack
 *
 * كل كارت يدخل من الأسفل ويبقى ثابتاً كـ layer.
 * الكارت التالي يتكدس تحته — مثل طبقات الجبل عند النزول.
 *
 * Stack order (من فوق لتحت على الشاشة):
 *   Layer 1 — Villa       — يدخل عند 0.18
 *   Layer 2 — Gardens     — يدخل عند 0.40
 *   Layer 3 — Pool        — يدخل عند 0.62
 */

const SUPABASE = 'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beitsmar/amenities';

const LAYERS = [
  {
    id:       'villa',
    title:    'Villa',
    subtitle: 'Mountain Residence',
    image:    `${SUPABASE}/amenity1.jpg`,
    enterAt:  0.18,   // scrollProgress when it starts entering
    color:    '#d4a853',
  },
  {
    id:       'gardens',
    title:    'Gardens',
    subtitle: 'Alpine Landscape',
    image:    `${SUPABASE}/amenity2.jpg`,
    enterAt:  0.40,
    color:    '#7a9e7e',
  },
  {
    id:       'pool',
    title:    'Infinity Pool',
    subtitle: 'Horizon Waters',
    image:    `${SUPABASE}/amenity3.jpg`,
    enterAt:  0.62,
    color:    '#5b8fa8',
  },
];

// Each card occupies a vertical slot from the bottom
const CARD_HEIGHT   = 110;   // px — exposed strip height per layer
const CARD_FULL_H   = 340;   // px — full card height
const TRANSITION_W  = 0.12;  // scroll window for the enter animation

function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

export default function ShowcaseCards() {
  const scrollProgress = useSmarStore((s) => s.scrollProgress);

  return (
    <div style={{
      position:      'fixed',
      inset:         0,
      pointerEvents: 'none',
      zIndex:        20,
    }}>
      {LAYERS.map((layer, i) => {
        // t: 0 (not entered) → 1 (fully docked)
        const t = clamp((scrollProgress - layer.enterAt) / TRANSITION_W, 0, 1);

        // Docked Y position — each layer stacks above the previous
        // Layer 0 (villa) docks lowest, layer 2 (pool) docks highest
        const dockedY   = window.innerHeight - CARD_HEIGHT * (LAYERS.length - i);
        // Start position: just below viewport
        const startY    = window.innerHeight + 20;
        // Smooth ease
        const ease      = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        const currentY  = startY + (dockedY - startY) * ease;

        // Stack z-index: first card on top
        const zIndex    = 20 + (LAYERS.length - i);

        // Card is invisible before its enterAt
        if (t === 0) return null;

        return (
          <div
            key={layer.id}
            style={{
              position:   'fixed',
              left:       0,
              right:      0,
              top:        currentY,
              height:     CARD_FULL_H,
              zIndex,
              pointerEvents: t > 0.8 ? 'auto' : 'none',
              willChange: 'transform',
            }}
          >
            {/* Full-width layer card */}
            <div style={{
              width:          '100%',
              height:         '100%',
              background:     'rgba(8, 8, 12, 0.92)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderTop:      `1px solid ${layer.color}33`,
              overflow:       'hidden',
              position:       'relative',
            }}>

              {/* Background image — fills the card */}
              <img
                src={layer.image}
                alt={layer.title}
                style={{
                  position:   'absolute',
                  inset:      0,
                  width:      '100%',
                  height:     '100%',
                  objectFit:  'cover',
                  opacity:    0.18,
                  filter:     'saturate(0.6)',
                }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />

              {/* Gold top accent line */}
              <div style={{
                position:   'absolute',
                top:        0,
                left:       0,
                right:      0,
                height:     2,
                background: `linear-gradient(90deg, transparent, ${layer.color}, transparent)`,
                opacity:    0.7,
              }} />

              {/* Content — visible in the exposed strip */}
              <div style={{
                position: 'absolute',
                top:      0,
                left:     0,
                right:    0,
                height:   CARD_HEIGHT,
                display:  'flex',
                alignItems: 'center',
                padding:  '0 5vw',
                gap:      20,
              }}>
                {/* Number */}
                <span style={{
                  fontFamily:    "'Cormorant Garamond', Georgia, serif",
                  fontSize:      '2.8rem',
                  fontWeight:    300,
                  color:         layer.color,
                  opacity:       0.4,
                  lineHeight:    1,
                  minWidth:      48,
                }}>
                  {String(i + 1).padStart(2, '0')}
                </span>

                {/* Text */}
                <div>
                  <p style={{
                    fontFamily:    "'Inter', sans-serif",
                    fontSize:      '0.58rem',
                    letterSpacing: '0.4em',
                    color:         layer.color,
                    textTransform: 'uppercase',
                    margin:        '0 0 4px',
                    opacity:       0.8,
                  }}>
                    {layer.subtitle}
                  </p>
                  <h3 style={{
                    fontFamily:    "'Cormorant Garamond', Georgia, serif",
                    fontSize:      'clamp(1.4rem, 3vw, 2rem)',
                    fontWeight:    400,
                    color:         '#f0e6d0',
                    margin:        0,
                    letterSpacing: '0.04em',
                  }}>
                    {layer.title}
                  </h3>
                </div>

                {/* Arrow hint */}
                <div style={{
                  marginLeft:  'auto',
                  color:       layer.color,
                  fontSize:    '1.2rem',
                  opacity:     0.4,
                }}>
                  ↗
                </div>
              </div>

            </div>
          </div>
        );
      })}
    </div>
  );
}

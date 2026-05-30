/**
 * CollageScene.jsx  —  Photorealistic Collage (Light "Summer Heritage" Theme)
 *
 * Three real-photo tiles slide in and PIN to form the mountain scene.
 * Booking panel: sunlit light-glass bottom-sheet.
 *
 * Scroll map (600vh → progress 0→1):
 *   0.10→0.28  Villa      slides from RIGHT → pins upper-right
 *   0.28→0.48  Restaurant slides from LEFT  → pins mid-left
 *   0.48→0.70  Chalets    slides from BOTTOM→ pins lower-center
 *   0.70→1.00  CTA strip fades in
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence }      from 'framer-motion';
import { useNavigate, useParams }        from 'react-router-dom';
import { useTenantBase }                 from '../../../hooks/useTenantSlug';
import { useSmarStore }                 from '../store/useSmarStore';
import { useTenantConfigContext }        from '../../../context/TenantConfigContext';

// ── Assets ───────────────────────────────────────────────────────────────────
const BASE = 'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beitsmar';

const TILES = [
  {
    id:          'villa',
    type:        'villa',
    name_ar:     'فيلا بيت سمار',
    name_en:     'Beit Smar Villa',
    eyebrow:     'LUXURY VILLA',
    description: '3 bedrooms · 3 baths · up to 12 guests',
    image:       `${BASE}/homepage/frontveiwvilla.png`,
    pos: { top: '4vh', right: '3vw', width: '46vw', height: '46vh' },
    enterFrom:   'right',
    enterStart:  0.10,
    enterEnd:    0.28,
    bookable:    true,
  },
  {
    id:          'restaurant',
    type:        'restaurant',
    name_ar:     'المطعم الجبلي',
    name_en:     'Mountain Dining',
    eyebrow:     'RESTAURANT & CAFÉ',
    description: 'Panoramic views · Mountain cuisine · Open daily',
    image:       `${BASE}/amenities/amenity2.jpg`,
    pos: { top: '30vh', left: '2vw', width: '40vw', height: '36vh' },
    enterFrom:   'left',
    enterStart:  0.28,
    enterEnd:    0.48,
    bookable:    false,
    waText:      'أود%20حجز%20طاولة%20في%20مطعم%20بيت%20سمار',
  },
  {
    id:          'chalet',
    type:        'chalet',
    name_ar:     'الشاليهات',
    name_en:     'Mountain Chalets',
    eyebrow:     '12 CHALETS',
    description: '1–3 bedrooms · private terrace · mountain view',
    image:       `${BASE}/amenities/amenity1.jpg`,
    pos: { top: '52vh', left: '26vw', width: '46vw', height: '40vh' },
    enterFrom:   'bottom',
    enterStart:  0.48,
    enterEnd:    0.70,
    bookable:    true,
  },
];

// ── Light theme tokens ────────────────────────────────────────────────────────
const G = {
  bg:          '#faf9f6',
  glass:       'rgba(255,255,255,0.82)',
  glassBorder: 'rgba(255,255,255,0.6)',
  border:      'rgba(180,158,110,0.22)',
  gold:        '#b8892e',
  goldDim:     'rgba(184,137,46,0.12)',
  text:        '#2d2824',
  textSec:     'rgba(45,40,36,0.62)',
  textMuted:   'rgba(45,40,36,0.4)',
  input:       'rgba(255,255,255,0.85)',
  inputBorder: 'rgba(180,158,110,0.3)',
  shadow:      '0 4px 32px rgba(120,90,40,0.12)',
  spring:      { type: 'spring', stiffness: 65, damping: 20, mass: 1.5 },
  snappy:      { type: 'spring', stiffness: 280, damping: 24, mass: 0.5 },
};

function easeOutQuart(t) { return 1 - Math.pow(1 - t, 4); }
function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

export default function CollageScene() {
  const navigate         = useNavigate();
  const { slug = 'smar' } = useParams();
  const { config }       = useTenantConfigContext();
  const waPhone          = config.whatsapp_number || '96178727986';
  const base             = useTenantBase();
  const tileRefs     = useRef([]);
  const ctaRef       = useRef(null);

  const [expanded,   setExpanded]  = useState(null);
  const [checkIn,    setCheckIn]   = useState('');
  const [checkOut,   setCheckOut]  = useState('');
  const [guests,     setGuests]    = useState(1);
  const [hoveredIdx, setHovered]   = useState(null);

  // Lock body scroll when panel open
  useEffect(() => {
    document.body.style.overflow = expanded ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [expanded]);

  // RAF scroll animation — zero React re-renders
  useEffect(() => {
    TILES.forEach((tile, i) => {
      const el = tileRefs.current[i];
      if (!el) return;
      if (tile.enterFrom === 'right')  el.style.transform = 'translateX(110vw)';
      if (tile.enterFrom === 'left')   el.style.transform = 'translateX(-110vw)';
      if (tile.enterFrom === 'bottom') el.style.transform = 'translateY(80vh)';
      el.style.opacity = '0';
    });

    let rafId;
    let lastP = -1;

    const tick = () => {
      const p = useSmarStore.getState().scrollProgress;

      if (Math.abs(p - lastP) > 0.0004) {
        lastP = p;

        TILES.forEach((tile, i) => {
          const el = tileRefs.current[i];
          if (!el) return;
          const rawT = clamp((p - tile.enterStart) / (tile.enterEnd - tile.enterStart), 0, 1);
          const t    = easeOutQuart(rawT);

          if (tile.enterFrom === 'right')  el.style.transform = `translateX(${(1 - t) * 110}vw)`;
          else if (tile.enterFrom === 'left')   el.style.transform = `translateX(${(1 - t) * -110}vw)`;
          else                                   el.style.transform = `translateY(${(1 - t) * 80}vh)`;

          el.style.opacity = Math.min(1, rawT / 0.3).toFixed(3);
        });

        if (ctaRef.current) {
          const ctaT = clamp((p - 0.72) / 0.10, 0, 1);
          ctaRef.current.style.opacity      = ctaT.toFixed(3);
          ctaRef.current.style.pointerEvents= ctaT > 0.5 ? 'auto' : 'none';
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const handleBook = () => {
    if (!expanded || !checkIn || !checkOut) return;
    navigate(`${base}/payment`, {
      state: {
        formData: { unit_id: expanded.id, check_in: checkIn, check_out: checkOut, guests },
        unit: {
          id:        expanded.id,
          name_en:   expanded.name_en,
          name_ar:   expanded.name_ar,
          unit_type: expanded.type,
          image_url: expanded.image,
        },
        totalPrice:        null,
        availableServices: [],
        lang: 'en',
        slug,
      },
    });
  };

  const closePanel = () => { setExpanded(null); setCheckIn(''); setCheckOut(''); setGuests(1); };

  return (
    <>
      {/* ── Tiles ────────────────────────────────────────────────────── */}
      {TILES.map((tile, i) => (
        <div
          key={tile.id}
          ref={(el) => { tileRefs.current[i] = el; }}
          onClick={() => {
            if (tile.bookable) setExpanded(tile);
            else if (tile.waText) window.open(`https://wa.me/${waPhone}?text=${tile.waText}`, '_blank');
          }}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(null)}
          style={{
            position:     'absolute',
            top:          tile.pos.top,
            ...(tile.pos.right ? { right: tile.pos.right } : { left: tile.pos.left }),
            width:        tile.pos.width,
            height:       tile.pos.height,
            borderRadius: 16,
            overflow:     'hidden',
            cursor:       'pointer',
            zIndex:       i + 2,
            transform:    tile.enterFrom === 'right'  ? 'translateX(110vw)'  :
                          tile.enterFrom === 'left'   ? 'translateX(-110vw)' :
                          'translateY(80vh)',
            opacity:      0,
            boxShadow:    hoveredIdx === i
              ? `0 0 0 2px rgba(184,137,46,0.55), 0 12px 52px rgba(80,55,20,0.22)`
              : `0 4px 32px rgba(80,55,20,0.15), 0 0 0 1px rgba(180,158,110,0.18)`,
            transition:   'box-shadow 0.3s ease',
            willChange:   'transform, opacity',
          }}
        >
          <img
            src={tile.image}
            alt={tile.name_en}
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement.style.background = '#d8cfc0';
            }}
          />

          {/* Light vignette at bottom for label readability */}
          <div style={{
            position:   'absolute',
            inset:      0,
            background: 'linear-gradient(to top, rgba(250,249,246,0.9) 0%, rgba(250,249,246,0.1) 42%, transparent 100%)',
          }} />

          {/* Hover shimmer */}
          {hoveredIdx === i && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,248,230,0.08)' }} />
          )}

          {/* Bottom label — light glass chip */}
          <div style={{
            position: 'absolute',
            bottom:   0, left: 0, right: 0,
            padding:  '1.2rem 1.1rem 0.9rem',
          }}>
            <p style={{
              fontFamily:    "'Inter', sans-serif",
              fontSize:      '0.5rem',
              letterSpacing: '0.44em',
              color:         G.gold,
              textTransform: 'uppercase',
              margin:        '0 0 0.25rem',
            }}>
              {tile.eyebrow}
            </p>
            <p style={{
              fontFamily: "'Cormorant Garamond', 'Georgia', serif",
              fontSize:   'clamp(1.05rem, 1.7vw, 1.45rem)',
              fontWeight: 400,
              color:      G.text,
              margin:     '0 0 0.1rem',
              lineHeight: 1.2,
            }}>
              {tile.name_ar}
            </p>
            <p style={{
              fontFamily:    "'Inter', sans-serif",
              fontSize:      '0.6rem',
              letterSpacing: '0.08em',
              color:         G.textSec,
            }}>
              {tile.description}
              {tile.bookable && (
                <span style={{ marginLeft: '0.5em', color: G.gold }}>— Tap to Book</span>
              )}
              {!tile.bookable && (
                <span style={{ marginLeft: '0.5em', color: '#3a9e5f' }}>— Reserve via WhatsApp</span>
              )}
            </p>
          </div>
        </div>
      ))}

      {/* ── CTA strip ───────────────────────────────────────────────── */}
      <div
        ref={ctaRef}
        style={{
          position:      'absolute',
          bottom:        '3vh',
          left:          '50%',
          transform:     'translateX(-50%)',
          display:       'flex',
          gap:           '1rem',
          zIndex:        20,
          opacity:       0,
          pointerEvents: 'none',
          whiteSpace:    'nowrap',
        }}
      >
        <a
          href="/listings"
          style={{
            fontFamily:     "'Inter', sans-serif",
            fontSize:       '0.6rem',
            letterSpacing:  '0.3em',
            color:          G.gold,
            textDecoration: 'none',
            textTransform:  'uppercase',
            padding:        '0.65rem 1.6rem',
            border:         `1px solid rgba(184,137,46,0.35)`,
            borderRadius:   6,
            background:     G.glass,
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            boxShadow:      G.shadow,
            transition:     'background 0.25s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.95)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = G.glass; }}
        >
          Explore All Units
        </a>
      </div>

      {/* ── Booking Panel ────────────────────────────────────────────── */}
      <AnimatePresence>
        {expanded && (
          <>
            {/* Scrim — very light frosted glass */}
            <motion.div
              key="scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              onClick={closePanel}
              style={{
                position:       'absolute',
                inset:          0,
                zIndex:         50,
                background:     'rgba(250,249,246,0.45)',
                backdropFilter: 'blur(4px)',
              }}
            />

            {/* Glass bottom panel */}
            <div style={{
              position:  'absolute',
              bottom:    0,
              left:      '50%',
              zIndex:    51,
              transform: 'translateX(-50%)',
              width:     'min(520px, 96vw)',
            }}>
              <motion.div
                key="panel"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={G.spring}
                style={{
                  background:     'rgba(255,255,255,0.94)',
                  border:         '1px solid rgba(255,255,255,0.7)',
                  borderBottom:   'none',
                  borderRadius:   '20px 20px 0 0',
                  backdropFilter: 'blur(28px)',
                  WebkitBackdropFilter: 'blur(28px)',
                  padding:        '2rem 2rem 2.5rem',
                  boxShadow:      '0 -6px 48px rgba(120,90,40,0.12)',
                }}
              >
                {/* Warm gold hairline top */}
                <div style={{
                  position:   'absolute',
                  top:        0, left: '3rem', right: '3rem', height: 1,
                  background: 'linear-gradient(to right, transparent, #b8892e 35%, #b8892e 65%, transparent)',
                }} />

                {/* Drag handle */}
                <div style={{
                  width: 36, height: 4, borderRadius: 2,
                  background: 'rgba(45,40,36,0.15)',
                  margin: '0 auto 1.4rem',
                }} />

                {/* Unit header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.6rem' }}>
                  <img
                    src={expanded.image}
                    alt=""
                    style={{
                      width: 60, height: 60, borderRadius: 10,
                      objectFit: 'cover',
                      border: '1px solid rgba(184,137,46,0.3)',
                      boxShadow: '0 2px 10px rgba(120,90,40,0.1)',
                    }}
                  />
                  <div>
                    <p style={{
                      fontFamily: "'Inter'", fontSize: '0.52rem', letterSpacing: '0.4em',
                      color: G.gold, textTransform: 'uppercase', margin: '0 0 0.2rem',
                    }}>
                      {expanded.eyebrow}
                    </p>
                    <p style={{
                      fontFamily: "'Cormorant Garamond', serif", fontSize: '1.3rem',
                      fontWeight: 400, color: G.text, margin: 0, direction: 'rtl',
                    }}>
                      {expanded.name_ar}
                    </p>
                    <p style={{
                      fontFamily: "'Inter'", fontSize: '0.63rem',
                      color: G.textSec, letterSpacing: '0.06em', margin: 0,
                    }}>
                      {expanded.description}
                    </p>
                  </div>
                  <button
                    onClick={closePanel}
                    style={{
                      marginLeft:     'auto',
                      background:     'rgba(45,40,36,0.06)',
                      border:         '1px solid rgba(45,40,36,0.12)',
                      borderRadius:   '50%',
                      width:          34, height: 34,
                      cursor:         'pointer',
                      color:          G.textSec,
                      fontSize:       '1rem',
                      display:        'flex',
                      alignItems:     'center',
                      justifyContent: 'center',
                    }}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>

                {/* Date + guests */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: '0.75rem', marginBottom: '1.1rem' }}>
                  <DateField
                    label="Check-in / دخول"
                    value={checkIn}
                    onChange={(v) => { setCheckIn(v); if (checkOut && v >= checkOut) setCheckOut(''); }}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <DateField
                    label="Check-out / خروج"
                    value={checkOut}
                    onChange={setCheckOut}
                    min={checkIn || new Date().toISOString().split('T')[0]}
                  />
                  <GuestsField value={guests} onChange={setGuests} />
                </div>

                {/* Night count hint */}
                {checkIn && checkOut && (
                  <motion.p
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={G.snappy}
                    style={{
                      fontFamily: "'Inter'", fontSize: '0.68rem', textAlign: 'center',
                      color: G.gold, margin: '0 0 1rem',
                    }}
                  >
                    {Math.max(1, Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000))} nights · Price confirmed at checkout
                  </motion.p>
                )}

                {/* Proceed button */}
                <button
                  onClick={handleBook}
                  disabled={!checkIn || !checkOut}
                  style={{
                    width:         '100%',
                    padding:       '0.95rem',
                    background:    (!checkIn || !checkOut)
                      ? 'rgba(184,137,46,0.18)'
                      : 'linear-gradient(135deg, #c9973a 0%, #b8892e 100%)',
                    border:        'none',
                    borderRadius:  10,
                    fontFamily:    "'Inter'",
                    fontSize:      '0.68rem',
                    letterSpacing: '0.24em',
                    fontWeight:    700,
                    textTransform: 'uppercase',
                    color:         (!checkIn || !checkOut) ? 'rgba(184,137,46,0.5)' : '#fff',
                    cursor:        (!checkIn || !checkOut) ? 'not-allowed' : 'pointer',
                    transition:    'all 0.22s ease',
                    boxShadow:     (!checkIn || !checkOut) ? 'none' : '0 4px 20px rgba(184,137,46,0.28)',
                  }}
                >
                  Proceed to Payment ↗
                </button>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────
function DateField({ label, value, onChange, min }) {
  return (
    <div>
      <label style={{
        display: 'block', fontFamily: "'Inter'",
        fontSize: '0.53rem', letterSpacing: '0.32em', textTransform: 'uppercase',
        color: 'rgba(45,40,36,0.42)', marginBottom: '0.4rem',
      }}>
        {label}
      </label>
      <input
        type="date"
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width:       '100%',
          background:  'rgba(255,255,255,0.88)',
          border:      '1px solid rgba(180,158,110,0.3)',
          borderRadius: 8,
          padding:     '0.6rem 0.7rem',
          fontFamily:  "'Inter'",
          fontSize:    '0.76rem',
          color:       '#2d2824',
          outline:     'none',
          colorScheme: 'light',
          cursor:      'pointer',
          boxSizing:   'border-box',
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(184,137,46,0.5)'; }}
        onBlur={(e)  => { e.currentTarget.style.borderColor = 'rgba(180,158,110,0.3)'; }}
      />
    </div>
  );
}

function GuestsField({ value, onChange }) {
  return (
    <div>
      <label style={{
        display: 'block', fontFamily: "'Inter'",
        fontSize: '0.53rem', letterSpacing: '0.32em', textTransform: 'uppercase',
        color: 'rgba(45,40,36,0.42)', marginBottom: '0.4rem',
      }}>
        Guests
      </label>
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        background:     'rgba(255,255,255,0.88)',
        border:         '1px solid rgba(180,158,110,0.3)',
        borderRadius:   8,
        padding:        '0.48rem 0.6rem',
        height:         40,
        boxSizing:      'border-box',
      }}>
        <button onClick={() => onChange(Math.max(1, value - 1))}
          style={{ background: 'none', border: 'none', color: '#b8892e', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: '0 3px' }}>
          −
        </button>
        <span style={{ fontFamily: "'Inter'", fontSize: '0.82rem', color: '#2d2824' }}>
          {value}
        </span>
        <button onClick={() => onChange(Math.min(20, value + 1))}
          style={{ background: 'none', border: 'none', color: '#b8892e', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: '0 3px' }}>
          +
        </button>
      </div>
    </div>
  );
}

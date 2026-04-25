/**
 * SpatialPropertyDetails.jsx  —  Bait Smar  ·  Cinematic Property Detail
 *
 * Layout (full-viewport, no page scroll):
 *  ┌──────────────────────────────────────────────┬─────────────────────┐
 *  │  FULL-SCREEN CINEMATIC VIDEO                 │  GS MAR             │
 *  │  • autoplay · muted · loop                   │  BOOKING PANEL      │
 *  │  • object-cover                              │  (glassmorphism)    │
 *  │                                              │  Date Picker        │
 *  │  ── Chapter Nav Bar (bottom overlay) ──      │  Guest Counter      │
 *  │  [ Entrance ][ Living Room ][ Pool ] …       │  Name + Phone       │
 *  │                                              │  [ BOOK NOW CTA ]   │
 *  └──────────────────────────────────────────────┴─────────────────────┘
 *
 * API:
 *  GET  /api/v1/public/client/smar/units          →  resolve unit by :id
 *  POST /api/v1/public/client/smar/book           →  submit booking
 *
 * n8n automation payload:
 *  { unit_id, customer_name, customer_phone, check_in, check_out,
 *    guests, payment_method: "whatsapp", arrival_time }
 */

import React, { useRef, useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTenantBase } from '../../../utils/useTenantSlug';
import { motion, AnimatePresence } from 'framer-motion';
import publicApi from '../../../utils/publicApi';
import UnitImageGallery from '../../../components/ui/UnitImageGallery';

// ─── Asset base ───────────────────────────────────────────────────────────────
const BASE = 'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beitsmar';

// ─── Video chapters ───────────────────────────────────────────────────────────
// Update `time` (seconds) to match your actual video timeline
const CHAPTERS = [
  { id: 'entrance',  labelAr: 'المدخل',         labelEn: 'Entrance',       time: 0   },
  { id: 'living',    labelAr: 'المجلس',         labelEn: 'Living Room',    time: 28  },
  { id: 'kitchen',   labelAr: 'المطبخ',         labelEn: 'Kitchen',        time: 58  },
  { id: 'bedroom',   labelAr: 'غرفة النوم',     labelEn: 'Master Suite',   time: 92  },
  { id: 'pool',      labelAr: 'المسبح',         labelEn: 'Infinity Pool',  time: 130 },
];

// ─── Spring ───────────────────────────────────────────────────────────────────
const PANEL_SPRING = { type: 'spring', stiffness: 80, damping: 22, mass: 1.2 };

// ─── Helpers ─────────────────────────────────────────────────────────────────
function today() {
  return new Date().toISOString().split('T')[0];
}
function addDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}
function nightsBetween(a, b) {
  return Math.max(0, Math.ceil((new Date(b) - new Date(a)) / 86400000));
}

// ─── BookingPanel ─────────────────────────────────────────────────────────────
function BookingPanel({ unit, onSuccess }) {
  const { id: slugId } = useParams();
  const [form, setForm] = useState({
    checkIn:  today(),
    checkOut: addDays(today(), 2),
    guests:   2,
    name:     '',
    phone:    '',
  });
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState(false);

  const nights = nightsBetween(form.checkIn, form.checkOut);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim())       return setError('الاسم مطلوب');
    if (!form.phone.trim())      return setError('رقم الواتساب مطلوب');
    if (nights < 1)              return setError('تواريخ غير صحيحة');

    setLoading(true);
    try {
      await publicApi.post('/client/smar/book', {
        unit_id:         unit?.id || slugId,
        customer_name:   form.name.trim(),
        customer_phone:  form.phone.trim(),
        check_in:        form.checkIn,
        check_out:       form.checkOut,
        guests:          form.guests,
        payment_method:  'whatsapp',
        arrival_time:    '14:00',
      });
      setSuccess(true);
      onSuccess?.();
    } catch (err) {
      const msg = err?.response?.data?.error?.message || 'حدث خطأ أثناء الحجز';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen ──
  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={PANEL_SPRING}
        style={{
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          height:         '100%',
          gap:            20,
          direction:      'rtl',
          textAlign:      'center',
          padding:        '0 24px',
        }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
          style={{
            width:          72,
            height:         72,
            borderRadius:   '50%',
            background:     'rgba(52,211,153,0.2)',
            border:         '2px solid rgba(52,211,153,0.6)',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            fontSize:       32,
          }}
        >
          ✓
        </motion.div>
        <h3 style={{ color: '#fff', fontSize: 20, fontWeight: 800, margin: 0 }}>
          تم إرسال طلب الحجز!
        </h3>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, margin: 0, lineHeight: 1.6 }}>
          سيتواصل معك فريقنا عبر الواتساب لتأكيد التفاصيل
        </p>
      </motion.div>
    );
  }

  // ── Form ──
  return (
    <form onSubmit={handleSubmit} style={{ direction: 'rtl', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Unit name badge */}
      {unit && (
        <div style={{
          background:           'rgba(255,255,255,0.06)',
          border:               '1px solid rgba(255,255,255,0.10)',
          borderRadius:         10,
          padding:              '10px 14px',
          marginBottom:         4,
        }}>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, letterSpacing: '0.12em',
                      textTransform: 'uppercase', fontFamily: 'sans-serif', margin: '0 0 3px' }}>
            الشاليه
          </p>
          <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, margin: 0 }}>
            {unit.name_ar || unit.name_en || 'بيت سمار'}
          </p>
        </div>
      )}

      {/* Date row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          { label: 'تاريخ الدخول',  key: 'checkIn',  min: today() },
          { label: 'تاريخ الخروج', key: 'checkOut', min: addDays(form.checkIn, 1) },
        ].map(({ label, key, min }) => (
          <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10,
                           letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
              {label}
            </span>
            <input
              type="date"
              value={form[key]}
              min={min}
              onChange={e => set(key, e.target.value)}
              style={{
                background:    'rgba(255,255,255,0.08)',
                border:        '1px solid rgba(255,255,255,0.14)',
                borderRadius:  8,
                color:         '#fff',
                fontSize:      13,
                padding:       '8px 10px',
                outline:       'none',
                width:         '100%',
                boxSizing:     'border-box',
                colorScheme:   'dark',
              }}
            />
          </label>
        ))}
      </div>

      {/* Nights badge */}
      {nights > 0 && (
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, textAlign: 'center',
                    fontFamily: 'sans-serif', margin: '-6px 0 0' }}>
          {nights} {nights === 1 ? 'ليلة' : 'ليالٍ'}
        </p>
      )}

      {/* Guest counter */}
      <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10,
                       letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
          عدد الضيوف
        </span>
        <div style={{
          display:       'flex',
          alignItems:    'center',
          justifyContent:'space-between',
          background:    'rgba(255,255,255,0.08)',
          border:        '1px solid rgba(255,255,255,0.14)',
          borderRadius:  8,
          padding:       '6px 10px',
        }}>
          <button
            type="button"
            onClick={() => set('guests', Math.max(1, form.guests - 1))}
            style={counterBtnStyle}
          >−</button>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{form.guests}</span>
          <button
            type="button"
            onClick={() => set('guests', Math.min(20, form.guests + 1))}
            style={counterBtnStyle}
          >+</button>
        </div>
      </label>

      {/* Name */}
      <input
        type="text"
        placeholder="الاسم الكامل"
        value={form.name}
        onChange={e => set('name', e.target.value)}
        style={inputStyle}
        required
      />

      {/* Phone */}
      <input
        type="tel"
        placeholder="رقم الواتساب (مثال: 9665xxxxxxxx)"
        value={form.phone}
        onChange={e => set('phone', e.target.value)}
        dir="ltr"
        style={{ ...inputStyle, textAlign: 'left' }}
        required
      />

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.p
            key="err"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              color:        '#f87171',
              fontSize:     12,
              margin:       '-4px 0 0',
              textAlign:    'center',
            }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {/* CTA */}
      <motion.button
        type="submit"
        disabled={loading}
        whileHover={{ scale: loading ? 1 : 1.02 }}
        whileTap={{ scale: loading ? 1 : 0.97 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        style={{
          marginTop:            8,
          background:           loading
            ? 'rgba(255,255,255,0.10)'
            : 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 100%)',
          backdropFilter:       'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border:               '1px solid rgba(255,255,255,0.24)',
          color:                '#fff',
          padding:              '15px 0',
          borderRadius:         12,
          fontSize:             16,
          fontWeight:           800,
          letterSpacing:        '0.06em',
          cursor:               loading ? 'not-allowed' : 'pointer',
          width:                '100%',
          transition:           'background 0.2s',
        }}
      >
        {loading ? '⏳ جاري الإرسال...' : '✦ احجز الآن'}
      </motion.button>

      <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 10, textAlign: 'center',
                  fontFamily: 'sans-serif', letterSpacing: '0.08em', marginTop: 2 }}>
        سيصلك تأكيد فوري عبر الواتساب
      </p>
    </form>
  );
}

// Shared input style
const inputStyle = {
  background:    'rgba(255,255,255,0.08)',
  border:        '1px solid rgba(255,255,255,0.14)',
  borderRadius:  8,
  color:         '#fff',
  fontSize:      14,
  padding:       '10px 14px',
  outline:       'none',
  width:         '100%',
  boxSizing:     'border-box',
};

const counterBtnStyle = {
  background:  'rgba(255,255,255,0.10)',
  border:      '1px solid rgba(255,255,255,0.14)',
  borderRadius: 6,
  color:       '#fff',
  width:       30,
  height:      30,
  cursor:      'pointer',
  fontSize:    18,
  lineHeight:  1,
  display:     'flex',
  alignItems:  'center',
  justifyContent: 'center',
  padding:     0,
};

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SpatialPropertyDetails() {
  const { slug = 'smar', id } = useParams();
  const navigate       = useNavigate();
  const base           = useTenantBase();
  const location       = useLocation();
  const videoRef       = useRef(null);

  const [unit,           setUnit]           = useState(location.state?.unit || null);
  const [activeChapter,  setActiveChapter]  = useState(CHAPTERS[0].id);
  const [videoLoaded,    setVideoLoaded]    = useState(false);
  const [isMuted,        setIsMuted]        = useState(true);
  const [panelExpanded,  setPanelExpanded]  = useState(true);
  const [bookingDone,    setBookingDone]    = useState(false);

  // Derive video URL — unit.videoUrl if set, else convention-based path
  const videoUrl = unit?.video_url
    || `${BASE}/videos/${id}.mp4`;

  // Fetch unit details if not passed via state
  useEffect(() => {
    if (unit) return;
    (async () => {
      try {
        const res = await publicApi.get('/listings/', { params: { client_slug: 'smar' } });
        const found = res.data?.units?.find(u => String(u.id) === String(id))
                   || res.data?.find?.(u => String(u.id) === String(id));
        if (found) setUnit(found);
      } catch (e) {
        console.error('Unit fetch failed:', e);
      }
    })();
  }, [id, unit]);

  // Jump to chapter timestamp
  const goToChapter = (chapter) => {
    setActiveChapter(chapter.id);
    if (videoRef.current) {
      videoRef.current.currentTime = chapter.time;
      videoRef.current.play().catch(() => {});
    }
  };

  return (
    <div
      data-slug="smar"
      style={{
        position:   'fixed',
        inset:      0,
        background: '#080808',
        overflow:   'hidden',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* ── CINEMATIC VIDEO (full-screen background) ── */}
      <video
        ref={videoRef}
        src={videoUrl}
        autoPlay
        muted={isMuted}
        loop
        playsInline
        onCanPlay={() => setVideoLoaded(true)}
        style={{
          position:   'absolute',
          inset:      0,
          width:      '100%',
          height:     '100%',
          objectFit:  'cover',
          zIndex:     0,
          opacity:    videoLoaded ? 1 : 0,
          transition: 'opacity 0.8s ease',
        }}
      />

      {/* Dark gradient overlays — left dark for readability, right darker for panel */}
      <div style={{
        position:   'absolute',
        inset:      0,
        zIndex:     1,
        background: 'linear-gradient(90deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.20) 55%, rgba(0,0,0,0.72) 100%)',
        pointerEvents: 'none',
      }} />
      {/* Bottom gradient for chapter nav */}
      <div style={{
        position:   'absolute',
        bottom:     0,
        left:       0,
        right:      0,
        height:     '28%',
        zIndex:     1,
        background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* ── TOP BAR ── */}
      <div style={{
        position:       'absolute',
        top:            0,
        left:           0,
        right:          0,
        zIndex:         10,
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'center',
        padding:        '20px 28px',
        direction:      'rtl',
      }}>
        {/* Back button */}
        <motion.button
          onClick={() => navigate(`${base}/listings`)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            background:           'rgba(0,0,0,0.45)',
            backdropFilter:       'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border:               '1px solid rgba(255,255,255,0.15)',
            borderRadius:         100,
            color:                '#fff',
            padding:              '8px 18px',
            cursor:               'pointer',
            fontSize:             13,
            letterSpacing:        '0.05em',
            display:              'flex',
            alignItems:           'center',
            gap:                  8,
          }}
        >
          ← العودة
        </motion.button>

        {/* Mute toggle */}
        <motion.button
          onClick={() => {
            setIsMuted(m => !m);
            if (videoRef.current) videoRef.current.muted = !isMuted;
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            background:           'rgba(0,0,0,0.45)',
            backdropFilter:       'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border:               '1px solid rgba(255,255,255,0.15)',
            borderRadius:         '50%',
            color:                '#fff',
            width:                40,
            height:               40,
            cursor:               'pointer',
            fontSize:             16,
            display:              'flex',
            alignItems:           'center',
            justifyContent:       'center',
          }}
        >
          {isMuted ? '🔇' : '🔊'}
        </motion.button>
      </div>

      {/* ── BENTO GALLERY (Phase 1 UI) ── */}
      <div style={{ position: 'relative', zIndex: 10, marginTop: '80px', pointerEvents: 'auto' }}>
        <UnitImageGallery />
      </div>

      {/* ── CHAPTER NAVIGATION BAR (bottom, over video) ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position:  'absolute',
          bottom:    28,
          left:      320,            // leaves room for right panel on desktop
          right:     380,
          zIndex:    10,
          display:   'flex',
          gap:       10,
          flexWrap:  'wrap',
          direction: 'rtl',
        }}
      >
        {CHAPTERS.map((ch) => (
          <motion.button
            key={ch.id}
            onClick={() => goToChapter(ch)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            style={{
              background:           activeChapter === ch.id
                ? 'rgba(255,255,255,0.22)'
                : 'rgba(0,0,0,0.45)',
              backdropFilter:       'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              border:               activeChapter === ch.id
                ? '1px solid rgba(255,255,255,0.45)'
                : '1px solid rgba(255,255,255,0.14)',
              borderRadius:         100,
              color:                activeChapter === ch.id ? '#fff' : 'rgba(255,255,255,0.65)',
              padding:              '8px 18px',
              cursor:               'pointer',
              fontSize:             13,
              fontWeight:           activeChapter === ch.id ? 700 : 400,
              letterSpacing:        '0.05em',
              transition:           'all 0.2s',
              whiteSpace:           'nowrap',
            }}
          >
            {ch.labelAr}
          </motion.button>
        ))}
      </motion.div>

      {/* ── GS MAR BOOKING PANEL (right side) ── */}
      <motion.div
        initial={{ x: 60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ ...PANEL_SPRING, delay: 0.3 }}
        style={{
          position:             'absolute',
          top:                  '50%',
          right:                28,
          translateY:           '-50%',
          zIndex:               20,
          width:                320,
          maxHeight:            'calc(100vh - 100px)',
          overflowY:            'auto',
          background:           'rgba(10,10,10,0.72)',
          backdropFilter:       'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          border:               '1px solid rgba(255,255,255,0.12)',
          borderRadius:         20,
          boxShadow:            '0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
          padding:              bookingDone ? '32px 24px' : '24px 22px',
        }}
      >
        {/* Panel header */}
        {!bookingDone && (
          <div style={{
            display:         'flex',
            justifyContent:  'space-between',
            alignItems:      'center',
            marginBottom:    18,
            direction:       'rtl',
          }}>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.42)', fontSize: 10,
                          letterSpacing: '0.18em', textTransform: 'uppercase',
                          fontFamily: 'sans-serif', margin: '0 0 3px' }}>
                احجز تجربتك
              </p>
              <h2 style={{ color: '#fff', fontWeight: 800, fontSize: 18, margin: 0, letterSpacing: '-0.01em' }}>
                بيت سمار
              </h2>
            </div>
            {/* Collapse toggle on mobile */}
            <button
              onClick={() => setPanelExpanded(p => !p)}
              style={{
                background:  'rgba(255,255,255,0.07)',
                border:      '1px solid rgba(255,255,255,0.10)',
                borderRadius: 8,
                color:       'rgba(255,255,255,0.5)',
                width:       30,
                height:      30,
                cursor:      'pointer',
                fontSize:    16,
                display:     'flex',
                alignItems:  'center',
                justifyContent: 'center',
              }}
            >
              {panelExpanded ? '−' : '+'}
            </button>
          </div>
        )}

        {/* Panel body */}
        <AnimatePresence initial={false}>
          {(panelExpanded || bookingDone) && (
            <motion.div
              key="panel-body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <BookingPanel
                unit={unit}
                onSuccess={() => setBookingDone(true)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Loading shimmer while video buffering */}
      <AnimatePresence>
        {!videoLoaded && (
          <motion.div
            key="shimmer"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            style={{
              position:   'absolute',
              inset:      0,
              zIndex:     5,
              background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1209 100%)',
              display:    'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <motion.div
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14,
                       letterSpacing: '0.3em', fontFamily: 'sans-serif' }}
            >
              LOADING EXPERIENCE
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

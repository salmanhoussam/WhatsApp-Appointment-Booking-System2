/**
 * SmarListingsPage.jsx  —  /smar/listings
 * Dark GS MAR listing grid — filterable by date + unit type.
 * Opens SmarUnitModal → SmarBookingDrawer → /smar/payment or success.
 *
 * URL params:
 *   ?type=villa | chalet | all  (pre-selects the type filter)
 */

import { useState, useEffect }       from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion }   from 'framer-motion';

import publicApi          from '../../../utils/publicApi';
import SmarUnitModal      from '../ui/SmarUnitModal';
import SmarBookingDrawer  from '../ui/SmarBookingDrawer';
import SmarWhatsAppButton from '../ui/SmarWhatsAppButton';

// ── Tokens — Sunlit Heritage Light Theme ─────────────────────────────────────
const G = {
  bg:       '#faf9f6',
  bgCard:   'rgba(255,255,255,0.72)',
  border:   'rgba(180,158,110,0.22)',
  gold:     '#b8892e',
  goldDim:  'rgba(184,137,46,0.10)',
  text:     '#2d2824',
  textSec:  'rgba(45,40,36,0.60)',
  textMuted:'rgba(45,40,36,0.38)',
  blur:     'blur(18px)',
  shadow:   '0 2px 20px rgba(120,90,40,0.09)',
  spring:   { type: 'spring', stiffness: 70, damping: 20, mass: 1.5 },
  snappy:   { type: 'spring', stiffness: 300, damping: 25, mass: 0.5 },
};

// ── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{
      background:   G.bgCard,
      border:       `1px solid ${G.border}`,
      borderRadius: 16,
      overflow:     'hidden',
      boxShadow:    G.shadow,
    }}>
      <div style={{ height: 220, background: 'rgba(180,158,110,0.12)', animation: 'shimmer 1.4s ease-in-out infinite' }} />
      <div style={{ padding: '18px 20px' }}>
        <div style={{ height: 10, width: '40%', background: 'rgba(180,158,110,0.14)', borderRadius: 6, marginBottom: 10, animation: 'shimmer 1.4s ease-in-out infinite' }} />
        <div style={{ height: 14, width: '70%', background: 'rgba(180,158,110,0.14)', borderRadius: 6, marginBottom: 8, animation: 'shimmer 1.4s ease-in-out infinite' }} />
        <div style={{ height: 10, width: '50%', background: 'rgba(180,158,110,0.10)', borderRadius: 6, animation: 'shimmer 1.4s ease-in-out infinite' }} />
      </div>
    </div>
  );
}

// ── Unit card ─────────────────────────────────────────────────────────────────
function UnitCard({ unit, onClick, lang, index }) {
  const name      = lang === 'ar' ? (unit.name_ar || unit.name_en) : (unit.name_en || unit.name_ar);
  const image     = unit.image_url1 || unit.image_url2
    || `https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beitsmar/interiors/${unit.id}_1.jpg`;
  const typeLabel = unit.unit_type || unit.type || 'Chalet';
  const price     = unit.price_per_night || unit.base_price;

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...G.spring, delay: index * 0.06 }}
      onClick={() => onClick(unit)}
      whileHover={{ y: -4, boxShadow: `0 16px 48px rgba(120,90,40,0.16), 0 0 0 1.5px rgba(184,137,46,0.35)` }}
      style={{
        background:     G.bgCard,
        border:         `1px solid ${G.border}`,
        borderRadius:   16,
        overflow:       'hidden',
        cursor:         'pointer',
        backdropFilter: G.blur,
        boxShadow:      G.shadow,
        transition:     'box-shadow 0.3s',
      }}
    >
      {/* Image */}
      <div style={{ position: 'relative', height: 220, overflow: 'hidden', background: '#e8e0d0' }}>
        <img
          src={image}
          alt={name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.5s ease' }}
          onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/600x400/d8cfc0/a09070?text=Beit+Smar'; }}
          onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
          onMouseOut={(e)  => { e.currentTarget.style.transform = 'scale(1)'; }}
        />
        <div style={{
          position:   'absolute',
          inset:      0,
          background: 'linear-gradient(to top, rgba(250,249,246,0.88) 0%, transparent 48%)',
        }} />
        {/* Type badge */}
        <div style={{
          position:       'absolute',
          top:            14,
          left:           lang === 'ar' ? 'auto' : 14,
          right:          lang === 'ar' ? 14 : 'auto',
          background:     'rgba(255,255,255,0.82)',
          backdropFilter: 'blur(12px)',
          border:         `1px solid rgba(184,137,46,0.28)`,
          borderRadius:   20,
          padding:        '4px 10px',
          fontSize:       '0.63rem',
          color:          G.gold,
          letterSpacing:  '0.12em',
          textTransform:  'uppercase',
          fontWeight:     600,
        }}>
          {typeLabel}
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: '18px 20px 20px' }}>
        <h3 style={{ color: G.text, fontSize: '1.05rem', fontWeight: 700, marginBottom: 8, margin: '0 0 6px' }}>
          {name}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: G.textSec, fontSize: '0.78rem' }}>
            👥 {unit.capacity} {lang === 'ar' ? 'أشخاص' : 'guests'}
          </span>
          {price && (
            <span style={{ color: G.gold, fontSize: '0.9rem', fontWeight: 700 }}>
              {Number(price).toLocaleString()} <span style={{ fontSize: '0.72rem', fontWeight: 400, color: G.textMuted }}>{lang === 'ar' ? 'SAR/ليلة' : 'SAR/night'}</span>
            </span>
          )}
        </div>
        <motion.div
          style={{
            marginTop:     14,
            background:    G.goldDim,
            border:        `1px solid rgba(212,168,83,0.2)`,
            borderRadius:  10,
            padding:       '10px 14px',
            display:       'flex',
            alignItems:    'center',
            justifyContent:'center',
            gap:           6,
            color:         G.gold,
            fontSize:      '0.8rem',
            fontWeight:    600,
            letterSpacing: '0.06em',
          }}
          whileHover={{ background: 'rgba(212,168,83,0.2)' }}
        >
          {lang === 'ar' ? 'عرض التفاصيل' : 'View Details'} →
        </motion.div>
      </div>
    </motion.div>
  );
}

// ── Glass input (date/filter) ─────────────────────────────────────────────────
function SearchInput({ label, type, value, onChange, min }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 140 }}>
      <label style={{ color: G.textMuted, fontSize: '0.65rem', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        min={min}
        style={{
          background:    'rgba(255,255,255,0.9)',
          border:        `1px solid rgba(180,158,110,0.28)`,
          borderRadius:  10,
          padding:       '11px 14px',
          color:         G.text,
          fontSize:      '0.88rem',
          outline:       'none',
          colorScheme:   'light',
          width:         '100%',
          boxSizing:     'border-box',
        }}
        onFocus={(e) => { e.target.style.borderColor = 'rgba(184,137,46,0.5)'; }}
        onBlur={(e)  => { e.target.style.borderColor = 'rgba(180,158,110,0.28)'; }}
      />
    </div>
  );
}

// ── Type filter pill ──────────────────────────────────────────────────────────
const TYPE_FILTERS = [
  { id: 'all',    ar: 'الكل',     en: 'All'      },
  { id: 'villa',  ar: 'الفيلات',  en: 'Villas'   },
  { id: 'chalet', ar: 'الشاليهات',en: 'Chalets'  },
];

function TypePill({ filter, active, onClick, lang }) {
  return (
    <motion.button
      onClick={() => onClick(filter.id)}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      style={{
        background:   active ? G.goldDim : 'transparent',
        border:       `1px solid ${active ? 'rgba(212,168,83,0.4)' : G.border}`,
        borderRadius: 20,
        padding:      '7px 18px',
        color:        active ? G.gold : G.textSec,
        fontSize:     '0.78rem',
        fontWeight:   active ? 600 : 400,
        cursor:       'pointer',
        letterSpacing:'0.06em',
        transition:   'all 0.2s',
        whiteSpace:   'nowrap',
      }}
    >
      {lang === 'ar' ? filter.ar : filter.en}
    </motion.button>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function SmarListingsPage() {
  const { slug }                   = useParams();
  const navigate                   = useNavigate();
  const [searchParams]             = useSearchParams();

  const [lang,        setLang]     = useState('ar');
  const [units,       setUnits]    = useState([]);
  const [isLoading,   setLoading]  = useState(true);
  const [typeFilter,  setType]     = useState(searchParams.get('type') || 'all');
  const [checkIn,     setCheckIn]  = useState('');
  const [checkOut,    setCheckOut] = useState('');
  const [hasSearched, setSearched] = useState(false);

  const [selectedUnit, setSelected]       = useState(null);
  const [isModalOpen,  setModalOpen]      = useState(false);
  const [isDrawerOpen, setDrawerOpen]     = useState(false);

  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const today = new Date().toISOString().split('T')[0];

  // Initial load — all units (no date filter)
  useEffect(() => {
    const params = { client_slug: slug };
    if (typeFilter !== 'all') params.type = typeFilter;
    publicApi.get(`/listings/`, { params })
      .then((r) => setUnits(r.data?.units || r.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  const handleSearch = async () => {
    setLoading(true);
    setSearched(true);
    try {
      const params = { client_slug: slug };
      if (checkIn)  params.check_in  = checkIn;
      if (checkOut) params.check_out = checkOut;
      if (typeFilter !== 'all') params.type = typeFilter;
      const r = await publicApi.get(`/listings/`, { params });
      setUnits(r.data?.units || r.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openModal  = (unit) => { setSelected(unit); setModalOpen(true); };
  const closeModal = ()     => setModalOpen(false);
  const openDrawer = ()     => { setModalOpen(false); setDrawerOpen(true); };
  const closeDrawer= ()     => { setDrawerOpen(false); setSelected(null); };

  return (
    <div
      data-slug="smar"
      dir={dir}
      style={{ minHeight: '100vh', background: G.bg, color: G.text, fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <style>{`
        @keyframes shimmer { 0%,100%{opacity:.55} 50%{opacity:.9} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(184,137,46,0.25); border-radius: 4px; }
        input[type="date"]::-webkit-calendar-picker-indicator { opacity: 0.55; }
      `}</style>

      {/* ── Top Navigation ──────────────────────────────────────────── */}
      <nav style={{
        position:       'sticky',
        top:            0,
        zIndex:         50,
        background:     'rgba(250,249,246,0.90)',
        backdropFilter: 'blur(20px)',
        borderBottom:   `1px solid ${G.border}`,
        boxShadow:      '0 1px 12px rgba(120,90,40,0.08)',
        padding:        '0 32px',
        height:         64,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
      }}>
        {/* Back + Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <motion.button
            onClick={() => navigate(`/${slug}/home`)}
            whileHover={{ x: lang === 'ar' ? 3 : -3 }}
            style={{
              background:    'none',
              border:        'none',
              color:         G.textSec,
              cursor:        'pointer',
              fontSize:      '0.82rem',
              letterSpacing: '0.06em',
              display:       'flex',
              alignItems:    'center',
              gap:           6,
            }}
          >
            <span style={{ transform: lang === 'ar' ? 'scaleX(-1)' : 'none', display: 'inline-block' }}>←</span>
            {lang === 'ar' ? 'الرئيسية' : 'Home'}
          </motion.button>

          <div style={{ width: 1, height: 20, background: G.border }} />

          <span style={{
            color:         G.gold,
            fontSize:      '1.05rem',
            fontWeight:    700,
            letterSpacing: '0.18em',
          }}>
            SMAR
          </span>
        </div>

        {/* Lang toggle */}
        <motion.button
          onClick={() => setLang((l) => l === 'ar' ? 'en' : 'ar')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            background:    G.bgCard,
            border:        `1px solid ${G.border}`,
            borderRadius:  20,
            padding:       '6px 16px',
            color:         G.textSec,
            fontSize:      '0.78rem',
            cursor:        'pointer',
            letterSpacing: '0.1em',
          }}
        >
          {lang === 'ar' ? 'EN' : 'ع'}
        </motion.button>
      </nav>

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div style={{ padding: '52px 32px 36px', maxWidth: 1200, margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p style={{ color: G.gold, fontSize: '0.68rem', letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 10 }}>
            {lang === 'ar' ? 'بيت سمار · لبنان' : 'Beit Smar · Lebanon'}
          </p>
          <h1 style={{ color: G.text, fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 700, lineHeight: 1.1, margin: '0 0 8px' }}>
            {lang === 'ar' ? 'اكتشف إقامتك' : 'Discover Your Stay'}
          </h1>
          <p style={{ color: G.textSec, fontSize: '0.92rem', margin: 0 }}>
            {lang === 'ar' ? '3 فيلات فاخرة · 12 شاليه · مطعم · مسبح انفينيتي' : '3 Luxury Villas · 12 Chalets · Restaurant · Infinity Pool'}
          </p>
        </motion.div>
      </div>

      {/* ── Search Bar ──────────────────────────────────────────────── */}
      <div style={{ padding: '0 32px 40px', maxWidth: 1200, margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{
            background:     'rgba(255,255,255,0.78)',
            border:         `1px solid ${G.border}`,
            backdropFilter: G.blur,
            borderRadius:   18,
            padding:        '22px 24px',
            boxShadow:      G.shadow,
            display:        'flex',
            flexWrap:       'wrap',
            alignItems:     'flex-end',
            gap:            16,
          }}
        >
          <SearchInput
            label={lang === 'ar' ? 'تاريخ الدخول' : 'Check-in'}
            type="date"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            min={today}
          />
          <SearchInput
            label={lang === 'ar' ? 'تاريخ الخروج' : 'Check-out'}
            type="date"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            min={checkIn || today}
          />

          {/* Search button */}
          <motion.button
            onClick={handleSearch}
            disabled={isLoading}
            whileHover={!isLoading ? { scale: 1.03, boxShadow: '0 8px 28px rgba(212,168,83,0.28)' } : {}}
            whileTap={!isLoading ? { scale: 0.97 } : {}}
            style={{
              background:    isLoading ? 'rgba(212,168,83,0.4)' : 'linear-gradient(135deg, #d4a853 0%, #b8892a 100%)',
              border:        'none',
              borderRadius:  10,
              padding:       '11px 28px',
              color:         '#fff',
              fontWeight:    700,
              fontSize:      '0.88rem',
              cursor:        isLoading ? 'not-allowed' : 'pointer',
              letterSpacing: '0.06em',
              alignSelf:     'flex-end',
              height:        42,
              display:       'flex',
              alignItems:    'center',
              gap:           8,
              whiteSpace:    'nowrap',
            }}
          >
            {isLoading ? (
              <span style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#050508', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
            ) : (
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            )}
            {lang === 'ar' ? 'بحث' : 'Search'}
          </motion.button>
        </motion.div>

        {/* Type filter pills */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          {TYPE_FILTERS.map((f) => (
            <TypePill
              key={f.id}
              filter={f}
              active={typeFilter === f.id}
              onClick={setType}
              lang={lang}
            />
          ))}
        </div>
      </div>

      {/* ── Results Grid ────────────────────────────────────────────── */}
      <div style={{ padding: '0 32px 80px', maxWidth: 1200, margin: '0 auto' }}>

        {/* Result count */}
        {!isLoading && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ color: G.textMuted, fontSize: '0.78rem', marginBottom: 24, letterSpacing: '0.04em' }}
          >
            {lang === 'ar'
              ? `${units.length} ${hasSearched ? 'وحدة متاحة' : 'وحدة إجمالاً'}`
              : `${units.length} ${hasSearched ? 'available units' : 'units total'}`}
          </motion.p>
        )}

        {isLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : units.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              textAlign:    'center',
              padding:      '80px 20px',
              background:   'rgba(255,255,255,0.72)',
              border:       `1px solid ${G.border}`,
              borderRadius: 20,
              boxShadow:    G.shadow,
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🏔️</div>
            <h3 style={{ color: G.text, fontSize: '1.2rem', fontWeight: 600, marginBottom: 10 }}>
              {lang === 'ar' ? 'لا توجد وحدات متاحة' : 'No units available'}
            </h3>
            <p style={{ color: G.textSec, fontSize: '0.88rem', marginBottom: 28 }}>
              {lang === 'ar'
                ? 'جميع الوحدات محجوزة في هذه التواريخ. جرّب تواريخ أخرى.'
                : 'All units are booked for these dates. Try different dates.'}
            </p>
            <a
              href={`https://wa.me/96178727986?text=${encodeURIComponent(lang === 'ar' ? 'مرحباً، أريد الاستفسار عن الإتاحة' : 'Hello, I would like to check availability')}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display:        'inline-flex',
                alignItems:     'center',
                gap:            8,
                background:     'rgba(37,211,102,0.12)',
                border:         '1px solid rgba(37,211,102,0.3)',
                borderRadius:   12,
                padding:        '12px 24px',
                color:          '#4ade80',
                fontSize:       '0.88rem',
                textDecoration: 'none',
                fontWeight:     600,
              }}
            >
              {lang === 'ar' ? 'تواصل معنا عبر واتساب' : 'Contact us on WhatsApp'}
            </a>
          </motion.div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {units.map((unit, i) => (
              <UnitCard
                key={unit.id}
                unit={unit}
                onClick={openModal}
                lang={lang}
                index={i}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Modals & Drawer ─────────────────────────────────────────── */}
      <AnimatePresence>
        {isModalOpen && selectedUnit && (
          <SmarUnitModal
            key="unit-modal"
            unit={selectedUnit}
            onClose={closeModal}
            onBook={openDrawer}
            lang={lang}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDrawerOpen && selectedUnit && (
          <SmarBookingDrawer
            key="booking-drawer"
            unit={selectedUnit}
            searchDates={{ checkIn, checkOut }}
            slug={slug}
            onClose={closeDrawer}
            lang={lang}
          />
        )}
      </AnimatePresence>

      {/* ── Floating WhatsApp ────────────────────────────────────────── */}
      <SmarWhatsAppButton lang={lang} />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

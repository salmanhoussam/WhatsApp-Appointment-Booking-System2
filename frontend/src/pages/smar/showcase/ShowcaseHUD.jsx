/**
 * ShowcaseHUD.jsx  —  Global Sticky Navbar + Scroll HUD  (v2 — React 19 safe)
 *
 * ─── ARCHITECTURE CHANGE (v2) ──────────────────────────────────────────────────
 * v1 consumed scrollProgress MotionValue from ShowcaseContext and used
 * useMotionValueEvent + useTransform to drive the HUD opacity and section label.
 * In FM 12 + React 19, FM's internal useEffect subscription to the MotionValue
 * could throw during StrictMode's double-mount → white screen.
 *
 * v2 uses a plain window scroll listener (useEffect) and useState.
 * No MotionValues, no FM subscriptions, no useLayoutEffect from FM.
 * motion.* is kept ONLY for animate= keyframe animations and gesture props.
 *
 * Layer structure (z-50):
 *   ● Sticky Navbar   — always visible, 100% width, pointer-events: auto
 *       Left   : Diamond logo mark + "BEIT SMAR" wordmark
 *       Center : Nav links — الشاليهات / الأقسام
 *       Right  : Login button · AR/EN language toggle
 *   ● Progress dots   — right edge, fade in with scroll (CSS transition)
 *   ● Section label   — bottom centre, fades between sections
 *
 * pointer-events contract:
 *   Outer wrapper: none  (parent div is pointer-events:none — WebGL / scroll passes through)
 *   Navbar:        auto  (buttons/links fully clickable)
 *   Dots + label:  none  (decorative)
 */

import { useState, useEffect } from 'react';
import { motion }              from 'framer-motion';
import { useLanguage }         from '../../../context/LanguageContext';

// ─── Section metadata ─────────────────────────────────────────────────────────
const SECTIONS = {
  ar: ['البداية', 'الشاليهات', 'المسبح', 'الاستكشاف'],
  en: ['Intro',  'Chalets',   'Pool',   'Explore'],
};

function offsetToSection(v) {
  if (v < 0.22) return 0;
  if (v < 0.50) return 1;
  if (v < 0.80) return 2;
  return 3;
}

// ─── Progress dots (right edge) ───────────────────────────────────────────────
function ProgressDots({ active }) {
  return (
    <div className="flex flex-col gap-3 items-center">
      {SECTIONS.en.map((_, i) => (
        // animate= is keyframe animation — NOT a MotionValue style binding, safe in React 19
        <motion.div
          key={i}
          animate={{
            width:           2,
            height:          i === active ? 24 : 6,
            backgroundColor: i === active
              ? '#d4a853'
              : 'rgba(255,255,255,0.22)',
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          className="rounded-full"
        />
      ))}
    </div>
  );
}

// ─── Navbar link ──────────────────────────────────────────────────────────────
function NavLink({ href, children }) {
  const [hover, setHover] = useState(false);
  return (
    <a
      href={href}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        color:          hover ? '#d4a853' : 'rgba(255,255,255,0.55)',
        fontSize:        13,
        fontWeight:      600,
        letterSpacing:   '0.04em',
        textDecoration:  'none',
        transition:      'color 0.18s',
        padding:         '4px 2px',
        borderBottom:    hover ? '1px solid rgba(212,168,83,0.5)' : '1px solid transparent',
      }}
    >
      {children}
    </a>
  );
}

// ─── HUD root ─────────────────────────────────────────────────────────────────
export default function ShowcaseHUD() {
  const { lang, toggleLang, t } = useLanguage();

  // Scroll-reactive state — updated by plain window listener (no FM MotionValues)
  const [active,     setActive]     = useState(0);
  const [hudVisible, setHudVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const sp  = window.scrollY / max;
      setHudVisible(sp > 0.025);
      setActive(offsetToSection(sp));
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // initialise immediately
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const sectionLabel = SECTIONS[lang]?.[active] ?? SECTIONS.en[0];
  const loginLabel   = lang === 'ar' ? 'تسجيل الدخول' : 'Login';

  return (
    // Outer: pointer-events none so scroll/drag passes through to the page
    <div
      className="absolute inset-0"
      style={{ zIndex: 50, pointerEvents: 'none' }}
    >

      {/* ════════════════════════════════════════════════════════════════════
          STICKY NAVBAR — always visible, pointer-events: auto
      ════════════════════════════════════════════════════════════════════ */}
      <nav
        style={{
          pointerEvents:        'auto',
          position:             'absolute',
          top:                  0,
          left:                 0,
          right:                0,
          display:              'flex',
          alignItems:           'center',
          justifyContent:       'space-between',
          padding:              '0 24px',
          height:               60,
          backdropFilter:       'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          background:           'rgba(5, 5, 10, 0.35)',
          borderBottom:         '1px solid rgba(255,255,255,0.06)',
          zIndex:               51,
        }}
      >

        {/* ── Left: Logo ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '0 0 auto' }}>
          <div
            style={{
              width:      18,
              height:     18,
              transform:  'rotate(45deg)',
              border:     '1.5px solid #d4a853',
              background: 'rgba(212,168,83,0.10)',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              color:         '#ffffff',
              fontWeight:    900,
              fontSize:      13,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              whiteSpace:    'nowrap',
            }}
          >
            Beit Smar
          </span>
        </div>

        {/* ── Center: Nav links ── */}
        <div
          style={{
            display:   'flex',
            alignItems:'center',
            gap:       32,
            position:  'absolute',
            left:      '50%',
            transform: 'translateX(-50%)',
          }}
        >
          <NavLink href="/listings">الشاليهات</NavLink>
          <NavLink href="/listings">الأقسام</NavLink>
        </div>

        {/* ── Right: Login + Language toggle ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '0 0 auto' }}>

          {/* Language toggle — whileHover / whileTap gesture, no MotionValue binding */}
          <motion.button
            onClick={toggleLang}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.94 }}
            style={{
              background:           'rgba(255,255,255,0.07)',
              border:               '1px solid rgba(255,255,255,0.14)',
              backdropFilter:       'blur(8px)',
              borderRadius:         '50px',
              color:                '#d4a853',
              fontSize:             11,
              fontWeight:           700,
              letterSpacing:        '0.16em',
              textTransform:        'uppercase',
              padding:              '6px 14px',
              cursor:               'pointer',
              whiteSpace:           'nowrap',
            }}
          >
            {t?.langToggle ?? (lang === 'ar' ? 'AR / EN' : 'EN / AR')}
          </motion.button>

          {/* Login button */}
          <motion.a
            href="/login"
            whileHover={{
              scale:     1.04,
              boxShadow: '0 6px 28px rgba(212,168,83,0.40)',
            }}
            whileTap={{ scale: 0.96 }}
            style={{
              display:        'inline-flex',
              alignItems:     'center',
              gap:            6,
              padding:        '7px 18px',
              borderRadius:   '50px',
              background:     'linear-gradient(135deg, #d4a853 0%, #b8893a 100%)',
              color:          '#fff',
              fontSize:       12,
              fontWeight:     700,
              letterSpacing:  '0.08em',
              textDecoration: 'none',
              whiteSpace:     'nowrap',
            }}
          >
            <svg width="11" height="13" viewBox="0 0 11 13" fill="none" style={{ flexShrink: 0 }}>
              <rect x="1" y="5" width="9" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="none"/>
              <path d="M3 5V3.5a2.5 2.5 0 0 1 5 0V5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none"/>
              <circle cx="5.5" cy="8.5" r="1" fill="currentColor"/>
            </svg>
            {loginLabel}
          </motion.a>
        </div>
      </nav>

      {/* ════════════════════════════════════════════════════════════════════
          SCROLL-REACTIVE HUD — fades in via CSS transition (no MotionValue)
          pointer-events: none (decorative)
      ════════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          position:   'absolute',
          inset:      0,
          opacity:    hudVisible ? 1 : 0,
          transition: 'opacity 0.4s ease',
          pointerEvents: 'none',
        }}
      >
        {/* Right-side vertical progress dots */}
        <div
          style={{
            position:  'absolute',
            right:     'clamp(20px, 3vw, 40px)',
            top:       '50%',
            transform: 'translateY(-50%)',
          }}
        >
          <ProgressDots active={active} />
        </div>

        {/* Bottom section label */}
        <div
          style={{
            position:       'absolute',
            bottom:         24,
            left:           0,
            right:          0,
            display:        'flex',
            justifyContent: 'center',
          }}
        >
          {/* animate= keyframe, safe in React 19 */}
          <motion.div
            key={sectionLabel}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{    opacity: 0, y: -6 }}
            transition={{ duration: 0.42, ease: 'easeOut' }}
            style={{ display: 'flex', alignItems: 'center', gap: 12 }}
          >
            <div style={{ width: 16, height: 1, background: '#d4a853' }} />
            <span style={{
              fontSize:      9,
              letterSpacing: '0.34em',
              color:         'rgba(255,255,255,0.30)',
              textTransform: 'uppercase',
              fontWeight:    600,
            }}>
              {sectionLabel}
            </span>
            <div style={{ width: 16, height: 1, background: '#d4a853' }} />
          </motion.div>
        </div>
      </div>

    </div>
  );
}

/**
 * SpatialHomePage.jsx — Footlab cinematic scroll-driven homepage
 *
 * Pattern: Scroll-Triggered Storytelling (landing.csv #10)
 * 500vh pinned stage — scroll controls scale, opacity, and copy reveals.
 *
 * FM12 RULE: Uses useScroll + useTransform → MUST be lazy() in routes.
 *
 * Chapters:
 *   0 → 25%  : Giant "FOOTLAB" zooms in, scroll hint fades
 *   25 → 55% : Chapter 1 — "FIT, CONFIDENT & CLASSY."
 *   55 → 80% : Chapter 2 — "YOUR STYLE SAYS IT ALL"
 *   80 → 100%: Chapter 3 — CTA + button
 * Below pinned: catalog items horizontal strip
 */

import { useRef, useState, useEffect } from 'react'
import { motion, useScroll, useTransform, useSpring } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import publicApi from '../../../utils/publicApi'
import '../footlab.css'

// ── Constants ──────────────────────────────────────────────────────────────────
const SPRING   = { stiffness: 50, damping: 22, mass: 0.6 }
const SPRING_F = { stiffness: 120, damping: 28, mass: 0.4 }
const ACCENT   = '#f59e0b'
const BG       = '#0a0a0f'

// ── Grain overlay (SVG filter — no external asset needed) ──────────────────────
function GrainOverlay() {
  return (
    <svg
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%',
               pointerEvents: 'none', opacity: 0.04, zIndex: 1 }}
    >
      <filter id="fl-grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.68" numOctaves="3" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#fl-grain)" />
    </svg>
  )
}

// ── Product card (below pinned section) ───────────────────────────────────────
function ProductCard({ item, index, onNavigate }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ delay: index * 0.06, type: 'spring', stiffness: 180, damping: 24 }}
      onClick={onNavigate}
      style={{ flexShrink: 0, width: 220, cursor: 'pointer' }}
    >
      <div style={{
        height: 260, background: '#141418',
        overflow: 'hidden', marginBottom: 14, position: 'relative',
      }}>
        {item.image_url
          ? <img
              src={item.image_url} alt={item.name_ar || item.name_en || ''}
              style={{ width: '100%', height: '100%', objectFit: 'cover',
                       transition: 'transform 0.5s ease' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.06)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
            />
          : <div style={{ width: '100%', height: '100%', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          fontSize: 40, opacity: 0.07, color: ACCENT }}>◈</div>
        }
        {item.is_featured && (
          <span style={{
            position: 'absolute', top: 10, left: 10,
            fontSize: 9, fontWeight: 800, letterSpacing: '0.2em',
            textTransform: 'uppercase', background: ACCENT,
            color: BG, padding: '4px 10px',
          }}>
            Featured
          </span>
        )}
      </div>
      <div style={{ fontWeight: 700, fontSize: 13, color: '#f0ebe3',
                    marginBottom: 5, letterSpacing: '0.01em',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {item.name_ar || item.name_en}
      </div>
      {item.price != null && (
        <div style={{ fontSize: 14, fontWeight: 800, color: ACCENT }}>
          {Number(item.price).toLocaleString('ar-SA')}
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)',
                         marginRight: 4, fontWeight: 400 }}>
            {item.currency}
          </span>
        </div>
      )}
    </motion.article>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function SpatialHomePage() {
  const containerRef = useRef(null)
  const navigate     = useNavigate()
  const [items, setItems] = useState([])

  // ── Scroll wiring ─────────────────────────────────────────────────────────
  const { scrollYProgress } = useScroll({
    target:  containerRef,
    offset: ['start start', 'end end'],
  })

  // Background color shift across chapters
  const rawBg = useTransform(
    scrollYProgress,
    [0,       0.35,      0.70,      1.0      ],
    ['#0a0a0f','#0c0c13','#0f0f16','#0a0a0f']
  )

  // Progress bar width
  const progressW = useTransform(scrollYProgress, [0, 1], ['0%', '100%'])

  // ── Giant "FOOTLAB" zoom (0 → 25%) ────────────────────────────────────────
  const rawLogoScale   = useTransform(scrollYProgress, [0, 0.25], [1, 22])
  const logoScale      = useSpring(rawLogoScale,   SPRING)
  const rawLogoOpacity = useTransform(scrollYProgress, [0, 0.18, 0.25], [1, 1, 0])
  const logoOpacity    = useSpring(rawLogoOpacity, SPRING)

  // ── Scroll hint (fades out early) ─────────────────────────────────────────
  const rawHint  = useTransform(scrollYProgress, [0, 0.07], [1, 0])
  const hintOpacity = useSpring(rawHint, SPRING_F)

  // ── Chapter 1: FIT, CONFIDENT & CLASSY (25 → 55%) ────────────────────────
  const rawCh1  = useTransform(scrollYProgress, [0.22, 0.30, 0.48, 0.55], [0, 1, 1, 0])
  const ch1Opacity = useSpring(rawCh1, SPRING)
  const rawCh1Y = useTransform(scrollYProgress, [0.22, 0.30], [32, 0])
  const ch1Y    = useSpring(rawCh1Y, SPRING)

  // ── Chapter 2: YOUR STYLE SAYS IT ALL (55 → 80%) ─────────────────────────
  const rawCh2  = useTransform(scrollYProgress, [0.55, 0.63, 0.75, 0.82], [0, 1, 1, 0])
  const ch2Opacity = useSpring(rawCh2, SPRING)

  // ── Chapter 3: CTA (80 → 100%) ────────────────────────────────────────────
  const rawCh3  = useTransform(scrollYProgress, [0.82, 0.90, 1.0, 1.0], [0, 1, 1, 1])
  const ch3Opacity = useSpring(rawCh3, SPRING)
  const rawCh3S = useTransform(scrollYProgress, [0.82, 0.92], [0.88, 1])
  const ch3Scale   = useSpring(rawCh3S, SPRING)

  // ── Catalog fetch ─────────────────────────────────────────────────────────
  useEffect(() => {
    publicApi.get('/catalog/items')
      .then(r => setItems((r?.data?.data ?? []).slice(0, 10)))
      .catch(() => {})
  }, [])

  return (
    <div data-slug="footlab" style={{ background: BG, fontFamily: "'Inter', sans-serif",
                                       minHeight: '100vh', color: '#f0ebe3' }}>

      {/* ── Fixed progress bar ─────────────────────────────────────────────── */}
      <motion.div style={{
        position: 'fixed', top: 0, left: 0, height: 2,
        background: ACCENT, width: progressW,
        zIndex: 200, transformOrigin: 'left',
      }} />

      {/* ── Fixed nav ──────────────────────────────────────────────────────── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '22px 32px',
        background: 'linear-gradient(to bottom, rgba(10,10,15,0.9) 0%, transparent 100%)',
      }}>
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.25em',
                        textTransform: 'uppercase', color: '#f0ebe3' }}>
          Footlab
        </span>
        <nav style={{ display: 'flex', gap: 28 }}>
          {[['Shop', 'store'], ['Cart', 'cart']].map(([label, path]) => (
            <button key={path} onClick={() => navigate(`/footlab/${path}`)}
              style={{ background: 'none', border: 'none', fontFamily: 'inherit',
                       fontSize: 11, fontWeight: 600, letterSpacing: '0.18em',
                       textTransform: 'uppercase', color: 'rgba(240,235,227,0.45)',
                       cursor: 'pointer', padding: 0,
                       transition: 'color 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#f0ebe3' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(240,235,227,0.45)' }}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      {/* ── Pinned cinematic stage (500vh) ─────────────────────────────────── */}
      <div ref={containerRef} style={{ height: '500vh', position: 'relative' }}>
        <motion.div style={{
          position: 'sticky', top: 0, height: '100vh', width: '100%',
          overflow: 'hidden', backgroundColor: rawBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>

          <GrainOverlay />

          {/* Ambient glow — reacts to scroll */}
          <motion.div style={{
            position: 'absolute',
            width: '60vw', height: '60vw',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${ACCENT}08 0%, transparent 70%)`,
            pointerEvents: 'none', zIndex: 0,
            opacity: useTransform(scrollYProgress, [0, 0.5, 1], [0.4, 1, 0.3]),
          }} />

          {/* ── Giant "FOOTLAB" logo zoom ─────────────────────────────────── */}
          <motion.div style={{
            position: 'absolute', zIndex: 2, pointerEvents: 'none',
            scale: logoScale, opacity: logoOpacity,
          }}>
            <span style={{
              display: 'block',
              fontSize: 'clamp(52px, 10vw, 130px)',
              fontWeight: 900,
              letterSpacing: '-0.07em',
              color: 'oklch(16% 0.012 85)',
              lineHeight: 0.9,
              userSelect: 'none',
            }}>
              FOOTLAB
            </span>
          </motion.div>

          {/* ── Chapter 1: FIT, CONFIDENT & CLASSY ───────────────────────── */}
          <motion.div style={{
            position: 'absolute', zIndex: 3, textAlign: 'center',
            opacity: ch1Opacity, y: ch1Y,
          }}>
            <p style={{
              fontSize: 'clamp(44px, 8.5vw, 112px)',
              fontWeight: 900,
              letterSpacing: '-0.05em',
              lineHeight: 0.9,
              textTransform: 'uppercase',
              color: '#f0ebe3',
            }}>
              fit,<br />
              <span style={{ color: ACCENT }}>confident</span><br />
              &amp; classy.
            </p>
          </motion.div>

          {/* ── Chapter 2: YOUR STYLE SAYS IT ALL ────────────────────────── */}
          <motion.div style={{
            position: 'absolute', zIndex: 3, textAlign: 'center',
            opacity: ch2Opacity,
          }}>
            <p style={{
              fontSize: 'clamp(12px, 1.6vw, 20px)',
              fontWeight: 300,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'rgba(240,235,227,0.4)',
              marginBottom: '0.6em',
            }}>
              Your style speaks before you do
            </p>
            <p style={{
              fontSize: 'clamp(40px, 7.5vw, 96px)',
              fontWeight: 900,
              letterSpacing: '-0.04em',
              lineHeight: 0.88,
              textTransform: 'uppercase',
              color: '#f0ebe3',
            }}>
              LOUD,<br />
              CLEAR,<br />
              <span style={{
                fontWeight: 200,
                fontSize: '0.65em',
                letterSpacing: '0.06em',
                color: 'rgba(240,235,227,0.35)',
                display: 'block',
                marginTop: '0.1em',
              }}>
                AND EFFORTLESSLY YOU.
              </span>
            </p>
          </motion.div>

          {/* ── Chapter 3: CTA ────────────────────────────────────────────── */}
          <motion.div style={{
            position: 'absolute', zIndex: 3,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 40,
            opacity: ch3Opacity, scale: ch3Scale,
          }}>
            <p style={{
              fontSize: 'clamp(48px, 9.5vw, 124px)',
              fontWeight: 900,
              letterSpacing: '-0.055em',
              lineHeight: 0.88,
              textTransform: 'uppercase',
              textAlign: 'center',
              color: '#f0ebe3',
            }}>
              YOUR STORY<br />
              IN EVERY<br />
              <span style={{ color: ACCENT }}>STEP.</span>
            </p>

            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/footlab/store')}
              style={{
                padding: '18px 64px',
                background: ACCENT, color: BG,
                border: 'none', borderRadius: 0,
                fontFamily: 'inherit',
                fontSize: 12, fontWeight: 800,
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              ENTER THE STORE
            </motion.button>
          </motion.div>

          {/* ── Scroll hint ───────────────────────────────────────────────── */}
          <motion.div style={{
            position: 'absolute', bottom: 36, zIndex: 4,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 10,
            opacity: hintOpacity,
          }}>
            <span style={{
              fontSize: 10, letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: 'rgba(240,235,227,0.3)',
            }}>
              scroll to walk
            </span>
            <motion.div
              animate={{ y: [0, 9, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                width: 1, height: 40,
                background: `linear-gradient(to bottom, ${ACCENT}aa, transparent)`,
              }}
            />
          </motion.div>

        </motion.div>
      </div>

      {/* ── Products strip (below pinned) ───────────────────────────────────── */}
      {items.length > 0 && (
        <section style={{ background: '#0d0d12', paddingTop: 96, paddingBottom: 80 }}>

          {/* Section header */}
          <div style={{ padding: '0 32px', marginBottom: 48 }}>
            <p style={{
              fontSize: 10, letterSpacing: '0.35em',
              textTransform: 'uppercase',
              color: `${ACCENT}88`, marginBottom: 14,
            }}>
              The Collection
            </p>
            <h2 style={{
              fontSize: 'clamp(40px, 7vw, 88px)',
              fontWeight: 900, letterSpacing: '-0.05em',
              lineHeight: 0.88, textTransform: 'uppercase',
              color: '#f0ebe3', margin: 0,
            }}>
              NEW<br />
              <span style={{
                fontWeight: 200, color: 'rgba(240,235,227,0.25)',
                letterSpacing: '0.04em', fontSize: '0.55em',
              }}>
                ARRIVALS
              </span>
            </h2>
          </div>

          {/* Horizontal scroll strip */}
          <div style={{
            display: 'flex', gap: 16,
            overflowX: 'auto', padding: '4px 32px 20px',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
          }}>
            {items.map((item, i) => (
              <ProductCard
                key={item.id}
                item={item}
                index={i}
                onNavigate={() => navigate('/footlab/store')}
              />
            ))}
          </div>

          {/* "View all" link */}
          <div style={{ padding: '40px 32px 0', textAlign: 'center' }}>
            <motion.button
              whileHover={{ color: ACCENT }}
              onClick={() => navigate('/footlab/store')}
              style={{
                background: 'none', border: `1px solid rgba(240,235,227,0.15)`,
                borderRadius: 0,
                padding: '14px 48px',
                fontFamily: 'inherit',
                fontSize: 11, fontWeight: 700,
                letterSpacing: '0.25em', textTransform: 'uppercase',
                color: 'rgba(240,235,227,0.45)', cursor: 'pointer',
                transition: 'color 0.2s, border-color 0.2s',
              }}
            >
              View All Products
            </motion.button>
          </div>
        </section>
      )}

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer style={{
        background: BG,
        borderTop: '1px solid rgba(255,255,255,0.05)',
        padding: '28px 32px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 12, fontWeight: 800,
                        letterSpacing: '0.22em', textTransform: 'uppercase' }}>
          Footlab
        </span>
        <span style={{ fontSize: 10, color: 'rgba(240,235,227,0.2)',
                        letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Premium Sneaker Culture
        </span>
      </footer>

    </div>
  )
}

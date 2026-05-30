/**
 * CategoriesGridSection — Dynamic Section Renderer
 * data: { heading_ar, show_count }
 *
 * Fetches catalog categories and renders them as a visual tile grid.
 * Clicking a tile navigates to the catalog page filtered by that category.
 */
import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import { fetchCategories } from '../../services/catalogApi'

const TILE_COLORS = [
  'oklch(0.30 0.08 280)', 'oklch(0.28 0.07 320)',
  'oklch(0.27 0.06 200)', 'oklch(0.29 0.05 240)',
  'oklch(0.31 0.07 160)', 'oklch(0.28 0.06 60)',
]

export default function CategoriesGridSection({ data, accent, slug, moduleKey }) {
  const [categories, setCategories] = useState([])
  const [loading,    setLoading]    = useState(true)
  const mountedRef  = useRef(true)
  const navigate    = useNavigate()
  const location    = useLocation()

  useEffect(() => () => { mountedRef.current = false }, [])

  useEffect(() => {
    if (!moduleKey || !slug) { setLoading(false); return }
    fetchCategories(moduleKey, slug)
      .then(res => { if (mountedRef.current) setCategories(res.data?.data ?? []) })
      .catch(() => { if (mountedRef.current) setCategories([]) })
      .finally(() => { if (mountedRef.current) setLoading(false) })
  }, [moduleKey, slug])

  if (!loading && categories.length === 0) return null

  // Build the catalog path — handles both /demo/:slug and /:slug/*
  const catalogPath = location.pathname.includes('/demo/')
    ? `/demo/${slug}/catalog`
    : `/${slug}/catalog`

  const goToCategory = (catId) => navigate(`${catalogPath}?cat=${catId}`)

  return (
    <section style={{ marginBottom: 56, direction: 'rtl' }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{
          margin: 0,
          fontSize: 'clamp(20px, 3vw, 30px)',
          fontWeight: 800,
          color: '#f0f0f5',
          letterSpacing: '-0.01em',
          fontFamily: "'Cairo', sans-serif",
        }}>
          {data.heading_ar || 'التصنيفات'}
        </h2>
        <div style={{ width: 36, height: 3, background: accent, borderRadius: 2 }} />
      </div>

      {loading ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 12,
        }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{
              height: 100, borderRadius: 14,
              background: 'rgba(255,255,255,0.03)',
              animation: 'cg-pulse 1.6s ease-in-out infinite',
              animationDelay: `${i * 0.1}s`,
            }} />
          ))}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 12,
        }}>
          {categories.map((cat, i) => (
            <motion.button
              key={cat.id}
              onClick={() => goToCategory(cat.id)}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 22, delay: i * 0.06 }}
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              style={{
                position: 'relative',
                height: 100,
                borderRadius: 14,
                overflow: 'hidden',
                border: 'none',
                cursor: 'pointer',
                background: TILE_COLORS[i % TILE_COLORS.length],
                padding: 0,
              }}
            >
              {/* Category image (if available) */}
              {cat.image_url && (
                <img
                  src={cat.image_url}
                  alt=""
                  style={{
                    position: 'absolute', inset: 0,
                    width: '100%', height: '100%', objectFit: 'cover',
                  }}
                />
              )}

              {/* Overlay */}
              <div style={{
                position: 'absolute', inset: 0,
                background: cat.image_url
                  ? 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.2) 100%)'
                  : `linear-gradient(135deg, ${accent}33 0%, transparent 100%)`,
              }} />

              {/* Name + count */}
              <div style={{
                position: 'absolute', bottom: 0, right: 0, left: 0,
                padding: '10px 14px',
                direction: 'rtl', textAlign: 'right',
              }}>
                <div style={{
                  fontSize: 14, fontWeight: 700,
                  color: '#fff',
                  fontFamily: "'Cairo', sans-serif",
                  lineHeight: 1.3,
                }}>
                  {cat.name_ar || cat.name_en}
                </div>
                {data.show_count && cat.item_count != null && (
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
                    {cat.item_count} منتج
                  </div>
                )}
              </div>
            </motion.button>
          ))}
        </div>
      )}

      <style>{`@keyframes cg-pulse{0%,100%{opacity:.3}50%{opacity:.7}}`}</style>
    </section>
  )
}

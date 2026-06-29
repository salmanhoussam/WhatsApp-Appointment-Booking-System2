/**
 * FeaturedItemsSection — Dynamic Section Renderer
 * data: { heading_ar, limit }
 *
 * Fetches catalog items for this tenant.
 * Shows items with is_featured=true first; falls back to first N items.
 */
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { fetchCategories, fetchItems } from '../../services/catalogApi'
import CatalogItemCard from '../../design-system/molecules/CatalogItemCard'

function SkeletonCard() {
  return (
    <div style={{
      borderRadius: 16, overflow: 'hidden',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
      height: 280,
      animation: 'fs-pulse 1.6s ease-in-out infinite',
    }} />
  )
}

export default function FeaturedItemsSection({ data, accent, slug, moduleKey, onAddToCart }) {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  useEffect(() => () => { mountedRef.current = false }, [])

  useEffect(() => {
    if (!moduleKey || !slug) { setLoading(false); return }

    const limit = data.limit ?? 6

    fetchCategories(moduleKey, slug)
      .then(res => {
        const cats = res.data?.data ?? []
        if (!cats.length) return []
        // Fetch items from the first category only (avoids N+1)
        return fetchItems(moduleKey, slug, cats[0].id)
          .then(r => r.data?.data ?? [])
      })
      .then(allItems => {
        if (!mountedRef.current) return
        // Prefer featured items; fall back to all
        const featured = allItems.filter(i => i.is_featured)
        const pool     = featured.length >= 3 ? featured : allItems
        setItems(pool.slice(0, limit))
      })
      .catch(() => { if (mountedRef.current) setItems([]) })
      .finally(() => { if (mountedRef.current) setLoading(false) })
  }, [moduleKey, slug, data.limit])

  if (!loading && items.length === 0) return null

  return (
    <section style={{ marginBottom: 56, direction: 'rtl' }}>
      <style>{`@keyframes fs-pulse{0%,100%{opacity:.4}50%{opacity:.8}}`}</style>

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
          {data.heading_ar || 'منتجات مميزة'}
        </h2>
        <div style={{ width: 36, height: 3, background: accent, borderRadius: 2 }} />
      </div>

      {/* Grid */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="skeletons"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 16,
            }}
          >
            {Array.from({ length: data.limit ?? 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="items"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 16,
            }}
          >
            {items.map(item => (
              <CatalogItemCard
                key={item.id}
                item={item}
                accent={accent}
                onAddToCart={onAddToCart}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

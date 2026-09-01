/**
 * ProductsSection — Dynamic Section Renderer
 * data: { heading_ar, limit }
 *
 * Products/Services Separation, Track B (2026-08-20) -- structural sibling of
 * FeaturedItemsSection.jsx, but strictly Store products (real CatalogItem, module_key='store'),
 * never Services. CTA is always "أضف للسلة" (never a booking CTA) -- reuses the exact same
 * `onAddToCart` callback (the shared Zustand `addItem` action) every section already receives via
 * DynamicPage.jsx's `sectionProps`, the same one CatalogPage.jsx's own real "add to cart" UI uses
 * for `/{slug}/store` -- no new cart mechanism.
 *
 * Self-gates to `null` when this tenant has no `store` capability active, so mounting this
 * section on a tenant like mr-h (no Store) is always inert, no tenant-slug check needed.
 */
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { fetchCategories, fetchItems } from '../../services/catalogApi'
import CatalogItemCard from '../../design-system/molecules/CatalogItemCard'
import { homepageTokens } from './homepageTokens'
import { getServiceRoute } from '../../config/service-catalog'

function SkeletonCard() {
  return (
    <div style={{
      borderRadius: 16, overflow: 'hidden',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
      height: 280,
      animation: 'ps-pulse 1.6s ease-in-out infinite',
    }} />
  )
}

export default function ProductsSection({ data, accent, slug, onAddToCart, config, homepageTheme }) {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)
  const navigate = useNavigate()
  const useBlackGold = homepageTheme === 'black_gold'
  const themeAccent = useBlackGold ? homepageTokens.accent : accent

  const hasStore = (config?.active_services ?? []).includes('store')
  const shopRoute = getServiceRoute('store', slug)

  // Same real StrictMode mountedRef-reset bug already fixed in FeaturedItemsSection.jsx/
  // useCatalog.js (2026-07-21) -- reset on every effect setup, not just the initializer.
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (!slug || !hasStore) { setLoading(false); return }

    const limit = data.limit ?? 6

    fetchCategories('store', slug)
      .then(res => {
        const cats = res.data?.data ?? []
        if (!cats.length) return []
        return Promise.all(
          cats.map(cat => fetchItems('store', slug, cat.id).then(r => r.data?.data ?? []))
        ).then(itemsByCategory => itemsByCategory.flat())
      })
      .then(allItems => {
        if (!mountedRef.current) return
        const featured = allItems.filter(i => i.is_featured)
        const pool     = featured.length >= 3 ? featured : allItems
        setItems(pool.slice(0, limit))
      })
      .catch(() => { if (mountedRef.current) setItems([]) })
      .finally(() => { if (mountedRef.current) setLoading(false) })
  }, [slug, hasStore, data.limit])

  if (!hasStore) return null
  if (!loading && items.length === 0) return null

  return (
    <section style={{ marginBottom: 56, direction: 'rtl' }}>
      <style>{`@keyframes ps-pulse{0%,100%{opacity:.4}50%{opacity:.8}}`}</style>

      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{
          margin: 0,
          fontSize: 'clamp(20px, 3vw, 30px)',
          fontWeight: 800,
          color: useBlackGold ? homepageTokens.text : '#f0f0f5',
          letterSpacing: '-0.01em',
          fontFamily: useBlackGold ? homepageTokens.headingFont : "'Cairo', sans-serif",
        }}>
          {data.heading_ar || 'منتجاتنا'}
        </h2>
        <div style={{ width: 36, height: 3, background: themeAccent, borderRadius: 2 }} />
      </div>

      {/* Optional video banner (2026-09-01) -- video on top, real product grid under it, one
          section instead of a separate video_story section duplicating this same heading. */}
      {data.video_url && (
        <div style={{ marginBottom: 24 }}>
          <video
            src={data.video_url}
            autoPlay muted loop playsInline
            style={{ width: '100%', maxHeight: 420, objectFit: 'cover', display: 'block', borderRadius: 16 }}
          />
          {data.video_caption_ar && (
            <p style={{
              marginTop: 10, fontSize: 14, color: 'rgba(255,255,255,0.55)',
              fontFamily: "'Cairo', sans-serif", textAlign: 'center',
            }}>
              {data.video_caption_ar}
            </p>
          )}
        </div>
      )}

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
                homepageTheme={homepageTheme}
                onAddToCart={onAddToCart}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* "View all products" -- RK Nav & Shop Correction (2026-09-01): this section is a curated
          preview (data.limit), the full catalog lives on the real Shop page (/{slug}/store,
          CatalogPage.jsx) -- reused here, not a second shop implementation. */}
      {!loading && items.length > 0 && shopRoute && (
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button
            type="button"
            onClick={() => navigate(shopRoute)}
            style={{
              padding: '10px 28px', borderRadius: 999, cursor: 'pointer',
              background: 'transparent', border: `1px solid ${themeAccent}`,
              color: themeAccent, fontSize: 13, fontWeight: 700,
              fontFamily: useBlackGold ? homepageTokens.bodyFont : "'Cairo', sans-serif",
            }}
          >
            شاهد كل المنتجات ←
          </button>
        </div>
      )}
    </section>
  )
}

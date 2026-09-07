/**
 * FeaturedItemsSection — Dynamic Section Renderer
 * data: { heading_ar, limit }
 *
 * Services FIRST, then catalog items (corrected 2026-09-07 -- this docstring previously claimed
 * "every item this component fetches is a real CatalogService", which the code has never done:
 * only the `reservations` branch reads CatalogService; the fallback below reads CatalogItem, and
 * that is what caracas's restaurant menu and olivello's store front actually render). Store
 * products (module_key='store') are still excluded here -- those live in ProductsSection.jsx.
 * CTA is always
 * "احجز الآن"; the old per-item `metadata.requires_booking` check is gone -- it predated the real
 * CatalogService/CatalogItem model split (Phase 3.7C) and was fragile (real store products never
 * even return `metadata` from the public API, so it only ever worked by accident for tenants
 * seeded before the split). Shows items with is_featured=true first; falls back to first N items.
 */
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { fetchAllCategories, fetchItems } from '../../services/catalogApi'
import publicApi from '../../utils/publicApi'
import CatalogItemCard from '../../design-system/molecules/CatalogItemCard'
import { homepageTokens } from './homepageTokens'

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

export default function FeaturedItemsSection({ data, accent, slug, config, homepageTheme }) {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)
  const navigate = useNavigate()
  const handleBookNow = (item) => navigate(`/${slug}/reserve?service=${item.id}`)
  const useBlackGold = homepageTheme === 'black_gold'
  const themeAccent = useBlackGold ? homepageTokens.accent : accent

  // Same real bug already found/fixed in useCatalog.js (2026-07-21, see
  // .claude/memory.md): a cleanup-only effect never resets mountedRef back to
  // `true` on setup, so React StrictMode's dev-mode mount->cleanup->remount
  // cycle permanently latches it to `false` -- every `if (mountedRef.current)`
  // guard below then silently no-ops forever, so `loading` never resolves and
  // the skeletons render forever even though the fetch succeeded.
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (!slug) { setLoading(false); return }

    const limit = data.limit ?? 6

    // Source of truth is the CAPABILITY, not an unrelated activation flag (2026-09-07).
    //
    // This used to read `reservations && !catalog`. The `!catalog` half was arbitrary: `catalog`
    // says nothing about whether a tenant's bookable services exist, and a tenant holding BOTH
    // keys fell through to the CatalogItem walk below. `alzabt-demo` is exactly that tenant --
    // 6 real CatalogService rows, 0 CatalogItems -- so it rendered an empty Services section.
    // Invisible today only because its page has no sections yet. Measured against production,
    // not inferred.
    //
    // `reservations` alone is the honest condition, because it is the same gate that makes
    // catalog_services reachable at all (require_service("reservations") on the route). A tenant
    // holding it has a services table; one without it provably has none, and falls through to
    // CatalogItems -- which is the correct source for a restaurant menu (caracas, module_key
    // 'restaurant') or a store front (olivello, 'store'), both of which still render this section.
    //
    // STILL NOT the definitive split Salman asked for: `featured_items` is serving three
    // different capabilities (services / store products / restaurant menu) through one component.
    // A real split needs a restaurant-menu section that does not exist yet -- ProductsSection is
    // store-only by construction (its own `hasStore` gate), so caracas has nowhere to move to.
    // Recorded in .claudedocs/work/data-model-consolidation/2026-09-07/, not silently deferred.
    const activeServices = config?.active_services ?? []
    if (activeServices.includes('reservations')) {
      publicApi.get('/reservations/catalog-services', { params: { client_slug: slug } })
        .then(res => {
          if (!mountedRef.current) return
          const allItems = res.data?.data ?? []
          const featured = allItems.filter(i => i.is_featured)
          const pool     = featured.length >= 3 ? featured : allItems
          setItems(pool.slice(0, limit))
        })
        .catch(() => { if (mountedRef.current) setItems([]) })
        .finally(() => { if (mountedRef.current) setLoading(false) })
      return
    }

    // Fetch every real Services category (no tenant-wide moduleKey collapse -- TOS-004), then pool
    // items across ALL of them, each routed by its own real module_key. A tenant with more than
    // one catalog-bearing capability active (e.g. RK Barber's real Services + Store categories)
    // must have every one of its real Services categories representable here, not just whichever
    // one a hardcoded "first category" happened to pick.
    //
    // Store categories (module_key === 'store') are deliberately excluded here (Track B,
    // 2026-08-20) -- real Store products now live in the separate ProductsSection.jsx, never
    // pooled in with Services. This is what actually fixes the CTA ambiguity the old
    // `requires_booking` flag was standing in for: an item reaching this component is now
    // guaranteed bookable by construction (it only ever came from a non-store category), not by a
    // fragile per-item flag.
    fetchAllCategories(slug)
      .then(res => {
        const cats = (res.data?.data ?? []).filter(cat => cat.module_key !== 'store')
        if (!cats.length) return []
        return Promise.all(
          cats.map(cat => fetchItems(cat.module_key, slug, cat.id).then(r => r.data?.data ?? []))
        ).then(itemsByCategory => itemsByCategory.flat())
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
  }, [slug, data.limit, config])

  if (!loading && items.length === 0) return null

  return (
    <section style={{ marginBottom: 56 }}>
      <style>{`@keyframes fs-pulse{0%,100%{opacity:.4}50%{opacity:.8}}`}</style>

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
          {data.heading_ar || 'منتجات مميزة'}
        </h2>
        <div style={{ width: 36, height: 3, background: themeAccent, borderRadius: 2 }} />
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
                homepageTheme={homepageTheme}
                onBookNow={handleBookNow}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

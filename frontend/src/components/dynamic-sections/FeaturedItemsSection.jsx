/**
 * FeaturedItemsSection — Dynamic Section Renderer
 * data: { heading_ar, limit }
 *
 * Fetches catalog items for this tenant.
 * Shows items with is_featured=true first; falls back to first N items.
 */
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { fetchAllCategories, fetchItems } from '../../services/catalogApi'
import publicApi from '../../utils/publicApi'
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

export default function FeaturedItemsSection({ data, accent, slug, onAddToCart, config }) {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)
  const navigate = useNavigate()
  const handleBookNow = (item) => navigate(`/${slug}/reserve?service=${item.id}`)

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

    // P0.1 fix (2026-08-15, ALZABT_SECTION_SYSTEM_WORK_SEQUENCE.md): a Reservations-vertical
    // tenant (e.g. Ali) has real CatalogService rows but no separately-activated "catalog"
    // service -- the old catalogApi.js path 403s on such a tenant (its real backend route is
    // gated behind require_service("catalog")). GET /reservations/catalog-services is the
    // already-real, already-public, reservations-native endpoint (already proven working by
    // useReservationBooking.js's own booking-page fetch) gated behind "reservations" instead.
    // Branch on the ACTUAL gate the old path depends on ("catalog"), not merely on whether
    // "reservations" is present -- a tenant can genuinely have both (e.g. RK: real Services
    // AND real Store categories), and such a tenant must keep its existing, already-working
    // multi-category walk below untouched, not be narrowed down to reservations-only services.
    const activeServices = config?.active_services ?? []
    if (activeServices.includes('reservations') && !activeServices.includes('catalog')) {
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

    // Fetch every real category (no tenant-wide moduleKey collapse -- TOS-004), then pool items
    // across ALL of them, each routed by its own real module_key. A tenant with more than one
    // catalog-bearing capability active (e.g. RK Barber's real Services + Store categories) must
    // have every one of its real categories representable here, not just whichever one a
    // hardcoded "first category" happened to pick.
    fetchAllCategories(slug)
      .then(res => {
        const cats = res.data?.data ?? []
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
            {items.map(item => {
              // Real, existing per-item signal (CatalogItem.metadata.requires_booking, already
              // set on every real bookable service via the Reservation Pilot's catalog/service
              // bridge -- confirmed present on BOTH fetch paths above, live). More correct than a
              // tenant-level toggle: a tenant can have both real bookable services AND real
              // cart-purchasable products in the same section (e.g. RK: "الخدمات" category is
              // requires_booking, "منتجات العناية" is not) -- this decides per item, not per tenant.
              const requiresBooking = item.metadata?.requires_booking === true
              return (
                <CatalogItemCard
                  key={item.id}
                  item={item}
                  accent={accent}
                  onAddToCart={requiresBooking ? undefined : onAddToCart}
                  onBookNow={requiresBooking ? handleBookNow : undefined}
                />
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

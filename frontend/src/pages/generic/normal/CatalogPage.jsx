import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { TenantModuleNav }                              from '../../../design-system/organisms'
import { CategoryPill, CartBadge }                      from '../../../design-system/molecules'
import { colors }                                       from '../../../design-system/tokens'
import { useTenantBase }                                from '../../../hooks/useTenantSlug'
import useGenericStore                                  from '../store/useGenericStore'
import useCatalog                                       from '../../../hooks/useCatalog'
import { hasOrderCapability }                           from '../../../utils/capabilities'
import CatalogGrid                                      from '../../catalog/templates/CatalogGrid'
import CatalogList                                      from '../../catalog/templates/CatalogList'
import CatalogShowcase                                  from '../../catalog/templates/CatalogShowcase'

const TEMPLATE_MAP = { grid: CatalogGrid, list: CatalogList, showcase: CatalogShowcase }

// ── Accent-aware loading dot ──────────────────────────────────────────────────

let _dotInjected = false
function LoadingDot({ accent }) {
  if (!_dotInjected) {
    _dotInjected = true
    const s = document.createElement('style')
    s.textContent = `@keyframes gldot{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:1;transform:scale(1.6)}}`
    document.head.appendChild(s)
  }
  return (
    <div style={{ textAlign: 'center', padding: '80px 0' }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%', background: accent,
        margin: '0 auto', boxShadow: `0 0 20px 4px ${accent}66`,
        animation: 'gldot 1.4s ease-in-out infinite',
      }} />
    </div>
  )
}

// ── CatalogPage — thin wrapper ────────────────────────────────────────────────
// Pass layoutOverride="list"|"grid"|"showcase" to force a specific template.
// Without it, each category's display_template field determines the layout.
//
// productLinkBase — optional, additive only. When provided (a function
// `(item) => path`), cards become clickable and navigate to that path — used
// today only by beit-al-fakhar, which has a real Product Detail Page route.
// Every other tenant using this shared page doesn't pass it, so their cards
// keep behaving exactly as before (add-to-cart only, no navigation).

export default function CatalogPage({ layoutOverride, productLinkBase } = {}) {
  const base     = useTenantBase()
  const navigate = useNavigate()
  const { addItem, totalItems } = useGenericStore()

  const {
    config,
    categories, activeCategory, setActiveCategory,
    filteredItems, search, setSearch,
    isLoading, itemsLoading,
  } = useCatalog()

  const accent    = config?.primary_color ?? '#d4a853'
  // Plural capability check (TOS-004) -- not the tenant-wide collapsed `moduleKey`. A tenant with
  // both Catalog and Store active (e.g. RK Barber) must still see the cart affordance; the old
  // `moduleKey === 'store'` check only worked for such a tenant by luck of derivation priority.
  // Gates the floating CartBadge only -- a real cart from a different (order-bearing) category
  // must stay reachable regardless of which category is currently being browsed.
  const canOrder  = hasOrderCapability(config?.active_services)
  // Localhost Production Readiness fix, 2026-08-22 -- `canOrder` alone answers "can this TENANT
  // order at all", not "does the category currently being browsed actually belong to an
  // order-bearing capability". `useCatalog()`'s own fetchAllCategories() deliberately returns
  // EVERY real category regardless of module_key (see that hook's own comment) -- filtering was
  // always meant to happen here, per-category, not there. Confirmed live on rk (real DB read):
  // "الخدمات" is a real `module_key: 'catalog'` category, sitting alongside "منتجات العناية"
  // (`module_key: 'store'`) -- with only the tenant-level check, both offered the identical
  // "+ أضف للسلة" affordance, letting a real service item enter the same cart as real Store
  // products. The backend's own real order-creation path
  // (`app/repositories/store_repo.py`'s `category.moduleKey == "store"` filter) then rejected it
  // with a 404 at checkout time -- for the WHOLE cart, not just the offending item. Fixed at the
  // source (never offer the action) instead of a checkout-side workaround, per instruction.
  const canOrderActiveCategory = canOrder
    && (activeCategory?.module_key === 'store' || activeCategory?.module_key === 'restaurant')
  const onAddCart = useCallback((item) => addItem(item, 1), [addItem])

  // Hooks must run unconditionally (Rules of Hooks) — always create the
  // callback, only conditionally use its result below.
  const navigateToProduct = useCallback(
    (item) => { if (productLinkBase) navigate(productLinkBase(item)) },
    [navigate, productLinkBase]
  )
  const onItemClick = productLinkBase ? navigateToProduct : undefined

  const templateKey = layoutOverride ?? activeCategory?.display_template ?? 'grid'
  const Template    = TEMPLATE_MAP[templateKey] ?? CatalogGrid

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#fff', direction: 'rtl' }}>
      <TenantModuleNav />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '88px 20px 100px' }}>

        {/* Search */}
        <div style={{ marginBottom: 24 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث عن عنصر..."
            style={{
              width: '100%', padding: '12px 18px', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 12, color: '#fff', fontSize: 14,
              outline: 'none', direction: 'rtl',
              fontFamily: "'Cairo', sans-serif",
            }}
          />
        </div>

        {/* Category pills */}
        {categories.length > 1 && (
          <div style={{
            display: 'flex', gap: 10, overflowX: 'auto',
            paddingBottom: 16, marginBottom: 28,
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            scrollbarWidth: 'none',
          }}>
            {categories.map((cat) => (
              <CategoryPill
                key={cat.id}
                cat={cat}
                active={activeCategory?.id === cat.id}
                accent={accent}
                onClick={() => setActiveCategory(cat)}
              />
            ))}
          </div>
        )}

        {/* Content */}
        {isLoading || itemsLoading ? (
          <LoadingDot accent={accent} />
        ) : filteredItems.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '80px 0',
            color: 'rgba(255,255,255,0.25)', fontSize: 15,
            fontFamily: "'Cairo', sans-serif",
          }}>
            {search ? `لا نتائج لـ "${search}"` : 'لا توجد عناصر في هذا القسم'}
          </div>
        ) : (
          <Template
            items={filteredItems}
            accent={accent}
            onAddToCart={canOrderActiveCategory ? onAddCart : undefined}
            onItemClick={onItemClick}
          />
        )}
      </div>

      {/* Floating cart */}
      {canOrder && (
        <AnimatePresence>
          <CartBadge
            count={totalItems()}
            accent={accent}
            onClick={() => navigate(`${base}/cart`)}
          />
        </AnimatePresence>
      )}
    </div>
  )
}

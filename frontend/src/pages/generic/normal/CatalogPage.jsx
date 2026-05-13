import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { TenantModuleNav }                              from '../../../design-system/organisms'
import { CategoryPill, CartBadge }                      from '../../../design-system/molecules'
import { colors }                                       from '../../../design-system/tokens'
import { useTenantBase }                                from '../../../utils/useTenantSlug'
import useGenericStore                                  from '../store/useGenericStore'
import useCatalog                                       from '../../../hooks/useCatalog'
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

export default function CatalogPage({ layoutOverride } = {}) {
  const base     = useTenantBase()
  const navigate = useNavigate()
  const { addItem, totalItems } = useGenericStore()

  const {
    config, moduleKey,
    categories, activeCategory, setActiveCategory,
    filteredItems, search, setSearch,
    isLoading, itemsLoading,
  } = useCatalog()

  const accent    = config?.primary_color ?? '#d4a853'
  const canOrder  = moduleKey === 'restaurant' || moduleKey === 'store'
  const onAddCart = useCallback((item) => addItem(item, 1), [addItem])

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
            onAddToCart={canOrder ? onAddCart : undefined}
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

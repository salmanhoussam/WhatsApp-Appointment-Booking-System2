import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion }       from 'framer-motion'
import publicApi         from '../../../utils/publicApi'
import useTenantConfig   from '../../../hooks/useTenantConfig'
import useTenantSlug     from '../../../utils/useTenantSlug'
import { useTenantBase } from '../../../utils/useTenantSlug'
import TenantModuleNav   from '../../../design-system/organisms/TenantModuleNav'
import CatalogGrid       from '../../catalog/templates/CatalogGrid'
import CatalogList       from '../../catalog/templates/CatalogList'
import CatalogShowcase   from '../../catalog/templates/CatalogShowcase'
import useGenericStore   from '../store/useGenericStore'

const TEMPLATE_MAP = { grid: CatalogGrid, list: CatalogList, showcase: CatalogShowcase }

// ── API helpers (module-aware) ────────────────────────────────────────────────

function fetchCategories(moduleKey, slug) {
  const base = { client_slug: slug }
  if (moduleKey === 'restaurant')
    return publicApi.get('/restaurant/menu/categories', { params: base })
  if (moduleKey === 'store')
    return publicApi.get('/store/categories', { params: base })
  // catalog: slug-in-path endpoint with client_slug for tenant resolution
  return publicApi.get(`/${slug}/catalog/categories`, { params: { ...base, module_key: moduleKey } })
}

function fetchItems(moduleKey, slug, categoryId) {
  const base = { client_slug: slug }
  if (moduleKey === 'restaurant')
    return publicApi.get(`/restaurant/menu/categories/${categoryId}/items`, { params: base })
  if (moduleKey === 'store')
    return publicApi.get('/store/products', { params: { ...base, category_id: categoryId } })
  // catalog: slug-in-path endpoint
  return publicApi.get(`/${slug}/catalog/categories/${categoryId}/items`, { params: base })
}

// ── Category pill ─────────────────────────────────────────────────────────────

function CategoryPill({ cat, active, accent, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      style={{
        padding: '8px 20px', borderRadius: 999, flexShrink: 0,
        border:     `1.5px solid ${active ? accent : 'rgba(255,255,255,0.12)'}`,
        background: active ? `${accent}22` : 'rgba(255,255,255,0.04)',
        color:      active ? accent : 'rgba(255,255,255,0.7)',
        cursor: 'pointer', fontSize: 14, fontWeight: active ? 600 : 400,
        transition: 'all 0.2s', whiteSpace: 'nowrap',
        fontFamily: "'Cairo', sans-serif",
      }}
    >
      {cat.name_ar || cat.name_en}
    </motion.button>
  )
}

// ── Loading ───────────────────────────────────────────────────────────────────

let _pulseInjected = false
function LoadingDot({ accent }) {
  useEffect(() => {
    if (_pulseInjected) return
    _pulseInjected = true
    const el = document.createElement('style')
    el.textContent = `@keyframes gldot{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:1;transform:scale(1.6)}}`
    document.head.appendChild(el)
  }, [])
  return (
    <div style={{ textAlign: 'center', padding: '80px 0' }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: accent, margin: '0 auto',
        boxShadow: `0 0 20px 4px ${accent}66`,
        animation: 'gldot 1.4s ease-in-out infinite',
      }} />
    </div>
  )
}

// ── Floating cart badge ───────────────────────────────────────────────────────

function CartBadge({ count, accent, onClick }) {
  if (!count) return null
  return (
    <motion.button
      onClick={onClick}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      whileTap={{ scale: 0.93 }}
      style={{
        position: 'fixed', bottom: 28, left: 24, zIndex: 50,
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '13px 24px', borderRadius: 999,
        background: accent, color: '#fff',
        border: 'none', cursor: 'pointer',
        fontSize: 14, fontWeight: 700,
        boxShadow: `0 8px 32px ${accent}55`,
        fontFamily: "'Cairo', sans-serif",
      }}
    >
      <span style={{
        width: 22, height: 22, borderRadius: '50%',
        background: 'rgba(0,0,0,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 800,
      }}>
        {count}
      </span>
      عرض السلة
    </motion.button>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CatalogPage() {
  const { config, isLoading: configLoading } = useTenantConfig()
  const slug     = useTenantSlug()
  const base     = useTenantBase()
  const navigate = useNavigate()
  const accent   = config?.primary_color ?? '#d4a853'

  const { moduleKey, setConfig, addItem, totalItems } = useGenericStore()

  // Sync config into store once loaded
  useEffect(() => {
    if (config && !configLoading) {
      setConfig(config, config.active_services ?? [])
    }
  }, [config, configLoading, setConfig])

  const [categories,   setCategories]   = useState([])
  const [activeCat,    setActiveCat]    = useState(null)
  const [items,        setItems]        = useState([])
  const [search,       setSearch]       = useState('')
  const [catsLoading,  setCatsLoading]  = useState(true)
  const [itemsLoading, setItemsLoading] = useState(false)

  const mountedRef = useRef(true)
  useEffect(() => () => { mountedRef.current = false }, [])

  // ── Fetch categories ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!moduleKey || !slug) return
    setCatsLoading(true)
    fetchCategories(moduleKey, slug)
      .then(({ data }) => {
        if (!mountedRef.current) return
        const cats = data?.data ?? []
        setCategories(cats)
        if (cats.length) setActiveCat(cats[0])
      })
      .catch(() => { if (mountedRef.current) setCategories([]) })
      .finally(() => { if (mountedRef.current) setCatsLoading(false) })
  }, [moduleKey, slug])

  // ── Fetch items when category changes ────────────────────────────────────
  useEffect(() => {
    if (!activeCat || !moduleKey || !slug) return
    setItemsLoading(true)
    setItems([])
    fetchItems(moduleKey, slug, activeCat.id)
      .then(({ data }) => {
        if (!mountedRef.current) return
        setItems(data?.data ?? [])
      })
      .catch(() => { if (mountedRef.current) setItems([]) })
      .finally(() => { if (mountedRef.current) setItemsLoading(false) })
  }, [activeCat, moduleKey, slug])

  // ── Client-side search ────────────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    if (!search.trim()) return items
    const q = search.toLowerCase()
    return items.filter((i) =>
      (i.name_ar ?? '').toLowerCase().includes(q) ||
      (i.name_en ?? '').toLowerCase().includes(q)
    )
  }, [items, search])

  // ── Add to cart ───────────────────────────────────────────────────────────
  const canOrder = moduleKey === 'restaurant' || moduleKey === 'store'
  const handleAddToCart = useCallback((item) => {
    addItem(item, 1)
  }, [addItem])

  const Template = TEMPLATE_MAP[activeCat?.display_template || 'grid'] ?? CatalogGrid
  const isLoading = configLoading || catsLoading

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#fff', direction: 'rtl' }}>
      <TenantModuleNav />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '88px 20px 100px' }}>

        {/* ── Search ───────────────────────────────────────────────────── */}
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

        {/* ── Category pills ───────────────────────────────────────────── */}
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
                active={activeCat?.id === cat.id}
                accent={accent}
                onClick={() => { setActiveCat(cat); setSearch('') }}
              />
            ))}
          </div>
        )}

        {/* ── Items ────────────────────────────────────────────────────── */}
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
            onAddToCart={canOrder ? handleAddToCart : undefined}
          />
        )}
      </div>

      {/* ── Floating cart button ──────────────────────────────────────── */}
      {canOrder && (
        <CartBadge
          count={totalItems()}
          accent={accent}
          onClick={() => navigate(`${base}/cart`)}
        />
      )}
    </div>
  )
}

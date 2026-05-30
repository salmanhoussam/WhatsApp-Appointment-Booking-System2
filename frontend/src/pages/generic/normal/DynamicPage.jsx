/**
 * DynamicPage — Generic Public Tenant Page
 *
 * Reads config.content.sections from the tenant public config and renders
 * section components built in the Page Builder.
 *
 * ── Mounting contexts ──────────────────────────────────────────────────────────
 *   /demo/:slug          DynamicTenantResolver  (trial preview, shows ribbon)
 *   /:slug               _dynamic.routes index  (production path-based)
 *   slug.domain.com/     _dynamic.routes index  (production subdomain mode)
 *
 * ── page_type fallback (when sections: []) ────────────────────────────────────
 *   "showcase"                → ConfigurableHero (legacy hero from settings)
 *   "catalog"|"restaurant"|"store" → auto-redirect → ./catalog
 *   anything else             → "coming soon" message
 *
 * ── Production API ────────────────────────────────────────────────────────────
 *   Uses publicApi (VITE_API_URL env var). No raw axios. No hardcoded URL.
 *   Set VITE_API_URL=https://your-backend.up.railway.app in Railway env vars.
 */

import { useState, useEffect, useMemo } from 'react'
import { useParams, Link, Navigate }    from 'react-router-dom'
import { AnimatePresence }              from 'framer-motion'

import useTenantConfig from '../../../hooks/useTenantConfig'
import useGenericStore  from '../store/useGenericStore'
import CartBadge      from '../../../design-system/molecules/CartBadge'
import CartDrawer     from '../../../design-system/organisms/CartDrawer'
import ConfigurableHero from '../../../components/ConfigurableHero'

import {
  HeroSection,
  StorySection,
  FeaturedItemsSection,
  CategoriesGridSection,
  GallerySection,
  LocationSection,
  CtaSection,
} from '../../../components/dynamic-sections'

// ── Section component registry ────────────────────────────────────────────────

const SECTION_MAP = {
  hero:            HeroSection,
  story:           StorySection,
  featured_items:  FeaturedItemsSection,
  categories_grid: CategoriesGridSection,
  gallery:         GallerySection,
  location:        LocationSection,
  cta:             CtaSection,
}

// ── Page type → catalog-module list ──────────────────────────────────────────

const CATALOG_PAGE_TYPES = ['catalog', 'restaurant', 'store', 'grid', 'list']

// ── Loading screen ────────────────────────────────────────────────────────────

function LoadingScreen({ accent = '#d4a853' }) {
  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0f',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 10, height: 10, borderRadius: '50%',
        background: accent,
        boxShadow: `0 0 24px 4px ${accent}80`,
        animation: 'dp-pulse 1.4s ease-in-out infinite',
      }} />
      <style>{`@keyframes dp-pulse{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:1;transform:scale(1.7)}}`}</style>
    </div>
  )
}

// ── Tenant not found ──────────────────────────────────────────────────────────

function NotFoundScreen({ slug }) {
  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0f',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16,
      color: '#fff', fontFamily: "'Cairo', sans-serif",
    }}>
      <div style={{ fontSize: 48, opacity: 0.12 }}>◈</div>
      <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 14, margin: 0 }}>
        لم يتم العثور على المنشأة:{' '}
        <code style={{ color: '#d4a853' }}>{slug}</code>
      </p>
      <Link to="/login" style={{
        fontSize: 12, color: '#d4a853', textDecoration: 'none', opacity: 0.7,
      }}>
        تسجيل الدخول ←
      </Link>
    </div>
  )
}

// ── Default fallback — no sections configured yet ────────────────────────────

function DefaultFallback({ config, accent, pageType, useTenantBase }) {
  // catalog/restaurant/store modes: redirect to catalog sub-page immediately
  if (CATALOG_PAGE_TYPES.includes(pageType)) {
    return <Navigate to="catalog" replace />
  }

  // showcase mode: render the legacy ConfigurableHero (backward compat)
  if (pageType === 'showcase') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0f' }}>
        <ConfigurableHero config={config} />
      </div>
    )
  }

  // Generic "coming soon" — admins need to build sections in Page Builder
  return (
    <div style={{
      minHeight: '60vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16,
      textAlign: 'center', padding: '80px 32px',
      direction: 'rtl', fontFamily: "'Cairo', sans-serif",
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 14,
        background: `${accent}12`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 26, color: accent, opacity: 0.7,
        marginBottom: 4,
      }}>
        ◈
      </div>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#f0f0f5' }}>
        {config?.name_ar || config?.name_en || 'مرحباً'}
      </h2>
      <p style={{
        margin: 0, fontSize: 14,
        color: 'rgba(255,255,255,0.3)', maxWidth: 320, lineHeight: 1.7,
      }}>
        الصفحة قيد الإعداد. استخدم{' '}
        <span style={{ color: accent }}>بناء الصفحة</span>
        {' '}في لوحة التحكم لإضافة الأقسام.
      </p>
    </div>
  )
}

// ── Trial ribbon (demo route only) ────────────────────────────────────────────

function TrialRibbon({ accent, name }) {
  return (
    <div style={{
      background: `${accent}14`,
      borderBottom: `1px solid ${accent}28`,
      padding: '8px 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      direction: 'rtl',
    }}>
      <span style={{
        fontSize: 12, color: `${accent}bb`, fontWeight: 600,
        fontFamily: "'Cairo', sans-serif",
      }}>
        ✦ صفحة تجريبية — {name}
      </span>
      <Link to="/login" style={{
        fontSize: 11, color: accent, textDecoration: 'none',
        opacity: 0.7, letterSpacing: '0.06em',
      }}>
        تسجيل الدخول ←
      </Link>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DynamicPage() {
  const { slug } = useParams()

  // ── Server state — React Query backed, 10 min cache, cross-navigation dedup ──
  const { config: serverConfig, isLoading: loading } = useTenantConfig(slug)

  // ── Live preview overrides — Page Builder iframe sends PREVIEW_UPDATE ────────
  const [previewPatch, setPreviewPatch] = useState({})

  // Merge: server config + preview overrides (preview wins on key collision)
  const tenantConfig = useMemo(
    () => serverConfig ? { ...serverConfig, ...previewPatch } : null,
    [serverConfig, previewPatch]
  )

  const [cartOpen, setCartOpen] = useState(false)

  const { setConfig, addItem, totalItems } = useGenericStore()

  const isDemoRoute = window.location.pathname.includes('/demo/')

  // ── Sync tenantConfig into Zustand store (moduleKey derivation) ───────────────
  useEffect(() => {
    if (tenantConfig) setConfig(tenantConfig, tenantConfig.active_services ?? [])
  }, [tenantConfig, setConfig])

  // ── Live preview bridge — postMessage from GenericAdminDashboard iframe ──────
  // Dashboard sends: { type: 'PREVIEW_UPDATE', accent, heroType, catalogLayout, config? }
  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type !== 'PREVIEW_UPDATE') return
      const patch = {}
      if (e.data.accent)        patch.primary_color = e.data.accent
      if (e.data.heroType)      patch.page_type = e.data.heroType
      if (e.data.catalogLayout) patch.config = {
        ...(serverConfig?.config ?? {}),
        catalog_layout: e.data.catalogLayout,
      }
      if (e.data.config)        Object.assign(patch, e.data.config)
      setPreviewPatch(prev => ({ ...prev, ...patch }))
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [serverConfig])

  // ── Early exits ──────────────────────────────────────────────────────────────
  if (loading)       return <LoadingScreen />
  if (!tenantConfig) return <NotFoundScreen slug={slug} />

  // ── Derived values ───────────────────────────────────────────────────────────
  const accent   = tenantConfig.primary_color || '#6d28d9'
  const currency = tenantConfig.currency      || 'USD'
  const pageType = tenantConfig.page_type     || 'normal'

  const activeServices = tenantConfig.active_services ?? []
  const moduleKey = activeServices.includes('restaurant') ? 'restaurant'
    : activeServices.includes('store')      ? 'store'
    : activeServices.includes('catalog')    ? 'catalog'
    : null

  const sections = (tenantConfig.config?.content?.sections ?? [])
    .filter(s => s?.type)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  const cartCount = totalItems()
  const showCart  = !!moduleKey

  // Props injected into every section component
  const sectionProps = {
    slug,
    accent,
    currency,
    moduleKey,
    config: tenantConfig,
    onAddToCart: addItem,
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      color: '#fff',
      fontFamily: "'Cairo', 'Segoe UI', sans-serif",
    }}>
      {isDemoRoute && (
        <TrialRibbon
          accent={accent}
          name={tenantConfig.name_ar || tenantConfig.name_en}
        />
      )}

      {/* Sections — or fallback if none configured */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 120px' }}>
        {sections.length > 0 ? (
          sections.map((section) => {
            const Component = SECTION_MAP[section.type]
            if (!Component) return null
            return (
              <Component
                key={section.id}
                data={section.data ?? {}}
                {...sectionProps}
              />
            )
          })
        ) : (
          <DefaultFallback
            config={tenantConfig}
            accent={accent}
            pageType={pageType}
          />
        )}
      </div>

      {/* Floating cart badge */}
      {showCart && (
        <AnimatePresence>
          {cartCount > 0 && (
            <CartBadge
              count={cartCount}
              accent={accent}
              onClick={() => setCartOpen(true)}
            />
          )}
        </AnimatePresence>
      )}

      {/* Cart drawer */}
      {showCart && (
        <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
      )}

    </div>
  )
}

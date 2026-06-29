import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import publicApi          from '../../utils/publicApi';
import { getTenantSlug }  from '../../utils/tenant.config';
import TenantModuleNav    from '../../design-system/organisms/TenantModuleNav';
import useTenantConfig    from '../../hooks/useTenantConfig';
import CatalogGrid        from './templates/CatalogGrid';
import CatalogList        from './templates/CatalogList';
import CatalogShowcase    from './templates/CatalogShowcase';

const FALLBACK_ACCENT = '#6d28d9';

const TEMPLATE_MAP = {
  grid:     CatalogGrid,
  list:     CatalogList,
  showcase: CatalogShowcase,
};

// ── Category pill ─────────────────────────────────────────────────────────────
function CategoryPill({ cat, active, accent, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      style={{
        padding: '8px 20px',
        borderRadius: 999,
        border: `1.5px solid ${active ? accent : 'rgba(255,255,255,0.12)'}`,
        background: active ? `${accent}22` : 'rgba(255,255,255,0.04)',
        color: active ? accent : 'rgba(255,255,255,0.7)',
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: active ? 600 : 400,
        transition: 'all 0.2s',
        whiteSpace: 'nowrap',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      {cat.name_ar || cat.name_en}
      <span style={{
        fontSize: 9, opacity: 0.6, letterSpacing: '0.06em',
        background: 'rgba(255,255,255,0.1)', padding: '1px 5px', borderRadius: 4,
        textTransform: 'uppercase',
      }}>
        {cat.display_template || 'grid'}
      </span>
    </motion.button>
  );
}

// ── Loading dot ───────────────────────────────────────────────────────────────
function LoadingDot({ accent }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 0' }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: accent, margin: '0 auto 16px',
        boxShadow: `0 0 20px 4px ${accent}66`,
        animation: 'pulse 1.4s ease-in-out infinite',
      }} />
      <style>{`@keyframes pulse{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:1;transform:scale(1.6)}}`}</style>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CatalogPage() {
  const { config }  = useTenantConfig();
  const accent      = config?.primary_color || FALLBACK_ACCENT;
  const slug        = getTenantSlug();

  const [categories,  setCategories]  = useState([]);
  const [items,       setItems]       = useState([]);
  const [activeCat,   setActiveCat]   = useState(null);   // full category object
  const [loading,     setLoading]     = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);

  // Load categories
  useEffect(() => {
    publicApi
      .get('/catalog/categories', { params: { client_slug: slug } })
      .then(({ data }) => {
        if (data.success && data.data.length) {
          setCategories(data.data);
          setActiveCat(data.data[0]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  // Load items when active category changes
  useEffect(() => {
    if (!activeCat) return;
    setItemsLoading(true);
    publicApi
      .get(`/catalog/categories/${activeCat.id}/items`, { params: { client_slug: slug } })
      .then(({ data }) => { if (data.success) setItems(data.data); })
      .catch(() => setItems([]))
      .finally(() => setItemsLoading(false));
  }, [activeCat, slug]);

  // Resolve template component from active category's display_template
  const TemplateComponent = TEMPLATE_MAP[activeCat?.display_template || 'grid'] ?? CatalogGrid;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#fff', direction: 'rtl' }}>
      <TenantModuleNav />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px 80px' }}>

        {/* Category pills */}
        {categories.length > 1 && (
          <div style={{
            display: 'flex', gap: 10, flexWrap: 'wrap',
            marginBottom: 32, paddingBottom: 16,
            borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}>
            {categories.map(cat => (
              <CategoryPill
                key={cat.id}
                cat={cat}
                active={activeCat?.id === cat.id}
                accent={accent}
                onClick={() => setActiveCat(cat)}
              />
            ))}
          </div>
        )}

        {/* Template badge */}
        {activeCat && (
          <div style={{
            marginBottom: 20, fontSize: 11,
            color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            {activeCat.name_ar}
            {' · '}
            <span style={{ color: `${accent}99` }}>
              {activeCat.display_template === 'grid'     && 'عرض شبكي'}
              {activeCat.display_template === 'list'     && 'عرض قائمة'}
              {activeCat.display_template === 'showcase' && 'عرض كبير'}
            </span>
          </div>
        )}

        {/* Items */}
        {loading || itemsLoading ? (
          <LoadingDot accent={accent} />
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(255,255,255,0.25)', fontSize: 15 }}>
            لا توجد عناصر في هذا القسم
          </div>
        ) : (
          <TemplateComponent items={items} accent={accent} />
        )}

      </div>
    </div>
  );
}

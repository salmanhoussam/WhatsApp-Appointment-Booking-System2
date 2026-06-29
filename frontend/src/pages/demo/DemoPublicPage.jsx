/**
 * DemoPublicPage — demo.salmansaas.com/demo/:slug
 * Public customer-facing preview for trial tenants (no login required).
 * Fetches tenant config + catalog categories and renders ConfigurableHero.
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import ConfigurableHero from '../../components/ConfigurableHero';
import adminApi from '../../utils/admin.config';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0f',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 10, height: 10, borderRadius: '50%',
        background: '#d4a853',
        boxShadow: '0 0 24px 4px rgba(212,168,83,0.5)',
        animation: 'pulse 1.4s ease-in-out infinite',
      }} />
      <style>{`@keyframes pulse{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:1;transform:scale(1.7)}}`}</style>
    </div>
  );
}

function NotFoundScreen({ slug }) {
  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0f',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16,
      color: '#fff',
    }}>
      <div style={{ fontSize: 48, opacity: 0.2 }}>◈</div>
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
        لم يتم العثور على المنشأة: <code style={{ color: '#d4a853' }}>{slug}</code>
      </p>
    </div>
  );
}

// ── Catalog layout sub-components ─────────────────────────────────────────────

function GridView({ items, accent }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
      gap: 16, direction: 'rtl',
    }}>
      {items.slice(0, 6).map((item, i) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, type: 'spring', stiffness: 200, damping: 20 }}
          style={{
            borderRadius: 16,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            overflow: 'hidden',
          }}
        >
          <div style={{
            height: 140, overflow: 'hidden',
            background: item.image_url ? 'transparent' : `${accent}12`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {item.image_url
              ? <img src={item.image_url} alt={item.name_ar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 32, opacity: 0.2 }}>◈</span>
            }
          </div>
          <div style={{ padding: '12px 14px' }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#fff', marginBottom: 4 }}>
              {item.name_ar || item.name_en}
            </div>
            {item.price != null && (
              <div style={{ fontSize: 15, fontWeight: 700, color: accent }}>
                {Number(item.price).toLocaleString('ar-SA')}
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginRight: 4 }}>
                  {item.currency}
                </span>
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function ListView({ items, accent }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, direction: 'rtl' }}>
      {items.slice(0, 8).map((item, i) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04, type: 'spring', stiffness: 220, damping: 22 }}
          style={{
            display: 'flex', alignItems: 'center', gap: 14,
            borderRadius: 14,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            padding: '10px 14px',
          }}
        >
          {/* Thumbnail */}
          <div style={{
            width: 64, height: 64, borderRadius: 10, flexShrink: 0,
            overflow: 'hidden',
            background: item.image_url ? 'transparent' : `${accent}10`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {item.image_url
              ? <img src={item.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 22, opacity: 0.15 }}>◈</span>
            }
          </div>

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#f0ebe3', marginBottom: 3 }}>
              {item.name_ar || item.name_en}
            </div>
            {(item.description_ar || item.description_en) && (
              <div style={{
                fontSize: 12, color: 'rgba(255,255,255,0.3)', lineHeight: 1.4,
                overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
              }}>
                {item.description_ar || item.description_en}
              </div>
            )}
          </div>

          {/* Price */}
          {item.price != null && (
            <div style={{ flexShrink: 0, textAlign: 'left' }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: accent }}>
                {Number(item.price).toLocaleString('ar-SA')}
              </span>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
                {item.currency}
              </div>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

function ShowcaseView({ items, accent }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: 16, direction: 'rtl',
    }}>
      {items.slice(0, 4).map((item, i) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.06, type: 'spring', stiffness: 200, damping: 22 }}
          style={{ position: 'relative', height: 210, borderRadius: 20, overflow: 'hidden', cursor: 'pointer' }}
        >
          {/* BG image */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: item.image_url ? `url(${item.image_url})` : 'none',
            backgroundSize: 'cover', backgroundPosition: 'center',
            background: item.image_url ? undefined : `${accent}14`,
          }} />

          {/* Gradient overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.88) 40%, rgba(0,0,0,0.1) 100%)',
          }} />

          {/* Accent line */}
          <div style={{
            position: 'absolute', bottom: 56, right: 20,
            width: 28, height: 2, borderRadius: 1, background: accent, opacity: 0.8,
          }} />

          {/* Content */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '14px 20px', direction: 'rtl',
          }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#fff', marginBottom: 4 }}>
              {item.name_ar || item.name_en}
            </div>
            {item.price != null && (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 18, fontWeight: 900, color: accent }}>
                  {Number(item.price).toLocaleString('ar-SA')}
                </span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
                  {item.currency}
                </span>
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ── Catalog preview strip ─────────────────────────────────────────────────────
function CatalogStrip({ slug, accent, layout }) {
  const [categories, setCategories] = useState([]);
  const [items,      setItems]      = useState([]);
  const [activeId,   setActiveId]   = useState(null);

  useEffect(() => {
    axios.get(`${API_BASE}/api/v1/public/catalog/categories`, {
      params: { client_slug: slug },
    }).then(({ data }) => {
      if (data.success && data.data.length) {
        setCategories(data.data);
        setActiveId(data.data[0].id);
      }
    }).catch(() => {});
  }, [slug]);

  useEffect(() => {
    if (!activeId) return;
    axios.get(`${API_BASE}/api/v1/public/catalog/categories/${activeId}/items`, {
      params: { client_slug: slug },
    }).then(({ data }) => {
      if (data.success) setItems(data.data);
    }).catch(() => setItems([]));
  }, [activeId, slug]);

  if (!categories.length) return null;

  return (
    <div style={{ marginTop: 48 }}>
      <h2 style={{
        margin: '0 0 20px', fontSize: 18, fontWeight: 700,
        color: '#fff', direction: 'rtl',
      }}>
        القائمة
      </h2>

      {/* Category pills */}
      {categories.length > 1 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24, direction: 'rtl' }}>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveId(cat.id)}
              style={{
                padding: '7px 18px', borderRadius: 999, cursor: 'pointer',
                background: activeId === cat.id ? `${accent}22` : 'rgba(255,255,255,0.04)',
                border: `1.5px solid ${activeId === cat.id ? accent : 'rgba(255,255,255,0.1)'}`,
                color: activeId === cat.id ? accent : 'rgba(255,255,255,0.6)',
                fontSize: 13, fontWeight: activeId === cat.id ? 700 : 400,
                fontFamily: 'inherit', transition: 'all 0.2s',
              }}
            >
              {cat.name_ar || cat.name_en}
            </button>
          ))}
        </div>
      )}

      {/* Items — layout switch */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${activeId}-${layout}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {layout === 'list'     && <ListView     items={items} accent={accent} />}
          {layout === 'showcase' && <ShowcaseView items={items} accent={accent} />}
          {(layout === 'grid' || !layout) && <GridView items={items} accent={accent} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function loadSaved(slug) {
  try { return JSON.parse(localStorage.getItem(`tp_${slug}`) || '{}'); }
  catch { return {}; }
}
function savePref(slug, key, value) {
  try {
    const prev = loadSaved(slug);
    localStorage.setItem(`tp_${slug}`, JSON.stringify({ ...prev, [key]: value }));
  } catch {}
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DemoPublicPage() {
  const { slug } = useParams();
  const [config,        setConfig]        = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [heroType,      setHeroType]      = useState('normal');
  const [catalogLayout, setCatalogLayout] = useState('grid');
  const [accent,        setAccent]        = useState('#6d28d9');


  useEffect(() => {
    axios.get(`${API_BASE}/api/v1/public/${slug}/config`)
      .then(({ data }) => {
        setConfig(data);
        const saved = loadSaved(slug);
        setHeroType(saved.heroType           || data.page_type              || 'normal');
        setCatalogLayout(saved.catalogLayout || data.config?.catalog_layout || 'grid');
        setAccent(data.primary_color || '#6d28d9');
      })
      .catch(() => setConfig(null))
      .finally(() => setLoading(false));
  }, [slug]);

  // Listen for live preview updates from the dashboard (postMessage)
  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type !== 'PREVIEW_UPDATE') return;
      if (e.data.heroType)      setHeroType(e.data.heroType);
      if (e.data.catalogLayout) setCatalogLayout(e.data.catalogLayout);
      if (e.data.accent)        setAccent(e.data.accent);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const persistToDb = async (patch) => {
    if (!localStorage.getItem('admin_access_token')) return;
    try { await adminApi.patch('/settings', patch); } catch {}
  };

  const handleHeroChange = (type) => {
    setHeroType(type);
    savePref(slug, 'heroType', type);
    persistToDb({ page_type: type });
  };

  const handleCatalogChange = (layout) => {
    setCatalogLayout(layout);
    savePref(slug, 'catalogLayout', layout);
    persistToDb({ config: { ...(config?.config ?? {}), catalog_layout: layout } });
  };

  if (loading) return <LoadingScreen />;
  if (!config)  return <NotFoundScreen slug={slug} />;

  const hasCatalog = config.active_services?.includes('catalog');

  // Merge local overrides — accent is reactive to postMessage from dashboard
  const heroConfig = { ...config, page_type: heroType, primary_color: accent };

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0f',
      color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Trial ribbon */}
      <div style={{
        background: `${accent}18`,
        borderBottom: `1px solid ${accent}33`,
        padding: '8px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        direction: 'rtl',
      }}>
        <span style={{ fontSize: 12, color: `${accent}cc`, fontWeight: 600 }}>
          ✦ صفحة تجريبية — {config.name_ar || config.name_en}
        </span>
        <Link
          to="/login"
          style={{
            fontSize: 11, color: accent,
            textDecoration: 'none', opacity: 0.7,
            letterSpacing: '0.08em',
          }}
        >
          تسجيل الدخول ←
        </Link>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 120px' }}>
        <ConfigurableHero config={heroConfig} />

        {hasCatalog && (
          <CatalogStrip slug={slug} accent={accent} layout={catalogLayout} />
        )}

        {!hasCatalog && (
          <div style={{
            textAlign: 'center', padding: '80px 0',
            color: 'rgba(255,255,255,0.2)', fontSize: 15,
          }}>
            قيد الإعداد...
          </div>
        )}
      </div>

    </div>
  );
}

/**
 * DemoCatalogPage — /demo/:slug/catalog  |  /demo/:slug/menu
 *
 * Full-page public catalog for trial tenants.
 * Shows all categories as tab pills and all items in 3 layout modes (grid/list/showcase).
 * No auth required — customer-facing.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, Link }                  from 'react-router-dom';
import { motion, AnimatePresence }          from 'framer-motion';
import axios                                from 'axios';
import TemplatePicker                       from '../../components/TemplatePicker';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// ── Tiny helpers ──────────────────────────────────────────────────────────────

function LoadingDot({ color = '#d4a853' }) {
  return (
    <div style={{
      width: '100vw', height: '100vh', background: '#0a0a0f',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: color,
        boxShadow: `0 0 20px 4px ${color}55`,
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
    }}>
      <div style={{ fontSize: 40, opacity: 0.15 }}>◈</div>
      <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>
        المنشأة غير موجودة: <code style={{ color: '#d4a853' }}>{slug}</code>
      </p>
    </div>
  );
}

// ── Layout: Grid ──────────────────────────────────────────────────────────────

function ItemCard({ item, accent, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4), type: 'spring', stiffness: 220, damping: 22 }}
      style={{
        borderRadius: 16,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.07)',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}
    >
      <div style={{
        height: 160, flexShrink: 0, overflow: 'hidden',
        background: item.image_url ? 'transparent' : `${accent}10`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {item.image_url
          ? <img
              src={item.image_url}
              alt={item.name_ar || item.name_en}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          : <span style={{ fontSize: 36, opacity: 0.15 }}>◈</span>
        }
      </div>

      <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{
          fontWeight: 700, fontSize: 14, color: '#f0ebe3', direction: 'rtl',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {item.name_ar || item.name_en}
        </div>

        {(item.description_ar || item.description_en) && (
          <div style={{
            fontSize: 12, color: 'rgba(255,255,255,0.35)',
            direction: 'rtl', lineHeight: 1.5,
            overflow: 'hidden',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>
            {item.description_ar || item.description_en}
          </div>
        )}

        {item.price != null && (
          <div style={{ marginTop: 'auto', paddingTop: 8, display: 'flex', alignItems: 'baseline', gap: 4, direction: 'rtl' }}>
            <span style={{ fontSize: 17, fontWeight: 800, color: accent }}>
              {Number(item.price).toLocaleString('ar-SA')}
            </span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
              {item.currency}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function GridView({ items, accent }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
      gap: 16,
    }}>
      {items.map((item, i) => (
        <ItemCard key={item.id} item={item} accent={accent} index={i} />
      ))}
    </div>
  );
}

// ── Layout: List ──────────────────────────────────────────────────────────────

function ListView({ items, accent }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, direction: 'rtl' }}>
      {items.map((item, i) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: Math.min(i * 0.04, 0.4), type: 'spring', stiffness: 220, damping: 22 }}
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
            width: 72, height: 72, borderRadius: 12, flexShrink: 0,
            overflow: 'hidden',
            background: item.image_url ? 'transparent' : `${accent}10`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {item.image_url
              ? <img src={item.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 24, opacity: 0.15 }}>◈</span>
            }
          </div>

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#f0ebe3', marginBottom: 4 }}>
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
              <div style={{ fontSize: 17, fontWeight: 800, color: accent }}>
                {Number(item.price).toLocaleString('ar-SA')}
              </div>
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

// ── Layout: Showcase ──────────────────────────────────────────────────────────

function ShowcaseView({ items, accent }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, direction: 'rtl' }}>
      {items.map((item, i) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: Math.min(i * 0.05, 0.4), type: 'spring', stiffness: 180, damping: 22 }}
          style={{ position: 'relative', height: 200, borderRadius: 22, overflow: 'hidden' }}
        >
          {/* BG image */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: item.image_url ? `url(${item.image_url})` : 'none',
            backgroundSize: 'cover', backgroundPosition: 'center',
            background: item.image_url ? undefined : `${accent}14`,
          }} />

          {/* Gradient overlay — deeper on right side (text side in RTL) */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to left, rgba(0,0,0,0.88) 45%, rgba(0,0,0,0.25) 100%)',
          }} />

          {/* Accent bar */}
          <div style={{
            position: 'absolute', top: '50%', right: 28,
            transform: 'translateY(-50%)',
            width: 3, height: 40, borderRadius: 2,
            background: accent, opacity: 0.85,
          }} />

          {/* Content */}
          <div style={{
            position: 'absolute', top: '50%', right: 48,
            transform: 'translateY(-50%)',
            direction: 'rtl', maxWidth: '55%',
          }}>
            <div style={{ fontWeight: 900, fontSize: 20, color: '#fff', marginBottom: 6, lineHeight: 1.2 }}>
              {item.name_ar || item.name_en}
            </div>
            {(item.description_ar || item.description_en) && (
              <div style={{
                fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>
                {item.description_ar || item.description_en}
              </div>
            )}
            {item.price != null && (
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 22, fontWeight: 900, color: accent }}>
                  {Number(item.price).toLocaleString('ar-SA')}
                </span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
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

// ── Skeleton placeholders ─────────────────────────────────────────────────────

function GridSkeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{
          height: 260, borderRadius: 16,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.05)',
          animation: 'shimmer 1.4s ease-in-out infinite',
        }} />
      ))}
      <style>{`@keyframes shimmer{0%,100%{opacity:.4}50%{opacity:.8}}`}</style>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function DemoCatalogPage() {
  const { slug } = useParams();

  const [config,        setConfig]        = useState(null);
  const [configLoad,    setConfigLoad]    = useState(true);
  const [categories,    setCategories]    = useState([]);
  const [items,         setItems]         = useState([]);
  const [activeCat,     setActiveCat]     = useState(null);
  const [itemsLoad,     setItemsLoad]     = useState(false);
  const [catalogLayout, setCatalogLayout] = useState('grid');

  // Fetch tenant config
  useEffect(() => {
    axios.get(`${API_BASE}/api/v1/public/${slug}/config`)
      .then(({ data }) => {
        setConfig(data);
        setCatalogLayout(data.config?.catalog_layout || 'grid');
      })
      .catch(() => setConfig(null))
      .finally(() => setConfigLoad(false));
  }, [slug]);

  // Fetch categories once config is loaded
  useEffect(() => {
    if (!config) return;
    axios.get(`${API_BASE}/api/v1/public/catalog/categories`, {
      params: { client_slug: slug },
    }).then(({ data }) => {
      if (data.success && data.data.length) {
        setCategories(data.data);
        setActiveCat(data.data[0].id);
      }
    }).catch(() => {});
  }, [slug, config]);

  // Fetch items when active category changes
  const loadItems = useCallback((catId) => {
    if (!catId) return;
    setItemsLoad(true);
    axios.get(`${API_BASE}/api/v1/public/catalog/categories/${catId}/items`, {
      params: { client_slug: slug },
    }).then(({ data }) => {
      if (data.success) setItems(data.data);
    }).catch(() => setItems([]))
      .finally(() => setItemsLoad(false));
  }, [slug]);

  useEffect(() => {
    loadItems(activeCat);
  }, [activeCat, loadItems]);

  if (configLoad) return <LoadingDot />;
  if (!config)   return <NotFoundScreen slug={slug} />;

  const accent = config.primary_color || '#6d28d9';
  const tenantName = config.name_ar || config.name_en || slug;

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0f',
      color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Trial ribbon */}
      <div style={{
        background: `${accent}15`,
        borderBottom: `1px solid ${accent}28`,
        padding: '9px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        direction: 'rtl', position: 'sticky', top: 0, zIndex: 50,
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link
            to={`/demo/${slug}`}
            style={{
              color: 'rgba(255,255,255,0.3)', fontSize: 12,
              textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            → {tenantName}
          </Link>
          <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: 10 }}>|</span>
          <span style={{ fontSize: 12, color: `${accent}bb`, fontWeight: 600 }}>
            الكتالوج
          </span>
        </div>
        <Link
          to="/login"
          style={{ fontSize: 11, color: accent, textDecoration: 'none', opacity: 0.7 }}
        >
          تسجيل الدخول ←
        </Link>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 120px' }}>

        {/* Page header */}
        <div style={{ marginBottom: 32, direction: 'rtl' }}>
          <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800, color: '#f0ebe3' }}>
            {tenantName}
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
            تصفّح الكتالوج الكامل
          </p>
        </div>

        {/* Category pills */}
        {categories.length > 0 && (
          <div style={{
            display: 'flex', gap: 8, flexWrap: 'wrap',
            marginBottom: 28, direction: 'rtl',
          }}>
            {categories.map(cat => {
              const isActive = cat.id === activeCat;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCat(cat.id)}
                  style={{
                    padding: '8px 20px', borderRadius: 999,
                    cursor: 'pointer', fontFamily: 'inherit',
                    background: isActive ? `${accent}20` : 'rgba(255,255,255,0.04)',
                    border: `1.5px solid ${isActive ? accent : 'rgba(255,255,255,0.09)'}`,
                    color: isActive ? accent : 'rgba(255,255,255,0.55)',
                    fontSize: 13, fontWeight: isActive ? 700 : 400,
                    transition: 'all 0.18s',
                  }}
                >
                  {cat.name_ar || cat.name_en}
                  {cat.items_count > 0 && (
                    <span style={{ marginRight: 6, fontSize: 10, opacity: 0.5, fontWeight: 400 }}>
                      ({cat.items_count})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Items — layout switch */}
        {itemsLoad ? (
          <GridSkeleton />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeCat}-${catalogLayout}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {items.length === 0 ? (
                <div style={{
                  textAlign: 'center', padding: '60px 0',
                  color: 'rgba(255,255,255,0.2)', fontSize: 14,
                }}>
                  لا توجد عناصر في هذا القسم بعد
                </div>
              ) : (
                <>
                  {catalogLayout === 'list'     && <ListView     items={items} accent={accent} />}
                  {catalogLayout === 'showcase' && <ShowcaseView items={items} accent={accent} />}
                  {(catalogLayout === 'grid' || !catalogLayout) && <GridView items={items} accent={accent} />}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Floating template picker — catalog layout only visible here */}
      <TemplatePicker
        accent={accent}
        heroType="normal"
        catalogLayout={catalogLayout}
        onHeroChange={() => {}}
        onCatalogChange={setCatalogLayout}
      />
    </div>
  );
}

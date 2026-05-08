/**
 * DemoCatalogPage — /demo/:slug/catalog  |  /demo/:slug/menu
 *
 * Full-page public catalog for trial tenants.
 * Shows all categories as tab pills and all items in a responsive grid.
 * No auth required — customer-facing.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, Link }                  from 'react-router-dom';
import { motion, AnimatePresence }          from 'framer-motion';
import axios                                from 'axios';

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

// ── Item Card ─────────────────────────────────────────────────────────────────

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
      {/* Image */}
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

      {/* Info */}
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

// ── Main ──────────────────────────────────────────────────────────────────────

export default function DemoCatalogPage() {
  const { slug } = useParams();

  const [config,     setConfig]     = useState(null);
  const [configLoad, setConfigLoad] = useState(true);
  const [categories, setCategories] = useState([]);
  const [items,      setItems]      = useState([]);
  const [activeCat,  setActiveCat]  = useState(null);
  const [itemsLoad,  setItemsLoad]  = useState(false);

  // Fetch tenant config
  useEffect(() => {
    axios.get(`${API_BASE}/api/v1/public/${slug}/config`)
      .then(({ data }) => setConfig(data))
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

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 80px' }}>

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
                    <span style={{
                      marginRight: 6, fontSize: 10,
                      opacity: 0.5, fontWeight: 400,
                    }}>
                      ({cat.items_count})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Items grid */}
        {itemsLoad ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 16,
          }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: 260, borderRadius: 16,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  animation: 'shimmer 1.4s ease-in-out infinite',
                }}
              />
            ))}
            <style>{`@keyframes shimmer{0%,100%{opacity:.4}50%{opacity:.8}}`}</style>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCat}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 16,
              }}
            >
              {items.length === 0 ? (
                <div style={{
                  gridColumn: '1 / -1', textAlign: 'center',
                  padding: '60px 0', color: 'rgba(255,255,255,0.2)', fontSize: 14,
                }}>
                  لا توجد عناصر في هذا القسم بعد
                </div>
              ) : (
                items.map((item, i) => (
                  <ItemCard key={item.id} item={item} accent={accent} index={i} />
                ))
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

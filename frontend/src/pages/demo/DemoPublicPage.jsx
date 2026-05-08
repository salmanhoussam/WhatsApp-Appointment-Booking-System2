/**
 * DemoPublicPage — auth.salmansaas.com/demo/:slug
 * Public customer-facing preview for trial tenants (no login required).
 * Fetches tenant config + catalog categories and renders ConfigurableHero.
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import ConfigurableHero from '../../components/ConfigurableHero';

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

// ── Catalog preview strip ─────────────────────────────────────────────────────
function CatalogStrip({ slug, accent }) {
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

      {/* Items grid */}
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
            {/* Image */}
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
            {/* Info */}
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
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DemoPublicPage() {
  const { slug } = useParams();
  const [config,  setConfig]  = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_BASE}/api/v1/public/${slug}/config`)
      .then(({ data }) => setConfig(data))
      .catch(() => setConfig(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <LoadingScreen />;
  if (!config)  return <NotFoundScreen slug={slug} />;

  const accent = config.primary_color || '#6d28d9';
  const hasCatalog = config.active_services?.includes('catalog');

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

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px' }}>
        <ConfigurableHero config={config} />

        {hasCatalog && <CatalogStrip slug={slug} accent={accent} />}

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

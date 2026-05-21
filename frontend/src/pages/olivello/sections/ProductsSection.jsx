/**
 * ProductsSection.jsx — Olivello Showcase, Section 8 — "اختر زيتك"
 *
 * Loads products from /public/store/products?client_slug=olivello.
 * Uses useGenericStore so the cart is shared with /olivello/cart.
 *
 * Layout: category filter pills → 2×2/4×N product grid → floating cart FAB.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate }      from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import publicApi            from '../../../utils/publicApi';
import useGenericStore      from '../../generic/store/useGenericStore';
import useTenantConfig      from '../../../hooks/useTenantConfig';

const SLUG   = 'olivello';
const ACCENT = 'oklch(78% 0.16 72)';
const ACCENT_HEX = '#C8A84B';  // for boxShadow strings

// Raw product name helper
function getName(field) {
  if (!field) return '';
  if (typeof field === 'object') return field.ar || field.en || '';
  return String(field);
}

// Per-product add-button with micro bounce
function AddButton({ onClick, added }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.93 }}
      animate={added ? { scale: [1, 1.18, 1] } : {}}
      transition={{ duration: 0.28 }}
      style={{
        width: '100%',
        padding: 'clamp(8px, 1vh, 11px) 0',
        marginTop: 10,
        borderRadius: 6,
        border: `1.5px solid rgba(200,168,75,${added ? '0.8' : '0.35'})`,
        background: added ? 'rgba(200,168,75,0.18)' : 'transparent',
        color: ACCENT,
        fontSize: 'clamp(10px, 1vw, 12px)',
        fontWeight: 700,
        fontFamily: "'Tajawal', system-ui, sans-serif",
        cursor: 'pointer',
        letterSpacing: '0.04em',
        direction: 'rtl',
        transition: 'background 0.2s, border-color 0.2s',
      }}
    >
      {added ? '✓ أُضيف' : 'أضف للسلة'}
    </motion.button>
  );
}

// Product card
function ProductCard({ product, accent, onAdd }) {
  const [added, setAdded] = useState(false);

  function handleAdd() {
    onAdd(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  }

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      style={{
        background: 'oklch(22% 0.06 92)',
        border: '1px solid rgba(200,168,75,0.14)',
        borderRadius: 12,
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Image */}
      {product.image_url ? (
        <img
          src={product.image_url}
          alt={getName(product.name)}
          loading="lazy"
          style={{
            width: '100%',
            aspectRatio: '1 / 1',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      ) : (
        <div style={{
          width: '100%', aspectRatio: '1 / 1',
          background: 'radial-gradient(ellipse at 50% 50%, rgba(200,168,75,0.14) 0%, rgba(0,0,0,0.15) 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg viewBox="0 0 60 80" style={{ width: 32, opacity: 0.4 }}>
            <ellipse cx="30" cy="22" rx="18" ry="20" fill="oklch(52% 0.12 130)" />
            <rect x="26" y="40" width="8" height="30" rx="4" fill="oklch(62% 0.10 80)" />
          </svg>
        </div>
      )}

      {/* Info */}
      <div style={{ padding: 'clamp(10px, 1.5vw, 16px)', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <p style={{
          fontSize: 'clamp(11px, 1.1vw, 13px)',
          color: 'rgba(200,168,75,0.55)',
          fontFamily: "'Inter', system-ui, sans-serif",
          letterSpacing: '0.06em',
          margin: '0 0 5px',
          textTransform: 'uppercase',
        }}>
          {product.metadata?.size ?? ''}
        </p>

        <h3 style={{
          fontSize: 'clamp(13px, 1.3vw, 15px)',
          fontWeight: 700,
          color: '#f0ede6',
          fontFamily: "'Tajawal', system-ui, sans-serif",
          direction: 'rtl',
          margin: '0 0 6px',
          lineHeight: 1.35,
          flex: 1,
        }}>
          {getName(product.name)}
        </h3>

        {product.description_ar && (
          <p style={{
            fontSize: 'clamp(10px, 0.95vw, 12px)',
            color: 'rgba(240,237,230,0.32)',
            fontFamily: "'Tajawal', system-ui, sans-serif",
            direction: 'rtl',
            margin: '0 0 8px',
            lineHeight: 1.55,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {product.description_ar}
          </p>
        )}

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{
            fontSize: 'clamp(15px, 1.6vw, 18px)',
            fontWeight: 800,
            color: ACCENT,
          }}>
            ${Number(product.price).toFixed(0)}
          </span>
          {product.compare_at_price && (
            <span style={{
              fontSize: 11,
              color: 'rgba(240,237,230,0.25)',
              textDecoration: 'line-through',
            }}>
              ${Number(product.compare_at_price).toFixed(0)}
            </span>
          )}
        </div>

        <AddButton onClick={handleAdd} added={added} />
      </div>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ProductsSection() {
  const navigate = useNavigate();

  const { config }                         = useTenantConfig();
  const { addItem, totalItems, setConfig } = useGenericStore();

  const [categories,   setCategories]   = useState([]);
  const [products,     setProducts]     = useState([]);
  const [activeCatId,  setActiveCatId]  = useState(null);
  const [loading,      setLoading]      = useState(true);

  // Bootstrap generic store from TenantConfigProvider (already in scope via olivello.routes.jsx)
  useEffect(() => {
    if (config && config.slug !== 'unknown') {
      setConfig(config, config.active_services ?? []);
    }
  }, [config, setConfig]);

  // Fetch catalog
  useEffect(() => {
    Promise.all([
      publicApi.get('/store/categories', { params: { client_slug: SLUG } }),
      publicApi.get('/store/products',   { params: { client_slug: SLUG } }),
    ])
      .then(([catRes, prodRes]) => {
        const cats  = catRes.data?.data  ?? [];
        const prods = prodRes.data?.data ?? [];
        setCategories(cats);
        setProducts(prods);
        if (cats.length) setActiveCatId(cats[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const visible = activeCatId
    ? products.filter((p) => p.category_id === activeCatId)
    : products;

  const onAdd = useCallback((product) => addItem(product), [addItem]);
  const cartCount = totalItems();

  return (
    <section style={{
      minHeight: '100vh',
      background: 'oklch(19% 0.05 95)',
      padding: 'clamp(60px, 8vh, 100px) clamp(20px, 5vw, 80px) clamp(80px, 12vh, 140px)',
    }}>

      {/* ── Section header ─────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ type: 'spring', stiffness: 70, damping: 20 }}
        style={{ textAlign: 'center', marginBottom: 'clamp(32px, 5vh, 56px)' }}
      >
        <p style={{
          fontSize: 9, letterSpacing: '0.38em', color: 'rgba(200,168,75,0.50)',
          textTransform: 'uppercase', marginBottom: 14,
          fontFamily: "'Inter', system-ui, sans-serif",
        }}>
          Lebanese Mountain · Est. 1943
        </p>
        <h2 style={{
          fontSize: 'clamp(28px, 4.5vw, 58px)',
          fontWeight: 800, color: '#f0ede6',
          fontFamily: "'Tajawal', system-ui, sans-serif",
          direction: 'rtl', margin: 0, lineHeight: 1.15,
        }}>
          اختر زيتك
        </h2>
        <p style={{
          fontSize: 'clamp(13px, 1.3vw, 15px)',
          color: 'rgba(240,237,230,0.30)',
          fontFamily: "'Tajawal', system-ui, sans-serif",
          direction: 'rtl', marginTop: 12,
        }}>
          من الجبل مباشرةً إلى طاولتك
        </p>
        <div style={{
          width: 48, height: 1, margin: '22px auto 0',
          background: 'linear-gradient(to right, transparent, rgba(200,168,75,0.6), transparent)',
        }} />
      </motion.div>

      {/* ── Category filter pills ───────────────────────────────────────────── */}
      {categories.length > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ delay: 0.15 }}
          style={{
            display: 'flex', gap: 10, overflowX: 'auto',
            paddingBottom: 8, marginBottom: 'clamp(24px, 4vh, 40px)',
            scrollbarWidth: 'none',
            justifyContent: 'center', flexWrap: 'wrap',
          }}
        >
          {categories.map((cat) => {
            const active = activeCatId === cat.id;
            return (
              <motion.button
                key={cat.id}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setActiveCatId(cat.id)}
                style={{
                  padding: 'clamp(7px, 1vh, 10px) clamp(16px, 2vw, 22px)',
                  borderRadius: 999,
                  border: `1.5px solid ${active ? 'rgba(200,168,75,0.65)' : 'rgba(200,168,75,0.18)'}`,
                  background: active ? 'rgba(200,168,75,0.15)' : 'transparent',
                  color: active ? ACCENT : 'rgba(240,237,230,0.45)',
                  fontSize: 'clamp(11px, 1.1vw, 13px)',
                  fontWeight: active ? 700 : 500,
                  fontFamily: "'Tajawal', system-ui, sans-serif",
                  direction: 'rtl',
                  cursor: 'pointer',
                  letterSpacing: '0.03em',
                  transition: 'all 0.18s',
                  whiteSpace: 'nowrap',
                }}
              >
                {getName(cat.name) || cat.name_ar || cat.name_en}
              </motion.button>
            );
          })}
        </motion.div>
      )}

      {/* ── Product grid ────────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <motion.div
            animate={{ opacity: [0.3, 0.9, 0.3] }}
            transition={{ duration: 1.8, repeat: Infinity }}
            style={{
              width: 8, height: 8, borderRadius: '50%',
              background: ACCENT_HEX,
              margin: '0 auto',
              boxShadow: `0 0 20px 4px rgba(200,168,75,0.35)`,
            }}
          />
        </div>
      ) : (
        <motion.div
          key={activeCatId ?? 'all'}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 80, damping: 20 }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(140px, 22vw, 220px), 1fr))',
            gap: 'clamp(12px, 2vw, 20px)',
            maxWidth: 1000,
            margin: '0 auto',
          }}
        >
          {visible.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: (i % 4) * 0.08, type: 'spring', stiffness: 80, damping: 18 }}
            >
              <ProductCard product={product} accent={ACCENT} onAdd={onAdd} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* ── "See full store" link ────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ delay: 0.3 }}
        style={{ textAlign: 'center', marginTop: 'clamp(28px, 5vh, 52px)' }}
      >
        <button
          onClick={() => navigate('/olivello/store')}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(200,168,75,0.48)',
            fontSize: 'clamp(11px, 1.1vw, 13px)',
            fontFamily: "'Inter', system-ui, sans-serif",
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            textDecoration: 'underline',
            textUnderlineOffset: 4,
            textDecorationColor: 'rgba(200,168,75,0.25)',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = ACCENT; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(200,168,75,0.48)'; }}
        >
          تصفّح جميع المنتجات ↗
        </button>
      </motion.div>

      {/* ── Floating Cart FAB ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {cartCount > 0 && (
          <motion.button
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => navigate('/olivello/cart')}
            style={{
              position: 'fixed',
              bottom: 'clamp(18px, 4vh, 28px)',
              right: 'clamp(16px, 3vw, 28px)',
              zIndex: 50,
              display: 'flex', alignItems: 'center', gap: 10,
              padding: 'clamp(12px, 1.5vh, 15px) clamp(20px, 2.5vw, 28px)',
              borderRadius: 999,
              background: 'oklch(72% 0.16 72)',
              border: 'none',
              color: 'oklch(18% 0.05 90)',
              fontSize: 'clamp(12px, 1.2vw, 14px)',
              fontWeight: 700,
              fontFamily: "'Tajawal', system-ui, sans-serif",
              cursor: 'pointer',
              direction: 'rtl',
              boxShadow: '0 8px 32px rgba(200,168,75,0.40)',
            }}
          >
            <span>السلة</span>
            <motion.span
              key={cartCount}
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 22, height: 22,
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.2)',
                fontSize: 11, fontWeight: 800,
              }}
            >
              {cartCount}
            </motion.span>
          </motion.button>
        )}
      </AnimatePresence>
    </section>
  );
}
